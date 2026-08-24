"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Cpu,
  Database,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  Waves,
} from "lucide-react";

import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import RequireOfficer from "@/components/auth/RequireOfficer";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type HealthResponse = {
  status: string;
  service: string;
  version: string;
  database: string;
  databaseStatus: string;
  wardsLoaded: number;
  reportsStored: number;
  sensorReadingsStored: number;
  weatherAvailable: boolean;
};

type SystemService = {
  status: string;
  mode: string;
  description: string;
};

type SystemStatusResponse = {
  status: string;
  dataMode: string;

  services: {
    wardData?: SystemService;
    rainfall?: SystemService;
    riverLevel?: SystemService;
    crowdReports?: SystemService;
    database?: SystemService;
    authentication?: SystemService;
  };

  reports?: {
    total: number;
    pending: number;
    verified: number;
    rejected: number;
  };

  verificationPolicy?: {
    riskContribution?: string;
    pendingReports?: string;
    rejectedReports?: string;
  };

  lastUpdated?: number;
};

type WeatherWard = {
  ward: string;
  rainfallMm: number;
};

type WeatherResponse = {
  provider: string;
  mode: string;
  available: boolean;
  wards: WeatherWard[];
  lastUpdated: number | null;
  error: string | null;
};

type SensorReading = {
  id: string;
  sensorId: string;
  ward: string;
  sensorType: string;
  value: number;
  unit: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  source: string;
  timestamp: number;
};

type Report = {
  id: string;
  ward: string;
  reportType: string;
  severity: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  photoUrl: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: number;
  verifiedAt: number | null;
};


/* ========================================================================= */
/* CONFIG                                                                    */
/* ========================================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

const REFRESH_INTERVAL = 5000;


/* ========================================================================= */
/* PAGE CONTENT                                                              */
/* ========================================================================= */

