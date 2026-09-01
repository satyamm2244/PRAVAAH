"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  BarChart3,
  CloudRain,
  FlaskConical,
  RefreshCw,
  ShieldAlert,
  Users,
  Waves,
} from "lucide-react";

import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import RequireOfficer from "@/components/auth/RequireOfficer";

import {
  evaluateAllWards,
  type WardRisk,
} from "@/lib/risk-engine";

import type {
  WardReading,
} from "@/lib/mock-engine";

import {
  runDisasterSimulation,
  type SimulationResult,
} from "@/lib/simulation-engine";

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

  latitude: number;

  longitude: number;
};


/* ========================================================================= */
/* CONFIG                                                                    */
/* ========================================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


const SIMULATION_PRESETS = [
  {
    name: "Urban Flood",
    rainfallMm: 220,
    riverLevelCm: 180,
    windSpeedKmh: 35,
    fireRiskIndex: 0,
    smokeLevel: 0,
    seismicIntensity: 0,
    infrastructureStress: 20,
    verifiedReports: 8,
  },
  {
    name: "Major Fire",
    rainfallMm: 0,
    riverLevelCm: 0,
    windSpeedKmh: 45,
    fireRiskIndex: 100,
    smokeLevel: 95,
    seismicIntensity: 0,
    infrastructureStress: 25,
    verifiedReports: 7,
  },
  {
    name: "Severe Storm",
    rainfallMm: 150,
    riverLevelCm: 70,
    windSpeedKmh: 150,
    fireRiskIndex: 0,
    smokeLevel: 0,
    seismicIntensity: 0,
    infrastructureStress: 35,
    verifiedReports: 5,
  },
] as const;


/* ========================================================================= */
/* PAGE                                                                      */
/* ========================================================================= */

