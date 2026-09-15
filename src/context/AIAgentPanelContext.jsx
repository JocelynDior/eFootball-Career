import { createContext, useContext, useState, useCallback } from "react";

const AIAgentPanelContext = createContext();

export function AIAgentPanelProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const openPanel = useCallback(() => { setIsOpen(true); setMinimized(false); }, []);
  const closePanel = useCallback(() => { setIsOpen(false); setMinimized(false); }, []);
  const minimizePanel = useCallback(() => { setMinimized(true); }, []);

  return (
    <AIAgentPanelContext.Provider value={{ isOpen, minimized, openPanel, closePanel, minimizePanel }}>
      {children}
    </AIAgentPanelContext.Provider>
  );
}

export function useAIAgentPanel() {
  return useContext(AIAgentPanelContext);
}
