"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  Bell,
  Cpu,
  Database,
  FileText,
  FlaskConical,
  Gauge,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  Radio,
  Send,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  getStoredUser,
  logout,
  type AuthUser,
} from "@/lib/auth";

import {
  useMobileSidebar,
} from "@/components/dashboard/MobileSidebarProvider";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type UserRole =
  | "PUBLIC"
  | "USER"
  | "OFFICER";


type NavItem = {
  name:
    string;

  icon:
    LucideIcon;

  href:
    string;

  roles:
    UserRole[];
};


/* ========================================================================= */
/* NAVIGATION                                                                */
/* ========================================================================= */

const navigationItems:
  NavItem[] = [

  {
    name:
      "Dashboard",

    icon:
      Gauge,

    href:
      "/",

    roles: [
      "PUBLIC",
      "USER",
      "OFFICER",
    ],
  },


  {
    name:
      "Risk Map",

    icon:
      MapPin,

    href:
      "/risk-map",

    roles: [
      "PUBLIC",
      "USER",
      "OFFICER",
    ],
  },


  {
    name:
      "Safe Places",

    icon:
      Navigation,

    href:
      "/safe-places",

    roles: [
      "PUBLIC",
      "USER",
    ],
  },


  {
    name:
      "Citizen Alerts",

    icon:
      Bell,

    href:
      "/citizen-alerts",

    roles: [
      "PUBLIC",
      "USER",
    ],
  },


  {
    name:
      "Alerts",

    icon:
      Bell,

    href:
      "/alerts",

    roles: [
      "OFFICER",
    ],
  },


  {
    name:
      "My Reports",

    icon:
      FileText,

    href:
      "/my-reports",

    roles: [
      "USER",
    ],
  },


  {
    name:
      "Report Incident",

    icon:
      Send,

    href:
      "/report-incident",

    roles: [
      "USER",
      "OFFICER",
    ],
  },


  {
    name:
      "Evidence",

    icon:
      Database,

    href:
      "/evidence",

    roles: [
      "OFFICER",
    ],
  },


  {
    name:
      "Reports",

    icon:
      FileText,

    href:
      "/reports",

    roles: [
      "OFFICER",
    ],
  },


  {
    name:
      "Sensors",

    icon:
      Cpu,

    href:
      "/sensors",

    roles: [
      "OFFICER",
    ],
  },


  {
    name:
      "Data Health",

    icon:
      Radio,

    href:
      "/data-health",

    roles: [
      "OFFICER",
    ],
  },


  {
    name:
      "Simulator",

    icon:
      FlaskConical,

    href:
      "/simulator",

    roles: [
      "OFFICER",
    ],
  },

];


/* ========================================================================= */
/* SIDEBAR                                                                   */
/* ========================================================================= */

