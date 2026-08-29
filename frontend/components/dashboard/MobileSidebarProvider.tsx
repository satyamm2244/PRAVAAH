"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type MobileSidebarContextType = {
  mobileSidebarOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
};

const MobileSidebarContext =
  createContext<MobileSidebarContextType | null>(
    null
  );

export function MobileSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    mobileSidebarOpen,
    setMobileSidebarOpen,
  ] = useState(false);

  function openMobileSidebar() {
    setMobileSidebarOpen(true);
  }

  function closeMobileSidebar() {
    setMobileSidebarOpen(false);
  }

  /*
   * Prevent the page behind the drawer
   * from scrolling while mobile menu is open.
   */
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow =
        "hidden";
    } else {
      document.body.style.overflow =
        "";
    }

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [mobileSidebarOpen]);

  return (
    <MobileSidebarContext.Provider
      value={{
        mobileSidebarOpen,
        openMobileSidebar,
        closeMobileSidebar,
      }}
    >
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  const context =
    useContext(
      MobileSidebarContext
    );

  if (!context) {
    throw new Error(
      "useMobileSidebar must be used inside MobileSidebarProvider."
    );
  }

  return context;
}