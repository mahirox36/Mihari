import { createContext, useContext, useState, ReactNode } from "react";

interface SettingsContextType {
  performanceMode: boolean;
  togglePerformanceMode: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [performanceMode, setPerformanceMode] = useState(false);

  const togglePerformanceMode = () => setPerformanceMode((prev) => !prev);

  return (
    <SettingsContext.Provider
      value={{ performanceMode, togglePerformanceMode }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context)
    throw new Error("useSettings must be used within SettingsProvider");
  return context;
};
