"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Database,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  Waves,
} from "lucide-react";

import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import RequireOfficer from "@/components/auth/RequireOfficer";

import {
  evaluateAllWards,
  getRiskBreakdown,
  type RiskLevel,
  type WardRisk,
} from "@/lib/risk-engine";

import type {
  WardReading,
} from "@/lib/mock-engine";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type ApiSources = {
  rainfall?: string;
  rainfallMode?: string;

  riverLevel?: string;
  riverLevelMode?: string;

  riverLevelTimestamp?: number | null;

  crowdReports?: string;
  crowdReportsMode?: string;
};

type ApiWardReading = {
  ward: string;

  rainfallMm: number;

  riverLevelCm: number;

  reportCount: number;

  verifiedReportCount?: number;

  pendingReportCount?: number;

  rejectedReportCount?: number;

  totalReportCount?: number;

  latitude?: number;

  longitude?: number;

  dataMode?: string;

  sources?: ApiSources;

  timestamp?: number;
};

type EvidenceWard = {
  api: ApiWardReading;
  risk: WardRisk;
};


/* ========================================================================= */
/* CONFIG                                                                    */
/* ========================================================================= */

const API_BASE_URL =
  process.env
    .NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

const REFRESH_INTERVAL =
  4000;


/* ========================================================================= */
/* PAGE                                                                      */
/* ========================================================================= */

