"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Image from "next/image";

import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  CircleAlert,
  FileText,
  Info,
  Menu,
  PhoneCall,
  ShieldAlert,
  X,
} from "lucide-react";

import {
  authFetch,
  getStoredUser,
  getToken,
  logout,
  type AuthUser,
} from "@/lib/auth";

import {
  useMobileSidebar,
} from "@/components/dashboard/MobileSidebarProvider";


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


const NOTIFICATION_REFRESH_INTERVAL =
  30000;


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type NotificationType =
  | "REPORT"
  | "ALERT"
  | "RISK"
  | "SENSOR"
  | "SYSTEM";


type NotificationSeverity =
  | "INFO"
  | "LOW"
  | "MEDIUM"
  | "WATCH"
  | "HIGH"
  | "CRITICAL"
  | "SUCCESS";


type NotificationItem = {
  id: string;

  recipientRole:
    | "USER"
    | "OFFICER"
    | "ALL";

  recipientUserId:
    string | null;

  type:
    NotificationType;

  severity:
    NotificationSeverity;

  title:
    string;

  message:
    string;

  ward:
    string | null;

  actionType:
    string | null;

  actionTarget:
    string | null;

  isRead:
    boolean;

  createdAt:
    number;

  readAt:
    number | null;
};


/* ========================================================================= */
/* HEADER                                                                    */
/* ========================================================================= */

