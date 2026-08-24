"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
} from "next/navigation";

import EmergencyAssistant from "@/components/assistant/EmergencyAssistant";

import {
  getStoredUser,
  type AuthUser,
} from "@/lib/auth";


export default function AssistantGate() {
  const pathname =
    usePathname();

  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
      null
    );

  const [
    ready,
    setReady,
  ] =
    useState(
      false
    );


  useEffect(
    () => {

      try {

        const storedUser =
          getStoredUser();


        setUser(
          storedUser
        );

      } catch (
        error
      ) {

        console.error(
          "Unable to read logged-in user:",
          error
        );


        setUser(
          null
        );

      } finally {

        setReady(
          true
        );

      }

    },
    [
      pathname,
    ]
  );


  /*
   * Prevent the assistant from briefly
   * appearing before auth state is loaded.
   */
  if (
    !ready
  ) {
    return null;
  }


  /*
   * Hide on authentication pages.
   */
  if (
    pathname ===
      "/login" ||
    pathname.startsWith(
      "/login/"
    ) ||
    pathname ===
      "/register" ||
    pathname.startsWith(
      "/register/"
    ) ||
    pathname ===
      "/officer-login" ||
    pathname.startsWith(
      "/officer-login/"
    )
  ) {
    return null;
  }


  /*
   * PRAVAAH Assistant is for
   * normal citizens only.
   */
  if (
    user?.role !==
    "USER"
  ) {
    return null;
  }


  return (
    <EmergencyAssistant />
  );
}