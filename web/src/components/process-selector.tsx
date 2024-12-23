"use client";

import { useProcessContext } from "@/hooks/use-process";
import { usePlaygroundState } from "@/hooks/use-playground-state";
import { useState } from "react";

export function ProcessSelector() {
  const { processes, jwtToken } = useProcessContext();
  const { dispatch } = usePlaygroundState();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleClick = (config: any, index: number) => {
    console.log("Selected config:", config);

    const processConfig = JSON.parse(config);
    const { instruction, summaryInstruction } = processConfig.aiTalkConfig;
    console.log("Instruction:", instruction);
    console.log("Summary Instruction:", summaryInstruction);

    dispatch({ type: "SET_INSTRUCTIONS", payload: instruction });
    dispatch({ type: "SET_INSTRUCTIONS_SUMMARY", payload: summaryInstruction });
    dispatch({ type: "SET_JWT_TOKEN", payload: jwtToken });
    setSelectedIndex(index);
  };

  const clearSelection = () => {
    dispatch({ type: "SET_INSTRUCTIONS", payload: "" });
    dispatch({ type: "SET_INSTRUCTIONS_SUMMARY", payload: "" });
    dispatch({ type: "SET_JWT_TOKEN", payload: "" });
    setSelectedIndex(null);
  };

  if (!processes || !Array.isArray(processes)) {
    return <div>No data available yet.</div>;
  }

  return (
    <>
      <div
        className="flex items-center text-xs font-semibold uppercase tracking-widest sticky top-0 left-0 bg-white w-full p-4">
        PROCESSES | SÜREÇLER
      </div>
      <div
        className={`flex flex-1 flex-col w-full gap-[4px] p-4 rounded-lg "ring-0" h-[200px] overflow-y-auto`}
      >
        <ul style={{ listStyle: "none", padding: 0 }}>
          {processes.map((item, index) => (
            <li key={index} style={{ marginBottom: "8px" }}>
              <button
                className={"font-semibold text-xs tracking-widest uppercase"}
                onClick={() => handleClick(item.config, index)}
                disabled={selectedIndex === index}
                style={{
                  cursor: selectedIndex === index ? "not-allowed" : "pointer",
                  backgroundColor: selectedIndex === index ? "#d1e7dd" : "white",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  fontWeight: selectedIndex === index ? "bold" : "normal",
                  width: "100%",
                  textAlign: "left",
                }}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
        <button
          className={"font-semibold text-xs tracking-widest uppercase"}
          onClick={clearSelection}
          style={{
            marginTop: "16px",
            cursor: "pointer",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c2c7",
            borderRadius: "4px",
            padding: "8px 16px",
            color: "#842029",
            fontWeight: "bold",
          }}
        >
          Clear Selection
        </button>
      </div>
    </>
  );
}
