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
  MapPin,
  RefreshCw,
  ShieldAlert,
  Waves,
} from "lucide-react";

import Link from "next/link";

import Header from "@/components/dashboard/Header";

import type {
  WardReading,
} from "@/lib/mock-engine";

import {
  evaluateWard,
  type RiskLevel,
  type WardRisk,
} from "@/lib/risk-engine";

import {
  findNearestWard,
  isInsidePravaahCoverage,
} from "@/lib/ward-location";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type PublishedAlert = {
  id: string;

  ward: string;

  priority:
    | "INFO"
    | "ADVISORY"
    | "WARNING"
    | "EMERGENCY";

  trigger: string;

  level: RiskLevel;

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


/* ========================================================================= */
/* CONFIG                                                                    */
/* ========================================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


const REFRESH_MS =
  4000;


/*
 * Prototype default ward.
 *
 * Later we can connect this to the
 * citizen's detected / selected ward.
 */

const DEFAULT_WARD =
  "W2";


/* ========================================================================= */
/* PAGE                                                                      */
/* ========================================================================= */

export default function CitizenDashboardPage() {

  const [
    wardId,
    setWardId,
  ] =
    useState(
      DEFAULT_WARD
    );


  const [
    wardRisk,
    setWardRisk,
  ] =
    useState<
      WardRisk | null
    >(null);


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
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
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
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);


  const [
    locationStatus,
    setLocationStatus,
  ] =
    useState<
      | "IDLE"
      | "DETECTING"
      | "DETECTED"
      | "OUTSIDE_COVERAGE"
      | "DENIED"
      | "UNAVAILABLE"
    >("IDLE");


  const [
    detectedDistanceKm,
    setDetectedDistanceKm,
  ] =
    useState<
      number | null
    >(null);


  const [
    detectedCoordinates,
    setDetectedCoordinates,
  ] =
    useState<
      {
        latitude: number;
        longitude: number;
      } | null
    >(null);


  const [
    manualWardOverride,
    setManualWardOverride,
  ] =
    useState(
      false
    );


  /* ========================================================================= */
  /* FETCH DATA                                                                 */
  /* ========================================================================= */

  async function fetchCitizenData(
    manualRefresh =
      false
  ) {

    try {

      if (
        manualRefresh
      ) {

        setRefreshing(
          true
        );

      }


      setError(
        null
      );


      /* --------------------------------------------------------------------- */
      /* WARD DATA                                                             */
      /* --------------------------------------------------------------------- */

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
          `Ward data returned ${wardResponse.status}`
        );

      }


      const wardData:
        BackendWard[] =
        await wardResponse.json();


      const selectedBackendWard =
        wardData.find(
          (
            ward
          ) =>
            ward.ward ===
            wardId
        );


      if (
        selectedBackendWard
      ) {

        const reading:
          WardReading = {

          ward:
            selectedBackendWard
              .ward as WardReading["ward"],

          rainfallMm:
            selectedBackendWard
              .rainfallMm,

          riverLevelCm:
            selectedBackendWard
              .riverLevelCm,

          reportCount:
            selectedBackendWard
              .reportCount,
        };


        setWardRisk(
          evaluateWard(
            reading
          )
        );

      } else {

        setWardRisk(
          null
        );

      }


      /* --------------------------------------------------------------------- */
      /* PUBLISHED ALERTS                                                      */
      /* --------------------------------------------------------------------- */

      const alertsResponse =
        await fetch(
          `${API_BASE_URL}/api/alerts/ward/${wardId}`,
          {
            cache:
              "no-store",
          }
        );


      if (
        !alertsResponse.ok
      ) {

        throw new Error(
          `Alert API returned ${alertsResponse.status}`
        );

      }


      const alertData:
        PublishedAlert[] =
        await alertsResponse.json();


      setAlerts(
        alertData
      );


      setBackendOnline(
        true
      );


      setLastUpdated(
        new Date()
      );

    } catch (
      fetchError
    ) {

      console.error(
        "Unable to load citizen dashboard:",
        fetchError
      );


      setBackendOnline(
        false
      );


      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load citizen information."
      );

    } finally {

      setLoading(
        false
      );


      setRefreshing(
        false
      );

    }

  }


  /* ========================================================================= */
  /* ONE-TIME GPS WARD DETECTION                                                */
  /* ========================================================================= */

  useEffect(
    () => {

      /*
       * Geolocation only runs once when
       * the citizen dashboard opens.
       *
       * If the citizen manually changes
       * the ward later, the 4-second data
       * refresh will not override it.
       */

      if (
        typeof navigator ===
          "undefined" ||
        !navigator.geolocation
      ) {

        setLocationStatus(
          "UNAVAILABLE"
        );

        return;
      }


      setLocationStatus(
        "DETECTING"
      );


      navigator.geolocation.getCurrentPosition(

        async (
          position
        ) => {

          try {

            const latitude =
              position.coords.latitude;

            const longitude =
              position.coords.longitude;


            setDetectedCoordinates({
              latitude,
              longitude,
            });


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
                "Unable to load ward coordinates."
              );

            }


            const wards:
              BackendWard[] =
              await response.json();


            const detectedWard =
              findNearestWard(
                latitude,
                longitude,
                wards
              );


            if (
              !detectedWard
            ) {

              setLocationStatus(
                "UNAVAILABLE"
              );

              return;
            }


            setDetectedDistanceKm(
              detectedWard.distanceKm
            );


            if (
              !isInsidePravaahCoverage(
                detectedWard
              )
            ) {

              setLocationStatus(
                "OUTSIDE_COVERAGE"
              );

              return;
            }


            /*
             * Only auto-select the detected
             * ward if the citizen has not
             * manually overridden the ward.
             */

            setWardId(
              detectedWard.ward
            );


            setLocationStatus(
              "DETECTED"
            );

          } catch (
            locationError
          ) {

            console.error(
              "Unable to detect ward:",
              locationError
            );


            setLocationStatus(
              "UNAVAILABLE"
            );

          }

        },


        (
          geolocationError
        ) => {

          console.error(
            "Location permission failed:",
            geolocationError
          );


          if (
            geolocationError.code ===
            geolocationError.PERMISSION_DENIED
          ) {

            setLocationStatus(
              "DENIED"
            );

          } else {

            setLocationStatus(
              "UNAVAILABLE"
            );

          }

        },


        {
          enableHighAccuracy:
            true,

          timeout:
            10000,

          maximumAge:
            60000,
        }

      );

    },
    []
  );


  /* ========================================================================= */
  /* AUTO REFRESH                                                               */
  /* ========================================================================= */

  useEffect(
    () => {

      fetchCitizenData();


      const interval =
        setInterval(
          () => {

            fetchCitizenData();

          },
          REFRESH_MS
        );


      return () => {

        clearInterval(
          interval
        );

      };

    },
    [
      wardId,
    ]
  );


  /* ========================================================================= */
  /* ACTIVE ALERT                                                               */
  /* ========================================================================= */

  const activeAlert =
    useMemo(
      () => {

        if (
          alerts.length ===
          0
        ) {
          return null;
        }


        return [
          ...alerts,
        ].sort(
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
        )[0];

      },
      [
        alerts,
      ]
    );


  /* ========================================================================= */
  /* UI                                                                        */
  /* ========================================================================= */

  return (

    <main className="min-h-screen bg-[#07111f] text-white">

      <Header />


      <div className="mx-auto max-w-[1200px] px-5 py-8 lg:px-8">


        {/* ================================================================= */}
        {/* HEADER                                                            */}
        {/* ================================================================= */}

        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">


          <div>


            <p className="mb-1 text-sm text-slate-500">
              Citizen Safety Dashboard
            </p>


            <h1 className="text-3xl font-bold tracking-tight">
              Your Local Risk Status
            </h1>


            <p className="mt-2 max-w-2xl text-sm text-slate-400">

              View published disaster alerts, live ward risk information and
              safety guidance from PRAVAAH.

            </p>


          </div>


          <div className="flex items-center gap-3">


            <div className="rounded-xl border border-white/10 bg-[#0a1728] px-4 py-2.5">


              <div className="flex items-center gap-2">


                <span
                  className={`h-2 w-2 rounded-full ${
                    backendOnline
                      ? "bg-emerald-400"
                      : "bg-yellow-400"
                  }`}
                />


                <span className="text-xs text-slate-300">

                  {
                    backendOnline
                      ? "Live"
                      : "Connection issue"
                  }

                </span>


              </div>


              {lastUpdated && (

                <p className="mt-1 text-[9px] text-slate-600">

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


            <button
              type="button"

              onClick={() =>
                fetchCitizenData(
                  true
                )
              }

              disabled={
                refreshing
              }

              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
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


        </div>


        {/* ================================================================= */}
        {/* WARD SELECT                                                       */}
        {/* ================================================================= */}

        <div className="mb-6 rounded-2xl border border-white/10 bg-[#0a1728] p-5">


          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">


            <div className="flex items-center gap-3">


              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">

                <MapPin className="h-5 w-5 text-blue-400" />

              </div>


              <div>


                <p className="text-[10px] uppercase tracking-wider text-slate-600">
                  Current Ward
                </p>


                <p className="mt-1 font-semibold text-white">
                  {
                    wardId
                  }
                </p>


              </div>


            </div>


            <select
              value={
                wardId
              }

              onChange={(
                event
              ) => {

                setManualWardOverride(
                  true
                );

                setWardId(
                  event.target.value
                );

              }}

              className="rounded-lg border border-white/10 bg-[#07111f] px-4 py-2 text-sm text-slate-300 outline-none"
            >

              {
                Array.from(
                  {
                    length:
                      67,
                  },
                  (
                    _,
                    index
                  ) =>
                    `W${index + 1}`
                ).map(
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

                ))
              }

            </select>


          </div>


        </div>


        {/* ================================================================= */}
        {/* LOCATION STATUS                                                   */}
        {/* ================================================================= */}

        <LocationStatusCard
          status={
            locationStatus
          }

          wardId={
            wardId
          }

          distanceKm={
            detectedDistanceKm
          }

          coordinates={
            detectedCoordinates
          }

          manualOverride={
            manualWardOverride
          }
        />


        {/* ================================================================= */}
        {/* ERROR                                                             */}
        {/* ================================================================= */}

        {error && (

          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">


            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />


            <div>


              <p className="text-sm font-medium text-red-300">
                Live information unavailable
              </p>


              <p className="mt-1 text-xs text-red-300/70">
                {
                  error
                }
              </p>


            </div>


          </div>

        )}


        {/* ================================================================= */}
        {/* LOADING                                                           */}
        {/* ================================================================= */}

        {loading ? (

          <LoadingState />

        ) : (

          <>


            {/* ============================================================= */}
            {/* ACTIVE WARNING                                                */}
            {/* ============================================================= */}

            <ActiveCitizenAlert
              alert={
                activeAlert
              }
            />


            {/* ============================================================= */}
            {/* RISK STATUS                                                   */}
            {/* ============================================================= */}

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a1728] p-6">


              <div className="flex items-start justify-between gap-4">


                <div>


                  <p className="text-[10px] uppercase tracking-wider text-slate-600">
                    Current Ward Status
                  </p>


                  <h2 className="mt-2 text-xl font-semibold text-white">

                    {
                      wardRisk
                        ? `${wardRisk.ward} • ${wardRisk.level}`
                        : `${wardId} • Data unavailable`
                    }

                  </h2>


                </div>


                {wardRisk && (

                  <RiskBadge
                    level={
                      wardRisk.level
                    }
                  />

                )}


              </div>


              {wardRisk ? (

                <>


                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">


                    <Metric
                      label="Risk Score"
                      value={`${wardRisk.risk}/100`}
                    />


                    <Metric
                      label="Confidence"
                      value={`${wardRisk.confidence}%`}
                    />


                    <Metric
                      label="Rainfall"
                      value={`${wardRisk.reading.rainfallMm} mm/hr`}
                    />


                    <Metric
                      label="River Level"
                      value={`${wardRisk.reading.riverLevelCm} cm`}
                    />


                  </div>


                  <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">


                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                      Current Guidance
                    </p>


                    <p className="mt-2 text-sm leading-6 text-slate-400">

                      {
                        wardRisk.recommendedAction
                      }

                    </p>


                  </div>


                </>

              ) : (

                <p className="mt-5 text-sm text-slate-500">

                  PRAVAAH could not retrieve current ward measurements.

                </p>

              )}


            </div>


            {/* ============================================================= */}
            {/* ACTIONS                                                       */}
            {/* ============================================================= */}

            <div className="mt-6 grid gap-4 md:grid-cols-2">


              <Link
                href="/report-incident"

                className="group rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-5 transition hover:bg-blue-500/[0.1]"
              >


                <div className="flex items-center gap-3">


                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">

                    <ShieldAlert className="h-5 w-5 text-blue-400" />

                  </div>


                  <div>


                    <h3 className="font-semibold text-white">
                      Report an Incident
                    </h3>


                    <p className="mt-1 text-xs text-slate-500">

                      Report flooding, waterlogging or local hazards.

                    </p>


                  </div>


                </div>


              </Link>


              <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">


                <div className="flex items-center gap-3">


                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">

                    <BellRing className="h-5 w-5 text-emerald-400" />

                  </div>


                  <div>


                    <h3 className="font-semibold text-white">
                      Published Alerts
                    </h3>


                    <p className="mt-1 text-xs text-slate-500">

                      {
                        alerts.length
                      } active alert(s) for {
                        wardId
                      }.

                    </p>


                  </div>


                </div>


              </div>


            </div>


            {/* ============================================================= */}
            {/* RECENT ALERTS                                                 */}
            {/* ============================================================= */}

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a1728]">


              <div className="border-b border-white/10 p-5">


                <h3 className="font-semibold text-white">
                  Recent Published Alerts
                </h3>


                <p className="mt-1 text-xs text-slate-500">

                  Officer-approved warnings currently active for your ward.

                </p>


              </div>


              {
                alerts.length ===
                0

                  ? (

                    <div className="p-8 text-center">


                      <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500/60" />


                      <p className="mt-3 text-sm text-slate-400">
                        No published alerts for this ward.
                      </p>


                    </div>

                  )

                  : (

                    <div className="divide-y divide-white/5">

                      {
                        alerts.map(
                          (
                            alert
                          ) => (

                          <RecentAlert
                            key={
                              alert.id
                            }

                            alert={
                              alert
                            }
                          />

                        ))
                      }

                    </div>

                  )
              }


            </div>


          </>

        )}


      </div>

    </main>

  );
}