function SimulatorPageContent() {
  const [
    backendWards,
    setBackendWards,
  ] =
    useState<
      BackendWard[]
    >([]);

  const [
    wardRisks,
    setWardRisks,
  ] =
    useState<
      WardRisk[]
    >([]);

  const [
    selectedWard,
    setSelectedWard,
  ] =
    useState(
      "W16"
    );

  const [
    rainfallMm,
    setRainfallMm,
  ] =
    useState(
      50
    );

  const [
    riverLevelCm,
    setRiverLevelCm,
  ] =
    useState(
      60
    );

  const [
    windSpeedKmh,
    setWindSpeedKmh,
  ] =
    useState(
      0
    );

  const [
    fireRiskIndex,
    setFireRiskIndex,
  ] =
    useState(
      0
    );

  const [
    smokeLevel,
    setSmokeLevel,
  ] =
    useState(
      0
    );

  const [
    seismicIntensity,
    setSeismicIntensity,
  ] =
    useState(
      0
    );

  const [
    infrastructureStress,
    setInfrastructureStress,
  ] =
    useState(
      0
    );

  const [
    verifiedReports,
    setVerifiedReports,
  ] =
    useState(
      3
    );

  const [
    result,
    setResult,
  ] =
    useState<
      SimulationResult | null
    >(
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
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );


  /* ----------------------------------------------------------------------- */
  /* FETCH LIVE WARD DATA                                                    */
  /* ----------------------------------------------------------------------- */

  const fetchWardData =
    useCallback(
      async () => {
        try {

          setLoading(
            true
          );


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
              `Backend returned ${response.status}`
            );
          }


          const data:
            BackendWard[] =
            await response.json();


          setBackendWards(
            data
          );


          const readings:
            WardReading[] =
            data.map(
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


          setWardRisks(
            risks
          );


          setError(
            null
          );

        } catch (
          fetchError
        ) {

          console.error(
            "Unable to load simulator data:",
            fetchError
          );


          setError(
            "Unable to load live ward data."
          );

        } finally {

          setLoading(
            false
          );
        }
      },
      []
    );


  useEffect(
    () => {
      fetchWardData();
    },
    [
      fetchWardData,
    ]
  );


  /* ----------------------------------------------------------------------- */
  /* COORDINATES                                                             */
  /* ----------------------------------------------------------------------- */

  const coordinates =
    useMemo<
      WardCoordinate[]
    >(
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


  /* ----------------------------------------------------------------------- */
  /* CURRENT WARD                                                            */
  /* ----------------------------------------------------------------------- */

  const currentWard =
    useMemo(
      () =>
        wardRisks.find(
          (
            ward
          ) =>
            ward.ward ===
            selectedWard
        ) ??
        null,
      [
        wardRisks,
        selectedWard,
      ]
    );


  /* ----------------------------------------------------------------------- */
  /* LOAD LIVE VALUES                                                        */
  /* ----------------------------------------------------------------------- */

  function loadLiveValues() {
    if (
      !currentWard
    ) {
      return;
    }


    setRainfallMm(
      currentWard.reading
        .rainfallMm
    );


    setRiverLevelCm(
      currentWard.reading
        .riverLevelCm
    );


    setVerifiedReports(
      currentWard.reading
        .reportCount
    );


    setWindSpeedKmh(
      0
    );

    setFireRiskIndex(
      0
    );

    setSmokeLevel(
      0
    );

    setSeismicIntensity(
      0
    );

    setInfrastructureStress(
      0
    );


    setResult(
      null
    );
  }


  /* ----------------------------------------------------------------------- */
  /* PRESET SCENARIOS                                                        */
  /* ----------------------------------------------------------------------- */

  function applyPreset(
    preset:
      (typeof SIMULATION_PRESETS)[number]
  ) {

    setRainfallMm(
      preset.rainfallMm
    );

    setRiverLevelCm(
      preset.riverLevelCm
    );

    setWindSpeedKmh(
      preset.windSpeedKmh
    );

    setFireRiskIndex(
      preset.fireRiskIndex
    );

    setSmokeLevel(
      preset.smokeLevel
    );

    setSeismicIntensity(
      preset.seismicIntensity
    );

    setInfrastructureStress(
      preset.infrastructureStress
    );

    setVerifiedReports(
      preset.verifiedReports
    );

    setResult(
      null
    );
  }


  /* ----------------------------------------------------------------------- */
  /* RUN SIMULATION                                                          */
  /* ----------------------------------------------------------------------- */

  function runSimulation() {
    if (
      wardRisks.length ===
        0 ||
      coordinates.length ===
        0
    ) {
      return;
    }


    const simulation =
      runDisasterSimulation(
        {
  ward:
    selectedWard,

  rainfallMm,

  riverLevelCm,

  windSpeedKmh,

  fireRiskIndex,

  smokeLevel,

  seismicIntensity,

  infrastructureStress,

  verifiedReportCount:
    verifiedReports,
},

        wardRisks,

        coordinates
      );


    setResult(
      simulation
    );
  }


  /* ----------------------------------------------------------------------- */
  /* UI                                                                      */
  /* ----------------------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-[#07111f] text-white">

      <Header />


      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[230px_1fr]">

        <Sidebar />


        <section className="min-w-0 p-5 lg:p-8">

          {/* =============================================================== */}
          {/* HEADER                                                          */}
          {/* =============================================================== */}

          <div className="mb-7">

            <div className="mb-2 flex items-center gap-2 text-sm text-purple-400">

              <FlaskConical className="h-4 w-4" />

              Disaster Digital Twin

            </div>


            <h1 className="text-3xl font-bold tracking-tight">
              What-If Disaster Simulator
            </h1>


            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Simulate future rainfall, river
              conditions and verified ground
              incidents without modifying live
              operational data.
            </p>

          </div>


          {/* =============================================================== */}
          {/* ERROR                                                           */}
          {/* =============================================================== */}

          {error && (

            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4">

              <div className="flex gap-3">

                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-400" />


                <div>

                  <p className="text-sm font-medium text-red-300">
                    Simulator unavailable
                  </p>


                  <p className="mt-1 text-xs text-red-300/70">
                    {
                      error
                    }
                  </p>

                </div>

              </div>

            </div>

          )}


          {/* =============================================================== */}
          {/* LOADING                                                         */}
          {/* =============================================================== */}

          {loading ? (

            <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-white/10 bg-[#0a1728]">

              <div className="text-center">

                <RefreshCw className="mx-auto h-6 w-6 animate-spin text-purple-400" />


                <p className="mt-3 text-sm text-slate-500">
                  Loading digital twin...
                </p>

              </div>

            </div>

          ) : (

            <div className="grid gap-6 xl:grid-cols-[380px_1fr]">

              {/* =========================================================== */}
              {/* CONTROLS                                                    */}
              {/* =========================================================== */}

              <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">

                <h2 className="font-semibold">
                  Scenario Controls
                </h2>


                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Modify the selected ward's
                  environmental and ground
                  evidence.
                </p>


                {/* PRESETS */}

                <div className="mt-5">

                  <div className="mb-2 flex items-center justify-between gap-3">

                    <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                      Quick Demo Scenarios
                    </p>

                    <span className="text-[9px] text-slate-600">
                      One-click setup
                    </span>

                  </div>


                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">

                    {SIMULATION_PRESETS.map(
                      (
                        preset
                      ) => (

                      <button
                        key={
                          preset.name
                        }
                        type="button"
                        onClick={() =>
                          applyPreset(
                            preset
                          )
                        }
                        className="rounded-lg border border-purple-500/15 bg-purple-500/[0.04] px-3 py-2 text-left text-xs font-medium text-purple-200 transition hover:border-purple-500/30 hover:bg-purple-500/[0.08]"
                      >
                        {
                          preset.name
                        }
                      </button>

                    )
                    )}

                  </div>

                </div>


                {/* WARD */}

                <div className="mt-6">

                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Source Ward
                  </label>


                  <select
                    value={
                      selectedWard
                    }
                    onChange={(
                      event
                    ) => {

                      setSelectedWard(
                        event.target.value
                      );

                      setResult(
                        null
                      );
                    }}
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-2.5 text-sm text-white outline-none"
                  >

                    {wardRisks
                      .map(
                        (
                          ward
                        ) =>
                          ward.ward
                      )
                      .sort(
                        sortWardIds
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


                {/* RAIN */}

                <ScenarioInput
                  icon={
                    CloudRain
                  }
                  label="Rainfall"
                  value={
                    rainfallMm
                  }
                  onChange={
                    setRainfallMm
                  }
                  min={
                    0
                  }
                  max={
                    250
                  }
                  step={
                    1
                  }
                  unit="mm/hr"
                />


                {/* RIVER */}

                <ScenarioInput
                  icon={
                    Waves
                  }
                  label="River Level"
                  value={
                    riverLevelCm
                  }
                  onChange={
                    setRiverLevelCm
                  }
                  min={
                    -50
                  }
                  max={
                    200
                  }
                  step={
                    1
                  }
                  unit="cm"
                />


                {/* WIND */}

                <ScenarioInput
                  icon={
                    Waves
                  }
                  label="Wind Speed"
                  value={
                    windSpeedKmh
                  }
                  onChange={
                    setWindSpeedKmh
                  }
                  min={
                    0
                  }
                  max={
                    200
                  }
                  step={
                    1
                  }
                  unit="km/h"
                />


                {/* FIRE */}

                <ScenarioInput
                  icon={
                    AlertTriangle
                  }
                  label="Fire Risk Index"
                  value={
                    fireRiskIndex
                  }
                  onChange={
                    setFireRiskIndex
                  }
                  min={
                    0
                  }
                  max={
                    100
                  }
                  step={
                    1
                  }
                  unit="/100"
                />


                {/* SMOKE */}

                <ScenarioInput
                  icon={
                    AlertTriangle
                  }
                  label="Smoke Level"
                  value={
                    smokeLevel
                  }
                  onChange={
                    setSmokeLevel
                  }
                  min={
                    0
                  }
                  max={
                    100
                  }
                  step={
                    1
                  }
                  unit="/100"
                />


                {/* SEISMIC */}

                <ScenarioInput
                  icon={
                    BarChart3
                  }
                  label="Seismic Intensity"
                  value={
                    seismicIntensity
                  }
                  onChange={
                    setSeismicIntensity
                  }
                  min={
                    0
                  }
                  max={
                    10
                  }
                  step={
                    0.1
                  }
                  unit=""
                />


                {/* INFRASTRUCTURE */}

                <ScenarioInput
                  icon={
                    ShieldAlert
                  }
                  label="Infrastructure Stress"
                  value={
                    infrastructureStress
                  }
                  onChange={
                    setInfrastructureStress
                  }
                  min={
                    0
                  }
                  max={
                    100
                  }
                  step={
                    1
                  }
                  unit="/100"
                />


                {/* REPORTS */}

                <ScenarioInput
                  icon={
                    ShieldAlert
                  }
                  label="Verified Reports"
                  value={
                    verifiedReports
                  }
                  onChange={
                    setVerifiedReports
                  }
                  min={
                    0
                  }
                  max={
                    50
                  }
                  step={
                    1
                  }
                  unit="reports"
                />


                {/* BUTTONS */}

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">

                  <button
                    type="button"
                    onClick={
                      runSimulation
                    }
                    className="rounded-xl bg-purple-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-400"
                  >
                    Run Simulation
                  </button>


                  <button
                    type="button"
                    onClick={
                      loadLiveValues
                    }
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.06]"
                  >
                    Load Live Values
                  </button>

                </div>


                {/* SAFETY NOTE */}

                <div className="mt-5 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] p-4">

                  <div className="flex items-start gap-3">

                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />

                    <div>

                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                        Safe Simulation Mode
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        Scenario values exist only inside this officer session.
                        Live PRAVAAH sensor, weather, report and alert data are
                        never modified.
                      </p>

                    </div>

                  </div>

                </div>

              </div>


              {/* =========================================================== */}
              {/* RESULTS                                                     */}
              {/* =========================================================== */}

              <div>

                {!result ? (

                  <SimulationEmptyState
                    currentWard={
                      currentWard
                    }
                  />

                ) : (

                  <SimulationResults
                    result={
                      result
                    }
                  />

                )}

              </div>

            </div>

          )}

        </section>

      </div>

    </main>
  );
}


