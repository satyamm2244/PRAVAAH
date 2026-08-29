"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";


type MobileSidebarContextType = {
  mobileSidebarOpen:
    boolean;

  openMobileSidebar:
    () => void;

  closeMobileSidebar:
    () => void;

  toggleMobileSidebar:
    () => void;
};


const MobileSidebarContext =
  createContext<MobileSidebarContextType | null>(
    null
  );


/* ========================================================================= */
/* PROVIDER                                                                  */
/* ========================================================================= */

export function MobileSidebarProvider({
  children,
}: {
  children:
    React.ReactNode;
}) {

  const [
    mobileSidebarOpen,
    setMobileSidebarOpen,
  ] =
    useState(
      false
    );


  /* ========================================================================= */
  /* OPEN                                                                      */
  /* ========================================================================= */

  const openMobileSidebar =
    useCallback(
      () => {

        setMobileSidebarOpen(
          true
        );

      },
      []
    );


  /* ========================================================================= */
  /* CLOSE                                                                     */
  /* ========================================================================= */

  const closeMobileSidebar =
    useCallback(
      () => {

        setMobileSidebarOpen(
          false
        );

      },
      []
    );


  /* ========================================================================= */
  /* TOGGLE                                                                    */
  /* ========================================================================= */

  const toggleMobileSidebar =
    useCallback(
      () => {

        setMobileSidebarOpen(
          (
            current
          ) =>
            !current
        );

      },
      []
    );


  /* ========================================================================= */
  /* PREVENT BACKGROUND SCROLL                                                 */
  /* ========================================================================= */

  useEffect(
    () => {

      if (
        mobileSidebarOpen
      ) {

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

    },
    [
      mobileSidebarOpen,
    ]
  );


  /* ========================================================================= */
  /* CONTEXT VALUE                                                             */
  /* ========================================================================= */

  const value =
    useMemo(
      () => ({
        mobileSidebarOpen,
        openMobileSidebar,
        closeMobileSidebar,
        toggleMobileSidebar,
      }),
      [
        mobileSidebarOpen,
        openMobileSidebar,
        closeMobileSidebar,
        toggleMobileSidebar,
      ]
    );


  /* ========================================================================= */
  /* UI                                                                        */
  /* ========================================================================= */

  return (

    <MobileSidebarContext.Provider
      value={
        value
      }
    >

      {
        children
      }

    </MobileSidebarContext.Provider>

  );

}


/* ========================================================================= */
/* HOOK                                                                      */
/* ========================================================================= */

export function useMobileSidebar() {

  const context =
    useContext(
      MobileSidebarContext
    );


  if (
    !context
  ) {

    throw new Error(
      "useMobileSidebar must be used inside MobileSidebarProvider."
    );

  }


  return context;

}