from __future__ import annotations

import asyncio
import json
import jwt
import logging
import os
import uuid
from confluent_kafka import Producer
from dataclasses import asdict, dataclass
from datetime import datetime
from dotenv import load_dotenv
from livekit import rtc, api
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    WorkerType,
    cli,
    llm,
)
from livekit.agents.multimodal import MultimodalAgent
from livekit.plugins import openai
from openai import OpenAI
from typing import Any, Dict, Literal, List, Optional

load_dotenv()

logger = logging.getLogger("my-worker")
logger.setLevel(logging.INFO)

conf = {
    'bootstrap.servers': 'localhost:9092',
}
producer = Producer(conf)
topic = 'GENERAL_MESSAGE_TOPIC'


class InteractionEvent:
    def __init__(self,
                 eventName: str,
                 eventType: int,
                 eventTimestamp: int,
                 eventOwner: InteractionParticipant,
                 userData: Dict[str, str]
                 ):
        self.eventName = eventName
        self.eventType = eventType
        self.eventTimestamp = eventTimestamp
        self.eventOwner = eventOwner
        self.userData = userData

    def to_dict(self):
        return self.__dict__


class Message:
    def __init__(self,
                 interactionEvent: InteractionEvent,
                 messageOwner: InteractionParticipant
                 ):
        self.interactionEvent = interactionEvent
        self.messageOwner = messageOwner

    def to_dict(self):
        return self.__dict__


class InteractionParticipant:
    def __init__(self,
                 agent: Optional[Agent] = None,
                 systemParticipant: Optional[SystemParticipant] = None
                 ):
        self.agent = agent
        self.systemParticipant = systemParticipant

    def to_dict(self):
        return self.__dict__


class Agent:
    def __init__(self,
                 userId: str
                 ):
        self.userId = userId

    def to_dict(self):
        return self.__dict__


class SystemParticipant:
    def __init__(self,
                 instanceId: str
                 ):
        self.instanceId = instanceId

    def to_dict(self):
        return self.__dict__


@dataclass
class SessionConfig:
    openai_api_key: str
    instructions: str
    voice: openai.realtime.api_proto.Voice
    temperature: float
    max_response_output_tokens: str | int
    modalities: list[openai.realtime.api_proto.Modality]
    turn_detection: openai.realtime.ServerVadOptions
    jwtToken: str

    def __post_init__(self):
        if self.modalities is None:
            self.modalities = self._modalities_from_string("text_and_audio")

    def to_dict(self):
        return {k: v for k, v in asdict(self).items() if k != "openai_api_key"}

    @staticmethod
    def _modalities_from_string(modalities: str) -> list[str]:
        modalities_map = {
            "text_and_audio": ["text", "audio"],
            "text_only": ["text"],
        }
        return modalities_map.get(modalities, ["text", "audio"])

    def __eq__(self, other: SessionConfig) -> bool:
        return self.to_dict() == other.to_dict()


def parse_session_config(data: Dict[str, Any]) -> SessionConfig:
    turn_detection = None

    if data.get("turn_detection"):
        turn_detection_json = json.loads(data.get("turn_detection"))
        turn_detection = openai.realtime.ServerVadOptions(
            threshold=turn_detection_json.get("threshold", 0.5),
            prefix_padding_ms=turn_detection_json.get("prefix_padding_ms", 200),
            silence_duration_ms=turn_detection_json.get("silence_duration_ms", 300),
        )
    else:
        turn_detection = openai.realtime.DEFAULT_SERVER_VAD_OPTIONS

    config = SessionConfig(
        openai_api_key=data.get("openai_api_key", ""),
        instructions=data.get("instructions", ""),
        voice=data.get("voice", "alloy"),
        temperature=float(data.get("temperature", 0.8)),
        max_response_output_tokens=data.get("max_output_tokens")
        if data.get("max_output_tokens") == "inf"
        else int(data.get("max_output_tokens") or 2048),
        modalities=SessionConfig._modalities_from_string(
            data.get("modalities", "text_and_audio")
        ),
        turn_detection=turn_detection,
        jwtToken=data.get("jwtToken", ""),
    )
    return config