/* ========================================================================= */
/* PROTECTED                                                                 */
/* ========================================================================= */

export default function SimulatorPage() {
  return (
    <RequireOfficer>
      <SimulatorPageContent />
    </RequireOfficer>
  );
}


/* ========================================================================= */
/* SCENARIO INPUT                                                            */
/* ========================================================================= */

function ScenarioInput({
  icon: Icon,
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  icon:
    typeof CloudRain;

  label:
    string;

  value:
    number;

  onChange:
    (
      value: number
    ) => void;

  min:
    number;

  max:
    number;

  step:
    number;

  unit:
    string;
}) {

  return (
    <div className="mt-5">

      <div className="mb-2 flex items-center justify-between">

        <div className="flex items-center gap-2">

          <Icon className="h-4 w-4 text-slate-500" />


          <label className="text-xs font-medium text-slate-400">
            {
              label
            }
          </label>

        </div>


        <span className="text-xs font-semibold text-white">
          {
            value
          }{" "}
          <span className="font-normal text-slate-600">
            {
              unit
            }
          </span>
        </span>

      </div>


      <input
        type="range"
        min={
          min
        }
        max={
          max
        }
        step={
          step
        }
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            Number(
              event.target.value
            )
          )
        }
        className="w-full accent-purple-500"
      />


      <div className="mt-1 flex justify-between text-[9px] text-slate-700">

        <span>
          {
            min
          }
        </span>


        <span>
          {
            max
          }
        </span>

      </div>

    </div>
  );
}