/* ========================================================================= */
/* LOCATION STATUS CARD                                                      */
/* ========================================================================= */

function LocationStatusCard({
  status,
  wardId,
  distanceKm,
  coordinates,
  manualOverride,
}: {
  status:
    | "IDLE"
    | "DETECTING"
    | "DETECTED"
    | "OUTSIDE_COVERAGE"
    | "DENIED"
    | "UNAVAILABLE";

  wardId:
    string;

  distanceKm:
    number | null;

  coordinates:
    {
      latitude: number;
      longitude: number;
    } | null;

  manualOverride:
    boolean;
}) {

  if (
    status ===
    "IDLE"
  ) {
    return null;
  }


  if (
    status ===
    "DETECTING"
  ) {

    return (

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.05] p-4">

        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />


        <div>

          <p className="text-sm font-medium text-blue-300">
            Detecting your ward
          </p>


          <p className="mt-1 text-xs leading-5 text-slate-500">
            PRAVAAH is using your device location once to identify the nearest monitored ward.
          </p>

        </div>

      </div>

    );

  }


  if (
    status ===
    "DETECTED"
  ) {

    return (

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">

        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />


        <div>

          <p className="text-sm font-medium text-emerald-300">
            Ward detected automatically
          </p>


          <p className="mt-1 text-xs leading-5 text-slate-500">

            PRAVAAH detected{" "}

            <span className="font-semibold text-slate-300">
              {
                wardId
              }
            </span>

            {
              distanceKm !==
                null
                ? ` approximately ${distanceKm} km from your detected location.`
                : "."
            }

          </p>


          {manualOverride && (

            <p className="mt-1 text-[10px] text-yellow-400/80">
              Manual ward selection is currently overriding the detected ward.
            </p>

          )}

        </div>

      </div>

    );

  }


  if (
    status ===
    "OUTSIDE_COVERAGE"
  ) {

    return (

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.05] p-4">

        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />


        <div>

          <p className="text-sm font-medium text-yellow-300">
            Outside PRAVAAH monitoring coverage
          </p>


          <p className="mt-1 text-xs leading-5 text-slate-500">

            Your detected location is outside the configured Bhubaneswar ward coverage area.

            {
              distanceKm !==
                null
                ? ` The nearest monitored ward is approximately ${distanceKm} km away.`
                : ""
            }

            {" "}Use the ward selector above for prototype testing.

          </p>


          {coordinates && (

            <p className="mt-2 text-[10px] text-slate-600">
              Detected coordinates:{" "}
              {
                coordinates.latitude.toFixed(
                  4
                )
              }
              ,{" "}
              {
                coordinates.longitude.toFixed(
                  4
                )
              }
            </p>

          )}

        </div>

      </div>

    );

  }


  if (
    status ===
    "DENIED"
  ) {

    return (

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.05] p-4">

        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />


        <div>

          <p className="text-sm font-medium text-yellow-300">
            Location permission denied
          </p>


          <p className="mt-1 text-xs leading-5 text-slate-500">
            Automatic ward detection is unavailable. Use the ward selector above to choose your ward manually.
          </p>

        </div>

      </div>

    );

  }


  return (

    <div className="mb-6 flex items-start gap-3 rounded-xl border border-slate-500/20 bg-white/[0.03] p-4">

      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />


      <div>

        <p className="text-sm font-medium text-slate-300">
          Automatic location unavailable
        </p>


        <p className="mt-1 text-xs leading-5 text-slate-500">
          PRAVAAH could not determine your current ward automatically. Continue using manual ward selection.
        </p>

      </div>

    </div>

  );
}


