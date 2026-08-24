"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  Search,
  ShieldAlert,
  Waves,
} from "lucide-react";

import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";

import type {
  RiskLevel,
} from "@/lib/risk-engine";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type Priority =
  | "INFO"
  | "ADVISORY"
  | "WARNING"
  | "EMERGENCY";


type PublishedAlert = {
  id: string;

  ward: string;

  priority:
    Priority;

  trigger: string;

  level:
    RiskLevel;

  title: string;

  message: string;

  risk: number;

  confidence: number;

  primaryHazard: string;

  recommendedAction: string;

  status: string;

  publishedBy?:
    string | null;

  createdAt: number;

  publishedAt?:
    number | null;
};


type BackendWard = {
  ward: string;

  rainfallMm: number;

  riverLevelCm: number;

  reportCount: number;

  latitude: number;

  longitude: number;
};


type FilterTab =
  | "ALL"
  | RiskLevel;


/* ========================================================================= */
/* CONFIG                                                                    */
/* ========================================================================= */

const API_BASE_URL =
  process.env
    .NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


const REFRESH_MS =
  5000;


const FILTERS:
  FilterTab[] = [
    "ALL",
    "CRITICAL",
    "HIGH",
    "WATCH",
    "NORMAL",
  ];


/* ========================================================================= */
/* PAGE                                                                      */
/* ========================================================================= */

