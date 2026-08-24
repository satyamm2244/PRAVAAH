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
  Radio,
  Send,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  getStoredUser,
  logout,
  type AuthUser,
} from "@/lib/auth";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type UserRole =
  | "PUBLIC"
  | "USER"
  | "OFFICER";


type NavItem = {
  name: string;

  icon: LucideIcon;

  href: string;

  roles: UserRole[];
};


/* ========================================================================= */
/* NAVIGATION                                                                */
/* ========================================================================= */

const navigationItems: NavItem[] = [

  /* ----------------------------------------------------------------------- */
  /* DASHBOARD                                                               */
  /* ----------------------------------------------------------------------- */

  {
    name: "Dashboard",

    icon: Gauge,

    href: "/",

    roles: [
      "PUBLIC",
      "USER",
      "OFFICER",
    ],
  },


  /* ----------------------------------------------------------------------- */
  /* RISK MAP                                                                */
  /* ----------------------------------------------------------------------- */

  {
    name: "Risk Map",

    icon: MapPin,

    href: "/risk-map",

    roles: [
      "PUBLIC",
      "USER",
      "OFFICER",
    ],
  },


  /* ----------------------------------------------------------------------- */
  /* CITIZEN ALERTS                                                          */
  /* ----------------------------------------------------------------------- */

  {
    name: "Citizen Alerts",

    icon: Bell,

    href: "/citizen-alerts",

    roles: [
      "PUBLIC",
      "USER",
    ],
  },


  /* ----------------------------------------------------------------------- */
  /* OFFICER ALERT CENTER                                                    */
  /* ----------------------------------------------------------------------- */

  {
    name: "Alerts",

    icon: Bell,

    href: "/alerts",

    roles: [
      "OFFICER",
    ],
  },


  /* ----------------------------------------------------------------------- */
  /* CITIZEN REPORT HISTORY                                                  */
  /* ----------------------------------------------------------------------- */

  {
    name: "My Reports",

    icon: FileText,

    href: "/my-reports",

    roles: [
      "USER",
    ],
  },


  /* ----------------------------------------------------------------------- */
  /* REPORT INCIDENT                                                         */
  /* ----------------------------------------------------------------------- */

  {
    name: "Report Incident",

    icon: Send,

    href: "/report-incident",

    roles: [
      "USER",
      "OFFICER",
    ],
  },


  /* ----------------------------------------------------------------------- */
  /* EVIDENCE                                                                */
  /* ----------------------------------------------------------------------- */

  {
    name: "Evidence",

    icon: Database,

    href: "/evidence",

    roles: [
      "OFFICER",
    ],
  },


  /* ----------------------------------------------------------------------- */
  /* REPORTS                                                                 */
  /* ----------------------------------------------------------------------- */

  {
    name: "Reports",

    icon: FileText,

    href: "/reports",

    roles: [
      "OFFICER",
    ],
  },


  /* ----------------------------------------------------------------------- */
  /* SENSOR MANAGEMENT                                                       */
  /* ----------------------------------------------------------------------- */

  {
    name: "Sensors",

    icon: Cpu,

    href: "/sensors",

    roles: [
      "OFFICER",
    ],
  },


  /* ----------------------------------------------------------------------- */
  /* DATA HEALTH                                                             */
  /* ----------------------------------------------------------------------- */

  {
    name: "Data Health",

    icon: Radio,

    href: "/data-health",

    roles: [
      "OFFICER",
    ],
  },


  /* ----------------------------------------------------------------------- */
  /* SIMULATOR                                                               */
  /* ----------------------------------------------------------------------- */

  {
    name: "Simulator",

    icon: FlaskConical,

    href: "/simulator",

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
  /* LOGOUT                                                                     */
  /* ========================================================================= */

  function handleLogout() {

    logout();


    setUser(
      null
    );


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

    /*
     * Dashboard must be exact.
     *
     * Otherwise "/" would match every
     * route because every URL begins
     * with "/".
     */

    if (
      href ===
      "/"
    ) {

      return (
        pathname ===
        "/"
      );

    }


    /*
     * Exact page:
     * /my-reports
     *
     * Nested page:
     * /my-reports/<reportId>
     */

    return (
      pathname ===
        href ||
      pathname.startsWith(
        `${href}/`
      )
    );

  }


  /* ========================================================================= */
  /* UI                                                                         */
  /* ========================================================================= */

  return (

    <aside className="hidden min-h-[calc(100vh-80px)] border-r border-white/10 bg-[#081423] p-5 lg:block">


      {/* =================================================================== */}
      {/* TITLE                                                               */}
      {/* =================================================================== */}

      <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">

        Command Center

      </p>


      {/* =================================================================== */}
      {/* NAVIGATION                                                          */}
      {/* =================================================================== */}

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


              const classes =
                `flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                  isActive
                    ? "bg-blue-500/15 font-medium text-blue-300 ring-1 ring-blue-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`;


              return (

                <Link
                  key={
                    item.name
                  }
                  href={
                    item.href
                  }
                  className={
                    classes
                  }
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


      {/* =================================================================== */}
      {/* MONITORING AREA                                                     */}
      {/* =================================================================== */}

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


      {/* =================================================================== */}
      {/* USER INFORMATION                                                    */}
      {/* =================================================================== */}

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">

        {
          user
            ? (

              <>

                {/* ========================================================= */}
                {/* USER PROFILE                                              */}
                {/* ========================================================= */}

                <div className="flex items-center gap-3">


                  {/* USER ICON */}

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


                  {/* USER NAME + ROLE */}

                  <div className="min-w-0">

                    <p className="truncate text-xs font-medium text-slate-200">

                      {
                        user.name
                      }

                    </p>


                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-600">

                      {
                        user.role
                      }

                    </p>

                  </div>

                </div>


                {/* ========================================================= */}
                {/* LOGOUT                                                    */}
                {/* ========================================================= */}

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] py-2 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                >

                  <LogOut className="h-3.5 w-3.5" />

                  Logout

                </button>

              </>

            )
            : (

              <>

                {/* ========================================================= */}
                {/* PUBLIC USER                                               */}
                {/* ========================================================= */}

                <p className="text-xs text-slate-500">

                  Not signed in

                </p>


                <Link
                  href="/login"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500/10 py-2 text-xs font-medium text-blue-400 ring-1 ring-blue-500/20 transition hover:bg-blue-500/15"
                >

                  <LogIn className="h-3.5 w-3.5" />

                  Sign In

                </Link>

              </>

            )
        }

      </div>

    </aside>

  );

}