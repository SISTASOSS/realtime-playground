"use client";

import { useState } from "react";
import { InstructionsEditor } from "@/components/instructions-editor";
import { usePlaygroundState } from "@/hooks/use-playground-state";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CircleHelp } from "lucide-react";

export interface InstructionsProps {
  isSummary?: boolean;
}

export function Instructions({isSummary}:InstructionsProps) {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { pgState } = usePlaygroundState();

  return (
    <div
      className={`flex flex-1 flex-col w-full gap-[4px] border p-4 rounded-lg ${
        isFocused ? "ring-1" : "ring-0"
      } h-[200px] overflow-y-auto`}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <div className="text-xs font-semibold uppercase mr-1 tracking-widest">
            {!isSummary ?"INSTRUCTIONS | TALIMATLAR": "SUMMARY INSTRUCTIONS | ÖZET TALIMATLARI"}
          </div>
          <HoverCard open={isOpen}>
            <HoverCardTrigger asChild>
              <CircleHelp
                className="h-4 w-4 text-gray-500 cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
              />
            </HoverCardTrigger>
            <HoverCardContent
              className="w-[260px] text-sm"
              side="bottom"
              onInteractOutside={() => setIsOpen(false)}
            >
              {!isSummary ? "Instructions are a system message that is prepended to the conversation whenever the model responds. Updates will be reflected on the next conversation turn.\n| Talimatlar, model her yanıt verdiğinde görüşmeye yön gösteren bir sistem mesajıdır." : "Instructions are a system message used to summarize the transcipt. \n | Özet çıkarmak için talimatlar"}
            </HoverCardContent>
          </HoverCard>
        </div>
      </div>
      <InstructionsEditor
        instructions={isSummary ? pgState.instructionsSummary : pgState.instructions}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </div>
  );
}
