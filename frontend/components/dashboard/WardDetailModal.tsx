"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MapPinned,
  Route,
  Users,
  X,
} from "lucide-react";

import type {
  WardRisk,
} from "@/lib/risk-engine";

import type {
  PropagationLikelihood,
  WardPropagationResult,
} from "@/lib/propagation-engine";


type WardDetailModalProps = {
  wardRisk: WardRisk;

  propagation?:
    WardPropagationResult | null;

  onClose: () => void;
};


const levelColor = {
  CRITICAL:
    "text-red-400 bg-red-500/10 ring-red-500/20",

  HIGH:
    "text-orange-400 bg-orange-500/10 ring-orange-500/20",

  WATCH:
    "text-yellow-400 bg-yellow-500/10 ring-yellow-500/20",

  NORMAL:
    "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20",
} as const;


const factorColors = {
  Rainfall:
    "bg-blue-400",

  "River Level":
    "bg-cyan-400",

  "Verified Reports":
    "bg-purple-400",
} as const;


const likelihoodStyles:
  Record<
    PropagationLikelihood,
    string
  > = {

    "VERY HIGH":
      "bg-red-500/10 text-red-300 ring-red-500/20",

    HIGH:
      "bg-orange-500/10 text-orange-300 ring-orange-500/20",

    MODERATE:
      "bg-yellow-500/10 text-yellow-300 ring-yellow-500/20",

    LOW:
      "bg-purple-500/10 text-purple-300 ring-purple-500/20",
  };


