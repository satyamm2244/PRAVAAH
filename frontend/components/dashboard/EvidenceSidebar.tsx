"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CloudRain,
  Droplets,
  FileCheck2,
  FileQuestion,
  FileX2,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import type {
  WardRisk,
} from "@/lib/risk-engine";

import {
  WARD_DATA,
} from "@/lib/ward-data";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type EvidenceSidebarProps = {
  wardRisk: WardRisk | null;
  onClose: () => void;
};


type BackendWardEvidence = {
  ward: string;

  rainfallMm: number;

  riverLevelCm: number;

  reportCount: number;

  verifiedReportCount: number;

  pendingReportCount: number;

  rejectedReportCount: number;

  totalReportCount: number;

  latitude: number;

  longitude: number;

  dataMode: string;

  sources?: {
    rainfall?: string;
    rainfallMode?: string;

    riverLevel?: string;
    riverLevelMode?: string;

    crowdReports?: string;
    crowdReportsMode?: string;
  };

  timestamp?: number;
};


/* ========================================================================= */
/* CONFIG                                                                    */
/* ========================================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


/* ========================================================================= */
/* MAIN COMPONENT                                                            */
/* ========================================================================= */

export default function EvidenceSidebar({
  wardRisk,
  onClose,
}: EvidenceSidebarProps) {

  const [
    backendEvidence,
    setBackendEvidence,
  ] =
    useState<BackendWardEvidence | null>(
      null
    );

  const [
    evidenceLoading,
    setEvidenceLoading,
  ] =
    useState(false);

  const [
    evidenceError,
    setEvidenceError,
  ] =
    useState(false);


  /* ----------------------------------------------------------------------- */
  /* FETCH BACKEND EVIDENCE                                                  */
  /* ----------------------------------------------------------------------- */

  useEffect(() => {

    if (!wardRisk) {

      setBackendEvidence(
        null
      );

      return;
    }


    let cancelled = false;


    async function fetchEvidence() {

      try {

        setEvidenceLoading(
          true
        );

        setEvidenceError(
          false
        );


        const response =
          await fetch(
            `${API_BASE_URL}/api/wards/${wardRisk?.ward}`,
            {
              cache:
                "no-store",
            }
          );


        if (!response.ok) {

          throw new Error(
            `Backend returned ${response.status}`
          );
        }


        const data:
          BackendWardEvidence =
          await response.json();


        if (!cancelled) {

          setBackendEvidence(
            data
          );

        }

      } catch (error) {

        console.error(
          "Unable to fetch ward evidence:",
          error
        );


        if (!cancelled) {

          setEvidenceError(
            true
          );

        }

      } finally {

        if (!cancelled) {

          setEvidenceLoading(
            false
          );

        }

      }

    }


    fetchEvidence();


    const interval =
      setInterval(
        fetchEvidence,
        4000
      );


    return () => {

      cancelled = true;

      clearInterval(
        interval
      );

    };

  }, [wardRisk]);


  /* ----------------------------------------------------------------------- */
  /* NO SELECTION                                                            */
  /* ----------------------------------------------------------------------- */

  if (!wardRisk) {

    return null;

  }


  const wardData =
    WARD_DATA[
      wardRisk.ward
    ];


  const rainfall =
    wardRisk.reading
      .rainfallMm;


  const riverLevel =
    wardRisk.reading
      .riverLevelCm;


  /*
   * IMPORTANT:
   *
   * This is already VERIFIED
   * report count only.
   */
  const verifiedReports =
    backendEvidence
      ?.verifiedReportCount ??
    wardRisk.reading
      .reportCount;


  const pendingReports =
    backendEvidence
      ?.pendingReportCount ??
    0;


  const rejectedReports =
    backendEvidence
      ?.rejectedReportCount ??
    0;


  const totalReports =
    backendEvidence
      ?.totalReportCount ??
    verifiedReports;


  const levelStyles = {

    CRITICAL:
      "bg-red-500/15 text-red-400 border-red-500/20",

    HIGH:
      "bg-orange-500/15 text-orange-400 border-orange-500/20",

    WATCH:
      "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",

    NORMAL:
      "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",

  };


  return (
    <>

      {/* ================================================================ */}
      {/* BACKDROP                                                         */}
      {/* ================================================================ */}

      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={
          onClose
        }
      />


      {/* ================================================================ */}
      {/* SIDEBAR                                                          */}
      {/* ================================================================ */}

      <aside className="fixed right-0 top-0 z-50 h-screen w-full overflow-y-auto border-l border-white/10 bg-[#07111f] shadow-2xl sm:w-[460px]">


        {/* ================================================================ */}
        {/* HEADER                                                           */}
        {/* ================================================================ */}

        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#07111f]/95 p-5 backdrop-blur">

          <div className="flex items-start justify-between gap-4">

            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                Evidence Analysis
              </p>


              <div className="mt-2 flex items-center gap-3">

                <h2 className="text-2xl font-bold text-white">
                  {
                    wardRisk.ward
                  }
                </h2>


                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider ${
                    levelStyles[
                      wardRisk.level
                    ]
                  }`}
                >
                  {
                    wardRisk.level
                  }
                </span>

              </div>


              {wardData && (

                <p className="mt-1 text-sm text-slate-500">
                  {
                    wardData.zone
                  }
                </p>

              )}

            </div>


            <button
              type="button"
              onClick={
                onClose
              }
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close evidence sidebar"
            >

              <X className="h-5 w-5" />

            </button>

          </div>

        </div>


        {/* ================================================================ */}
        {/* CONTENT                                                          */}
        {/* ================================================================ */}

        <div className="space-y-6 p-5">


          {/* ============================================================= */}
          {/* WHY FLAGGED                                                   */}
          {/* ============================================================= */}

          <section>

            <div className="mb-4">

              <h3 className="text-sm font-semibold text-white">
                Why is this ward flagged?
              </h3>


              <p className="mt-1 text-xs leading-5 text-slate-500">
                Signals currently contributing
                to the ward-level risk assessment.
              </p>

            </div>


            <div className="space-y-3">

              <EvidenceCard
                icon={
                  CloudRain
                }
                title="Rainfall"
                value={`${rainfall} mm/hr`}
                description={
                  getRainfallDescription(
                    rainfall
                  )
                }
              />


              <EvidenceCard
                icon={
                  Droplets
                }
                title="River Level"
                value={
                  formatRiverLevel(
                    riverLevel
                  )
                }
                description={
                  getRiverDescription(
                    riverLevel
                  )
                }
              />


              <EvidenceCard
                icon={
                  Users
                }
                title="Verified Reports"
                value={`${verifiedReports}`}
                description={
                  getReportDescription(
                    verifiedReports
                  )
                }
              />

            </div>

          </section>


          {/* ============================================================= */}
          {/* CITIZEN EVIDENCE BREAKDOWN                                    */}
          {/* ============================================================= */}

          <section className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">

            <div className="flex items-start justify-between gap-3">

              <div>

                <h3 className="text-sm font-semibold text-white">
                  Citizen Evidence
                </h3>


                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Human verification status
                  of submitted ground reports.
                </p>

              </div>


              {evidenceLoading && (

                <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />

              )}

            </div>


            {evidenceError ? (

              <div className="mt-4 rounded-xl border border-yellow-500/15 bg-yellow-500/[0.05] p-4">

                <p className="text-xs leading-5 text-yellow-300">
                  Unable to refresh report
                  verification details.
                </p>

              </div>

            ) : (

              <>
                <div className="mt-5 grid grid-cols-2 gap-3">

                  <EvidenceCountBox
                    icon={
                      FileCheck2
                    }
                    label="Verified"
                    value={
                      verifiedReports
                    }
                    className="text-emerald-400"
                  />


                  <EvidenceCountBox
                    icon={
                      FileQuestion
                    }
                    label="Pending"
                    value={
                      pendingReports
                    }
                    className="text-yellow-400"
                  />


                  <EvidenceCountBox
                    icon={
                      FileX2
                    }
                    label="Rejected"
                    value={
                      rejectedReports
                    }
                    className="text-slate-400"
                  />


                  <EvidenceCountBox
                    icon={
                      Users
                    }
                    label="Total"
                    value={
                      totalReports
                    }
                    className="text-blue-400"
                  />

                </div>


                {/* VERIFICATION POLICY */}

                <div className="mt-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4">

                  <div className="flex items-start gap-3">

                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />


                    <div>

                      <p className="text-xs font-semibold text-emerald-300">
                        Human-Verified Risk Input
                      </p>


                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        Only verified citizen
                        reports contribute to
                        PRAVAAH&apos;s operational
                        risk score. Pending and
                        rejected reports do not
                        influence risk calculations.
                      </p>

                    </div>

                  </div>

                </div>

              </>

            )}

          </section>


          {/* ============================================================= */}
          {/* RISK CONTRIBUTION                                             */}
          {/* ============================================================= */}

          <section className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">

            <div className="mb-5">

              <div className="flex items-center gap-2">

                <Activity className="h-4 w-4 text-blue-400" />


                <h3 className="text-sm font-semibold text-white">
                  Risk Contribution
                </h3>

              </div>


              <p className="mt-1 text-xs leading-5 text-slate-500">
                Contribution of each
                verified signal to the
                final risk score.
              </p>

            </div>


            <div className="space-y-5">

              {wardRisk.factors.map(
                (factor) => (

                  <RiskFactorBar
                    key={
                      factor.name
                    }
                    name={
                      factor.name
                    }
                    value={
                      factor.value
                    }
                    contribution={
                      factor.contribution
                    }
                    reason={
                      factor.reason
                    }
                  />

                )
              )}

            </div>

          </section>


          {/* ============================================================= */}
          {/* RISK ASSESSMENT                                               */}
          {/* ============================================================= */}

          <section className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">

            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Risk Assessment
            </p>


            <div className="mt-5 grid grid-cols-2 gap-3">

              <MetricBox
                label="Risk Score"
                value={`${wardRisk.risk}/100`}
              />


              <MetricBox
                label="Confidence"
                value={`${wardRisk.confidence}%`}
              />

            </div>


            {/* RISK BAR */}

            <div className="mt-5">

              <div className="mb-2 flex items-center justify-between text-xs">

                <span className="text-slate-500">
                  Overall risk intensity
                </span>


                <span className="font-semibold text-white">
                  {
                    wardRisk.risk
                  }%
                </span>

              </div>


              <div className="h-2 overflow-hidden rounded-full bg-white/5">

                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    getRiskBarColor(
                      wardRisk.level
                    )
                  }`}
                  style={{
                    width:
                      `${Math.min(
                        100,
                        wardRisk.risk
                      )}%`,
                  }}
                />

              </div>

            </div>


            {/* CONFIDENCE BAR */}

            <div className="mt-5">

              <div className="mb-2 flex items-center justify-between text-xs">

                <span className="text-slate-500">
                  Assessment confidence
                </span>


                <span className="font-semibold text-white">
                  {
                    wardRisk.confidence
                  }%
                </span>

              </div>


              <div className="h-2 overflow-hidden rounded-full bg-white/5">

                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{
                    width:
                      `${Math.min(
                        100,
                        wardRisk.confidence
                      )}%`,
                  }}
                />

              </div>

            </div>

          </section>


          {/* ============================================================= */}
          {/* PRIMARY HAZARD                                                */}
          {/* ============================================================= */}

          <section className="rounded-2xl border border-orange-500/15 bg-orange-500/[0.04] p-5">

            <div className="flex items-start gap-3">

              <div className="rounded-lg bg-orange-500/10 p-2">

                <AlertTriangle className="h-5 w-5 text-orange-400" />

              </div>


              <div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Primary Hazard
                </p>


                <p className="mt-1 font-semibold text-white">
                  {
                    wardRisk.primaryHazard
                  }
                </p>

              </div>

            </div>

          </section>


          {/* ============================================================= */}
          {/* RECOMMENDED ACTION                                            */}
          {/* ============================================================= */}

          <section className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-5">

            <div className="flex items-start gap-3">

              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />


              <div>

                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">
                  Recommended Action
                </p>


                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {
                    wardRisk.recommendedAction
                  }
                </p>

              </div>

            </div>

          </section>


          {/* ============================================================= */}
          {/* EVIDENCE STATUS                                               */}
          {/* ============================================================= */}

          <section>

            <h3 className="mb-3 text-sm font-semibold text-white">
              Evidence Status
            </h3>


            <div className="space-y-2">

              <StatusRow
                icon={
                  CheckCircle2
                }
                text="Rainfall signal available"
                className="text-emerald-400"
              />


              <StatusRow
                icon={
                  CheckCircle2
                }
                text="Risk-engine analysis completed"
                className="text-emerald-400"
              />


              {verifiedReports >
              0 ? (

                <StatusRow
                  icon={
                    CheckCircle2
                  }
                  text={`${verifiedReports} citizen report${
                    verifiedReports ===
                    1
                      ? ""
                      : "s"
                  } verified`}
                  className="text-emerald-400"
                />

              ) : (

                <StatusRow
                  icon={
                    Clock3
                  }
                  text="No verified citizen evidence yet"
                  className="text-yellow-400"
                />

              )}


              {pendingReports >
                0 && (

                <StatusRow
                  icon={
                    Clock3
                  }
                  text={`${pendingReports} report${
                    pendingReports ===
                    1
                      ? ""
                      : "s"
                  } awaiting human review`}
                  className="text-yellow-400"
                />

              )}

            </div>

          </section>


          {/* ============================================================= */}
          {/* WARD CONTEXT                                                  */}
          {/* ============================================================= */}

          {wardData && (

            <section className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">

              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Ward Context
              </p>


              <div className="mt-4 grid grid-cols-2 gap-3">

                <MetricBox
                  label="Population"
                  value={
                    wardData.population.toLocaleString()
                  }
                />


                <MetricBox
                  label="Area"
                  value={`${wardData.area.toFixed(
                    1
                  )} ha`}
                />


                <MetricBox
                  label="Male Population"
                  value={
                    wardData.malePopulation.toLocaleString()
                  }
                />


                <MetricBox
                  label="Female Population"
                  value={
                    wardData.femalePopulation.toLocaleString()
                  }
                />

              </div>

            </section>

          )}


          {/* ============================================================= */}
          {/* DISCLAIMER                                                    */}
          {/* ============================================================= */}

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">

            <p className="text-center text-[10px] leading-5 text-slate-600">
              PRAVAAH provides
              decision-support intelligence.
              Critical operational actions
              should be verified by authorized
              personnel before execution.
            </p>

          </div>

        </div>

      </aside>

    </>
  );
}