export default function Header() {

  const {
    openMobileSidebar,
  } =
    useMobileSidebar();


  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
      null
    );


  const [
    notifications,
    setNotifications,
  ] =
    useState<NotificationItem[]>(
      []
    );


  const [
    unreadCount,
    setUnreadCount,
  ] =
    useState(
      0
    );


  const [
    notificationOpen,
    setNotificationOpen,
  ] =
    useState(
      false
    );


  const [
    notificationLoading,
    setNotificationLoading,
  ] =
    useState(
      false
    );


  const [
    notificationError,
    setNotificationError,
  ] =
    useState(
      ""
    );


  const notificationRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const notificationFetchInProgress =
    useRef(
      false
    );

  const [
    sosOpen,
    setSosOpen,
  ] =
    useState(
      false
    );



  /* ========================================================================= */
  /* LOAD USER                                                                 */
  /* ========================================================================= */

  useEffect(
    () => {

      const storedUser =
        getStoredUser();


      setUser(
        storedUser
      );

    },
    []
  );


  /* ========================================================================= */
  /* FETCH NOTIFICATIONS                                                       */
  /* ========================================================================= */

  const fetchNotifications =
    useCallback(
      async (
        silent = false
      ) => {

        if (
          notificationFetchInProgress.current
        ) {

          return;
        }


        if (
          typeof document !==
            "undefined" &&
          document.visibilityState ===
            "hidden" &&
          silent
        ) {

          return;
        }


        const token =
          getToken();


        if (
          !token
        ) {

          setNotifications(
            []
          );

          setUnreadCount(
            0
          );

          setNotificationError(
            ""
          );

          return;
        }


        notificationFetchInProgress.current =
          true;


        const controller =
          new AbortController();


        const timeout =
          window.setTimeout(
            () => {

              controller.abort();

            },
            12000
          );


        try {

          if (
            !silent
          ) {

            setNotificationLoading(
              true
            );

          }


          setNotificationError(
            ""
          );


          const [
            notificationResponse,
            countResponse,
          ] =
            await Promise.all(
              [

                authFetch(
                  `${API_BASE_URL}/api/notifications`,
                  {
                    cache:
                      "no-store",

                    signal:
                      controller.signal,
                  }
                ),

                authFetch(
                  `${API_BASE_URL}/api/notifications/unread-count`,
                  {
                    cache:
                      "no-store",

                    signal:
                      controller.signal,
                  }
                ),

              ]
            );


          if (
            notificationResponse.status ===
              401 ||
            notificationResponse.status ===
              403 ||
            countResponse.status ===
              401 ||
            countResponse.status ===
              403
          ) {

            logout();

            setUser(
              null
            );

            setNotifications(
              []
            );

            setUnreadCount(
              0
            );

            setNotificationError(
              ""
            );

            return;
          }


          if (
            !notificationResponse.ok
          ) {

            console.warn(
              "Notification API returned:",
              notificationResponse.status
            );

            return;
          }


          if (
            !countResponse.ok
          ) {

            console.warn(
              "Unread count API returned:",
              countResponse.status
            );

            return;
          }


          const notificationData:
            NotificationItem[] =
            await notificationResponse.json();


          const countData:
            {
              count:
                number;
            } =
            await countResponse.json();


          setNotifications(
            notificationData
          );


          setUnreadCount(
            countData.count ??
            0
          );


        } catch (
          error
        ) {

          if (
            error instanceof DOMException &&
            error.name ===
              "AbortError"
          ) {

            console.warn(
              "Notification request timed out."
            );

          } else {

            console.warn(
              "Notification service temporarily unavailable:",
              error
            );

          }


          if (
            !silent
          ) {

            setNotificationError(
              "Unable to load notifications."
            );

          }


        } finally {

          window.clearTimeout(
            timeout
          );


          notificationFetchInProgress.current =
            false;


          if (
            !silent
          ) {

            setNotificationLoading(
              false
            );

          }

        }

      },
      []
    );


  /* ========================================================================= */
  /* AUTO REFRESH                                                              */
  /* ========================================================================= */

  useEffect(
    () => {

      const token =
        getToken();


      if (
        !token
      ) {

        return;

      }


      fetchNotifications();


      const interval =
        window.setInterval(
          () => {

            if (
              !getToken()
            ) {

              window.clearInterval(
                interval
              );

              return;
            }


            if (
              document.visibilityState ===
                "visible"
            ) {

              fetchNotifications(
                true
              );

            }

          },
          NOTIFICATION_REFRESH_INTERVAL
        );


      function handleVisibilityChange() {

        if (
          document.visibilityState ===
            "visible" &&
          getToken()
        ) {

          fetchNotifications(
            true
          );

        }

      }


      document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
      );


      return () => {

        window.clearInterval(
          interval
        );


        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );

      };

    },
    [
      fetchNotifications,
    ]
  );


  /* ========================================================================= */
  /* OUTSIDE CLICK                                                             */
  /* ========================================================================= */

  useEffect(
    () => {

      function handleOutsideClick(
        event:
          MouseEvent
      ) {

        if (
          notificationRef.current &&
          !notificationRef.current.contains(
            event.target as Node
          )
        ) {

          setNotificationOpen(
            false
          );

        }

      }


      document.addEventListener(
        "mousedown",
        handleOutsideClick
      );


      return () => {

        document.removeEventListener(
          "mousedown",
          handleOutsideClick
        );

      };

    },
    []
  );


  /* ========================================================================= */
  /* MARK ONE READ                                                             */
  /* ========================================================================= */

  async function markNotificationRead(
    notification:
      NotificationItem
  ) {

    if (
      notification.isRead
    ) {

      handleNotificationAction(
        notification
      );

      return;
    }


    try {

      const response =
        await authFetch(
          `${API_BASE_URL}/api/notifications/${notification.id}/read`,
          {
            method:
              "PATCH",
          }
        );


      if (
        response.status ===
          401 ||
        response.status ===
          403
      ) {

        logout();

        setUser(
          null
        );

        setNotifications(
          []
        );

        setUnreadCount(
          0
        );

        return;
      }


      if (
        !response.ok
      ) {

        console.warn(
          "Unable to mark notification as read:",
          response.status
        );

        return;
      }


      setNotifications(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              notification.id
                ? {
                    ...item,

                    isRead:
                      true,

                    readAt:
                      Date.now(),
                  }
                : item
          )
      );


      setUnreadCount(
        (
          current
        ) =>
          Math.max(
            0,
            current -
            1
          )
      );


      handleNotificationAction(
        notification
      );


    } catch (
      error
    ) {

      console.warn(
        "Unable to mark notification read:",
        error
      );

    }

  }


  /* ========================================================================= */
  /* MARK ALL READ                                                             */
  /* ========================================================================= */

  async function markAllNotificationsRead() {

    if (
      unreadCount ===
      0
    ) {

      return;

    }


    try {

      const response =
        await authFetch(
          `${API_BASE_URL}/api/notifications/read-all`,
          {
            method:
              "PATCH",
          }
        );


      if (
        response.status ===
          401 ||
        response.status ===
          403
      ) {

        logout();

        setUser(
          null
        );

        setNotifications(
          []
        );

        setUnreadCount(
          0
        );

        return;
      }


      if (
        !response.ok
      ) {

        console.warn(
          "Unable to mark notifications read:",
          response.status
        );

        return;
      }


      const now =
        Date.now();


      setNotifications(
        (
          current
        ) =>
          current.map(
            (
              notification
            ) => ({
              ...notification,

              isRead:
                true,

              readAt:
                notification.readAt ??
                now,
            })
          )
      );


      setUnreadCount(
        0
      );


    } catch (
      error
    ) {

      console.warn(
        "Unable to mark all notifications read:",
        error
      );

    }

  }


  /* ========================================================================= */
  /* NOTIFICATION ACTION                                                       */
  /* ========================================================================= */

  function handleNotificationAction(
    notification:
      NotificationItem
  ) {

    setNotificationOpen(
      false
    );


    /* ----------------------------------------------------------------------- */
    /* VIEW REPORT                                                             */
    /* ----------------------------------------------------------------------- */

    if (
      notification.actionType ===
        "VIEW_REPORT" &&
      notification.actionTarget
    ) {

      if (
        user?.role ===
        "OFFICER"
      ) {

        window.location.href =
          `/reports?report=${encodeURIComponent(
            notification.actionTarget
          )}`;

      } else {

        window.location.href =
          `/my-reports/${encodeURIComponent(
            notification.actionTarget
          )}`;

      }


      return;
    }


    /* ----------------------------------------------------------------------- */
    /* VIEW ALERT                                                              */
    /* ----------------------------------------------------------------------- */

    if (
      notification.actionType ===
      "VIEW_ALERT"
    ) {

      window.location.href =
        user?.role ===
        "OFFICER"
          ? "/alerts"
          : "/citizen-alerts";


      return;
    }


    /* ----------------------------------------------------------------------- */
    /* VIEW WARD                                                               */
    /* ----------------------------------------------------------------------- */

    if (
      notification.actionType ===
        "VIEW_WARD" &&
      notification.actionTarget
    ) {

      window.location.href =
        `/risk-map?ward=${encodeURIComponent(
          notification.actionTarget
        )}`;

    }

  }


  /* ========================================================================= */
  /* USER INFORMATION                                                          */
  /* ========================================================================= */

  const initials =
    getInitials(
      user?.name ??
      "PRAVAAH User"
    );


  const roleLabel =
    user?.role ===
    "OFFICER"
      ? "Disaster Management"
      : user?.role ===
          "USER"
        ? "Citizen User"
        : "Public Access";


  /* ========================================================================= */
  /* UI                                                                        */
  /* ========================================================================= */

  return (

    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07111f]/95 backdrop-blur-xl">

      <div className="mx-auto flex h-20 max-w-[1700px] items-center justify-between px-3 sm:px-5 lg:px-8">


        {/* ================================================================= */}
        {/* LEFT SIDE                                                        */}
        {/* ================================================================= */}

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">


          {/* MOBILE MENU */}

          <button
            type="button"
            onClick={
              openMobileSidebar
            }
            aria-label="Open navigation menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-blue-400/20 hover:bg-blue-500/10 hover:text-blue-300 lg:hidden"
          >

            <Menu className="h-5 w-5" />

          </button>


          {/* LOGO */}

          <div className="relative hidden h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-blue-400/20 bg-[#081423] p-1 shadow-[0_0_25px_rgba(59,130,246,0.15)] sm:block">

            <Image
              src="/pravaah-icon.png"
              alt="PRAVAAH"
              fill
              priority
              sizes="48px"
              className="object-contain p-1"
            />

          </div>


          <div className="min-w-0">

            <div className="flex items-center gap-2">

              <h1 className="truncate text-base font-black tracking-[0.06em] text-white sm:text-xl sm:tracking-[0.08em]">

                PRAVAAH

              </h1>


              <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 md:flex">

                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />


                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">

                  Live

                </span>

              </div>

            </div>


            <p className="mt-0.5 hidden truncate text-[11px] text-slate-500 sm:block">

              Disaster Intelligence Platform

            </p>

          </div>

        </div>


        {/* ================================================================= */}
        {/* RIGHT SIDE                                                       */}
        {/* ================================================================= */}

        <div className="flex shrink-0 items-center gap-2 sm:gap-5 lg:gap-7">


          {/* SYSTEM STATUS */}

          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2 lg:flex">

            <span className="relative flex h-2 w-2">

              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />

              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />

            </span>


            <span className="text-xs font-medium text-emerald-300">

              System Operational

            </span>

          </div>


          {/* ================================================================= */}
          {/* SOS EMERGENCY ACCESS                                               */}
          {/* ================================================================= */}

          <button
            type="button"
            onClick={() => setSosOpen(true)}
            aria-label="Open emergency SOS contacts"
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 text-red-300 transition hover:border-red-400/50 hover:bg-red-500/20 hover:text-red-200"
          >
            <PhoneCall className="h-4 w-4" />
            <span className="hidden text-xs font-black tracking-wider sm:inline">
              SOS
            </span>
          </button>


          {/* ================================================================= */}
          {/* NOTIFICATIONS                                                     */}
          {/* ================================================================= */}

          <div
            ref={
              notificationRef
            }
            className="relative"
          >

            <button
              type="button"
              aria-label="Notifications"
              onClick={() => {

                const willOpen =
                  !notificationOpen;


                setNotificationOpen(
                  willOpen
                );


                if (
                  willOpen &&
                  getToken()
                ) {

                  fetchNotifications();

                }

              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-slate-400 transition duration-200 hover:border-blue-400/20 hover:bg-blue-500/10 hover:text-blue-300"
            >

              <Bell className="h-4 w-4" />


              {unreadCount > 0 && (

                <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#07111f]">

                  {
                    unreadCount >
                    99
                      ? "99+"
                      : unreadCount
                  }

                </span>

              )}

            </button>


            {notificationOpen && (

              <div className="fixed left-3 right-3 top-[88px] overflow-hidden rounded-2xl border border-white/10 bg-[#081423] shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[400px]">


                <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">

                  <div>

                    <div className="flex items-center gap-2">

                      <p className="font-semibold text-white">

                        Notifications

                      </p>


                      {unreadCount > 0 && (

                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-bold text-red-400">

                          {
                            unreadCount
                          }{" "}
                          unread

                        </span>

                      )}

                    </div>


                    <p className="mt-1 text-[10px] text-slate-500">

                      PRAVAAH operational updates

                    </p>

                  </div>


                  <button
                    type="button"
                    onClick={() =>
                      setNotificationOpen(
                        false
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white"
                  >

                    <X className="h-4 w-4" />

                  </button>

                </div>


                {notifications.length > 0 && (

                  <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">

                    <p className="text-[10px] text-slate-600">

                      Latest activity

                    </p>


                    <button
                      type="button"
                      disabled={
                        unreadCount ===
                        0
                      }
                      onClick={
                        markAllNotificationsRead
                      }
                      className="flex items-center gap-1.5 text-[10px] font-medium text-blue-400 transition hover:text-blue-300 disabled:text-slate-600"
                    >

                      <CheckCheck className="h-3.5 w-3.5" />

                      Mark all read

                    </button>

                  </div>

                )}


                <div className="max-h-[60vh] overflow-y-auto sm:max-h-[480px]">


                  {!getToken() ? (

                    <div className="p-8 text-center">

                      <Bell className="mx-auto h-8 w-8 text-slate-700" />


                      <p className="mt-3 text-sm font-medium text-slate-400">

                        Login required

                      </p>


                      <p className="mt-1 text-[10px] text-slate-600">

                        Sign in to view PRAVAAH notifications.

                      </p>

                    </div>


                  ) : notificationLoading ? (

                    <div className="flex min-h-[180px] items-center justify-center">

                      <div className="text-center">

                        <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-blue-400/20 border-t-blue-400" />


                        <p className="mt-3 text-xs text-slate-500">

                          Loading notifications...

                        </p>

                      </div>

                    </div>


                  ) : notificationError ? (

                    <div className="p-6 text-center">

                      <CircleAlert className="mx-auto h-7 w-7 text-red-400" />


                      <p className="mt-3 text-xs text-red-300">

                        {
                          notificationError
                        }

                      </p>

                    </div>


                  ) : notifications.length ===
                    0 ? (

                    <div className="p-8 text-center">

                      <Bell className="mx-auto h-8 w-8 text-slate-700" />


                      <p className="mt-3 text-sm font-medium text-slate-400">

                        No notifications

                      </p>


                      <p className="mt-1 text-[10px] text-slate-600">

                        New PRAVAAH activity will appear here.

                      </p>

                    </div>


                  ) : (

                    notifications.map(
                      (
                        notification
                      ) => (

                        <NotificationRow
                          key={
                            notification.id
                          }
                          notification={
                            notification
                          }
                          onClick={() =>
                            markNotificationRead(
                              notification
                            )
                          }
                        />

                      )
                    )

                  )}

                </div>

              </div>

            )}

          </div>


          {/* ================================================================= */}
          {/* USER PROFILE                                                      */}
          {/* ================================================================= */}

          <div className="flex items-center gap-3 border-l border-white/10 pl-2 sm:pl-5">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 via-blue-500/15 to-cyan-500/10 text-xs font-bold text-blue-200 ring-1 ring-blue-400/20 sm:h-10 sm:w-10 sm:text-sm">

              {
                initials
              }

            </div>


            <div className="hidden sm:block">

              <p className="max-w-[160px] truncate text-sm font-semibold text-slate-100">

                {
                  user?.name ??
                  "PRAVAAH User"
                }

              </p>


              <div className="mt-0.5 flex items-center gap-1.5">

                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    user?.role ===
                    "OFFICER"
                      ? "bg-red-400"
                      : user?.role ===
                          "USER"
                        ? "bg-blue-400"
                        : "bg-slate-500"
                  }`}
                />


                <p className="text-[10px] uppercase tracking-wider text-slate-500">

                  {
                    roleLabel
                  }

                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

      {sosOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSosOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-500/25 bg-[#081423] shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15">
                  <PhoneCall className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-lg font-black text-white">Emergency SOS</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Tap a number to call for immediate help.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSosOpen(false)}
                aria-label="Close emergency contacts"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <EmergencyContact label="National Emergency" description="Integrated emergency response" number="112" />
              <EmergencyContact label="Police" description="Police emergency assistance" number="112" />
              <EmergencyContact label="Ambulance" description="Emergency medical assistance" number="108" />
              <EmergencyContact label="Fire & Rescue" description="Fire and rescue emergency" number="112" />
              <EmergencyContact label="Disaster Management" description="National disaster helpline" number="1078" />
            </div>

            <div className="border-t border-white/5 bg-red-500/[0.035] px-5 py-4">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-[10px] leading-5 text-slate-500">
                  Use emergency numbers only for genuine emergencies. If one service is unavailable, call 112 for integrated emergency assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </header>

  );
}


/* ========================================================================= */
/* EMERGENCY CONTACT                                                         */
/* ========================================================================= */

function EmergencyContact({
  label,
  description,
  number,
}: {
  label: string;
  description: string;
  number: string;
}) {
  return (
    <a
      href={`tel:${number}`}
      className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.025] p-4 transition hover:border-red-500/25 hover:bg-red-500/[0.06]"
    >
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-[10px] text-slate-500">{description}</p>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-red-300 transition group-hover:bg-red-500/20">
        <PhoneCall className="h-3.5 w-3.5" />
        <span className="text-sm font-black">{number}</span>
      </div>
    </a>
  );
}


/* ========================================================================= */
/* NOTIFICATION ROW                                                          */
/* ========================================================================= */

function NotificationRow({
  notification,
  onClick,
}: {
  notification:
    NotificationItem;

  onClick:
    () => void;
}) {

  const style =
    getNotificationStyle(
      notification
    );


  const Icon =
    style.icon;


  return (

    <button
      type="button"
      onClick={
        onClick
      }
      className={`group relative flex w-full gap-3 border-b border-white/5 px-4 py-4 text-left transition ${
        notification.isRead
          ? "hover:bg-white/[0.025]"
          : "bg-blue-500/[0.055] hover:bg-blue-500/[0.08]"
      }`}
    >

      {!notification.isRead && (

        <span className="absolute bottom-3 left-0 top-3 w-[2px] bg-blue-400" />

      )}


      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.box}`}
      >

        <Icon
          className={`h-5 w-5 ${style.iconClass}`}
        />

      </div>


      <div className="min-w-0 flex-1">

        <div className="flex items-start justify-between gap-3">

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2">

              <p className="truncate text-xs font-semibold text-slate-100">

                {
                  notification.title
                }

              </p>


              <span
                className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${style.badge}`}
              >

                {
                  notification.severity
                }

              </span>

            </div>


            <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-slate-500">

              {
                notification.message
              }

            </p>

          </div>


          {!notification.isRead && (

            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-400" />

          )}

        </div>


        <div className="mt-2 flex items-center justify-between">

          <div className="flex items-center gap-2">

            {notification.ward && (

              <span className="text-[9px] font-medium text-blue-400">

                {
                  notification.ward
                }

              </span>

            )}


            <span className="text-[9px] text-slate-600">

              {
                formatRelativeTime(
                  notification.createdAt
                )
              }

            </span>

          </div>


          {notification.actionType && (

            <span className="text-[9px] text-slate-600 transition group-hover:text-blue-400">

              {
                getActionLabel(
                  notification.actionType
                )
              }{" "}
              →

            </span>

          )}

        </div>

      </div>

    </button>

  );
}


/* ========================================================================= */
/* NOTIFICATION STYLE                                                        */
/* ========================================================================= */

function getNotificationStyle(
  notification:
    NotificationItem
) {

  if (
    notification.type ===
    "REPORT"
  ) {

    return {

      icon:
        FileText,

      box:
        "bg-purple-500/10",

      iconClass:
        "text-purple-400",

      badge:
        notification.severity ===
        "CRITICAL"
          ? "bg-red-500/10 text-red-400"
          : notification.severity ===
              "HIGH"
            ? "bg-orange-500/10 text-orange-400"
            : notification.severity ===
                "SUCCESS"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-purple-500/10 text-purple-400",

    };

  }


  if (
    notification.type ===
    "ALERT"
  ) {

    return {

      icon:
        ShieldAlert,

      box:
        "bg-orange-500/10",

      iconClass:
        notification.severity ===
        "CRITICAL"
          ? "text-red-400"
          : "text-orange-400",

      badge:
        notification.severity ===
        "CRITICAL"
          ? "bg-red-500/10 text-red-400"
          : "bg-orange-500/10 text-orange-400",

    };

  }


  if (
    notification.severity ===
    "SUCCESS"
  ) {

    return {

      icon:
        CheckCircle2,

      box:
        "bg-emerald-500/10",

      iconClass:
        "text-emerald-400",

      badge:
        "bg-emerald-500/10 text-emerald-400",

    };

  }


  if (
    notification.severity ===
      "HIGH" ||
    notification.severity ===
      "CRITICAL"
  ) {

    return {

      icon:
        AlertTriangle,

      box:
        "bg-red-500/10",

      iconClass:
        "text-red-400",

      badge:
        "bg-red-500/10 text-red-400",

    };

  }


  return {

    icon:
      Info,

    box:
      "bg-blue-500/10",

    iconClass:
      "text-blue-400",

    badge:
      "bg-blue-500/10 text-blue-400",

  };

}


/* ========================================================================= */
/* ACTION LABEL                                                              */
/* ========================================================================= */

function getActionLabel(
  actionType:
    string
) {

  switch (
    actionType
  ) {

    case "VIEW_REPORT":
      return "View Report";

    case "VIEW_ALERT":
      return "View Alert";

    case "VIEW_WARD":
      return "View Ward";

    default:
      return "Open";

  }

}


/* ========================================================================= */
/* TIME                                                                      */
/* ========================================================================= */

function formatRelativeTime(
  timestamp:
    number
) {

  const seconds =
    Math.floor(
      (
        Date.now() -
        timestamp
      ) /
      1000
    );


  if (
    seconds <
    10
  ) {

    return "Just now";

  }


  if (
    seconds <
    60
  ) {

    return `${seconds}s ago`;

  }


  const minutes =
    Math.floor(
      seconds /
      60
    );


  if (
    minutes <
    60
  ) {

    return `${minutes}m ago`;

  }


  const hours =
    Math.floor(
      minutes /
      60
    );


  if (
    hours <
    24
  ) {

    return `${hours}h ago`;

  }


  return `${Math.floor(
    hours /
    24
  )}d ago`;

}


/* ========================================================================= */
/* INITIALS                                                                  */
/* ========================================================================= */

function getInitials(
  name:
    string
) {

  const parts =
    name
      .trim()
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );


  if (
    parts.length ===
    0
  ) {

    return "PV";

  }


  if (
    parts.length ===
    1
  ) {

    return parts[
      0
    ]
      .slice(
        0,
        2
      )
      .toUpperCase();

  }


  return (
    parts[
      0
    ][0] +
    parts[
      parts.length -
      1
    ][0]
  ).toUpperCase();

}