export default function Sidebar() {

  const pathname =
    usePathname();


  const router =
    useRouter();


  const {
    mobileSidebarOpen,
    closeMobileSidebar,
  } =
    useMobileSidebar();


  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
      null
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
    [
      pathname,
    ]
  );


  /* ========================================================================= */
  /* CLOSE MOBILE MENU AFTER NAVIGATION                                        */
  /* ========================================================================= */

  useEffect(
    () => {

      closeMobileSidebar();

    },
    [
      pathname,
      closeMobileSidebar,
    ]
  );


  /* ========================================================================= */
  /* CURRENT ROLE                                                              */
  /* ========================================================================= */

  const currentRole:
    UserRole =
    user?.role ??
    "PUBLIC";


  /* ========================================================================= */
  /* FILTER NAVIGATION                                                         */
  /* ========================================================================= */

  const visibleItems =
    navigationItems.filter(
      (
        item
      ) =>
        item.roles.includes(
          currentRole
        )
    );


  /* ========================================================================= */
  /* LOGOUT                                                                    */
  /* ========================================================================= */

  function handleLogout() {

    logout();


    setUser(
      null
    );


    closeMobileSidebar();


    router.push(
      "/login"
    );


    router.refresh();

  }


  /* ========================================================================= */
  /* ACTIVE ROUTE                                                              */
  /* ========================================================================= */

  function isRouteActive(
    href:
      string
  ) {

    if (
      href ===
      "/"
    ) {

      return (
        pathname ===
        "/"
      );

    }


    return (
      pathname ===
        href ||
      pathname.startsWith(
        `${href}/`
      )
    );

  }


  /* ========================================================================= */
  /* SIDEBAR CONTENT                                                           */
  /* ========================================================================= */

  function SidebarContent({
    mobile =
      false,
  }: {
    mobile?:
      boolean;
  }) {

    return (

      <>

        {/* =============================================================== */}
        {/* MOBILE HEADER                                                   */}
        {/* =============================================================== */}

        {mobile && (

          <div className="mb-5 flex items-center justify-between">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">

                PRAVAAH

              </p>


              <p className="mt-1 text-sm font-semibold text-white">

                Command Center

              </p>

            </div>


            <button
              type="button"
              onClick={
                closeMobileSidebar
              }
              aria-label="Close navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-white/10 hover:text-white"
            >

              <X className="h-5 w-5" />

            </button>

          </div>

        )}


        {/* =============================================================== */}
        {/* DESKTOP TITLE                                                   */}
        {/* =============================================================== */}

        {!mobile && (

          <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">

            Command Center

          </p>

        )}


        {/* =============================================================== */}
        {/* NAVIGATION                                                      */}
        {/* =============================================================== */}

        <nav
          aria-label="Main navigation"
          className="space-y-1"
        >

          {
            visibleItems.map(
              (
                item
              ) => {

                const Icon =
                  item.icon;


                const isActive =
                  isRouteActive(
                    item.href
                  );


                return (

                  <Link
                    key={
                      item.name
                    }
                    href={
                      item.href
                    }
                    onClick={
                      mobile
                        ? closeMobileSidebar
                        : undefined
                    }
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                      isActive
                        ? "bg-blue-500/15 font-medium text-blue-300 ring-1 ring-blue-500/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >

                    <Icon className="h-4 w-4 shrink-0" />


                    <span>
                      {
                        item.name
                      }
                    </span>

                  </Link>

                );

              }
            )
          }

        </nav>


        {/* =============================================================== */}
        {/* MONITORING AREA                                                 */}
        {/* =============================================================== */}

        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4">

          <p className="text-xs font-medium text-slate-300">

            Monitoring Area

          </p>


          <p className="mt-2 text-sm text-white">

            Bhubaneswar

          </p>


          <p className="mt-1 text-xs text-slate-500">

            Odisha, India

          </p>

        </div>


        {/* =============================================================== */}
        {/* USER INFORMATION                                                */}
        {/* =============================================================== */}

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">

          {
            user
              ? (

                <>

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">

                      {
                        user.role ===
                        "OFFICER"
                          ? (

                            <ShieldCheck className="h-4 w-4 text-blue-400" />

                          )
                          : (

                            <UserRound className="h-4 w-4 text-blue-400" />

                          )
                      }

                    </div>


                    <div className="min-w-0">

                      <p className="truncate text-xs font-medium text-slate-200">

                        {
                          user.name
                        }

                      </p>


                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-600">

                        {
                          user.role ===
                          "OFFICER"
                            ? "Disaster Management"
                            : "Citizen User"
                        }

                      </p>

                    </div>

                  </div>


                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] py-2.5 text-xs text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                  >

                    <LogOut className="h-3.5 w-3.5" />

                    Logout

                  </button>

                </>

              )
              : (

                <>

                  <p className="text-xs text-slate-500">

                    Not signed in

                  </p>


                  <Link
                    href="/login"
                    onClick={
                      mobile
                        ? closeMobileSidebar
                        : undefined
                    }
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500/10 py-2.5 text-xs font-medium text-blue-400 ring-1 ring-blue-500/20 transition hover:bg-blue-500/15"
                  >

                    <LogIn className="h-3.5 w-3.5" />

                    Sign In

                  </Link>

                </>

              )
          }

        </div>

      </>

    );

  }


  /* ========================================================================= */
  /* UI                                                                        */
  /* ========================================================================= */

  return (

    <>

      {/* =================================================================== */}
      {/* DESKTOP SIDEBAR                                                   */}
      {/* =================================================================== */}

      <aside className="hidden min-h-[calc(100vh-80px)] border-r border-white/10 bg-[#081423] p-5 lg:block">

        <SidebarContent />

      </aside>


      {/* =================================================================== */}
      {/* MOBILE BACKDROP                                                   */}
      {/* =================================================================== */}

      <div
        aria-hidden={
          !mobileSidebarOpen
        }
        onClick={
          closeMobileSidebar
        }
        className={`fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileSidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />


      {/* =================================================================== */}
      {/* MOBILE DRAWER                                                     */}
      {/* =================================================================== */}

      <aside
        aria-label="Mobile navigation"
        aria-hidden={
          !mobileSidebarOpen
        }
        className={`fixed bottom-0 left-0 top-0 z-[80] w-[84vw] max-w-[320px] overflow-y-auto border-r border-white/10 bg-[#081423] p-5 shadow-[20px_0_70px_rgba(0,0,0,0.55)] transition-transform duration-300 ease-out lg:hidden ${
          mobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        <SidebarContent
          mobile
        />

      </aside>

    </>

  );

}