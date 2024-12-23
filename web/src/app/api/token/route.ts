import { AccessToken } from "livekit-server-sdk";
import { PlaygroundState } from "@/data/playground-state";

export async function POST(request: Request) {
  let playgroundState: PlaygroundState;

  try {
    playgroundState = await request.json();
  } catch (error) {
    return Response.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  const {
    instructions,
    openaiAPIKey,
    sessionConfig: {
      turnDetection,
      modalities,
      voice,
      temperature,
      maxOutputTokens,
      vadThreshold,
      vadSilenceDurationMs,
      vadPrefixPaddingMs,
    },
    jwtToken
  } = playgroundState;

  if (!openaiAPIKey) {
    return Response.json(
      { error: "Key is required | Anahtar zorunludur" },
      { status: 400 },
    );
  }

  const roomName = Math.random().toString(36).slice(7);
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set");
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: "human",
    metadata: JSON.stringify({
      instructions: instructions,
      modalities: modalities,
      voice: voice,
      temperature: temperature,
      max_output_tokens: maxOutputTokens,
      openai_api_key: openaiAPIKey,
      turn_detection: JSON.stringify({
        type: turnDetection,
        threshold: vadThreshold,
        silence_duration_ms: vadSilenceDurationMs,
        prefix_padding_ms: vadPrefixPaddingMs,
      }),
      jwtToken: jwtToken
    }),
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  });
  return Response.json({
    accessToken: await at.toJwt(),
    url: process.env.LIVEKIT_URL,
  });
}