/* ========================================================================= */
/* EMPTY STATE                                                               */
/* ========================================================================= */

function SimulationEmptyState({
  currentWard,
}: {
  currentWard:
    WardRisk | null;
}) {

  return (
    <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-white/10 bg-[#0a1728] p-6">

      <div className="max-w-md text-center">

        <FlaskConical className="mx-auto h-10 w-10 text-purple-400" />


        <h2 className="mt-4 text-lg font-semibold">
          Ready to Simulate
        </h2>


        <p className="mt-2 text-sm leading-6 text-slate-500">
          Change the scenario controls and
          run the digital twin to estimate
          future risk and neighbouring ward
          propagation.
        </p>


        {currentWard && (

          <div className="mt-6 rounded-xl bg-white/[0.03] p-4">

            <p className="text-[10px] uppercase tracking-wider text-slate-600">
              Current Live State
            </p>


            <p className="mt-2 text-xl font-bold text-white">
              {
                currentWard.ward
              }{" "}
              •{" "}
              {
                currentWard.level
              }
            </p>


            <p className="mt-1 text-xs text-slate-500">
              Risk{" "}
              {
                currentWard.risk
              }
              /100
            </p>

          </div>

        )}

      </div>

    </div>
  );
}


/* ========================================================================= */
/* RESULTS                                                                   */
/* ========================================================================= */

function SimulationResults({
  result,
}: {
  result:
    SimulationResult;
}) {

  const previous =
    result.comparison
      .previous;

  const simulated =
    result.comparison
      .simulated;


  return (
    <div className="space-y-6">

      {/* =============================================================== */}
      {/* COMPARISON                                                      */}
      {/* =============================================================== */}

      <div className="rounded-2xl border border-purple-500/15 bg-[#0a1728] p-5">

        <div className="flex items-center justify-between gap-3">

          <div>

            <p className="text-xs uppercase tracking-wider text-purple-400">
              Simulation Result
            </p>


            <h2 className="mt-1 text-xl font-bold">
              {
                result.input.ward
              }
            </h2>

          </div>


          <span className="rounded-full bg-purple-500/10 px-3 py-1 text-[10px] font-bold tracking-wider text-purple-300 ring-1 ring-purple-500/20">
            WHAT-IF
          </span>

        </div>


        {/* ============================================================= */}
        {/* MULTI-HAZARD SUMMARY                                          */}
        {/* ============================================================= */}

        <div className="mt-5 grid gap-4 sm:grid-cols-3">

          <SummaryMetricCard
            label="Overall Risk"
            value={`${result.overallRisk}/100`}
            detail={
              simulated.level
            }
          />

          <SummaryMetricCard
            label="Confidence"
            value={`${result.overallConfidence}%`}
            detail="Evidence confidence"
          />

          <SummaryMetricCard
            label="Primary Hazard"
            value={
              formatHazardName(
                result.primaryHazard
              )
            }
            detail="Strongest simulated hazard"
          />

        </div>


        {/* ============================================================= */}
        {/* HAZARD BREAKDOWN                                              */}
        {/* ============================================================= */}

        <div className="mt-5">

          <div className="mb-3">

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Hazard Breakdown
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Independent risk and confidence assessment for each hazard.
            </p>

          </div>


          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

            {result.hazards
              .slice()
              .sort(
                (
                  first,
                  second
                ) =>
                  second.risk -
                  first.risk
              )
              .map(
                (
                  hazard
                ) => (

                <HazardResultCard
                  key={
                    hazard.hazardType
                  }
                  hazard={
                    hazard.hazardType
                  }
                  risk={
                    hazard.risk
                  }
                  level={
                    hazard.level
                  }
                  confidence={
                    hazard.confidence
                  }
                  primary={
                    hazard.hazardType ===
                    result.primaryHazard
                  }
                />

              )
            )}

          </div>

        </div>


        {/* ============================================================= */}
        {/* WHY THIS RISK                                                 */}
        {/* ============================================================= */}

        <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Why This Risk?
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Strongest scenario inputs contributing to the simulated assessment.
              </p>

            </div>


            <span className="w-fit rounded-full bg-purple-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-purple-300 ring-1 ring-purple-500/20">
              {
                formatHazardName(
                  result.primaryHazard
                )
              }
            </span>

          </div>


          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">

            {getScenarioDrivers(
              result.input,
              result.primaryHazard
            ).map(
              (
                driver
              ) => (

              <div
                key={
                  driver
                }
                className="rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2 text-xs text-slate-400"
              >
                {
                  driver
                }
              </div>

            )
            )}

          </div>

        </div>


        {/* ============================================================= */}
        {/* LIVE VS SIMULATED                                             */}
        {/* ============================================================= */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">

          <ComparisonCard
            title="Live State"
            risk={
              previous?.risk ??
              0
            }
            level={
              previous?.level ??
              "UNKNOWN"
            }
          />


          <ComparisonCard
            title="Simulated State"
            risk={
              simulated.risk
            }
            level={
              simulated.level
            }
          />

        </div>


        <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.025] p-4">

          <p className="text-[10px] uppercase tracking-wider text-slate-600">
            Risk Change
          </p>


          <p
            className={`mt-1 text-2xl font-bold ${
              result.comparison
                .riskDelta >
              0
                ? "text-red-400"
                : result.comparison
                      .riskDelta <
                    0
                  ? "text-emerald-400"
                  : "text-slate-300"
            }`}
          >
            {
              result.comparison
                .riskDelta >=
              0
                ? "+"
                : ""
            }
            {
              result.comparison
                .riskDelta
            }
          </p>

        </div>

      </div>


      {/* =============================================================== */}
      {/* IMPACT SUMMARY                                                  */}
      {/* =============================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <ImpactCard
          icon={
            BarChart3
          }
          label="Affected Wards"
          value={
            result.impact
              .affectedWardCount
          }
        />


        <ImpactCard
          icon={
            AlertTriangle
          }
          label="High Risk"
          value={
            result.impact
              .highRiskWardCount
          }
        />


        <ImpactCard
          icon={
            ShieldAlert
          }
          label="Critical"
          value={
            result.impact
              .criticalWardCount
          }
        />


        <ImpactCard
          icon={
            Users
          }
          label="Population Exposure"
          value={
            result.impact
              .populationExposure
          }
        />

      </div>


      {/* =============================================================== */}
      {/* PROPAGATION                                                     */}
      {/* =============================================================== */}

      <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">

        <h2 className="font-semibold">
          Predicted Propagation
        </h2>


        <p className="mt-1 text-xs text-slate-500">
          Nearby wards ranked by estimated
          propagation probability.
        </p>


        {result.impact
          .propagation
          .forecasts.length ===
        0 ? (

          <p className="mt-5 text-sm text-slate-500">
            No meaningful propagation detected.
          </p>

        ) : (

          <div className="mt-5 space-y-3">

            {result.impact
              .propagation
              .forecasts
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
                  className="rounded-xl border border-white/5 bg-white/[0.025] p-4"
                >

                  <div className="flex items-center justify-between gap-4">

                    <div>

                      <p className="font-semibold text-white">
                        {
                          forecast.targetWard
                        }
                      </p>


                      <p className="mt-1 text-xs text-slate-500">
                        {
                          forecast.distanceKm
                        }{" "}
                        km •{" "}
                        {
                          forecast.estimatedMinutes
                        }{" "}
                        min estimate
                      </p>

                    </div>


                    <p className="text-xl font-bold text-purple-300">
                      {
                        forecast.probability
                      }
                      %
                    </p>

                  </div>


                  <div className="mt-3 flex flex-wrap gap-1.5">

                    {forecast.drivers.map(
                      (
                        driver
                      ) => (

                      <span
                        key={
                          driver
                        }
                        className="rounded-md bg-white/[0.04] px-2 py-1 text-[10px] text-slate-500"
                      >
                        {
                          driver
                        }
                      </span>

                    )
                  )}

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}


/* ========================================================================= */
/* SUMMARY METRIC CARD                                                       */
/* ========================================================================= */

function SummaryMetricCard({
  label,
  value,
  detail,
}: {
  label:
    string;

  value:
    string;

  detail:
    string;
}) {

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">

      <p className="text-[10px] uppercase tracking-wider text-slate-600">
        {
          label
        }
      </p>


      <p className="mt-2 break-words text-xl font-bold text-white">
        {
          value
        }
      </p>


      <p className="mt-1 text-[10px] text-slate-500">
        {
          detail
        }
      </p>

    </div>
  );
}


/* ========================================================================= */
/* HAZARD RESULT CARD                                                        */
/* ========================================================================= */

function HazardResultCard({
  hazard,
  risk,
  level,
  confidence,
  primary,
}: {
  hazard:
    string;

  risk:
    number;

  level:
    string;

  confidence:
    number;

  primary:
    boolean;
}) {

  return (
    <div
      className={`rounded-xl border p-4 ${
        primary
          ? "border-purple-500/30 bg-purple-500/[0.06]"
          : "border-white/5 bg-white/[0.025]"
      }`}
    >

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-xs font-semibold text-white">
            {
              formatHazardName(
                hazard
              )
            }
          </p>


          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {
              level
            }
          </p>

        </div>


        {primary && (

          <span className="rounded-full bg-purple-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-purple-300 ring-1 ring-purple-500/20">
            Primary
          </span>

        )}

      </div>


      <div className="mt-4 flex items-end justify-between gap-4">

        <div>

          <p className="text-[9px] uppercase tracking-wider text-slate-600">
            Risk
          </p>

          <p className="mt-1 text-2xl font-bold text-white">
            {
              risk
            }
            <span className="text-xs font-normal text-slate-600">
              /100
            </span>
          </p>

        </div>


        <div className="text-right">

          <p className="text-[9px] uppercase tracking-wider text-slate-600">
            Confidence
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-300">
            {
              confidence
            }
            %
          </p>

        </div>

      </div>


      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">

        <div
          className="h-full rounded-full bg-purple-500 transition-all"
          style={{
            width:
              `${Math.max(
                0,
                Math.min(
                  100,
                  risk
                )
              )}%`,
          }}
        />

      </div>

    </div>
  );
}


/* ========================================================================= */
/* SCENARIO DRIVERS                                                          */
/* ========================================================================= */

function getScenarioDrivers(
  input:
    SimulationResult["input"],

  hazard:
    SimulationResult["primaryHazard"]
): string[] {

  const reports =
    `${input.verifiedReportCount} verified report${
      input.verifiedReportCount === 1
        ? ""
        : "s"
    }`;

  switch (
    hazard
  ) {

    case "FLOOD":
      return [
        `Rainfall: ${input.rainfallMm} mm/hr`,
        `River level: ${input.riverLevelCm} cm`,
        reports,
      ];

    case "SEVERE_WEATHER":
      return [
        `Wind speed: ${input.windSpeedKmh} km/h`,
        `Rainfall: ${input.rainfallMm} mm/hr`,
        reports,
      ];

    case "FIRE":
      return [
        `Fire risk index: ${input.fireRiskIndex}/100`,
        `Smoke level: ${input.smokeLevel}/100`,
        reports,
      ];

    case "SEISMIC":
      return [
        `Seismic intensity: ${input.seismicIntensity}/10`,
        `Infrastructure stress: ${input.infrastructureStress}/100`,
        reports,
      ];

    case "INFRASTRUCTURE":
      return [
        `Infrastructure stress: ${input.infrastructureStress}/100`,
        `Seismic intensity: ${input.seismicIntensity}/10`,
        reports,
      ];

    default:
      return [
        reports,
      ];
  }
}


/* ========================================================================= */
/* HAZARD NAME                                                               */
/* ========================================================================= */

function formatHazardName(
  hazard:
    string
) {

  return hazard
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase()
    );
}


/* ========================================================================= */
/* COMPARISON CARD                                                           */
/* ========================================================================= */

function ComparisonCard({
  title,
  risk,
  level,
}: {
  title:
    string;

  risk:
    number;

  level:
    string;
}) {

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">

      <p className="text-[10px] uppercase tracking-wider text-slate-600">
        {
          title
        }
      </p>


      <p className="mt-2 text-3xl font-bold">
        {
          risk
        }
        <span className="text-sm font-normal text-slate-600">
          /100
        </span>
      </p>


      <p className="mt-1 text-xs font-semibold text-slate-400">
        {
          level
        }
      </p>

    </div>
  );
}


/* ========================================================================= */
/* IMPACT CARD                                                               */
/* ========================================================================= */

function ImpactCard({
  icon: Icon,
  label,
  value,
}: {
  icon:
    typeof BarChart3;

  label:
    string;

  value:
    number;
}) {

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a1728] p-4">

      <Icon className="h-5 w-5 text-purple-400" />


      <p className="mt-3 text-2xl font-bold">
        {
          value.toLocaleString(
            "en-IN"
          )
        }
      </p>


      <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">
        {
          label
        }
      </p>

    </div>
  );
}


/* ========================================================================= */
/* SORT                                                                      */
/* ========================================================================= */

function sortWardIds(
  first:
    string,

  second:
    string
) {

  const firstNumber =
    Number(
      first.replace(
        "W",
        ""
      )
    );


  const secondNumber =
    Number(
      second.replace(
        "W",
        ""
      )
    );


  return (
    firstNumber -
    secondNumber
  );
}