function EvidencePageContent() {
  const [
    evidence,
    setEvidence,
  ] =
    useState<
      EvidenceWard[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    selectedWard,
    setSelectedWard,
  ] =
    useState<string>("ALL");


  /* ----------------------------------------------------------------------- */
  /* FETCH                                                                   */
  /* ----------------------------------------------------------------------- */

  const fetchEvidence =
    useCallback(
      async (
        showRefresh = false
      ) => {

        try {

          if (
            showRefresh
          ) {
            setRefreshing(
              true
            );
          }

          const response =
            await fetch(
              `${API_BASE_URL}/api/wards`,
              {
                cache:
                  "no-store",
              }
            );

          if (
            !response.ok
          ) {
            throw new Error(
              "Unable to load ward evidence."
            );
          }

          const apiData:
            ApiWardReading[] =
            await response.json();


          const readings:
            WardReading[] =
            apiData.map(
              (
                ward
              ) => ({
                ward:
                  ward.ward,

                rainfallMm:
                  ward.rainfallMm,

                riverLevelCm:
                  ward.riverLevelCm,

                reportCount:
                  ward.reportCount,
              })
            );


          const risks =
            evaluateAllWards(
              readings
            );


          const riskMap =
            new Map(
              risks.map(
                (
                  risk
                ) => [
                  risk.ward,
                  risk,
                ]
              )
            );


          const combined:
            EvidenceWard[] =
            apiData
              .map(
                (
                  api
                ) => {

                  const risk =
                    riskMap.get(
                      api.ward
                    );

                  if (
                    !risk
                  ) {
                    return null;
                  }

                  return {
                    api,
                    risk,
                  };
                }
              )
              .filter(
                (
                  item
                ): item is EvidenceWard =>
                  item !== null
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  b.risk.risk -
                  a.risk.risk
              );


          setEvidence(
            combined
          );

          setError(
            null
          );

        } catch (
          fetchError
        ) {

          console.error(
            "Unable to fetch evidence:",
            fetchError
          );

          setError(
            "Unable to connect to the PRAVAAH evidence pipeline."
          );

        } finally {

          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );


  /* ----------------------------------------------------------------------- */
  /* LIVE REFRESH                                                            */
  /* ----------------------------------------------------------------------- */

  useEffect(
    () => {

      fetchEvidence();

      const interval =
        setInterval(
          () => {
            fetchEvidence();
          },
          REFRESH_INTERVAL
        );

      return () =>
        clearInterval(
          interval
        );

    },
    [
      fetchEvidence,
    ]
  );


  /* ----------------------------------------------------------------------- */
  /* FILTER                                                                  */
  /* ----------------------------------------------------------------------- */

  const visibleEvidence =
    useMemo(
      () => {

        if (
          selectedWard ===
          "ALL"
        ) {
          return evidence;
        }

        return evidence.filter(
          (
            item
          ) =>
            item.api.ward ===
            selectedWard
        );

      },
      [
        evidence,
        selectedWard,
      ]
    );


  /* ----------------------------------------------------------------------- */
  /* COUNTS                                                                  */
  /* ----------------------------------------------------------------------- */

  const realRainfallCount =
    evidence.filter(
      (
        item
      ) =>
        item.api.sources
          ?.rainfallMode ===
        "REAL"
    ).length;


  const iotRiverCount =
    evidence.filter(
      (
        item
      ) =>
        item.api.sources
          ?.riverLevelMode ===
        "IOT"
    ).length;


  const verifiedEvidence =
    evidence.reduce(
      (
        total,
        item
      ) =>
        total +
        (
          item.api
            .verifiedReportCount ??
          item.api
            .reportCount ??
          0
        ),
      0
    );


  const highRiskCount =
    evidence.filter(
      (
        item
      ) =>
        item.risk.level ===
          "HIGH" ||
        item.risk.level ===
          "CRITICAL"
    ).length;


  /* ----------------------------------------------------------------------- */
  /* RENDER                                                                  */
  /* ----------------------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-[#07111f] text-white">

      <Header />


      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[230px_1fr]">

        <Sidebar />


        <section className="min-w-0 p-5 lg:p-8">

          {/* =============================================================== */}
          {/* PAGE HEADER                                                     */}
          {/* =============================================================== */}

          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <div className="mb-2 flex items-center gap-2 text-sm text-blue-400">

                <Database className="h-4 w-4" />

                Evidence Fusion Layer

              </div>


              <h1 className="text-3xl font-bold tracking-tight">
                Risk Evidence
              </h1>


              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Inspect the evidence
                contributing to each ward
                risk assessment, including
                rainfall, IoT river
                readings and verified
                citizen reports.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                fetchEvidence(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >

              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh

            </button>

          </div>


          {/* =============================================================== */}
          {/* ERROR                                                           */}
          {/* =============================================================== */}

          {error && (

            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">

              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

              <div>

                <p className="text-sm font-medium text-red-300">
                  Evidence service unavailable
                </p>

                <p className="mt-1 text-xs text-red-300/70">
                  {error}
                </p>

              </div>

            </div>

          )}


          {/* =============================================================== */}
          {/* SUMMARY                                                         */}
          {/* =============================================================== */}

          <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <SummaryCard
              icon={
                CloudRain
              }
              label="Real Rainfall"
              value={
                realRainfallCount
              }
              description="Wards using weather data"
            />


            <SummaryCard
              icon={
                Waves
              }
              label="IoT River"
              value={
                iotRiverCount
              }
              description="Wards with IoT readings"
            />


            <SummaryCard
              icon={
                FileCheck2
              }
              label="Verified Reports"
              value={
                verifiedEvidence
              }
              description="Human-verified evidence"
            />


            <SummaryCard
              icon={
                AlertTriangle
              }
              label="High Risk"
              value={
                highRiskCount
              }
              description="High + critical wards"
            />

          </div>


          {/* =============================================================== */}
          {/* CONTROLS                                                        */}
          {/* =============================================================== */}

          <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-[#0a1728] p-4 sm:flex-row sm:items-center">

            <div>

              <p className="text-sm font-medium text-slate-300">
                Evidence Explorer
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Select a ward or inspect
                all wards ordered by risk.
              </p>

            </div>


            <select
              value={
                selectedWard
              }
              onChange={(
                event
              ) =>
                setSelectedWard(
                  event.target
                    .value
                )
              }
              className="rounded-lg border border-white/10 bg-[#07111f] px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500/40"
            >

              <option value="ALL">
                All Wards
              </option>


              {evidence
                .map(
                  (
                    item
                  ) =>
                    item.api
                      .ward
                )
                .sort(
                  (
                    a,
                    b
                  ) => {

                    const numberA =
                      Number(
                        a.replace(
                          /\D/g,
                          ""
                        )
                      );

                    const numberB =
                      Number(
                        b.replace(
                          /\D/g,
                          ""
                        )
                      );

                    return (
                      numberA -
                      numberB
                    );
                  }
                )
                .map(
                  (
                    ward
                  ) => (

                    <option
                      key={
                        ward
                      }
                      value={
                        ward
                      }
                    >
                      {
                        ward
                      }
                    </option>

                  )
                )}

            </select>

          </div>


          {/* =============================================================== */}
          {/* CONTENT                                                         */}
          {/* =============================================================== */}

          {loading ? (

            <LoadingState />

          ) : visibleEvidence.length ===
            0 ? (

            <EmptyState />

          ) : (

            <div className="space-y-5">

              {visibleEvidence.map(
                (
                  item
                ) => (

                  <EvidenceCard
                    key={
                      item.api
                        .ward
                    }
                    item={
                      item
                    }
                  />

                )
              )}

            </div>

          )}


          {/* =============================================================== */}
          {/* METHODOLOGY                                                     */}
          {/* =============================================================== */}

          <div className="mt-7 rounded-2xl border border-blue-500/15 bg-blue-500/[0.04] p-5">

            <div className="flex items-center gap-2">

              <ShieldCheck className="h-5 w-5 text-blue-400" />

              <h3 className="text-sm font-semibold text-blue-300">
                Evidence Fusion Method
              </h3>

            </div>


            <p className="mt-3 max-w-4xl text-xs leading-6 text-slate-500">
              PRAVAAH combines rainfall,
              river-level observations and
              human-verified citizen
              evidence to calculate ward
              risk. The displayed risk
              thresholds and contribution
              weights are prototype
              decision-support parameters
              and are not official flood
              warning thresholds.
            </p>

          </div>

        </section>

      </div>

    </main>
  );
}




/* ========================================================================= */
/* PROTECTED PAGE                                                            */
/* ========================================================================= */

export default function EvidencePage() {
  return (
    <RequireOfficer>
      <EvidencePageContent />
    </RequireOfficer>
  );
}


/* ========================================================================= */
/* EVIDENCE CARD                                                             */
/* ========================================================================= */

function EvidenceCard({
  item,
}: {
  item: EvidenceWard;
}) {

  const {
    api,
    risk,
  } = item;


  const breakdown =
    getRiskBreakdown(
      risk.reading
    );


  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1728]">

      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 md:flex-row md:items-center">

        <div>

          <div className="flex flex-wrap items-center gap-2">

            <h2 className="text-lg font-bold">
              {api.ward}
            </h2>


            <RiskBadge
              level={
                risk.level
              }
            />

          </div>


          <p className="mt-2 text-xs text-slate-500">
            Primary Hazard:{" "}

            <span className="font-medium text-slate-300">
              {
                risk.primaryHazard
              }
            </span>
          </p>

        </div>


        <div className="flex gap-6">

          <Metric
            label="Risk"
            value={`${risk.risk}/100`}
          />


          <Metric
            label="Confidence"
            value={`${risk.confidence}%`}
          />

        </div>

      </div>


      {/* EVIDENCE SOURCES */}

      <div className="grid gap-4 p-5 xl:grid-cols-3">

        <EvidenceSource
          icon={
            CloudRain
          }
          title="Rainfall"
          value={`${api.rainfallMm} mm/hr`}
          source={
            api.sources
              ?.rainfall ??
            "Unknown"
          }
          mode={
            api.sources
              ?.rainfallMode ??
            "UNKNOWN"
          }
          contribution={
            breakdown.rainScore
          }
          maxContribution={
            40
          }
          explanation={
            findFactorReason(
              risk,
              "Rainfall"
            )
          }
        />


        <EvidenceSource
          icon={
            Waves
          }
          title="River Level"
          value={`${api.riverLevelCm} cm`}
          source={
            api.sources
              ?.riverLevel ??
            "Unknown"
          }
          mode={
            api.sources
              ?.riverLevelMode ??
            "UNKNOWN"
          }
          contribution={
            breakdown.riverScore
          }
          maxContribution={
            40
          }
          explanation={
            findFactorReason(
              risk,
              "River Level"
            )
          }
        />


        <EvidenceSource
          icon={
            FileCheck2
          }
          title="Verified Reports"
          value={`${api.verifiedReportCount ?? api.reportCount} verified`}
          source={
            api.sources
              ?.crowdReports ??
            "Citizen reports"
          }
          mode={
            api.sources
              ?.crowdReportsMode ??
            "UNKNOWN"
          }
          contribution={
            breakdown.reportScore
          }
          maxContribution={
            20
          }
          explanation={
            findFactorReason(
              risk,
              "Verified Reports"
            )
          }
        />

      </div>


      {/* EXPLANATION */}

      <div className="grid gap-4 border-t border-white/10 p-5 lg:grid-cols-2">

        <div className="rounded-xl bg-white/[0.03] p-4">

          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Why this risk?
          </p>


          <div className="mt-4 space-y-3">

            {risk.factors.map(
              (
                factor
              ) => (

                <div
                  key={
                    factor.name
                  }
                  className="flex items-center justify-between gap-4"
                >

                  <div>

                    <p className="text-xs font-medium text-slate-300">
                      {
                        factor.name
                      }
                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-600">
                      {
                        factor.value
                      }
                    </p>

                  </div>


                  <p className="font-mono text-xs font-semibold text-blue-300">
                    +
                    {
                      factor.contribution
                    }
                  </p>

                </div>

              )
            )}

          </div>


          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">

            <p className="text-xs font-semibold text-slate-300">
              Total Risk
            </p>

            <p className="font-mono text-sm font-bold text-white">
              {
                breakdown.total
              }
              /100
            </p>

          </div>

        </div>


        <div className="rounded-xl bg-white/[0.03] p-4">

          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Recommended Action
          </p>


          <p className="mt-3 text-sm leading-6 text-slate-300">
            {
              risk.recommendedAction
            }
          </p>


          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">

            <CheckCircle2 className="h-4 w-4 text-emerald-400" />

            Decision support generated
            from current evidence.

          </div>

        </div>

      </div>

    </article>
  );
}