/* ========================================================================= */
/* EVIDENCE COUNT BOX                                                        */
/* ========================================================================= */

function EvidenceCountBox({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof FileCheck2;
  label: string;
  value: number;
  className: string;
}) {

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">

      <div className="flex items-center justify-between">

        <Icon
          className={`h-4 w-4 ${
            className
          }`}
        />


        <span className="text-xl font-bold text-white">
          {value}
        </span>

      </div>


      <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>

    </div>
  );
}


/* ========================================================================= */
/* EVIDENCE CARD                                                             */
/* ========================================================================= */

function EvidenceCard({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: typeof CloudRain;
  title: string;
  value: string;
  description: string;
}) {

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a1728] p-4">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">

          <Icon className="h-5 w-5 text-blue-400" />

        </div>


        <div className="min-w-0 flex-1">

          <div className="flex items-center justify-between gap-3">

            <p className="text-sm font-medium text-slate-300">
              {title}
            </p>


            <p className="text-sm font-bold text-white">
              {value}
            </p>

          </div>


          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>

        </div>

      </div>

    </div>
  );
}


/* ========================================================================= */
/* RISK FACTOR BAR                                                           */
/* ========================================================================= */

function RiskFactorBar({
  name,
  value,
  contribution,
  reason,
}: {
  name: string;
  value: string;
  contribution: number;
  reason: string;
}) {

  const maxContribution =
    name === "Rainfall"
      ? 45
      : name ===
          "River Level"
        ? 35
        : 20;


  const percentage =
    Math.min(
      100,
      Math.max(
        0,
        (
          contribution /
          maxContribution
        ) * 100
      )
    );


  return (
    <div>

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-sm font-medium text-slate-300">
            {name}
          </p>


          <p className="mt-0.5 text-xs text-slate-500">
            {value}
          </p>

        </div>


        <div className="text-right">

          <p className="text-sm font-bold text-white">
            +{contribution}
          </p>


          <p className="text-[9px] uppercase tracking-wider text-slate-600">
            points
          </p>

        </div>

      </div>


      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/5">

        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{
            width:
              `${percentage}%`,
          }}
        />

      </div>


      <div className="mt-1 flex justify-between text-[9px] text-slate-600">

        <span>
          Contribution
        </span>


        <span>
          {contribution}/
          {maxContribution}
        </span>

      </div>


      <p className="mt-2 text-xs leading-5 text-slate-500">
        {reason}
      </p>

    </div>
  );
}