/* ========================================================================= */
/* ACTIVE CITIZEN ALERT                                                      */
/* ========================================================================= */

function ActiveCitizenAlert({
  alert,
}: {
  alert:
    PublishedAlert | null;
}) {

  if (
    !alert
  ) {

    return (

      <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-6">


        <div className="flex items-start gap-3">


          <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-400" />


          <div>


            <h2 className="font-semibold text-white">
              No active published warning
            </h2>


            <p className="mt-2 text-sm text-slate-500">

              There are currently no officer-published emergency alerts for
              this ward.

            </p>


          </div>


        </div>


      </div>

    );

  }


  return (

    <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-6">


      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">


        <div className="flex gap-4">


          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10">

            <AlertTriangle className="h-6 w-6 text-red-400" />

          </div>


          <div>


            <div className="flex flex-wrap items-center gap-2">


              <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-red-300 ring-1 ring-red-500/20">

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


            <h2 className="mt-3 text-xl font-bold text-white">

              {
                alert.title
              }

            </h2>


            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">

              {
                alert.message
              }

            </p>


          </div>


        </div>


        <div className="shrink-0 text-left md:text-right">


          <p className="text-[9px] uppercase tracking-wider text-slate-600">
            Risk
          </p>


          <p className="mt-1 text-2xl font-bold text-red-300">

            {
              alert.risk
            }
            /100

          </p>


          <p className="mt-1 text-[10px] text-slate-500">

            {
              alert.confidence
            }
            % confidence

          </p>


        </div>


      </div>


      <div className="mt-5 rounded-xl border border-red-500/10 bg-[#07111f]/40 p-4">


        <p className="text-[10px] font-semibold uppercase tracking-wider text-red-300">
          Recommended Action
        </p>


        <p className="mt-2 text-sm leading-6 text-slate-300">

          {
            alert.recommendedAction
          }

        </p>


      </div>


    </div>

  );
}