export default function CitizenAlertsPage() {

  const [
    alerts,
    setAlerts,
  ] =
    useState<
      PublishedAlert[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    backendOnline,
    setBackendOnline,
  ] =
    useState(
      false
    );


  const [
    lastUpdated,
    setLastUpdated,
  ] =
    useState<
      Date | null
    >(null);


  const [
    filter,
    setFilter,
  ] =
    useState<
      FilterTab
    >("ALL");


  const [
    search,
    setSearch,
  ] =
    useState("");


  /* ========================================================================= */
  /* FETCH ALL PUBLISHED ALERTS                                                */
  /* ========================================================================= */

  useEffect(
    () => {

      let cancelled =
        false;


      async function fetchAlerts() {

        try {

          /*
           * Step 1:
           * Get all monitored wards.
           */

          const wardResponse =
            await fetch(
              `${API_BASE_URL}/api/wards`,
              {
                cache:
                  "no-store",
              }
            );


          if (
            !wardResponse.ok
          ) {

            throw new Error(
              `Ward API returned ${wardResponse.status}`
            );

          }


          const wardData:
            BackendWard[] =
            await wardResponse.json();


          /*
           * Step 2:
           * Fetch published alerts for
           * every ward.
           */

          const alertRequests =
            wardData.map(
              async (
                ward
              ) => {

                try {

                  const response =
                    await fetch(
                      `${API_BASE_URL}/api/alerts/ward/${ward.ward}`,
                      {
                        cache:
                          "no-store",
                      }
                    );


                  if (
                    !response.ok
                  ) {

                    return [];

                  }


                  const data:
                    PublishedAlert[] =
                    await response.json();


                  return data.filter(
                    (
                      alert
                    ) =>
                      alert.status ===
                        "PUBLISHED" ||
                      !alert.status
                  );

                } catch {

                  return [];

                }

              }
            );


          const responses =
            await Promise.all(
              alertRequests
            );


          if (
            cancelled
          ) {
            return;
          }


          /*
           * Flatten all ward alert arrays.
           */

          const combined =
            responses.flat();


          /*
           * Remove duplicates by alert ID.
           */

          const uniqueMap =
            new Map<
              string,
              PublishedAlert
            >();


          for (
            const alert
            of combined
          ) {

            uniqueMap.set(
              alert.id,
              alert
            );

          }


          const uniqueAlerts =
            Array.from(
              uniqueMap.values()
            );


          /*
           * Newest published alerts first.
           */

          uniqueAlerts.sort(
            (
              a,
              b
            ) =>
              (
                b.publishedAt ??
                b.createdAt
              ) -
              (
                a.publishedAt ??
                a.createdAt
              )
          );


          setAlerts(
            uniqueAlerts
          );


          setBackendOnline(
            true
          );


          setLastUpdated(
            new Date()
          );

        } catch (
          error
        ) {

          console.error(
            "Unable to load citizen alerts:",
            error
          );


          if (
            !cancelled
          ) {

            setBackendOnline(
              false
            );

          }

        } finally {

          if (
            !cancelled
          ) {

            setLoading(
              false
            );

          }

        }

      }


      fetchAlerts();


      const interval =
        setInterval(
          fetchAlerts,
          REFRESH_MS
        );


      return () => {

        cancelled =
          true;


        clearInterval(
          interval
        );

      };

    },
    []
  );


  /* ========================================================================= */
  /* FILTER                                                                    */
  /* ========================================================================= */

  const filteredAlerts =
    useMemo(
      () => {

        let result =
          [
            ...alerts,
          ];


        if (
          filter !==
          "ALL"
        ) {

          result =
            result.filter(
              (
                alert
              ) =>
                alert.level ===
                filter
            );

        }


        const query =
          search
            .trim()
            .toLowerCase();


        if (
          query
        ) {

          result =
            result.filter(
              (
                alert
              ) =>
                alert.ward
                  .toLowerCase()
                  .includes(
                    query
                  ) ||

                alert.title
                  .toLowerCase()
                  .includes(
                    query
                  ) ||

                alert.primaryHazard
                  .toLowerCase()
                  .includes(
                    query
                  ) ||

                alert.message
                  .toLowerCase()
                  .includes(
                    query
                  )
            );

        }


        return result;

      },
      [
        alerts,
        filter,
        search,
      ]
    );


  /* ========================================================================= */
  /* COUNTS                                                                    */
  /* ========================================================================= */

  const criticalCount =
    alerts.filter(
      (
        alert
      ) =>
        alert.level ===
        "CRITICAL"
    ).length;


  const highCount =
    alerts.filter(
      (
        alert
      ) =>
        alert.level ===
        "HIGH"
    ).length;


  const watchCount =
    alerts.filter(
      (
        alert
      ) =>
        alert.level ===
        "WATCH"
    ).length;


  const normalCount =
    alerts.filter(
      (
        alert
      ) =>
        alert.level ===
        "NORMAL"
    ).length;


  /* ========================================================================= */
  /* UI                                                                        */
  /* ========================================================================= */

  return (

    <main className="min-h-screen bg-[#07111f] text-white">

      <Header />


      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[230px_1fr]">

        <Sidebar />


        <section className="min-w-0 p-5 lg:p-8">


          {/* =============================================================== */}
          {/* HEADER                                                          */}
          {/* =============================================================== */}

          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <p className="mb-1 text-sm text-slate-500">
                Public Safety Information
              </p>


              <h2 className="text-3xl font-bold tracking-tight">
                Published Alerts
              </h2>


              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Officially published PRAVAAH alerts across all monitored wards.
              </p>

            </div>


            <div className="flex w-fit items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">

              <span
                className={`h-2 w-2 rounded-full ${
                  backendOnline
                    ? "bg-emerald-400"
                    : "bg-yellow-400"
                }`}
              />


              <div>

                <p className="text-sm text-slate-300">

                  {
                    backendOnline
                      ? "Live Alerts"
                      : "Connection unavailable"
                  }

                </p>


                {lastUpdated && (

                  <p className="mt-0.5 text-[10px] text-slate-500">

                    Updated{" "}

                    {
                      lastUpdated
                        .toLocaleTimeString(
                          "en-IN",
                          {
                            hour:
                              "2-digit",

                            minute:
                              "2-digit",

                            second:
                              "2-digit",
                          }
                        )
                    }

                  </p>

                )}

              </div>

            </div>

          </div>


          {/* =============================================================== */}
          {/* SUMMARY                                                          */}
          {/* =============================================================== */}

          <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <SummaryCard
              title="Critical"
              value={
                criticalCount
              }
              icon={
                ShieldAlert
              }
              className="text-red-400"
            />


            <SummaryCard
              title="High"
              value={
                highCount
              }
              icon={
                AlertTriangle
              }
              className="text-orange-400"
            />


            <SummaryCard
              title="Watch"
              value={
                watchCount
              }
              icon={
                Waves
              }
              className="text-yellow-400"
            />


            <SummaryCard
              title="Normal"
              value={
                normalCount
              }
              icon={
                CheckCircle2
              }
              className="text-emerald-400"
            />

          </div>


          {/* =============================================================== */}
          {/* FILTERS                                                         */}
          {/* =============================================================== */}

          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div className="flex flex-wrap gap-2">

              {
                FILTERS.map(
                  (
                    item
                  ) => {

                    const active =
                      filter ===
                      item;


                    return (

                      <button
                        key={
                          item
                        }
                        type="button"
                        onClick={() =>
                          setFilter(
                            item
                          )
                        }
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >

                        {
                          item ===
                          "ALL"
                            ? "All"
                            : item
                        }

                      </button>

                    );

                  }
                )
              }

            </div>


            <div className="relative w-full xl:w-[300px]">

              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />


              <input
                type="text"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search ward or hazard..."
                className="w-full rounded-xl border border-white/10 bg-[#0a1728] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500/40"
              />

            </div>

          </div>


          {/* =============================================================== */}
          {/* LOADING                                                         */}
          {/* =============================================================== */}

          {loading && (

            <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-12 text-center">

              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-blue-400" />


              <p className="mt-4 text-sm text-slate-400">
                Loading published alerts...
              </p>

            </div>

          )}


          {/* =============================================================== */}
          {/* ERROR                                                           */}
          {/* =============================================================== */}

          {!loading &&
            !backendOnline &&
            alerts.length ===
              0 && (

              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.04] p-10 text-center">

                <Clock3 className="mx-auto h-8 w-8 text-yellow-400" />


                <h3 className="mt-4 font-semibold">
                  Unable to load alerts
                </h3>


                <p className="mt-2 text-sm text-slate-500">
                  PRAVAAH will automatically retry the connection.
                </p>

              </div>

            )}


          {/* =============================================================== */}
          {/* EMPTY                                                           */}
          {/* =============================================================== */}

          {!loading &&
            backendOnline &&
            filteredAlerts.length ===
              0 && (

              <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-12 text-center">

                <BellRing className="mx-auto h-8 w-8 text-slate-600" />


                <h3 className="mt-4 font-semibold">
                  No published alerts
                </h3>


                <p className="mt-2 text-sm text-slate-500">
                  No alerts match the current filter.
                </p>

              </div>

            )}


          {/* =============================================================== */}
          {/* ALERT LIST                                                      */}
          {/* =============================================================== */}

          {!loading &&
            filteredAlerts.length >
              0 && (

              <div className="space-y-4">

                {
                  filteredAlerts.map(
                    (
                      alert
                    ) => (

                      <CitizenAlertCard
                        key={
                          alert.id
                        }
                        alert={
                          alert
                        }
                      />

                    )
                  )
                }

              </div>

            )}


          {/* =============================================================== */}
          {/* DISCLAIMER                                                      */}
          {/* =============================================================== */}

          <div className="mt-7 rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-4">

            <p className="text-xs leading-5 text-slate-500">

              PRAVAAH provides decision-support information based on currently available evidence.
              Follow official emergency and evacuation instructions issued by authorized authorities.

            </p>

          </div>

        </section>

      </div>

    </main>

  );
}