/* ========================================================================= */
/* METRIC BOX                                                                */
/* ========================================================================= */

function MetricBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (
    <div className="rounded-lg bg-white/[0.04] p-3">

      <p className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </p>


      <p className="mt-1 text-lg font-bold text-white">
        {value}
      </p>

    </div>
  );
}


/* ========================================================================= */
/* STATUS ROW                                                                */
/* ========================================================================= */

function StatusRow({
  icon: Icon,
  text,
  className,
}: {
  icon: typeof CheckCircle2;
  text: string;
  className: string;
}) {

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">

      <Icon
        className={`h-4 w-4 shrink-0 ${
          className
        }`}
      />


      <p className="text-xs text-slate-400">
        {text}
      </p>

    </div>
  );
}


/* ========================================================================= */
/* DESCRIPTION HELPERS                                                       */
/* ========================================================================= */

function getRainfallDescription(
  rainfall: number
) {

  if (
    rainfall >= 100
  ) {

    return "Extremely heavy rainfall detected.";

  }


  if (
    rainfall >= 60
  ) {

    return "Heavy rainfall is significantly increasing local risk.";

  }


  if (
    rainfall >= 30
  ) {

    return "Moderate rainfall conditions detected.";

  }


  return "Rainfall contribution is currently low.";
}