/* ========================================================================= */
/* EVIDENCE SOURCE                                                           */
/* ========================================================================= */

function EvidenceSource({
  icon: Icon,
  title,
  value,
  source,
  mode,
  contribution,
  maxContribution,
  explanation,
}: {
  icon: typeof CloudRain;

  title: string;

  value: string;

  source: string;

  mode: string;

  contribution: number;

  maxContribution: number;

  explanation: string;
}) {

  const percentage =
    Math.min(
      100,
      Math.max(
        0,
        (
          contribution /
          maxContribution
        ) *
          100
      )
    );


  return (
    <div className="rounded-xl border border-white/10 bg-[#07111f] p-4">

      <div className="flex items-start justify-between gap-3">

        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">

            <Icon className="h-4 w-4 text-blue-400" />

          </div>


          <div>

            <p className="text-xs text-slate-500">
              {title}
            </p>

            <p className="mt-0.5 text-lg font-bold text-white">
              {value}
            </p>

          </div>

        </div>


        <ModeBadge
          mode={
            mode
          }
        />

      </div>


      <div className="mt-4">

        <div className="mb-2 flex items-center justify-between text-[10px]">

          <span className="text-slate-600">
            Risk contribution
          </span>

          <span className="font-mono text-blue-300">
            {contribution}/
            {maxContribution}
          </span>

        </div>


        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">

          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{
              width:
                `${percentage}%`,
            }}
          />

        </div>

      </div>


      <div className="mt-4 border-t border-white/5 pt-3">

        <p className="text-[9px] uppercase tracking-wider text-slate-600">
          Source
        </p>

        <p className="mt-1 break-words text-[11px] text-slate-400">
          {source}
        </p>

      </div>


      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        {explanation}
      </p>

    </div>
  );
}


