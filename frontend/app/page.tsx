"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CloudRain,
  FileCheck2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Waves,
  type LucideIcon,
} from "lucide-react";

import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import WardDetailModal from "@/components/dashboard/WardDetailModal";

import {
  getStoredUser,
  type AuthUser,
} from "@/lib/auth";

import {
  evaluateAllWards,
  type RiskLevel,
  type WardRisk,
} from "@/lib/risk-engine";

import type {
  WardReading,
} from "@/lib/mock-engine";

import {
  calculateWardPropagation,
  type WardPropagationResult,
} from "@/lib/propagation-engine";

import type {
  WardCoordinate,
} from "@/lib/ward-connectivity";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type BackendWard = {
  ward: string;

  rainfallMm: number;

  riverLevelCm: number;

  reportCount: number;

  verifiedReportCount?: number;

  pendingReportCount?: number;

  rejectedReportCount?: number;

  totalReportCount?: number;

  latitude: number;

  longitude: number;

  dataMode?: string;

  timestamp?: number;

  sources?: {
    rainfall?: string;

    rainfallMode?: string;

    riverLevel?: string;

    riverLevelMode?: string;

    riverLevelTimestamp?: number | null;

    crowdReports?: string;

    crowdReportsMode?: string;
  };
};


type SystemStatusResponse = {
  status: string;

  dataMode: string;

  reports?: {
    total?: number;

    pending?: number;

    verified?: number;

    rejected?: number;
  };

  lastUpdated?: number;
};


type OverviewCardProps = {
  title: string;

  value:
    | string
    | number;

  subtitle: string;

  icon:
    LucideIcon;

  tone:
    | "blue"
    | "red"
    | "green"
    | "purple";
};


/* ========================================================================= */
/* CONFIG                                                                    */
/* ========================================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


const REFRESH_INTERVAL =
  4000;


/* ========================================================================= */
/* PAGE                                                                      */
/* ========================================================================= */

