"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  getCurrentUser,
  getStoredUser,
  isAuthenticated,
} from "@/lib/auth";

import {
  RefreshCw,
} from "lucide-react";


type OfficerRouteGuardProps = {
  children: ReactNode;
};


export default function OfficerRouteGuard({
  children,
}: OfficerRouteGuardProps) {

  const router =
    useRouter();

  const pathname =
    usePathname();

  const [
    checking,
    setChecking,
  ] =
    useState(
      true
    );


  useEffect(
    () => {

      let cancelled =
        false;


      async function verifyOfficer() {

        try {

          if (
            !isAuthenticated()
          ) {

            router.replace(
              "/officer-login"
            );

            return;
          }


          /*
           * Fast local check first.
           */

          const storedUser =
            getStoredUser();


          if (
            storedUser?.role !==
            "OFFICER"
          ) {

            router.replace(
              "/officer-login"
            );

            return;
          }


          /*
           * Then confirm against backend.
           *
           * This prevents stale or manually
           * edited localStorage from granting
           * officer access.
           */

          const user =
            await getCurrentUser();


          if (
            cancelled
          ) {
            return;
          }


          if (
            user.role !==
            "OFFICER"
          ) {

            router.replace(
              "/officer-login"
            );

            return;
          }


          setChecking(
            false
          );

        } catch (
          error
        ) {

          console.error(
            "Officer access verification failed:",
            error
          );


          if (
            !cancelled
          ) {

            router.replace(
              "/officer-login"
            );

          }

        }

      }


      verifyOfficer();


      return () => {

        cancelled =
          true;

      };

    },
    [
      router,
      pathname,
    ]
  );


  if (
    checking
  ) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">

        <div className="text-center">

          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-400" />


          <p className="mt-3 text-sm text-slate-400">
            Verifying officer access...
          </p>

        </div>

      </div>

    );

  }


  return (
    <>
      {
        children
      }
    </>
  );
}