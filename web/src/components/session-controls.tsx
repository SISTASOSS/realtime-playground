"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Mic, MicOff } from "lucide-react";
import { useEffect, useState } from "react";

import {
  TrackToggle,
  useLocalParticipant,
  useMediaDeviceSelect,
  useVoiceAssistant,
} from "@livekit/components-react";
import { useKrispNoiseFilter } from "@livekit/components-react/krisp";
import { Track } from "livekit-client";

import { useConnection } from "@/hooks/use-connection";
import { useMultibandTrackVolume } from "@/hooks/use-multiband-track-volume";
import { MultibandAudioVisualizer } from "./agent/visualizers/multiband-bar-visualizer";
import { usePlaygroundState } from "@/hooks/use-playground-state";

export function SessionControls() {
  const { localParticipant } = useLocalParticipant();

  const { pgState } = usePlaygroundState();
  const { agent } = useVoiceAssistant();
  const deviceSelect = useMediaDeviceSelect({ kind: "audioinput" });
  const { disconnect } = useConnection();

  const localMultibandVolume = useMultibandTrackVolume(
    localParticipant.getTrackPublication(Track.Source.Microphone)?.track,
    9,
  );
  const [isMuted, setIsMuted] = useState(localParticipant.isMicrophoneEnabled);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const { isNoiseFilterEnabled, isNoiseFilterPending, setNoiseFilterEnabled } =
    useKrispNoiseFilter();
  useEffect(() => {
    setIsMuted(localParticipant.isMicrophoneEnabled === false);
  }, [localParticipant.isMicrophoneEnabled]);

  const disconnectSession = async () => {
    const summaryInstruction = pgState.instructionsSummary;
    setIsButtonDisabled(true);
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


    disconnect();
  };

  return (
    <div className="flex flex-row gap-2">
      <div className="flex items-center rounded-md bg-neutral-100 text-secondary-foreground">
        <div className="flex gap-1 pr-4">
          <TrackToggle
            source={Track.Source.Microphone}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-l-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-neutral-300 bg-neutral-100 text-neutral-900 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-800/80 h-9 py-2 px-3 shadow-none${
              isMuted ? " opacity-50" : ""
            }`}
            showIcon={false}
          >
            {isMuted ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </TrackToggle>
          <MultibandAudioVisualizer
            state="speaking"
            barWidth={2}
            minBarHeight={2}
            maxBarHeight={16}
            frequencies={localMultibandVolume}
            borderRadius={5}
            gap={2}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              className="px-2.5 shadow-none hover:bg-neutral-200/80 rounded-l-none border-l-[1px] border-neutral-200 text-sm font-semibold"
            >
              <ChevronDown className="h-4 w-4 text-secondary-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            alignOffset={-5}
            className="w-[320px]"
            forceMount
          >
            <DropdownMenuLabel className="text-xs uppercase tracking-widest">
              Available inputs | Kullanılabilir Girişler
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {deviceSelect.devices.map((device, index) => (
              <DropdownMenuCheckboxItem
                key={`device-${index}`}
                className="text-xs"
                checked={device.deviceId === deviceSelect.activeDeviceId}
                onCheckedChange={() =>
                  deviceSelect.setActiveMediaDevice(device.deviceId)
                }
              >
                {device.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs uppercase tracking-widest">
              Audio Settings | Ses Ayarları
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              className="text-xs"
              checked={isNoiseFilterEnabled}
              onCheckedChange={async (checked) => {
                setNoiseFilterEnabled(checked);
              }}
              disabled={isNoiseFilterPending}
            >
              Enhanced Noise Filter
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Button variant="destructive"
              onClick={disconnectSession}
              disabled={isButtonDisabled}
              className={isButtonDisabled ? "bg-gray-400 cursor-not-allowed" : ""}>
        Disconnect | Bağlantıyı Kes
      </Button>
    </div>
  );
}