/* ========================================================================= */
/* BADGES                                                                    */
/* ========================================================================= */

function RiskBadge({
  level,
}: {
  level:
    RiskLevel;
}) {

  const styles:
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
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest ring-1 ${
        styles[
          level
        ]
      }`}
    >
      {level}
    </span>
  );
}


function ModeBadge({
  mode,
}: {
  mode: string;
}) {

  let style =
    "bg-white/5 text-slate-400 ring-white/10";


  if (
    mode === "REAL"
  ) {
    style =
      "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20";
  }


  if (
    mode === "IOT"
  ) {
    style =
      "bg-blue-500/10 text-blue-400 ring-blue-500/20";
  }


  if (
    mode ===
    "SIMULATED"
  ) {
    style =
      "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20";
  }


  return (
    <span
      className={`rounded-full px-2 py-1 text-[9px] font-bold tracking-wider ring-1 ${style}`}
    >
      {mode}
    </span>
  );
}


/* ========================================================================= */
/* SUMMARY                                                                   */
/* ========================================================================= */

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon:
    typeof Database;

  label:
    string;

  value:
    number;

  description:
    string;
}) {

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a1728] p-4">

      <div className="flex items-center justify-between">

        <Icon className="h-5 w-5 text-blue-400" />

        <p className="text-2xl font-bold">
          {value}
        </p>

      </div>


      <p className="mt-3 text-sm font-medium text-slate-300">
        {label}
      </p>


      <p className="mt-1 text-[10px] text-slate-600">
        {description}
      </p>

    </div>
  );
}


/* ========================================================================= */
/* METRIC                                                                    */
/* ========================================================================= */

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (
    <div className="text-right">

      <p className="text-[9px] uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-white">
        {value}
      </p>

    </div>
  );
}


/* ========================================================================= */
/* STATES                                                                    */
/* ========================================================================= */

function LoadingState() {

  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-white/10 bg-[#0a1728]">

      <div className="text-center">

        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-400" />

        <p className="mt-3 text-sm text-slate-500">
          Building evidence view...
        </p>

      </div>

    </div>
  );
}


function EmptyState() {

  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-white/10 bg-[#0a1728]">

      <div className="text-center">

        <Database className="mx-auto h-8 w-8 text-slate-700" />

        <p className="mt-3 text-sm font-medium text-slate-300">
          No evidence available
        </p>

        <p className="mt-1 text-xs text-slate-600">
          Ward evidence will appear
          when data becomes available.
        </p>

      </div>

    </div>
  );
}


/* ========================================================================= */
/* HELPERS                                                                   */
/* ========================================================================= */

function findFactorReason(
  risk: WardRisk,
  name: string
): string {

  const factor =
    risk.factors.find(
      (
        item
      ) =>
        item.name ===
        name
    );

  return (
    factor?.reason ??
    "No explanation available."
  );
}