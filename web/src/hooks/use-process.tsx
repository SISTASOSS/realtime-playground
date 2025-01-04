"use client";

import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface ProcessContextType {
  evaUrl: string;
  setEvaUrl: (value: string) => void;
  jwtToken: string;
  setJwtToken: (value: string) => void;
  processes: any;
  setProcesses: (value: any) => void;
}

const ProcessContext = createContext<ProcessContextType>({
  evaUrl: "",
  setEvaUrl: () => {},
  jwtToken: "",
  setJwtToken: () => {},
  processes: null,
  setProcesses: () => {},
});

export const ProcessProvider = ({ children }: { children: ReactNode }) => {
  const [evaUrl, setEvaUrl] = useState("");
  const [jwtToken, setJwtToken] = useState("");
  const [processes, setProcesses] = useState(null);

  useEffect(() => {
    const handleProcess = async () => {
      if (!evaUrl) {
        console.log("Eva url not ready yet!");
        return;
      }

      if (!jwtToken) {
        console.log("Jwt token not ready yet!");
        return;
      }

      try {
        const response = await fetch(
          evaUrl + "/services/evacore/api/process-templates/find-by-status-published",
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
  }, [evaUrl, jwtToken]);

  return (
    <ProcessContext.Provider value={{ evaUrl, setEvaUrl, jwtToken, setJwtToken, processes, setProcesses }}>
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
