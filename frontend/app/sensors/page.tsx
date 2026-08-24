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
  Clock3,
  Cpu,
  Database,
  MapPin,
  RefreshCw,
  Radio,
  Waves,
} from "lucide-react";

import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type SensorStatus =
  | "ONLINE"
  | "OFFLINE"
  | "MAINTENANCE";

type SensorReading = {
  id: string;
  sensorId: string;
  ward: string;
  sensorType: string;
  value: number;
  unit: string;
  latitude: number | null;
  longitude: number | null;
  status: SensorStatus;
  source: string;
  timestamp: number;
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

export default function SensorsPage() {
  const [
    latestReadings,
    setLatestReadings,
  ] =
    useState<
      SensorReading[]
    >([]);

  const [
    allReadings,
    setAllReadings,
  ] =
    useState<
      SensorReading[]
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


  /* ----------------------------------------------------------------------- */
  /* FETCH DATA                                                              */
  /* ----------------------------------------------------------------------- */

  const fetchSensorData =
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
            latestResponse,
            allResponse,
          ] =
            await Promise.all(
              [
                fetch(
                  `${API_BASE_URL}/api/sensors/latest`,
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
              ]
            );

          if (
            !latestResponse.ok ||
            !allResponse.ok
          ) {
            throw new Error(
              "Unable to load sensor data."
            );
          }

          const latestData:
            SensorReading[] =
            await latestResponse.json();

          const allData:
            SensorReading[] =
            await allResponse.json();

          setLatestReadings(
            latestData
          );

          setAllReadings(
            allData
          );

          setError(
            null
          );
        } catch (
          err
        ) {
          console.error(
            "Sensor fetch failed:",
            err
          );

          setError(
            "Unable to connect to the PRAVAAH sensor service."
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
      fetchSensorData();

      const interval =
        setInterval(
          () => {
            fetchSensorData();
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
      fetchSensorData,
    ]
  );


  /* ----------------------------------------------------------------------- */
  /* UNIQUE SENSOR COUNT                                                     */
  /* ----------------------------------------------------------------------- */

  const uniqueSensorCount =
    useMemo(
      () => {
        const ids =
          new Set(
            allReadings.map(
              (
                reading
              ) =>
                reading.sensorId
            )
          );

        return ids.size;
      },
      [
        allReadings,
      ]
    );


  /* ----------------------------------------------------------------------- */
  /* STATUS COUNTS                                                           */
  /* ----------------------------------------------------------------------- */

  const onlineCount =
    latestReadings.filter(
      (
        reading
      ) =>
        reading.status ===
        "ONLINE"
    ).length;


  const offlineCount =
    latestReadings.filter(
      (
        reading
      ) =>
        reading.status ===
        "OFFLINE"
    ).length;


  const maintenanceCount =
    latestReadings.filter(
      (
        reading
      ) =>
        reading.status ===
        "MAINTENANCE"
    ).length;


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

          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <div className="mb-2 flex items-center gap-2 text-sm text-blue-400">

                <Radio className="h-4 w-4" />

                IoT Monitoring Layer

              </div>


              <h1 className="text-3xl font-bold tracking-tight">
                Sensor Monitoring
              </h1>


              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Monitor IoT sensor
                readings entering the
                PRAVAAH disaster-risk
                pipeline.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                fetchSensorData(
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
                  Sensor service unavailable
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

          <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

            <SummaryCard
              icon={
                Cpu
              }
              label="Sensors"
              value={
                uniqueSensorCount
              }
              description="Registered devices"
            />


            <SummaryCard
              icon={
                CheckCircle2
              }
              label="Online"
              value={
                onlineCount
              }
              description="Latest status online"
            />


            <SummaryCard
              icon={
                AlertTriangle
              }
              label="Offline"
              value={
                offlineCount
              }
              description="Requires attention"
            />


            <SummaryCard
              icon={
                Activity
              }
              label="Maintenance"
              value={
                maintenanceCount
              }
              description="Temporarily unavailable"
            />


            <SummaryCard
              icon={
                Database
              }
              label="Readings"
              value={
                allReadings.length
              }
              description="Stored in SQLite"
            />

          </div>


          {/* =============================================================== */}
          {/* LIVE SENSOR LIST                                                */}
          {/* =============================================================== */}

          <div className="rounded-2xl border border-white/10 bg-[#0a1728]">

            <div className="flex flex-col justify-between gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center">

              <div>

                <h2 className="font-semibold">
                  Live Sensors
                </h2>


                <p className="mt-1 text-xs text-slate-500">
                  Latest reading for each
                  ward and sensor type.
                </p>

              </div>


              <div className="flex items-center gap-2 text-xs text-slate-500">

                <span className="relative flex h-2 w-2">

                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />

                </span>

                Auto-refresh every 4 sec

              </div>

            </div>


            {loading ? (

              <LoadingState />

            ) : latestReadings.length ===
              0 ? (

              <EmptyState />

            ) : (

              <div className="grid gap-4 p-5 xl:grid-cols-2">

                {latestReadings.map(
                  (
                    reading
                  ) => (

                    <SensorCard
                      key={`${reading.ward}-${reading.sensorType}`}
                      reading={
                        reading
                      }
                    />

                  )
                )}

              </div>

            )}

          </div>


          {/* =============================================================== */}
          {/* INGESTION PIPELINE                                              */}
          {/* =============================================================== */}

          <div className="mt-6 rounded-2xl border border-blue-500/15 bg-blue-500/[0.04] p-5">

            <h3 className="text-sm font-semibold text-blue-300">
              IoT Ingestion Pipeline
            </h3>


            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">

              <PipelineItem
                text="Sensor / ESP32"
              />

              <Arrow />

              <PipelineItem
                text="FastAPI"
              />

              <Arrow />

              <PipelineItem
                text="SQLite"
              />

              <Arrow />

              <PipelineItem
                text="Latest Reading"
              />

              <Arrow />

              <PipelineItem
                text="Risk Engine"
              />

            </div>


            <p className="mt-4 max-w-3xl text-xs leading-5 text-slate-500">
              PRAVAAH uses the latest
              ONLINE river-level sensor
              reading when available.
              Wards without an IoT
              reading continue using
              prototype simulation as
              fallback.
            </p>

          </div>

        </section>

      </div>

    </main>
  );
}


/* ========================================================================= */
/* SENSOR CARD                                                               */
/* ========================================================================= */

function SensorCard({
  reading,
}: {
  reading:
    SensorReading;
}) {

  const statusStyles:
    Record<
      SensorStatus,
      string
    > = {

    ONLINE:
      "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20",

    OFFLINE:
      "text-red-400 bg-red-500/10 ring-red-500/20",

    MAINTENANCE:
      "text-yellow-400 bg-yellow-500/10 ring-yellow-500/20",

  };


  return (
    <article className="rounded-xl border border-white/10 bg-[#07111f] p-5">

      <div className="flex items-start justify-between gap-3">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">

            <Waves className="h-5 w-5 text-blue-400" />

          </div>


          <div>

            <p className="font-mono text-xs text-blue-300">
              {
                reading.sensorId
              }
            </p>


            <p className="mt-1 text-sm font-semibold text-white">
              {
                formatSensorType(
                  reading.sensorType
                )
              }
            </p>

          </div>

        </div>


        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest ring-1 ${
            statusStyles[
              reading.status
            ]
          }`}
        >
          {
            reading.status
          }
        </span>

      </div>


      {/* READING */}

      <div className="mt-5 rounded-xl bg-white/[0.03] p-4">

        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Latest Reading
        </p>


        <div className="mt-1 flex items-end gap-2">

          <p className="text-3xl font-bold text-white">
            {
              reading.value
            }
          </p>


          <p className="pb-1 text-sm text-slate-500">
            {
              reading.unit
            }
          </p>

        </div>

      </div>


      {/* INFORMATION */}

      <div className="mt-4 grid grid-cols-2 gap-3">

        <InfoBox
          icon={
            MapPin
          }
          label="Ward"
          value={
            reading.ward
          }
        />


        <InfoBox
          icon={
            Radio
          }
          label="Source"
          value={
            reading.source
          }
        />

      </div>


      {/* LOCATION */}

      {reading.latitude !==
        null &&
        reading.longitude !==
          null && (

        <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">

          <p className="text-[9px] uppercase tracking-wider text-slate-600">
            Sensor Location
          </p>


          <p className="mt-1 font-mono text-[11px] text-slate-400">
            {
              reading.latitude.toFixed(
                6
              )
            }
            ,{" "}
            {
              reading.longitude.toFixed(
                6
              )
            }
          </p>

        </div>

      )}


      {/* TIMESTAMP */}

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">

        <Clock3 className="h-3.5 w-3.5" />

        Updated{" "}
        {
          formatTimestamp(
            reading.timestamp
          )
        }

      </div>

    </article>
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
  icon: typeof Cpu;
  label: string;
  value: number;
  description: string;
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
        {
          description
        }
      </p>

    </div>
  );
}


/* ========================================================================= */
/* INFO BOX                                                                  */
/* ========================================================================= */

function InfoBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {

  return (
    <div className="rounded-lg bg-white/[0.03] p-3">

      <Icon className="h-3.5 w-3.5 text-slate-500" />


      <p className="mt-2 text-[9px] uppercase tracking-wider text-slate-600">
        {label}
      </p>


      <p className="mt-1 text-xs font-medium text-slate-300">
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
    <div className="flex min-h-[250px] items-center justify-center">

      <div className="text-center">

        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-400" />


        <p className="mt-3 text-sm text-slate-500">
          Loading sensor network...
        </p>

      </div>

    </div>
  );
}


/* ========================================================================= */
/* EMPTY                                                                     */
/* ========================================================================= */

function EmptyState() {

  return (
    <div className="flex min-h-[250px] items-center justify-center">

      <div className="text-center">

        <Cpu className="mx-auto h-8 w-8 text-slate-700" />


        <p className="mt-3 text-sm font-medium text-slate-300">
          No sensor readings yet
        </p>


        <p className="mt-1 text-xs text-slate-600">
          New IoT readings will appear
          here after ingestion.
        </p>

      </div>

    </div>
  );
}


/* ========================================================================= */
/* PIPELINE                                                                  */
/* ========================================================================= */

function PipelineItem({
  text,
}: {
  text: string;
}) {

  return (
    <div className="rounded-lg border border-white/10 bg-[#07111f] px-3 py-2">
      {text}
    </div>
  );
}


function Arrow() {

  return (
    <span className="text-blue-500">
      →
    </span>
  );
}


/* ========================================================================= */
/* HELPERS                                                                   */
/* ========================================================================= */

function formatSensorType(
  sensorType: string
) {

  return sensorType
    .split("_")
    .map(
      (
        word
      ) =>
        word.charAt(0) +
        word
          .slice(1)
          .toLowerCase()
    )
    .join(" ");
}


function formatTimestamp(
  timestamp: number
) {

  const difference =
    Date.now() -
    timestamp;

  const seconds =
    Math.floor(
      difference /
      1000
    );


  if (
    seconds < 60
  ) {

    return `${Math.max(
      0,
      seconds
    )} sec ago`;

  }


  const minutes =
    Math.floor(
      seconds /
      60
    );


  if (
    minutes < 60
  ) {

    return `${minutes} min ago`;

  }


  const hours =
    Math.floor(
      minutes /
      60
    );


  if (
    hours < 24
  ) {

    return `${hours} hr${
      hours === 1
        ? ""
        : "s"
    } ago`;

  }


  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day:
        "numeric",

      month:
        "short",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      timestamp
    )
  );
}