/* ========================================================================= */
/* RECENT ALERT                                                              */
/* ========================================================================= */

function RecentAlert({
  alert,
}: {
  alert:
    PublishedAlert;
}) {

  return (

    <div className="p-5">


      <div className="flex items-start justify-between gap-4">


        <div>


          <div className="flex items-center gap-2">


            <RiskBadge
              level={
                alert.level
              }
            />


            <span className="text-[10px] text-slate-600">

              {
                alert.ward
              }

            </span>


          </div>


          <h4 className="mt-3 text-sm font-semibold text-white">

            {
              alert.title
            }

          </h4>


          <p className="mt-1 text-xs leading-5 text-slate-500">

            {
              alert.message
            }

          </p>


        </div>


        <div className="text-right">


          <p className="text-xs font-semibold text-white">

            {
              alert.risk
            }
            /100

          </p>


          <p className="mt-1 text-[9px] text-slate-600">

            {
              new Date(
                alert.publishedAt ??
                alert.createdAt
              ).toLocaleTimeString(
                "en-IN",
                {
                  hour:
                    "2-digit",

                  minute:
                    "2-digit",
                }
              )
            }

          </p>


        </div>


      </div>


    </div>

  );
}


/* ========================================================================= */
/* RISK BADGE                                                                */
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
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ring-1 ${
        styles[
          level
        ]
      }`}
    >

      {
        level
      }

    </span>

  );
}


/* ========================================================================= */
/* METRIC                                                                    */
/* ========================================================================= */

function Metric({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {

  return (

    <div className="rounded-xl bg-white/[0.03] p-4">


      <p className="text-[9px] uppercase tracking-wider text-slate-600">

        {
          label
        }

      </p>


      <p className="mt-2 text-lg font-semibold text-slate-200">

        {
          value
        }

      </p>


    </div>

  );
}


/* ========================================================================= */
/* LOADING                                                                   */
/* ========================================================================= */

function LoadingState() {

  return (

    <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-12 text-center">


      <RefreshCw className="mx-auto h-7 w-7 animate-spin text-blue-400" />


      <p className="mt-4 text-sm text-slate-400">

        Loading citizen safety information...

      </p>


    </div>

  );
}