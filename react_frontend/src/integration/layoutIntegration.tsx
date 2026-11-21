import React, { createContext, useContext, useState } from 'react';

interface LayoutContextType {
  embedded: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType>({
  embedded: false,
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  setSidebarCollapsed: () => {},
});

export interface LayoutProviderProps {
  children: React.ReactNode;
  embedded?: boolean;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({
  children,
  embedded = false,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  return (
    <LayoutContext.Provider
      value={{
        embedded,
        sidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayoutIntegration = () => useContext(LayoutContext);