class TranscriptionValue:
    def __init__(
            self,
            firstReceivedTime: int,
            text: str):
        self.firstReceivedTime = firstReceivedTime
        self.text = text


class Transcription:
    def __init__(
            self,
            key: str,
            value: TranscriptionValue):
        self.key = key
        self.value = value


class SummaryRequest:
    def __init__(
            self,
            summaryInstruction: str,
            transcriptionsArray:
            List[
                Transcription]):
        self.summaryInstruction = summaryInstruction
        self.transcriptionsArray = transcriptionsArray


def deserialize_summary_request(
        json_str: str) -> SummaryRequest:
    data = json.loads(
        json_str)

    transcriptions_array = [
        Transcription(
            key=
            item[
                "key"],
            value=TranscriptionValue(
                firstReceivedTime=
                item[
                    "value"][
                    "firstReceivedTime"],
                text=
                item[
                    "value"][
                    "text"]
            )
        )
        for
        item
        in
        data[
            "transcriptionsArray"]
    ]

    return SummaryRequest(
        summaryInstruction=
        data[
            "summaryInstruction"],
        transcriptionsArray=transcriptions_array
    )


async def entrypoint(ctx: JobContext):
    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant = await ctx.wait_for_participant()

    run_multimodal_agent(ctx, participant)

    logger.info("agent started")