function getRiverDescription(
  level: number
) {

  if (
    level >= 50
  ) {

    return "River level is significantly elevated.";

  }


  if (
    level >= 25
  ) {

    return "Elevated river conditions require monitoring.";

  }


  if (
    level >= 10
  ) {

    return "Moderate river-level conditions detected.";

  }


  return "River level is currently within a manageable range.";
}


function getReportDescription(
  reports: number
) {

  if (
    reports >= 15
  ) {

    return "Multiple verified reports strongly corroborate the detected conditions.";

  }


  if (
    reports >= 5
  ) {

    return "Verified ground reports provide additional confirmation of local conditions.";

  }


  if (
    reports > 0
  ) {

    return "A limited number of verified ground reports are available.";

  }


  return "No verified citizen reports currently contribute to the risk score.";
}


/* ========================================================================= */
/* FORMAT RIVER LEVEL                                                        */
/* ========================================================================= */

function formatRiverLevel(
  level: number
) {

  return `${
    level >= 0
      ? "+"
      : ""
  }${level} cm`;
}


/* ========================================================================= */
/* RISK BAR COLOR                                                            */
/* ========================================================================= */

function getRiskBarColor(
  level: WardRisk["level"]
) {

  switch (
    level
  ) {

    case "CRITICAL":

      return "bg-red-500";


    case "HIGH":

      return "bg-orange-500";


    case "WATCH":

      return "bg-yellow-500";


    case "NORMAL":

      return "bg-emerald-500";


    default:

      return "bg-blue-500";

  }
}