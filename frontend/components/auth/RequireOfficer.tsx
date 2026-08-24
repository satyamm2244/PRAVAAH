"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  ShieldAlert,
} from "lucide-react";

import {
  getCurrentUser,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth";

type RequireOfficerProps = {
  children: React.ReactNode;
};

export default function RequireOfficer({
  children,
}: RequireOfficerProps) {
  const router =
    useRouter();

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
    checking,
    setChecking,
  ] =
    useState(true);

  useEffect(
    () => {
      let cancelled =
        false;

      async function checkAccess() {
        try {
          const storedUser =
            getStoredUser();

          if (!storedUser) {
            router.replace(
              `/officer-login?next=${encodeURIComponent(
                pathname
              )}`
            );

            return;
          }

          if (
            storedUser.role !==
            "OFFICER"
          ) {
            router.replace(
              "/"
            );

            return;
          }

          const currentUser =
            await getCurrentUser();

          if (
            currentUser.role !==
            "OFFICER"
          ) {
            router.replace(
              "/"
            );

            return;
          }

          if (!cancelled) {
            setUser(
              currentUser
            );
          }
        } catch {
          router.replace(
            "/officer-login"
          );
        } finally {
          if (!cancelled) {
            setChecking(
              false
            );
          }
        }
      }

      checkAccess();

      return () => {
        cancelled =
          true;
      };
    },
    [
      pathname,
      router,
    ]
  );

  if (
    checking ||
    !user
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">
        <div className="text-center">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
            <ShieldAlert className="h-6 w-6 text-blue-400" />
          </div>

          <p className="mt-4 text-sm font-medium text-slate-300">
            Verifying officer access...
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Checking authentication and role permissions.
          </p>

        </div>
      </main>
    );
  }

  return (
    <>
      {children}
    </>
  );
}