export default function WardDetailModal({
  wardRisk,
  propagation,
  onClose,
}: WardDetailModalProps) {

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ward-detail-title"
      onClick={
        onClose
      }
    >

      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0a1728] p-6 shadow-2xl"
        onClick={(
          event
        ) =>
          event.stopPropagation()
        }
      >

        {/* =============================================================== */}
        {/* HEADER                                                          */}
        {/* =============================================================== */}

        <div className="flex items-start justify-between gap-4">

          <div>

            <span
              className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest ring-1 ${
                levelColor[
                  wardRisk.level
                ]
              }`}
            >
              {
                wardRisk.level
              }
            </span>


            <h2
              id="ward-detail-title"
              className="mt-3 text-xl font-bold text-white"
            >
              {
                wardRisk.ward
              }
            </h2>


            <p className="mt-1 text-sm text-slate-400">
              {
                wardRisk.primaryHazard
              }
            </p>

          </div>


          <button
            type="button"
            onClick={
              onClose
            }
            className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
            aria-label="Close ward details"
          >

            <X className="h-5 w-5" />

          </button>

        </div>


        {/* =============================================================== */}
        {/* TOP METRICS                                                      */}
        {/* =============================================================== */}

        <div className="mt-6 grid grid-cols-2 gap-3">

          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">

            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Risk Score
            </p>


            <div className="mt-1 flex items-end gap-1">

              <p className="text-3xl font-bold text-white">
                {
                  wardRisk.risk
                }
              </p>

              <p className="mb-1 text-sm text-slate-500">
                /100
              </p>

            </div>

          </div>


          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">

            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Confidence
            </p>


            <div className="mt-1 flex items-end gap-1">

              <p className="text-3xl font-bold text-white">
                {
                  wardRisk.confidence
                }
              </p>

              <p className="mb-1 text-sm text-slate-500">
                %
              </p>

            </div>

          </div>

        </div>


        {/* =============================================================== */}
        {/* EXPLAINABLE RISK                                                */}
        {/* =============================================================== */}

        <section className="mt-7">

          <div className="mb-4">

            <h3 className="text-sm font-semibold text-white">
              Why This Ward Is At Risk
            </h3>


            <p className="mt-1 text-xs text-slate-500">
              PRAVAAH combines environmental
              signals and officer-verified
              citizen evidence to calculate
              the current risk assessment.
            </p>

          </div>


          <div className="space-y-4">

            {wardRisk.factors.map(
              (
                factor
              ) => {

                const maximum =
                  getFactorMaximum(
                    factor.name
                  );


                const percentage =
                  Math.round(
                    (
                      factor.contribution /
                      maximum
                    ) *
                    100
                  );


                const color =
                  factorColors[
                    factor.name as keyof typeof factorColors
                  ] ??
                  "bg-blue-400";


                return (

                  <div
                    key={
                      factor.name
                    }
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                  >

                    <div className="flex items-center justify-between gap-4">

                      <div>

                        <p className="text-sm font-medium text-slate-200">
                          {
                            factor.name
                          }
                        </p>


                        <p className="mt-1 text-xs text-slate-500">
                          {
                            factor.value
                          }
                        </p>

                      </div>


                      <div className="text-right">

                        <p className="text-sm font-semibold text-white">
                          {
                            factor.contribution
                          } pts
                        </p>


                        <p className="text-[10px] text-slate-600">
                          contribution
                        </p>

                      </div>

                    </div>


                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">

                      <div
                        className={`h-full rounded-full ${color}`}
                        style={{
                          width:
                            `${Math.min(
                              100,
                              percentage
                            )}%`,
                        }}
                      />

                    </div>


                    <p className="mt-3 text-xs leading-relaxed text-slate-500">
                      {
                        factor.reason
                      }
                    </p>

                  </div>

                );
              }
            )}

          </div>

        </section>


        {/* =============================================================== */}
        {/* PROPAGATION FORECAST                                            */}
        {/* =============================================================== */}

        <section className="mt-7">

          <div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.04] p-5">

            <div className="flex items-start justify-between gap-3">

              <div className="flex gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">

                  <Route className="h-4 w-4 text-purple-300" />

                </div>


                <div>

                  <h3 className="text-sm font-semibold text-white">
                    Potential Risk Propagation
                  </h3>


                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Forecast of nearby wards
                    that may deteriorate if
                    current conditions in{" "}
                    {
                      wardRisk.ward
                    } continue.
                  </p>

                </div>

              </div>


              <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-[9px] font-bold tracking-wider text-purple-300 ring-1 ring-purple-500/20">
                DIGITAL TWIN
              </span>

            </div>


            {!propagation ||
            propagation.forecasts.length ===
              0 ? (

              <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">

                <p className="text-sm text-slate-300">
                  No meaningful nearby
                  propagation signal detected.
                </p>


                <p className="mt-1 text-xs leading-5 text-slate-600">
                  PRAVAAH will continue
                  monitoring neighbouring wards
                  as live conditions change.
                </p>

              </div>

            ) : (

              <div className="mt-5 space-y-3">

                {propagation.forecasts
                  .slice(
                    0,
                    5
                  )
                  .map(
                    (
                      forecast
                    ) => (

                    <div
                      key={
                        forecast.targetWard
                      }
                      className="rounded-xl border border-white/5 bg-[#07111f]/70 p-4"
                    >

                      <div className="flex flex-wrap items-start justify-between gap-3">

                        <div>

                          <div className="flex items-center gap-2">

                            <MapPinned className="h-4 w-4 text-purple-300" />


                            <p className="font-semibold text-white">
                              {
                                forecast.targetWard
                              }
                            </p>


                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ring-1 ${
                                likelihoodStyles[
                                  forecast.likelihood
                                ]
                              }`}
                            >
                              {
                                forecast.likelihood
                              }
                            </span>

                          </div>


                          <p className="mt-3 text-2xl font-bold text-purple-200">
                            {
                              forecast.probability
                            }%
                          </p>


                          <p className="text-[10px] uppercase tracking-wider text-slate-600">
                            propagation probability
                          </p>

                        </div>


                        <div className="grid grid-cols-2 gap-2">

                          <MiniMetric
                            icon={
                              Clock3
                            }
                            label="ETA"
                            value={`${forecast.estimatedMinutes} min`}
                          />


                          <MiniMetric
                            icon={
                              Route
                            }
                            label="Distance"
                            value={`${forecast.distanceKm} km`}
                          />

                        </div>

                      </div>


                      {/* POPULATION */}

                      {forecast.affectedPopulation !==
                        null && (

                        <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/[0.025] px-3 py-2.5 text-xs text-slate-500">

                          <Users className="h-3.5 w-3.5 text-slate-500" />


                          Potential population exposure:


                          <span className="font-medium text-slate-300">

                            {
                              forecast.affectedPopulation.toLocaleString(
                                "en-IN"
                              )
                            }

                          </span>

                        </div>

                      )}


                      {/* DRIVERS */}

                      <div className="mt-3 flex flex-wrap gap-1.5">

                        {forecast.drivers.map(
                          (
                            driver
                          ) => (

                          <span
                            key={
                              driver
                            }
                            className="rounded-md bg-white/[0.04] px-2 py-1 text-[10px] text-slate-400"
                          >

                            {
                              driver
                            }

                          </span>

                        )
                      )}

                      </div>


                      {/* TARGET STATUS */}

                      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">

                        <div>

                          <p className="text-[9px] uppercase tracking-wider text-slate-600">
                            Current Target Risk
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-300">
                            {
                              forecast.targetRisk
                            }
                            /100
                          </p>

                        </div>


                        <div>

                          <p className="text-[9px] uppercase tracking-wider text-slate-600">
                            Current Status
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-300">
                            {
                              forecast.targetLevel
                            }
                          </p>

                        </div>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        </section>


        {/* =============================================================== */}
        {/* RECOMMENDED ACTION                                              */}
        {/* =============================================================== */}

        <section className="mt-7">

          <div className="rounded-xl border border-blue-400/10 bg-blue-500/[0.06] p-4">

            <div className="flex gap-3">

              <div className="mt-0.5 shrink-0">

                {wardRisk.level ===
                "NORMAL" ? (

                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />

                ) : (

                  <AlertTriangle className="h-5 w-5 text-orange-400" />

                )}

              </div>


              <div>

                <h3 className="text-sm font-semibold text-white">
                  Recommended Action
                </h3>


                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {
                    wardRisk.recommendedAction
                  }
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* =============================================================== */}
        {/* FOOTER                                                          */}
        {/* =============================================================== */}

        <div className="mt-6 border-t border-white/5 pt-4">

          <p className="text-[11px] leading-relaxed text-slate-600">
            Risk and propagation forecasts are
            prototype decision-support estimates
            generated from live rainfall,
            river-level, verified citizen
            evidence and geographic proximity.
            They are not official evacuation
            orders or hydrological forecasts.
          </p>

        </div>

      </div>

    </div>
  );
}


/* ========================================================================= */
/* FACTOR MAXIMUM                                                            */
/* ========================================================================= */

function getFactorMaximum(
  name: string
): number {

  switch (
    name
  ) {

    case "Rainfall":
      return 40;


    case "River Level":
      return 40;


    case "Verified Reports":
      return 20;


    default:
      return 100;
  }
}


/* ========================================================================= */
/* MINI METRIC                                                               */
/* ========================================================================= */

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon:
    typeof Clock3;

  label:
    string;

  value:
    string;
}) {

  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2">

      <div className="flex items-center gap-1 text-slate-600">

        <Icon className="h-3 w-3" />

        <span className="text-[9px] uppercase tracking-wider">
          {
            label
          }
        </span>

      </div>


      <p className="mt-1 text-xs font-semibold text-slate-300">
        {
          value
        }
      </p>

    </div>
  );
}