export default function Home() {

  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
      null
    );


  const [
    wardRisks,
    setWardRisks,
  ] =
    useState<WardRisk[]>(
      []
    );


  const [
    backendWards,
    setBackendWards,
  ] =
    useState<BackendWard[]>(
      []
    );


  const [
    systemStatus,
    setSystemStatus,
  ] =
    useState<SystemStatusResponse | null>(
      null
    );


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
    useState<Date | null>(
      null
    );


  /*
   * Selected ward remains selected
   * while its modal is open.
   */

  const [
    selectedWard,
    setSelectedWard,
  ] =
    useState<WardRisk | null>(
      null
    );


  const [
    modalOpen,
    setModalOpen,
  ] =
    useState(
      false
    );


  /* ========================================================================= */
  /* USER                                                                      */
  /* ========================================================================= */

  useEffect(
    () => {

      setUser(
        getStoredUser()
      );

    },
    []
  );


  /* ========================================================================= */
  /* FETCH LIVE DATA                                                           */
  /* ========================================================================= */

  const fetchDashboardData =
    useCallback(
      async () => {

        try {

          const [
            wardsResponse,
            statusResponse,
          ] =
            await Promise.all(
              [
                fetch(
                  `${API_BASE_URL}/api/wards`,
                  {
                    cache:
                      "no-store",
                  }
                ),

                fetch(
                  `${API_BASE_URL}/api/system-status`,
                  {
                    cache:
                      "no-store",
                  }
                ),
              ]
            );


          if (
            !wardsResponse.ok
          ) {

            throw new Error(
              `Ward API returned ${wardsResponse.status}`
            );

          }


          const wards:
            BackendWard[] =
            await wardsResponse.json();


          setBackendWards(
            wards
          );


          const readings:
            WardReading[] =
            wards.map(
              (
                ward
              ) => ({

                ward:
                  ward.ward as WardReading["ward"],

                rainfallMm:
                  ward.rainfallMm,

                riverLevelCm:
                  ward.riverLevelCm,

                reportCount:
                  ward.reportCount,

              })
            );


          const evaluated =
            evaluateAllWards(
              readings
            );


          setWardRisks(
            evaluated
          );


          /*
           * Keep selected ward live.
           *
           * If live data changes while the modal
           * is open, replace the old risk object
           * with the newest version.
           */

          setSelectedWard(
            (
              current
            ) => {

              if (
                !current
              ) {
                return null;
              }


              return (
                evaluated.find(
                  (
                    ward
                  ) =>
                    ward.ward ===
                    current.ward
                ) ??
                null
              );

            }
          );


          if (
            statusResponse.ok
          ) {

            const status:
              SystemStatusResponse =
              await statusResponse.json();


            setSystemStatus(
              status
            );

          }


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
            "Dashboard data fetch failed:",
            error
          );


          setBackendOnline(
            false
          );

        } finally {

          setLoading(
            false
          );

        }

      },
      []
    );


  /* ========================================================================= */
  /* LIVE REFRESH                                                              */
  /* ========================================================================= */

  useEffect(
    () => {

      fetchDashboardData();


      const interval =
        setInterval(
          fetchDashboardData,
          REFRESH_INTERVAL
        );


      return () => {

        clearInterval(
          interval
        );

      };

    },
    [
      fetchDashboardData,
    ]
  );


  /* ========================================================================= */
  /* COUNTS                                                                    */
  /* ========================================================================= */

  const criticalCount =
    wardRisks.filter(
      (
        ward
      ) =>
        ward.level ===
        "CRITICAL"
    ).length;


  const highCount =
    wardRisks.filter(
      (
        ward
      ) =>
        ward.level ===
        "HIGH"
    ).length;


  const watchCount =
    wardRisks.filter(
      (
        ward
      ) =>
        ward.level ===
        "WATCH"
    ).length;


  const normalCount =
    wardRisks.filter(
      (
        ward
      ) =>
        ward.level ===
        "NORMAL"
    ).length;


  const atRiskCount =
    criticalCount +
    highCount +
    watchCount;


  /* ========================================================================= */
  /* ENVIRONMENTAL METRICS                                                     */
  /* ========================================================================= */

  const averageRainfall =
    useMemo(
      () => {

        if (
          backendWards.length ===
          0
        ) {

          return 0;

        }


        const total =
          backendWards.reduce(
            (
              sum,
              ward
            ) =>
              sum +
              ward.rainfallMm,
            0
          );


        return Math.round(
          total /
          backendWards.length
        );

      },
      [
        backendWards,
      ]
    );


  const averageRiverLevel =
    useMemo(
      () => {

        if (
          backendWards.length ===
          0
        ) {

          return 0;

        }


        const total =
          backendWards.reduce(
            (
              sum,
              ward
            ) =>
              sum +
              ward.riverLevelCm,
            0
          );


        return Math.round(
          total /
          backendWards.length
        );

      },
      [
        backendWards,
      ]
    );


  /* ========================================================================= */
  /* REPORTS                                                                   */
  /* ========================================================================= */

  const verifiedReports =
    systemStatus
      ?.reports
      ?.verified ??
    backendWards.reduce(
      (
        total,
        ward
      ) =>
        total +
        (
          ward.verifiedReportCount ??
          ward.reportCount ??
          0
        ),
      0
    );


  /* ========================================================================= */
  /* SORTED RISK INTELLIGENCE                                                  */
  /* ========================================================================= */

  const sortedWardRisks =
    useMemo(
      () => {

        return [
          ...wardRisks,
        ].sort(
          (
            a,
            b
          ) =>
            b.risk -
            a.risk
        );

      },
      [
        wardRisks,
      ]
    );


  const highestRiskWard =
    sortedWardRisks.length >
    0
      ? sortedWardRisks[
          0
        ]
      : null;


  const topRiskWards =
    sortedWardRisks.slice(
      0,
      5
    );


  /* ========================================================================= */
  /* WARD COORDINATES                                                          */
  /* ========================================================================= */

  const coordinates =
    useMemo<WardCoordinate[]>(
      () =>
        backendWards.map(
          (
            ward
          ) => ({

            ward:
              ward.ward,

            latitude:
              ward.latitude,

            longitude:
              ward.longitude,

          })
        ),
      [
        backendWards,
      ]
    );


  /* ========================================================================= */
  /* SELECTED BACKEND WARD                                                     */
  /* ========================================================================= */

  const selectedWardData =
    useMemo(
      () => {

        if (
          !selectedWard
        ) {

          return null;

        }


        return (
          backendWards.find(
            (
              ward
            ) =>
              ward.ward ===
              selectedWard.ward
          ) ??
          null
        );

      },
      [
        selectedWard,
        backendWards,
      ]
    );


  /* ========================================================================= */
  /* PROPAGATION                                                               */
  /* ========================================================================= */

  const propagation:
    WardPropagationResult | null =
    useMemo(
      () => {

        if (
          !selectedWard ||
          coordinates.length ===
            0
        ) {

          return null;

        }


        return calculateWardPropagation(
          selectedWard.ward,
          wardRisks,
          coordinates
        );

      },
      [
        selectedWard,
        wardRisks,
        coordinates,
      ]
    );


  /* ========================================================================= */
  /* WARD MODAL                                                                */
  /* ========================================================================= */

  const handleWardSelect =
    useCallback(
      (
        ward:
          WardRisk
      ) => {

        setSelectedWard(
          ward
        );


        setModalOpen(
          true
        );

      },
      []
    );


  const handleCloseWardModal =
    useCallback(
      () => {

        setModalOpen(
          false
        );

      },
      []
    );


  /* ========================================================================= */
  /* ROLE                                                                      */
  /* ========================================================================= */

  const isOfficer =
    user?.role ===
    "OFFICER";


  const alertsHref =
    isOfficer
      ? "/alerts"
      : "/citizen-alerts";


  /* ========================================================================= */
  /* RISK DISTRIBUTION                                                         */
  /* ========================================================================= */

  const totalWards =
    wardRisks.length;


  const criticalPercentage =
    percentage(
      criticalCount,
      totalWards
    );


  const highPercentage =
    percentage(
      highCount,
      totalWards
    );


  const watchPercentage =
    percentage(
      watchCount,
      totalWards
    );


  const normalPercentage =
    percentage(
      normalCount,
      totalWards
    );


  const criticalEnd =
    criticalPercentage;


  const highEnd =
    criticalEnd +
    highPercentage;


  const watchEnd =
    highEnd +
    watchPercentage;


  const donutBackground =
    totalWards ===
    0
      ? "#1e293b"
      : `conic-gradient(
          #ef4444 0% ${criticalEnd}%,
          #f97316 ${criticalEnd}% ${highEnd}%,
          #eab308 ${highEnd}% ${watchEnd}%,
          #22c55e ${watchEnd}% 100%
        )`;


  /* ========================================================================= */
  /* UI                                                                        */
  /* ========================================================================= */

  return (

    <main className="min-h-screen bg-[#06101c] text-white">

      <Header />


      <div className="mx-auto grid max-w-[1700px] grid-cols-1 lg:grid-cols-[230px_1fr]">

        <Sidebar />


        <section className="min-w-0 p-4 sm:p-6 lg:p-8">

          {/* =============================================================== */}
          {/* HERO                                                            */}
          {/* =============================================================== */}

          <div className="relative min-h-[570px] overflow-hidden rounded-[26px] border border-blue-500/25 bg-[#0a1728] shadow-[0_25px_80px_rgba(0,0,0,0.25)]">

            <div className="absolute inset-0">

              <div
                className="absolute inset-0 bg-cover bg-center xl:bg-[center_55%]"
                style={{
                  backgroundImage:
                    "url('/pravaah-hero.png')",
                }}
              />


              <div className="absolute inset-0 bg-gradient-to-r from-[#06101c]/95 via-[#06101c]/72 to-[#06101c]/20" />


              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#06101c]/45 to-transparent" />


              <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#06101c]/75 to-transparent" />


              <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />


              <div className="absolute bottom-[-100px] left-[32%] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />


              <div
                className="absolute inset-0 opacity-[0.035]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(59,130,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.8) 1px, transparent 1px)",

                  backgroundSize:
                    "42px 42px",
                }}
              />

            </div>


            <div className="relative grid min-h-[570px] gap-8 p-6 md:p-8 xl:grid-cols-[1.15fr_0.85fr] xl:p-10">

              <div className="flex flex-col justify-center py-4 xl:py-8">

                <div className="mb-5 flex w-fit items-center gap-2 rounded-full border border-blue-400/20 bg-[#07111f]/65 px-3 py-1.5 backdrop-blur-md">

                  <span
                    className={`h-2 w-2 rounded-full ${
                      backendOnline
                        ? "bg-emerald-400"
                        : "bg-yellow-400"
                    }`}
                  />


                  <span className="text-xs font-medium text-blue-100">

                    {
                      backendOnline
                        ? "Live Disaster Intelligence"
                        : "Reconnecting to PRAVAAH"
                    }

                  </span>

                </div>


                <h1 className="max-w-2xl text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl xl:text-7xl">

                  <span className="block text-white">
                    Predict.
                  </span>


                  <span className="block text-blue-400">
                    Prepare.
                  </span>


                  <span className="block text-emerald-400">
                    Protect.
                  </span>

                </h1>


                <p className="mt-6 text-xl font-semibold text-slate-100">
                  Together for a Safer Tomorrow.
                </p>


                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">

                  PRAVAAH combines live environmental data,
                  verified community reports and risk intelligence
                  to support safer decisions across Bhubaneswar.

                </p>


                <div className="mt-7 flex flex-wrap gap-3">

                  <Link
                    href="/risk-map"
                    className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(59,130,246,0.25)] transition hover:bg-blue-400"
                  >

                    View Risk Map

                    <ArrowRight className="h-4 w-4" />

                  </Link>


                  <Link
                    href="/report-incident"
                    className="rounded-xl border border-blue-400/30 bg-[#07111f]/60 px-5 py-3 text-sm font-medium text-blue-100 backdrop-blur-md transition hover:bg-blue-500/10"
                  >

                    Report Incident

                  </Link>

                </div>


                {lastUpdated && (

                  <p className="mt-6 text-[10px] text-slate-500">

                    Live data updated{" "}

                    {
                      lastUpdated.toLocaleTimeString(
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


              <div className="flex items-center justify-center xl:justify-end">

                <div className="w-full max-w-[470px] rounded-2xl border border-blue-400/20 bg-[#07111f]/82 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="font-semibold text-white">
                        Current Status
                      </p>


                      <div className="mt-2 flex items-center gap-2">

                        <span
                          className={`h-2 w-2 rounded-full ${
                            backendOnline
                              ? "bg-emerald-400"
                              : "bg-yellow-400"
                          }`}
                        />


                        <span
                          className={`text-xs ${
                            backendOnline
                              ? "text-emerald-400"
                              : "text-yellow-400"
                          }`}
                        >

                          {
                            backendOnline
                              ? "System Operational"
                              : "Connection Degraded"
                          }

                        </span>

                      </div>

                    </div>


                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">

                      <ShieldCheck className="h-6 w-6 text-blue-400" />

                    </div>

                  </div>


                  <div className="mt-6 grid grid-cols-3 divide-x divide-white/10">

                    <StatusMetric
                      icon={
                        CloudRain
                      }
                      value={`${averageRainfall}`}
                      unit="mm"
                      label="Avg. Rainfall"
                      iconClass="text-blue-400"
                    />


                    <StatusMetric
                      icon={
                        Waves
                      }
                      value={`${averageRiverLevel}`}
                      unit="cm"
                      label="River Level"
                      iconClass="text-cyan-400"
                    />


                    <StatusMetric
                      icon={
                        AlertTriangle
                      }
                      value={`${atRiskCount}`}
                      unit=""
                      label="At Risk"
                      iconClass="text-red-400"
                    />

                  </div>


                  {highestRiskWard && (

                    <button
                      type="button"
                      onClick={() =>
                        handleWardSelect(
                          highestRiskWard
                        )
                      }
                      className="mt-6 w-full rounded-xl border border-white/5 bg-white/[0.035] p-4 text-left transition hover:border-blue-500/20 hover:bg-white/[0.06]"
                    >

                      <div className="flex items-center justify-between gap-4">

                        <div>

                          <p className="text-[10px] uppercase tracking-wider text-slate-500">
                            Highest Risk Ward
                          </p>


                          <p className="mt-1 text-lg font-bold text-white">
                            {
                              highestRiskWard.ward
                            }
                          </p>


                          <p className="mt-1 text-[10px] text-slate-500">

                            {
                              highestRiskWard.level
                            }{" "}
                            •{" "}
                            {
                              highestRiskWard.primaryHazard
                            }

                          </p>

                        </div>


                        <div className="text-right">

                          <p className="text-2xl font-black text-red-400">
                            {
                              highestRiskWard.risk
                            }
                          </p>


                          <p className="text-[10px] text-slate-500">
                            /100
                          </p>

                        </div>

                      </div>

                    </button>

                  )}


                  <div className="mt-4 flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-4 py-3">

                    <div>

                      <p className="text-[9px] uppercase tracking-wider text-slate-600">
                        Data Mode
                      </p>


                      <p className="mt-1 text-xs font-medium text-slate-300">

                        {
                          systemStatus
                            ?.dataMode ??
                          "HYBRID"
                        }

                      </p>

                    </div>


                    <div className="flex items-center gap-2">

                      <span className="h-2 w-2 rounded-full bg-emerald-400" />


                      <span className="text-xs text-slate-400">
                        Live Monitoring
                      </span>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>


          {/* =============================================================== */}
          {/* LOWER DASHBOARD                                                 */}
          {/* =============================================================== */}

          <div className="mt-7 grid gap-6 2xl:grid-cols-[1fr_360px]">

            <div>

              <div className="mb-4 flex items-center justify-between">

                <div>

                  <h2 className="text-xl font-bold">
                    Live Overview
                  </h2>


                  <p className="mt-1 text-xs text-slate-500">
                    Current operational picture across monitored wards.
                  </p>

                </div>


                {loading && (

                  <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />

                )}

              </div>


              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <OverviewCard
                  title="Total Wards"
                  value={
                    totalWards
                  }
                  subtitle="Bhubaneswar monitored"
                  icon={
                    Building2
                  }
                  tone="blue"
                />


                <OverviewCard
                  title="At Risk Wards"
                  value={
                    atRiskCount
                  }
                  subtitle={
                    atRiskCount ===
                    0
                      ? "No elevated risk"
                      : "Require monitoring"
                  }
                  icon={
                    AlertTriangle
                  }
                  tone="red"
                />


                <OverviewCard
                  title="Verified Reports"
                  value={
                    verifiedReports
                  }
                  subtitle="Ground evidence confirmed"
                  icon={
                    FileCheck2
                  }
                  tone="purple"
                />


                <OverviewCard
                  title="Emergency Status"
                  value={
                    criticalCount >
                    0
                      ? "Critical"
                      : highCount >
                          0
                        ? "Elevated"
                        : "Normal"
                  }
                  subtitle={
                    backendOnline
                      ? "Monitoring active"
                      : "Backend degraded"
                  }
                  icon={
                    ShieldCheck
                  }
                  tone="green"
                />

              </div>


              {/* =========================================================== */}
              {/* HIGHEST RISK WARDS                                          */}
              {/* =========================================================== */}

              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a1728] p-5 sm:p-6">

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                  <div>

                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-400">
                      Risk Intelligence
                    </p>


                    <h2 className="mt-1 text-lg font-bold text-white">
                      Highest-Risk Wards
                    </h2>


                    <p className="mt-1 text-xs text-slate-500">
                      Click any ward to inspect its risk intelligence and recommended response.
                    </p>

                  </div>


                  <Link
                    href="/risk-map"
                    className="flex w-fit items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 transition hover:bg-blue-500/15"
                  >

                    View Risk Map

                    <ArrowRight className="h-3.5 w-3.5" />

                  </Link>

                </div>


                <div className="mt-6 space-y-3">

                  {
                    topRiskWards.length >
                    0
                      ? topRiskWards.map(
                          (
                            ward,
                            index
                          ) => (

                            <TopRiskWardRow
                              key={
                                ward.ward
                              }
                              ward={
                                ward
                              }
                              rank={
                                index +
                                1
                              }
                              onClick={() =>
                                handleWardSelect(
                                  ward
                                )
                              }
                            />

                          )
                        )
                      : (

                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">

                          <p className="text-sm text-slate-500">
                            Waiting for ward risk data...
                          </p>

                        </div>

                      )
                  }

                </div>

              </div>


              <Link
                href={
                  alertsHref
                }
                className="group mt-6 flex items-center justify-between rounded-2xl border border-blue-500/15 bg-gradient-to-r from-blue-500/10 to-transparent p-5 transition hover:border-blue-500/30"
              >

                <div className="flex items-center gap-4">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15">

                    <ShieldCheck className="h-5 w-5 text-blue-400" />

                  </div>


                  <div>

                    <p className="font-semibold text-white">
                      Early action saves lives.
                    </p>


                    <p className="mt-1 text-xs text-slate-500">

                      {
                        isOfficer
                          ? "Review operational alerts and take authorized action."
                          : "Stay informed, stay prepared and follow published safety guidance."
                      }

                    </p>

                  </div>

                </div>


                <ArrowRight className="h-5 w-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-blue-400" />

              </Link>

            </div>


            {/* ============================================================= */}
            {/* RIGHT COLUMN                                                  */}
            {/* ============================================================= */}

            <div className="space-y-6">

              <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">

                <h2 className="font-semibold">
                  Risk Distribution
                </h2>


                <p className="mt-1 text-xs text-slate-500">
                  Current ward risk classification
                </p>


                <div className="mt-6 flex flex-col items-center">

                  <div
                    className="relative flex h-44 w-44 items-center justify-center rounded-full"
                    style={{
                      background:
                        donutBackground,
                    }}
                  >

                    <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-[#0a1728] shadow-inner">

                      <p className="text-3xl font-bold">
                        {
                          totalWards
                        }
                      </p>


                      <p className="text-[10px] uppercase tracking-wider text-slate-500">
                        Wards
                      </p>

                    </div>

                  </div>


                  <div className="mt-6 w-full space-y-3">

                    <RiskLegendRow
                      label="Critical"
                      count={
                        criticalCount
                      }
                      percentage={
                        criticalPercentage
                      }
                      dotClass="bg-red-500"
                    />


                    <RiskLegendRow
                      label="High"
                      count={
                        highCount
                      }
                      percentage={
                        highPercentage
                      }
                      dotClass="bg-orange-500"
                    />


                    <RiskLegendRow
                      label="Watch"
                      count={
                        watchCount
                      }
                      percentage={
                        watchPercentage
                      }
                      dotClass="bg-yellow-400"
                    />


                    <RiskLegendRow
                      label="Normal"
                      count={
                        normalCount
                      }
                      percentage={
                        normalPercentage
                      }
                      dotClass="bg-emerald-400"
                    />

                  </div>

                </div>

              </div>


              <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">

                    <MapPin className="h-5 w-5 text-emerald-400" />

                  </div>


                  <div>

                    <p className="text-xs text-slate-500">
                      Monitoring Area
                    </p>


                    <p className="font-semibold">
                      Bhubaneswar
                    </p>

                  </div>

                </div>


                <div className="mt-4 rounded-xl border border-white/5 bg-[#07111f] p-4">

                  <p className="text-[10px] uppercase tracking-wider text-slate-600">
                    Coverage
                  </p>


                  <p className="mt-2 text-2xl font-bold text-white">

                    {
                      totalWards
                    }{" "}

                    <span className="text-sm font-normal text-slate-500">
                      wards
                    </span>

                  </p>


                  <div className="mt-3 flex items-center gap-2">

                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />


                    <p className="text-xs text-slate-500">
                      Odisha, India
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

      </div>


      {/* =================================================================== */}
      {/* WARD DETAIL MODAL                                                   */}
      {/* =================================================================== */}

      {selectedWard &&
        modalOpen && (

        <WardDetailModal
          wardRisk={
            selectedWard
          }

          wardData={
            selectedWardData
          }

          propagation={
            propagation
          }

          onClose={
            handleCloseWardModal
          }
        />

      )}

    </main>

  );
}


/* ========================================================================= */
/* STATUS METRIC                                                             */
/* ========================================================================= */

function StatusMetric({
  icon: Icon,
  value,
  unit,
  label,
  iconClass,
}: {
  icon:
    LucideIcon;

  value:
    string;

  unit:
    string;

  label:
    string;

  iconClass:
    string;
}) {

  return (

    <div className="px-3 text-center first:pl-0 last:pr-0">

      <Icon
        className={`mx-auto h-6 w-6 ${iconClass}`}
      />


      <p className="mt-3 text-xl font-bold text-white">

        {
          value
        }


        {unit && (

          <span className="ml-1 text-xs font-normal text-slate-500">
            {
              unit
            }
          </span>

        )}

      </p>


      <p className="mt-1 text-[9px] text-slate-500">
        {
          label
        }
      </p>

    </div>

  );
}


/* ========================================================================= */
/* OVERVIEW CARD                                                             */
/* ========================================================================= */

function OverviewCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: OverviewCardProps) {

  const tones = {

    blue: {
      box:
        "bg-blue-500/10",

      icon:
        "text-blue-400",
    },

    red: {
      box:
        "bg-red-500/10",

      icon:
        "text-red-400",
    },

    green: {
      box:
        "bg-emerald-500/10",

      icon:
        "text-emerald-400",
    },

    purple: {
      box:
        "bg-purple-500/10",

      icon:
        "text-purple-400",
    },

  };


  const selected =
    tones[
      tone
    ];


  return (

    <article className="rounded-2xl border border-white/10 bg-[#0a1728] p-5 transition hover:-translate-y-0.5 hover:border-white/15">

      <div className="flex items-start justify-between gap-3">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected.box}`}
        >

          <Icon
            className={`h-5 w-5 ${selected.icon}`}
          />

        </div>


        <span className="h-2 w-2 rounded-full bg-emerald-400/70" />

      </div>


      <p className="mt-5 text-xs text-slate-500">
        {
          title
        }
      </p>


      <p className="mt-1 text-2xl font-bold text-white">
        {
          value
        }
      </p>


      <p className="mt-2 text-[10px] text-slate-600">
        {
          subtitle
        }
      </p>

    </article>

  );
}


/* ========================================================================= */
/* TOP RISK WARD ROW                                                         */
/* ========================================================================= */

function TopRiskWardRow({
  ward,
  rank,
  onClick,
}: {
  ward:
    WardRisk;

  rank:
    number;

  onClick:
    () => void;
}) {

  const styles:
    Record<
      RiskLevel,
      {
        text: string;
        badge: string;
        bar: string;
      }
    > = {

      CRITICAL: {
        text:
          "text-red-400",

        badge:
          "bg-red-500/10 ring-red-500/20",

        bar:
          "bg-red-500",
      },

      HIGH: {
        text:
          "text-orange-400",

        badge:
          "bg-orange-500/10 ring-orange-500/20",

        bar:
          "bg-orange-500",
      },

      WATCH: {
        text:
          "text-yellow-400",

        badge:
          "bg-yellow-500/10 ring-yellow-500/20",

        bar:
          "bg-yellow-400",
      },

      NORMAL: {
        text:
          "text-emerald-400",

        badge:
          "bg-emerald-500/10 ring-emerald-500/20",

        bar:
          "bg-emerald-400",
      },

    };


  const style =
    styles[
      ward.level
    ];


  const barWidth =
    Math.max(
      3,
      Math.min(
        ward.risk,
        100
      )
    );


  return (

    <button
      type="button"
      onClick={
        onClick
      }
      className="w-full rounded-xl border border-white/5 bg-[#07111f] p-4 text-left transition hover:border-blue-500/25 hover:bg-[#091626]"
    >

      <div className="flex items-center gap-4">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-xs font-bold text-slate-400">
          {
            rank
          }
        </div>


        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <p className="font-semibold text-white">
              {
                ward.ward
              }
            </p>


            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ring-1 ${style.badge} ${style.text}`}
            >
              {
                ward.level
              }
            </span>

          </div>


          <p className="mt-1 truncate text-xs text-slate-500">
            {
              ward.primaryHazard
            }
          </p>


          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">

            <div
              className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
              style={{
                width:
                  `${barWidth}%`,
              }}
            />

          </div>

        </div>


        <div className="shrink-0 text-right">

          <p
            className={`text-xl font-black ${style.text}`}
          >
            {
              ward.risk
            }
          </p>


          <p className="text-[9px] text-slate-600">
            /100
          </p>

        </div>

      </div>

    </button>

  );
}


/* ========================================================================= */
/* RISK LEGEND                                                               */
/* ========================================================================= */

function RiskLegendRow({
  label,
  count,
  percentage,
  dotClass,
}: {
  label:
    string;

  count:
    number;

  percentage:
    number;

  dotClass:
    string;
}) {

  return (

    <div className="flex items-center justify-between">

      <div className="flex items-center gap-2">

        <span
          className={`h-2.5 w-2.5 rounded-full ${dotClass}`}
        />


        <span className="text-xs text-slate-400">
          {
            label
          }
        </span>

      </div>


      <div className="text-xs">

        <span className="font-medium text-slate-200">
          {
            count
          }
        </span>


        <span className="ml-1 text-slate-600">

          (
          {
            percentage
          }
          %)

        </span>

      </div>

    </div>

  );
}


/* ========================================================================= */
/* HELPERS                                                                   */
/* ========================================================================= */

function percentage(
  count: number,
  total: number
): number {

  if (
    total ===
    0
  ) {

    return 0;

  }


  return Math.round(
    (
      count /
      total
    ) *
    100
  );
}