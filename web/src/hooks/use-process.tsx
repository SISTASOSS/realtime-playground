"use client";

import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface ProcessContextType {
  jwtToken: string;
  setJwtToken: (value: string) => void;
  processes: any;
  setProcesses: (value: any) => void;
}

const ProcessContext = createContext<ProcessContextType>({
  jwtToken: "",
  setJwtToken: () => {},
  processes: null,
  setProcesses: () => {},
});

export const ProcessProvider = ({ children }: { children: ReactNode }) => {
  const [jwtToken, setJwtToken] = useState("");
  const [processes, setProcesses] = useState(null);

  const evaApi = process.env.NEXT_PUBLIC_EVA_API;
  if (!evaApi) {
    throw new Error("NEXT_PUBLIC_EVA_API must be set");
  }

  useEffect(() => {
    const handleProcess = async () => {
      if (!jwtToken) {
        console.log("Jwt token not ready yet!");
        return;
      }

      try {
        const response = await fetch(
          evaApi + "/services/evacore/api/process-templates/find-by-status-published",
          {
            method: "GET",
            headers: {
              Authorization: "Bearer " + jwtToken,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch token");
        }

        const data = await response.json();
        setProcesses(data);
        console.log(data);
      } catch (error) {
        console.error("Error:", error);
      }
    };

    handleProcess();
  }, [jwtToken]);

  return (
    <ProcessContext.Provider value={{ jwtToken, setJwtToken, processes, setProcesses }}>
      {children}
    </ProcessContext.Provider>
  );
};

export const useProcessContext = () => {
  const context = useContext(ProcessContext);

  if (context === undefined) {
    throw new Error("useProcessContext must be used within a ProcessProvider");
  }

  return context;
};