/* ========================================================================= */
/* SUMMARY CARD                                                              */
/* ========================================================================= */

function SummaryCard({
  title,
  value,
  icon: Icon,
  className,
}: {
  title: string;

  value: number;

  icon:
    typeof ShieldAlert;

  className: string;
}) {

  return (

    <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-xs text-slate-500">
            {title}
          </p>


          <p className="mt-2 text-2xl font-bold">
            {value}
          </p>

        </div>


        <div className="rounded-xl bg-white/[0.03] p-3">

          <Icon
            className={`h-5 w-5 ${className}`}
          />

        </div>

      </div>

    </div>

  );
}


/* ========================================================================= */
/* ALERT CARD                                                                */
/* ========================================================================= */

function CitizenAlertCard({
  alert,
}: {
  alert:
    PublishedAlert;
}) {

  const levelStyles:
    Record<
      RiskLevel,
      string
    > = {

      CRITICAL:
        "bg-red-500/10 text-red-400 ring-red-500/20",

      HIGH:
        "bg-orange-500/10 text-orange-400 ring-orange-500/20",

      WATCH:
        "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20",

      NORMAL:
        "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    };


  return (

    <article className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

        <div>

          <div className="flex flex-wrap items-center gap-2">

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest ring-1 ${
                levelStyles[
                  alert.level
                ]
              }`}
            >

              {
                alert.level
              }

            </span>


            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-blue-300">

              {
                alert.priority
              }

            </span>


            <span className="text-xs text-slate-500">

              {
                alert.ward
              }

            </span>

          </div>


          <h3 className="mt-4 text-lg font-semibold text-white">

            {
              alert.title
            }

          </h3>


          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">

            {
              alert.message
            }

          </p>

        </div>


        <div className="shrink-0 rounded-xl bg-white/[0.03] px-4 py-3 text-right">

          <p className="text-[10px] uppercase tracking-wider text-slate-600">
            Risk
          </p>


          <p className="mt-1 text-xl font-bold">

            {
              alert.risk
            }

            <span className="text-xs text-slate-500">
              /100
            </span>

          </p>

        </div>

      </div>


      <div className="mt-5 grid gap-3 sm:grid-cols-3">

        <InfoBox
          label="Hazard"
          value={
            alert.primaryHazard
          }
        />


        <InfoBox
          label="Confidence"
          value={
            `${alert.confidence}%`
          }
        />


        <InfoBox
          label="Ward"
          value={
            alert.ward
          }
        />

      </div>


      <div className="mt-5 rounded-xl border border-blue-500/10 bg-blue-500/[0.04] p-4">

        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">
          Recommended Action
        </p>


        <p className="mt-2 text-sm leading-6 text-slate-300">

          {
            alert.recommendedAction
          }

        </p>

      </div>


      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">

        <div className="flex items-center gap-2 text-xs text-emerald-400">

          <CheckCircle2 className="h-4 w-4" />

          Published alert

        </div>


        <p className="text-xs text-slate-600">

          {
            formatAlertTime(
              alert.publishedAt ??
              alert.createdAt
            )
          }

        </p>

      </div>

    </article>

  );
}


/* ========================================================================= */
/* INFO BOX                                                                  */
/* ========================================================================= */

function InfoBox({
  label,
  value,
}: {
  label: string;

  value: string;
}) {

  return (

    <div className="rounded-lg bg-white/[0.03] p-3">

      <p className="text-[9px] uppercase tracking-wider text-slate-600">
        {label}
      </p>


      <p className="mt-1 text-sm font-medium text-slate-200">
        {value}
      </p>

    </div>

  );
}


/* ========================================================================= */
/* TIME                                                                      */
/* ========================================================================= */

function formatAlertTime(
  timestamp: number
): string {

  if (
    !timestamp
  ) {
    return "Time unavailable";
  }


  return new Date(
    timestamp
  ).toLocaleString(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}