function DataHealthPageContent() {
  const [
    health,
    setHealth,
  ] =
    useState<HealthResponse | null>(
      null
    );

  const [
    systemStatus,
    setSystemStatus,
  ] =
    useState<SystemStatusResponse | null>(
      null
    );

  const [
    weather,
    setWeather,
  ] =
    useState<WeatherResponse | null>(
      null
    );

  const [
    sensors,
    setSensors,
  ] =
    useState<SensorReading[]>([]);

  const [
    reports,
    setReports,
  ] =
    useState<Report[]>([]);

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
    useState<string | null>(
      null
    );


  /* ----------------------------------------------------------------------- */
  /* FETCH DATA                                                              */
  /* ----------------------------------------------------------------------- */

  const fetchHealthData =
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

          const [
            healthResponse,
            systemResponse,
            weatherResponse,
            sensorsResponse,
            reportsResponse,
          ] =
            await Promise.all([
              fetch(
                `${API_BASE_URL}/api/health`,
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

              fetch(
                `${API_BASE_URL}/api/weather`,
                {
                  cache:
                    "no-store",
                }
              ),

              fetch(
                `${API_BASE_URL}/api/sensors`,
                {
                  cache:
                    "no-store",
                }
              ),

              fetch(
                `${API_BASE_URL}/api/reports`,
                {
                  cache:
                    "no-store",
                }
              ),
            ]);


          if (
            !healthResponse.ok ||
            !systemResponse.ok ||
            !weatherResponse.ok ||
            !sensorsResponse.ok ||
            !reportsResponse.ok
          ) {
            throw new Error(
              "One or more backend services are unavailable."
            );
          }


          const [
            healthData,
            systemData,
            weatherData,
            sensorData,
            reportData,
          ] =
            await Promise.all([
              healthResponse.json(),
              systemResponse.json(),
              weatherResponse.json(),
              sensorsResponse.json(),
              reportsResponse.json(),
            ]);


          setHealth(
            healthData
          );

          setSystemStatus(
            systemData
          );

          setWeather(
            weatherData
          );

          setSensors(
            sensorData
          );

          setReports(
            reportData
          );

          setError(
            null
          );

        } catch (
          fetchError
        ) {

          console.error(
            "Unable to fetch Data Health:",
            fetchError
          );

          setError(
            "Unable to load backend health information."
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

      fetchHealthData();

      const interval =
        setInterval(
          () => {
            fetchHealthData();
          },
          REFRESH_INTERVAL
        );

      return () => {
        clearInterval(
          interval
        );
      };

    },
    [
      fetchHealthData,
    ]
  );


  /* ----------------------------------------------------------------------- */
  /* COMPUTED VALUES                                                         */
  /* ----------------------------------------------------------------------- */

  const averageRainfall =
    useMemo(
      () => {

        if (
          !weather ||
          weather.wards.length ===
            0
        ) {
          return 0;
        }

        const total =
          weather.wards.reduce(
            (
              sum,
              ward
            ) =>
              sum +
              ward.rainfallMm,
            0
          );

        return (
          total /
          weather.wards.length
        );

      },
      [
        weather,
      ]
    );


  const latestRiverSensors =
    useMemo(
      () => {

        const latest =
          new Map<
            string,
            SensorReading
          >();

        for (
          const reading
          of sensors
        ) {

          if (
            reading.sensorType !==
            "RIVER_LEVEL"
          ) {
            continue;
          }

          const existing =
            latest.get(
              reading.sensorId
            );

          if (
            !existing ||
            reading.timestamp >
              existing.timestamp
          ) {
            latest.set(
              reading.sensorId,
              reading
            );
          }
        }

        return Array.from(
          latest.values()
        );

      },
      [
        sensors,
      ]
    );


  const onlineRiverSensors =
    latestRiverSensors.filter(
      (
        sensor
      ) =>
        sensor.status ===
        "ONLINE"
    ).length;


  const averageRiverLevel =
    latestRiverSensors.length >
    0
      ? latestRiverSensors.reduce(
          (
            sum,
            sensor
          ) =>
            sum +
            sensor.value,
          0
        ) /
        latestRiverSensors.length
      : 0;


  const pendingReports =
    reports.filter(
      (
        report
      ) =>
        report.status ===
        "PENDING"
    ).length;


  const verifiedReports =
    reports.filter(
      (
        report
      ) =>
        report.status ===
        "VERIFIED"
    ).length;


  const rejectedReports =
    reports.filter(
      (
        report
      ) =>
        report.status ===
        "REJECTED"
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
          {/* HEADER                                                          */}
          {/* =============================================================== */}

          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <div className="mb-2 flex items-center gap-2 text-sm text-blue-400">

                <Activity className="h-4 w-4" />

                Live Backend Monitoring

              </div>


              <h1 className="text-3xl font-bold tracking-tight">
                Data Source Health
              </h1>


              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Real-time operational status
                of PRAVAAH data sources,
                persistence, authentication,
                weather feeds, IoT sensors and
                verified citizen evidence.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                fetchHealthData(
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
                  Health monitoring problem
                </p>


                <p className="mt-1 text-xs text-red-300/70">
                  {error}
                </p>

              </div>

            </div>

          )}


          {/* =============================================================== */}
          {/* LOADING                                                         */}
          {/* =============================================================== */}

          {loading ? (

            <LoadingState />

          ) : (

            <>
              {/* =========================================================== */}
              {/* SYSTEM SUMMARY                                              */}
              {/* =========================================================== */}

              <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

                <SummaryCard
                  icon={
                    CheckCircle2
                  }
                  label="Backend"
                  value={
                    health?.status ===
                    "ok"
                      ? "ONLINE"
                      : "UNKNOWN"
                  }
                  description={
                    health
                      ? `v${health.version}`
                      : "Version unavailable"
                  }
                />


                <SummaryCard
                  icon={
                    Database
                  }
                  label="Database"
                  value={
                    health?.databaseStatus
                      ?.toUpperCase() ??
                    "UNKNOWN"
                  }
                  description={
                    health?.database ??
                    "Database unavailable"
                  }
                />


                <SummaryCard
                  icon={
                    CloudRain
                  }
                  label="Weather"
                  value={
                    weather?.mode ??
                    "UNKNOWN"
                  }
                  description={
                    weather?.provider ??
                    "Provider unavailable"
                  }
                />


                <SummaryCard
                  icon={
                    Cpu
                  }
                  label="Sensors"
                  value={`${onlineRiverSensors}/${latestRiverSensors.length}`}
                  description="River sensors online"
                />


                <SummaryCard
                  icon={
                    ShieldCheck
                  }
                  label="Authentication"
                  value={
                    systemStatus
                      ?.services
                      ?.authentication
                      ?.mode ??
                    "JWT"
                  }
                  description="Role-based access"
                />

              </div>


              {/* =========================================================== */}
              {/* DATA SOURCE PANELS                                          */}
              {/* =========================================================== */}

              <div className="grid gap-5 md:grid-cols-2">

                <HealthPanel
                  icon={
                    CloudRain
                  }
                  title="Weather Feed"
                  status={
                    weather?.available
                      ? "ONLINE"
                      : "FALLBACK"
                  }
                  mode={
                    weather?.mode ??
                    "UNKNOWN"
                  }
                  mainLabel="Average rainfall"
                  mainValue={`${averageRainfall.toFixed(
                    2
                  )} mm/hr`}
                  description={
                    systemStatus
                      ?.services
                      ?.rainfall
                      ?.description ??
                    "Weather status unavailable."
                  }
                />


                <HealthPanel
                  icon={
                    Waves
                  }
                  title="River Level Sensors"
                  status={
                    onlineRiverSensors >
                    0
                      ? "ONLINE"
                      : "FALLBACK"
                  }
                  mode={
                    systemStatus
                      ?.services
                      ?.riverLevel
                      ?.mode ??
                    "UNKNOWN"
                  }
                  mainLabel="Average IoT river level"
                  mainValue={`${averageRiverLevel.toFixed(
                    1
                  )} cm`}
                  description={
                    systemStatus
                      ?.services
                      ?.riverLevel
                      ?.description ??
                    "River sensor status unavailable."
                  }
                />


                <HealthPanel
                  icon={
                    FileCheck2
                  }
                  title="Citizen Reports"
                  status="ONLINE"
                  mode="REAL"
                  mainLabel="Stored reports"
                  mainValue={`${reports.length}`}
                  description={
                    systemStatus
                      ?.services
                      ?.crowdReports
                      ?.description ??
                    "Human-verified citizen evidence."
                  }
                />


                <HealthPanel
                  icon={
                    Database
                  }
                  title="Persistent Storage"
                  status={
                    health?.databaseStatus ===
                    "online"
                      ? "ONLINE"
                      : "UNKNOWN"
                  }
                  mode="PERSISTENT"
                  mainLabel="Sensor readings stored"
                  mainValue={`${health?.sensorReadingsStored ?? sensors.length}`}
                  description={
                    systemStatus
                      ?.services
                      ?.database
                      ?.description ??
                    "SQLite persistence status unavailable."
                  }
                />

              </div>


              {/* =========================================================== */}
              {/* REPORT BREAKDOWN                                            */}
              {/* =========================================================== */}

              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a1728] p-5">

                <div className="flex items-center justify-between gap-3">

                  <div>

                    <h2 className="font-semibold">
                      Verification Pipeline
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Human-reviewed citizen
                      evidence currently stored
                      by PRAVAAH.
                    </p>

                  </div>


                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-400 ring-1 ring-emerald-500/20">
                    VERIFIED ONLY → RISK
                  </span>

                </div>


                <div className="mt-5 grid gap-3 sm:grid-cols-4">

                  <MetricBox
                    label="Total"
                    value={
                      reports.length
                    }
                  />


                  <MetricBox
                    label="Pending"
                    value={
                      pendingReports
                    }
                  />


                  <MetricBox
                    label="Verified"
                    value={
                      verifiedReports
                    }
                  />


                  <MetricBox
                    label="Rejected"
                    value={
                      rejectedReports
                    }
                  />

                </div>


                <div className="mt-5 rounded-xl border border-blue-500/10 bg-blue-500/[0.04] p-4">

                  <p className="text-xs leading-5 text-slate-500">
                    {
                      systemStatus
                        ?.verificationPolicy
                        ?.pendingReports ??
                      "Pending reports do not affect operational risk."
                    }
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {
                      systemStatus
                        ?.verificationPolicy
                        ?.rejectedReports ??
                      "Rejected reports are excluded from operational risk."
                    }
                  </p>

                </div>

              </div>


              {/* =========================================================== */}
              {/* BACKEND DETAILS                                             */}
              {/* =========================================================== */}

              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a1728] p-5">

                <h2 className="font-semibold">
                  Backend Details
                </h2>


                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                  <DetailBox
                    label="Service"
                    value={
                      health?.service ??
                      "Unknown"
                    }
                  />


                  <DetailBox
                    label="Version"
                    value={
                      health?.version ??
                      "Unknown"
                    }
                  />


                  <DetailBox
                    label="Wards Loaded"
                    value={`${health?.wardsLoaded ?? 0}`}
                  />


                  <DetailBox
                    label="Data Mode"
                    value={
                      systemStatus
                        ?.dataMode ??
                      "UNKNOWN"
                    }
                  />

                </div>

              </div>

            </>

          )}

        </section>

      </div>

    </main>
  );
}


