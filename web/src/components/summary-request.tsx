import { usePlaygroundState } from "@/hooks/use-playground-state";
import { Button } from "@/components/ui/button";
import { useLocalParticipant, useVoiceAssistant } from "@livekit/components-react";

export function SummaryRequest() {
  const { pgState } = usePlaygroundState();
  const { localParticipant } = useLocalParticipant();
  const { agent } = useVoiceAssistant();

  const handleGetSummary = async () => {
    const summaryInstruction = pgState.instructionsSummary;
    const transcriptions = pgState.displayTranscriptions; // Assuming transcription is part of pgState

    if (!localParticipant || !localParticipant.identity) {
      return;
    }

    if (!agent?.identity) {
      return;
    }

    try {
        const transcriptionsArray: { key: string, value: { firstReceivedTime: number, text: string } }[] = [];

        pgState.displayTranscriptions?.forEach(({ participant, segment }) => {
          if (participant && segment && segment.text.trim() !== "") {
            transcriptionsArray.push({
              key: participant.isAgent ? "Bot" : "Human",
              value: {
                firstReceivedTime: segment.firstReceivedTime ?? 0,
                text: segment.text,
              },
            });
          }
        });
      let responseObj = await localParticipant.performRpc({
        destinationIdentity: agent.identity,
        method: "pg.getSummary",
        payload: JSON.stringify({
          summaryInstruction,
          transcriptionsArray,
        }),
      });
      pgState.summary = responseObj;
    } catch (error) {
      console.error("Error performing RPC:", error);
    }
  };

  return (
    <Button onClick={handleGetSummary} className="mt-2">
      Get Summary
    </Button>
  );
}