def run_multimodal_agent(ctx: JobContext, participant: rtc.Participant):
    metadata = json.loads(participant.metadata)
    config = parse_session_config(metadata)

    logger.info(f"starting MultimodalAgent with config: {config.to_dict()}")

    async def show_toast(
        title: str,
        description: str | None,
        variant: Literal["default", "success", "warning", "destructive"],
    ):
        await ctx.room.local_participant.perform_rpc(
            destination_identity=participant.identity,
            method="pg.toast",
            payload=json.dumps(
                {"title": title, "description": description, "variant": variant}
            ),
        )

    if not config.openai_api_key:
        raise Exception("OpenAI API Key is required")

    model = openai.realtime.RealtimeModel(
        api_key=os.getenv("OPENAI_API_SECRET"),
        instructions=config.instructions,
        voice=config.voice,
        temperature=config.temperature,
        max_response_output_tokens=config.max_response_output_tokens,
        modalities=config.modalities,
        turn_detection=config.turn_detection,
    )
    assistant = MultimodalAgent(model=model)
    assistant.start(ctx.room)
    session = model.sessions[0]
    itemId = str(uuid.uuid4())[:10]
    lkapi = api.LiveKitAPI(
        os.getenv(
            "LIVEKIT_URL"),
        os.getenv(
            "LIVEKIT_API_KEY"),
        os.getenv(
            "LIVEKIT_API_SECRET"))

    if config.modalities == ["text", "audio"]:
        session.conversation.item.create(
            llm.ChatMessage(
                role="user",
                content="Please begin the interaction with the user in a manner consistent with your instructions.",
                id=str(itemId),
            )
        )
    egress_id = None

    async def start_record(ctx: JobContext):
        now = int(datetime.now().timestamp() * 1000)
        formatted_date = str(now)

        req = api.RoomCompositeEgressRequest(
            room_name = ctx.room.name,
            audio_only = True,
            file_outputs = [
                api.EncodedFileOutput(
                    file_type = api.EncodedFileType.MP4,
                    filepath = "livekit_" + ctx.room.name + "_to_" + ctx.room.name + "_at_" + formatted_date + "_audio" + ".mp4",
                    s3 = api.S3Upload(
                        bucket = os.getenv("S3_BUCKET"),
                        region = os.getenv("S3_REGION"),
                        access_key = os.getenv("S3_ACCESS_KEY"),
                        secret = os.getenv("S3_SECRET"),
                        force_path_style = True,
                    ),
                ),
            ],
        )
        res = await lkapi.egress.start_room_composite_egress(req)
        egress_id = res.egress_id

    async def stop_record():
        try:
            req = api.StopEgressRequest(egress_id=egress_id)
            res = await lkapi.egress.stop_egress(req)
            ssss = res
        except Exception as e:
            logger.error(f"Error stopping egress: {e}")

    @ctx.room.local_participant.register_rpc_method("pg.updateConfig")
    async def update_config(
        data: rtc.rpc.RpcInvocationData,
    ):
        if data.caller_identity != participant.identity:
            return

        asyncio.create_task(start_record(ctx))
        new_config = parse_session_config(json.loads(data.payload))
        if config != new_config:
            logger.info(
                f"config changed: {new_config.to_dict()}, participant: {participant.identity}"
            )
            session = model.sessions[0]
            session.session_update(
                instructions=new_config.instructions,
                voice=new_config.voice,
                temperature=new_config.temperature,
                max_response_output_tokens=new_config.max_response_output_tokens,
                turn_detection=new_config.turn_detection,
                modalities=new_config.modalities,
            )
            return json.dumps({"changed": True})
        else:
            return json.dumps({"changed": False})

    @ctx.room.local_participant.register_rpc_method("pg.getSummary")
    async def get_summary(
            data: rtc.rpc.RpcInvocationData,
    ):
        if data.caller_identity != participant.identity:
            return

        asyncio.create_task(stop_record())
        summary_request = deserialize_summary_request(data.payload)
        summary = await get_summary(summary_request)
        return summary

    async def get_summary(
            summary_request: SummaryRequest) -> str:
        try:
            # Prepare the prompt
            prompt = summary_request.summaryInstruction + "\n\n"
            for transcription in summary_request.transcriptionsArray:
                prompt += f"{transcription.key}: {transcription.value.text}\n"
            # Call the OpenAI API

            client = OpenAI(api_key=os.getenv("OPENAI_API_SECRET"))

            chat_completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": summary_request.summaryInstruction
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }]
            )

            # Collect the summary from the response
            summary = chat_completion.choices[0].message.content

            await prepare_message(participant, ctx, summary_request.transcriptionsArray, summary)

            return summary
        except Exception as e:
            logger.error(f"Error getting summary: {e}")
            return "An error occurred while generating the summary."

    @session.on("response_done")
    def on_response_done(response: openai.realtime.RealtimeResponse):
        variant: Literal["warning", "destructive"]
        description: str | None = None
        title: str
        if response.status == "incomplete":
            if response.status_details and response.status_details["reason"]:
                reason = response.status_details["reason"]
                if reason == "max_output_tokens":
                    variant = "warning"
                    title = "Max output tokens reached"
                    description = "Response may be incomplete"
                elif reason == "content_filter":
                    variant = "warning"
                    title = "Content filter applied"
                    description = "Response may be incomplete"
                else:
                    variant = "warning"
                    title = "Response incomplete"
            else:
                variant = "warning"
                title = "Response incomplete"
        elif response.status == "failed":
            if response.status_details and response.status_details["error"]:
                error_code = response.status_details["error"]["code"]
                if error_code == "server_error":
                    variant = "destructive"
                    title = "Server error"
                elif error_code == "rate_limit_exceeded":
                    variant = "destructive"
                    title = "Rate limit exceeded"
                else:
                    variant = "destructive"
                    title = "Response failed"
            else:
                variant = "destructive"
                title = "Response failed"
        else:
            return

        asyncio.create_task(show_toast(title, description, variant))

    async def send_transcription(
        ctx: JobContext,
        participant: rtc.Participant,
        track_sid: str,
        segment_id: str,
        text: str,
        is_final: bool = True,
    ):
        transcription = rtc.Transcription(
            participant_identity=participant.identity,
            track_sid=track_sid,
            segments=[
                rtc.TranscriptionSegment(
                    id=segment_id,
                    text=text,
                    start_time=0,
                    end_time=0,
                    language="en",
                    final=is_final,
                )
            ],
        )
        await ctx.room.local_participant.publish_transcription(transcription)

    last_transcript_id = None

    # send three dots when the user starts talking. will be cleared later when a real transcription is sent.
    @session.on("input_speech_started")
    def on_input_speech_started():
        nonlocal last_transcript_id
        remote_participant = next(iter(ctx.room.remote_participants.values()), None)
        if not remote_participant:
            return

        track_sid = next(
            (
                track.sid
                for track in remote_participant.track_publications.values()
                if track.source == rtc.TrackSource.SOURCE_MICROPHONE
            ),
            None,
        )
        if last_transcript_id:
            asyncio.create_task(
                send_transcription(
                    ctx, remote_participant, track_sid, last_transcript_id, ""
                )
            )

        new_id = str(uuid.uuid4())
        last_transcript_id = new_id
        asyncio.create_task(
            send_transcription(
                ctx, remote_participant, track_sid, new_id, "…", is_final=False
            )
        )

    @session.on("input_speech_transcription_completed")
    def on_input_speech_transcription_completed(
        event: openai.realtime.InputTranscriptionCompleted,
    ):
        nonlocal last_transcript_id
        if last_transcript_id:
            remote_participant = next(iter(ctx.room.remote_participants.values()), None)
            if not remote_participant:
                return

            track_sid = next(
                (
                    track.sid
                    for track in remote_participant.track_publications.values()
                    if track.source == rtc.TrackSource.SOURCE_MICROPHONE
                ),
                None,
            )
            asyncio.create_task(
                send_transcription(
                    ctx, remote_participant, track_sid, last_transcript_id, ""
                )
            )
            last_transcript_id = None

    @session.on("input_speech_transcription_failed")
    def on_input_speech_transcription_failed(
        event: openai.realtime.InputTranscriptionFailed,
    ):
        nonlocal last_transcript_id
        if last_transcript_id:
            remote_participant = next(iter(ctx.room.remote_participants.values()), None)
            if not remote_participant:
                return

            track_sid = next(
                (
                    track.sid
                    for track in remote_participant.track_publications.values()
                    if track.source == rtc.TrackSource.SOURCE_MICROPHONE
                ),
                None,
            )

            error_message = "⚠️ Transcription failed"
            asyncio.create_task(
                send_transcription(
                    ctx,
                    remote_participant,
                    track_sid,
                    last_transcript_id,
                    error_message,
                )
            )
            last_transcript_id = None

    def custom_serializer(obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if hasattr(obj, 'to_dict'):
            return obj.to_dict()
        raise TypeError(f"Type {type(obj)} not serializable")

    def publish_report(err, message):
        if err is not None:
            logger.info(f"Message delivery failed: {err}")
        else:
            logger.info(f"Message delivered to {message.topic()} [{message.partition()}]")

    def publish_message(message):
        logger.info(f"Message that is send to kafka obtained as : {message}")

        producer.produce(topic, key="key", value=message, callback=publish_report)
        producer.flush()

    async def prepare_message(participant, ctx, transcriptionsArray, summary):
        transcript = ""
        preferred_username = ""

        try:
            for transcription in transcriptionsArray:
                transcript += f"{transcription.key}: {transcription.value.text}\n"

            parsed_data = json.loads(participant.metadata)
            jwt_token = parsed_data.get("jwtToken")

            try:
                decoded_data = jwt.decode(jwt_token, options={"verify_signature": False})
                preferred_username = decoded_data.get("preferred_username")
            except jwt.DecodeError:
                print("Error decoding JWT token")
        except jwt.DecodeError:
            print("Error preparing message")

        event_name = "REQUEST_CREATE_MEDIA"
        event_type = 177
        event_timestamp = int(datetime.now().timestamp() * 1000)
        event_owner = InteractionParticipant(agent=Agent(userId=preferred_username))
        message_owner = InteractionParticipant(systemParticipant=SystemParticipant(instanceId="Python"))
        user_data = {
            "transcript": transcript,
            "summary": summary,
            "roomId": ctx.room.name,
            "bucket": os.getenv("S3_BUCKET"),
            "region": os.getenv("S3_REGION"),
            "access_key": os.getenv("S3_ACCESS_KEY"),
            "secret": os.getenv("S3_SECRET"),
        }

        interaction_event = InteractionEvent(
            eventName=event_name,
            eventType=event_type,
            eventTimestamp=event_timestamp,
            eventOwner=event_owner,
            userData=user_data
        )

        interaction_event_dict = interaction_event.to_dict()
        message_owner_dict = message_owner.to_dict()

        message = json.dumps(
            {"interactionEvent": interaction_event_dict, "messageOwner": message_owner_dict}, default=custom_serializer
        ).encode('utf8'),

        publish_message(message[0])


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, worker_type=WorkerType.ROOM))