/* ========================================================================= */
/* PROTECTED PAGE                                                            */
/* ========================================================================= */

export default function DataHealthPage() {
  return (
    <RequireOfficer>
      <DataHealthPageContent />
    </RequireOfficer>
  );
}


/* ========================================================================= */
/* SUMMARY CARD                                                              */
/* ========================================================================= */

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  description: string;
}) {

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a1728] p-4">

      <div className="flex items-center justify-between">

        <Icon className="h-5 w-5 text-blue-400" />

        <span className="h-2 w-2 rounded-full bg-emerald-400" />

      </div>


      <p className="mt-4 text-[10px] uppercase tracking-wider text-slate-600">
        {label}
      </p>


      <p className="mt-1 text-xl font-bold text-white">
        {value}
      </p>


      <p className="mt-1 text-[10px] text-slate-600">
        {description}
      </p>

    </div>
  );
}


/* ========================================================================= */
/* HEALTH PANEL                                                              */
/* ========================================================================= */

function HealthPanel({
  icon: Icon,
  title,
  status,
  mode,
  mainLabel,
  mainValue,
  description,
}: {
  icon: typeof CloudRain;
  title: string;
  status:
    | "ONLINE"
    | "FALLBACK"
    | "UNKNOWN";
  mode: string;
  mainLabel: string;
  mainValue: string;
  description: string;
}) {

  const online =
    status === "ONLINE";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">

      <div className="flex items-start justify-between gap-3">

        <div className="flex items-center gap-3">

          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              online
                ? "bg-emerald-500/10"
                : "bg-yellow-500/10"
            }`}
          >

            <Icon className="h-5 w-5 text-slate-300" />

          </div>


          <div>

            <p className="text-sm font-semibold">
              {title}
            </p>


            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-600">
              {mode}
            </p>

          </div>

        </div>


        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ring-1 ${
            online
              ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
              : "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20"
          }`}
        >
          {status}
        </span>

      </div>


      <div className="mt-5 rounded-xl bg-white/[0.03] p-4">

        <p className="text-[10px] uppercase tracking-wider text-slate-600">
          {mainLabel}
        </p>


        <p className="mt-1 text-2xl font-bold text-white">
          {mainValue}
        </p>

      </div>


      <p className="mt-4 text-xs leading-5 text-slate-500">
        {description}
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
  value: number;
}) {

  return (
    <div className="rounded-xl bg-white/[0.03] p-4">

      <p className="text-[10px] uppercase tracking-wider text-slate-600">
        {label}
      </p>


      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}


/* ========================================================================= */
/* DETAIL BOX                                                                */
/* ========================================================================= */

function DetailBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">

      <p className="text-[10px] uppercase tracking-wider text-slate-600">
        {label}
      </p>


      <p className="mt-1 text-sm font-medium text-slate-300">
        {value}
      </p>

    </div>
  );
}


/* ========================================================================= */
/* LOADING                                                                   */
/* ========================================================================= */

function LoadingState() {

  return (
    <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-white/10 bg-[#0a1728]">

      <div className="text-center">

        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-400" />


        <p className="mt-3 text-sm text-slate-400">
          Loading live system health...
        </p>

      </div>

    </div>
  );
}