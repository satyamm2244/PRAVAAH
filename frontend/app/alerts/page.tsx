"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  BellRing,
  CheckCircle2,
  Clock3,
  Eye,
  Search,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import EvidenceSidebar from "@/components/dashboard/EvidenceSidebar";
import OfficerRouteGuard from "@/components/auth/OfficerRouteGuard";

import type {
  WardId,
  WardReading,
} from "@/lib/mock-engine";

import {
  evaluateAllWards,
  type RiskLevel,
  type WardRisk,
} from "@/lib/risk-engine";

import {
  generateAllWardAlerts,
  type GeneratedAlert,
} from "@/lib/alert-engine";

import {
  authFetch,
} from "@/lib/auth";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type FilterTab =
  | "All"
  | RiskLevel;


type AlertStatus =
  | "PENDING"
  | "PUBLISHED"
  | "DISMISSED";


type ManagedAlert =
  GeneratedAlert & {
    status: AlertStatus;
  };


type BackendWard = {
  ward: string;

  rainfallMm: number;

  riverLevelCm: number;

  reportCount: number;

  latitude: number;

  longitude: number;
};


type PersistedAlert = {
  id: string;

  ward: string;

  priority:
    GeneratedAlert["priority"];

  trigger:
    GeneratedAlert["trigger"];

  level:
    RiskLevel;

  title: string;

  message: string;

  risk: number;

  confidence: number;

  primaryHazard: string;

  recommendedAction: string;

  status:
    | "PUBLISHED"
    | "DISMISSED";

  publishedBy?:
    string | null;

  createdAt: number;

  publishedAt?:
    number | null;

  dismissedAt?:
    number | null;
};


/* ========================================================================= */
/* CONFIG                                                                    */
/* ========================================================================= */

const FILTERS:
  FilterTab[] = [
    "All",
    "CRITICAL",
    "HIGH",
    "WATCH",
    "NORMAL",
  ];


const REFRESH_MS =
  4000;


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


/* ========================================================================= */
/* PAGE                                                                      */
/* ========================================================================= */

export default function AlertsPage() {

  const [
    wardRisks,
    setWardRisks,
  ] =
    useState<
      WardRisk[]
    >([]);


  const [
    alerts,
    setAlerts,
  ] =
    useState<
      ManagedAlert[]
    >([]);


  const [
    filter,
    setFilter,
  ] =
    useState<
      FilterTab
    >("All");


  const [
    selectedWard,
    setSelectedWard,
  ] =
    useState<
      WardRisk | null
    >(null);


  const [
    backendOnline,
    setBackendOnline,
  ] =
    useState(
      false
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    lastUpdated,
    setLastUpdated,
  ] =
    useState<
      Date | null
    >(null);


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    publishingAlertId,
    setPublishingAlertId,
  ] =
    useState<
      string | null
    >(null);


  const [
    dismissingAlertId,
    setDismissingAlertId,
  ] =
    useState<
      string | null
    >(null);


  const [
    actionError,
    setActionError,
  ] =
    useState<
      string | null
    >(null);


  /*
   * Stores the previous ward-risk snapshot.
   *
   * This lets PRAVAAH detect:
   *
   * NORMAL → WATCH
   * WATCH → HIGH
   * HIGH → CRITICAL
   *
   * and sudden changes in risk.
   */

  const previousRisksRef =
    useRef<
      WardRisk[] | null
    >(null);


  /* ========================================================================= */
  /* BACKEND FETCH                                                             */
  /* ========================================================================= */

  useEffect(
    () => {

      let cancelled =
        false;


      async function fetchWardData() {

        try {

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


          if (
            cancelled
          ) {
            return;
          }


          /* ----------------------------------------------------------------- */
          /* CONVERT BACKEND DATA                                              */
          /* ----------------------------------------------------------------- */

          const readings:
            WardReading[] =
            data.map(
              (
                ward
              ) => ({

                ward:
                  ward.ward as WardId,

                rainfallMm:
                  ward.rainfallMm,

                riverLevelCm:
                  ward.riverLevelCm,

                reportCount:
                  ward.reportCount,

              })
            );


          /* ----------------------------------------------------------------- */
          /* RISK ENGINE                                                       */
          /* ----------------------------------------------------------------- */

          const evaluated =
            evaluateAllWards(
              readings
            );


          /* ----------------------------------------------------------------- */
          /* ALERT ENGINE                                                      */
          /* ----------------------------------------------------------------- */

          const previousRisks =
            previousRisksRef.current ??
            [];


          const generatedAlerts =
            generateAllWardAlerts(
              evaluated,
              previousRisks
            );


          /* ----------------------------------------------------------------- */
          /* PERSISTED ALERT HISTORY                                            */
          /* ----------------------------------------------------------------- */

          let persistedAlerts:
            PersistedAlert[] =
            [];


          try {

            const historyResponse =
              await authFetch(
                `${API_BASE_URL}/api/alerts/history/all`,
                {
                  cache:
                    "no-store",
                }
              );


            if (
              historyResponse.ok
            ) {

              persistedAlerts =
                await historyResponse.json();

            }

          } catch (
            historyError
          ) {

            console.warn(
              "Unable to synchronize persisted alert history:",
              historyError
            );

          }


          /*
           * Merge newly generated alerts with
           * persisted PUBLISHED / DISMISSED
           * states from the backend.
           */

          setAlerts(
            (
              current
            ) =>
              mergeAlertsWithHistory(
                current,
                generatedAlerts,
                persistedAlerts
              )
          );


          /*
           * Store current snapshot AFTER
           * generating alerts.
           */

          previousRisksRef.current =
            evaluated;


          setWardRisks(
            evaluated
          );


          setBackendOnline(
            true
          );


          setLastUpdated(
            new Date()
          );


          /* ----------------------------------------------------------------- */
          /* KEEP EVIDENCE SIDEBAR LIVE                                        */
          /* ----------------------------------------------------------------- */

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
                current
              );

            }
          );

        } catch (
          error
        ) {

          console.error(
            "Unable to fetch alerts:",
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


      /* ------------------------------------------------------------------- */
      /* INITIAL FETCH                                                       */
      /* ------------------------------------------------------------------- */

      fetchWardData();


      /* ------------------------------------------------------------------- */
      /* LIVE REFRESH                                                       */
      /* ------------------------------------------------------------------- */

      const interval =
        setInterval(
          fetchWardData,
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
  /* PUBLISH ALERT                                                             */
  /* ========================================================================= */

  async function publishAlert(
    alertId: string
  ) {

    const alert =
      alerts.find(
        (
          current
        ) =>
          current.id ===
          alertId
      );


    if (
      !alert ||
      alert.status ===
        "PUBLISHED"
    ) {
      return;
    }


    try {

      setActionError(
        null
      );

      setPublishingAlertId(
        alertId
      );


      const response =
        await authFetch(
          `${API_BASE_URL}/api/alerts`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  alert.id,

                ward:
                  alert.ward,

                priority:
                  alert.priority,

                trigger:
                  alert.trigger,

                level:
                  alert.level,

                title:
                  alert.title,

                message:
                  alert.message,

                risk:
                  alert.risk,

                confidence:
                  alert.confidence,

                primaryHazard:
                  alert.primaryHazard,

                recommendedAction:
                  alert.recommendedAction,

                createdAt:
                  alert.createdAt,
              }),
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          data.detail ||
            "Unable to publish alert."
        );

      }


      /*
       * The backend may return an existing
       * equivalent alert with a different ID.
       *
       * We keep the frontend event ID but mark
       * its operational status as PUBLISHED.
       */

      setAlerts(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              alertId
                ? {
                    ...item,

                    status:
                      "PUBLISHED",
                  }
                : item
          )
      );

    } catch (
      publishError
    ) {

      console.error(
        "Unable to publish alert:",
        publishError
      );


      setActionError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish alert."
      );

    } finally {

      setPublishingAlertId(
        null
      );

    }

  }


  /* ========================================================================= */
  /* DISMISS ALERT                                                             */
  /* ========================================================================= */

  async function dismissAlert(
    alertId: string
  ) {

    const alert =
      alerts.find(
        (
          current
        ) =>
          current.id ===
          alertId
      );


    if (
      !alert
    ) {
      return;
    }


    /*
     * A PENDING alert has never been
     * published to citizens, so it only
     * needs to be dismissed locally.
     */

    if (
      alert.status ===
      "PENDING"
    ) {

      setAlerts(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              alertId
                ? {
                    ...item,

                    status:
                      "DISMISSED",
                  }
                : item
          )
      );


      return;
    }


    try {

      setActionError(
        null
      );

      setDismissingAlertId(
        alertId
      );


      /*
       * A persisted alert may have been
       * returned by the backend under a
       * different ID after duplicate
       * detection.
       *
       * Resolve the actual database alert
       * through officer alert history.
       */

      const historyResponse =
        await authFetch(
          `${API_BASE_URL}/api/alerts/history/all`,
          {
            cache:
              "no-store",
          }
        );


      if (
        !historyResponse.ok
      ) {

        throw new Error(
          "Unable to load alert history."
        );

      }


      const history:
        PersistedAlert[] =
        await historyResponse.json();


      const persistedAlert =
        history.find(
          (
            item
          ) =>
            persistedFingerprint(
              item
            ) ===
            alertFingerprint(
              alert
            ) &&
            item.status ===
              "PUBLISHED"
        );


      if (
        !persistedAlert
      ) {

        /*
         * If the backend does not have the
         * alert, treat this as a local alert.
         */

        setAlerts(
          (
            current
          ) =>
            current.map(
              (
                item
              ) =>
                item.id ===
                alertId
                  ? {
                      ...item,

                      status:
                        "DISMISSED",
                    }
                  : item
            )
        );


        return;
      }


      const response =
        await authFetch(
          `${API_BASE_URL}/api/alerts/${persistedAlert.id}/dismiss`,
          {
            method:
              "PATCH",
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          data.detail ||
            "Unable to dismiss alert."
        );

      }


      setAlerts(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              alertFingerprint(
                item
              ) ===
              persistedFingerprint(
                persistedAlert
              )
                ? {
                    ...item,

                    status:
                      "DISMISSED",
                  }
                : item
          )
      );

    } catch (
      dismissError
    ) {

      console.error(
        "Unable to dismiss alert:",
        dismissError
      );


      setActionError(
        dismissError instanceof Error
          ? dismissError.message
          : "Unable to dismiss alert."
      );

    } finally {

      setDismissingAlertId(
        null
      );

    }

  }


  /* ========================================================================= */
  /* REVIEW EVIDENCE                                                           */
  /* ========================================================================= */

  function reviewEvidence(
    alert: ManagedAlert
  ) {

    const ward =
      wardRisks.find(
        (
          wardRisk
        ) =>
          wardRisk.ward ===
          alert.ward
      );


    if (
      !ward
    ) {
      return;
    }


    setSelectedWard(
      ward
    );

  }


  /* ========================================================================= */
  /* COUNTS                                                                    */
  /* ========================================================================= */

  const pendingCount =
    alerts.filter(
      (
        alert
      ) =>
        alert.status ===
        "PENDING"
    ).length;


  const publishedCount =
    alerts.filter(
      (
        alert
      ) =>
        alert.status ===
        "PUBLISHED"
    ).length;


  const dismissedCount =
    alerts.filter(
      (
        alert
      ) =>
        alert.status ===
        "DISMISSED"
    ).length;


  const emergencyCount =
    alerts.filter(
      (
        alert
      ) =>
        alert.priority ===
          "EMERGENCY" &&
        alert.status !==
          "DISMISSED"
    ).length;


  /* ========================================================================= */
  /* FILTER                                                                    */
  /* ========================================================================= */

  const filteredAlerts =
    useMemo(
      () => {

        /*
         * Dismissed alerts disappear
         * from the active alert feed.
         */

        let result =
          alerts.filter(
            (
              alert
            ) =>
              alert.status !==
              "DISMISSED"
          );


        /* ------------------------------------------------------------------- */
        /* RISK FILTER                                                        */
        /* ------------------------------------------------------------------- */

        if (
          filter !==
          "All"
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


        /* ------------------------------------------------------------------- */
        /* SEARCH                                                             */
        /* ------------------------------------------------------------------- */

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


        /* ------------------------------------------------------------------- */
        /* PRIORITY SORT                                                      */
        /* ------------------------------------------------------------------- */

        return [
          ...result,
        ].sort(
          (
            a,
            b
          ) => {

            const priorityDifference =
              getPriorityValue(
                b.priority
              ) -
              getPriorityValue(
                a.priority
              );


            if (
              priorityDifference !==
              0
            ) {
              return priorityDifference;
            }


            return (
              b.createdAt -
              a.createdAt
            );

          }
        );

      },
      [
        alerts,
        filter,
        search,
      ]
    );


  /* ========================================================================= */
  /* UI                                                                        */
  /* ========================================================================= */

  return (

    <OfficerRouteGuard>

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
                Intelligent Warning System
              </p>


              <h2 className="text-3xl font-bold tracking-tight">
                Alert Review Center
              </h2>


              <p className="mt-2 max-w-2xl text-sm text-slate-400">

                PRAVAAH automatically detects meaningful risk changes and
                creates alerts for officer review before public publication.

              </p>


            </div>


            {/* ============================================================= */}
            {/* CONNECTION                                                    */}
            {/* ============================================================= */}

            <div className="flex w-fit items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">


              <span className="relative flex h-2 w-2">


                {backendOnline && (

                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

                )}


                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    backendOnline
                      ? "bg-emerald-400"
                      : "bg-yellow-400"
                  }`}
                />


              </span>


              <div>


                <p className="text-sm text-slate-300">

                  {backendOnline
                    ? "Live Monitoring"
                    : "Backend Offline"}

                </p>


                {lastUpdated && (

                  <p className="mt-0.5 text-[10px] text-slate-500">

                    Updated{" "}

                    {lastUpdated.toLocaleTimeString(
                      "en-IN",
                      {
                        hour:
                          "2-digit",

                        minute:
                          "2-digit",

                        second:
                          "2-digit",
                      }
                    )}

                  </p>

                )}


              </div>


            </div>


          </div>


          {/* =============================================================== */}
          {/* SUMMARY                                                         */}
          {/* =============================================================== */}

          <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">


            <SummaryCard
              title="Pending Review"
              value={
                pendingCount
              }
              icon={
                BellRing
              }
              className="text-yellow-400"
            />


            <SummaryCard
              title="Emergency"
              value={
                emergencyCount
              }
              icon={
                ShieldAlert
              }
              className="text-red-400"
            />


            <SummaryCard
              title="Published"
              value={
                publishedCount
              }
              icon={
                CheckCircle2
              }
              className="text-emerald-400"
            />


            <SummaryCard
              title="Dismissed"
              value={
                dismissedCount
              }
              icon={
                XCircle
              }
              className="text-slate-400"
            />


          </div>


          {/* =============================================================== */}
          {/* FILTERS                                                         */}
          {/* =============================================================== */}

          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">


            <div className="flex flex-wrap gap-2">


              {FILTERS.map(
                (
                  currentFilter
                ) => {


                  const count =
                    currentFilter ===
                    "All"

                      ? alerts.filter(
                          (
                            alert
                          ) =>
                            alert.status !==
                            "DISMISSED"
                        ).length

                      : alerts.filter(
                          (
                            alert
                          ) =>
                            alert.status !==
                              "DISMISSED" &&
                            alert.level ===
                              currentFilter
                        ).length;


                  return (

                    <button
                      key={
                        currentFilter
                      }

                      type="button"

                      onClick={() =>
                        setFilter(
                          currentFilter
                        )
                      }

                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        filter ===
                        currentFilter
                          ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >

                      {
                        currentFilter
                      }


                      <span className="ml-1.5 text-xs text-slate-500">

                        (
                        {
                          count
                        }
                        )

                      </span>


                    </button>

                  );

                }
              )}


            </div>


            {/* ============================================================= */}
            {/* SEARCH                                                        */}
            {/* ============================================================= */}

            <div className="relative w-full xl:w-[320px]">


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

                placeholder="Search alert, ward or hazard..."

                className="w-full rounded-xl border border-white/10 bg-[#0a1728] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/40"
              />


            </div>


          </div>


          {/* =============================================================== */}
          {/* RESULTS                                                         */}
          {/* =============================================================== */}

          {!loading && (

            <div className="mb-4 flex items-center justify-between">


              <p className="text-xs text-slate-500">

                Showing{" "}

                <span className="font-semibold text-slate-300">

                  {
                    filteredAlerts.length
                  }

                </span>{" "}

                active generated alert(s)

              </p>


              <p className="hidden text-xs text-slate-600 sm:block">

                Officer review required before public publication

              </p>


            </div>

          )}


          {/* =============================================================== */}
          {/* LOADING                                                         */}
          {/* =============================================================== */}

          {loading && (

            <LoadingState />

          )}


          {/* =============================================================== */}
          {/* BACKEND ERROR                                                   */}
          {/* =============================================================== */}

          {!loading &&
            !backendOnline &&
            wardRisks.length ===
              0 && (

              <BackendError />

            )}


          {/* =============================================================== */}
          {/* ALERT ACTION ERROR                                              */}
          {/* =============================================================== */}

          {actionError && (

            <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">

              <div>

                <p className="text-sm font-medium text-red-300">
                  Alert action failed
                </p>

                <p className="mt-1 text-xs text-red-300/70">
                  {
                    actionError
                  }
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setActionError(
                    null
                  )
                }
                className="text-xs text-red-300/70 transition hover:text-red-200"
              >
                Close
              </button>

            </div>

          )}


          {/* =============================================================== */}
          {/* ALERTS                                                          */}
          {/* =============================================================== */}

          {!loading &&
            filteredAlerts.length >
              0 && (

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">


                {filteredAlerts.map(
                  (
                    alert
                  ) => (

                    <GeneratedAlertCard
                      key={
                        alert.id
                      }

                      alert={
                        alert
                      }

                      onReview={() =>
                        reviewEvidence(
                          alert
                        )
                      }

                      onPublish={() =>
                        publishAlert(
                          alert.id
                        )
                      }

                      onDismiss={() =>
                        dismissAlert(
                          alert.id
                        )
                      }

                      publishing={
                        publishingAlertId ===
                        alert.id
                      }

                      dismissing={
                        dismissingAlertId ===
                        alert.id
                      }
                    />

                  )
                )}


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


                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/60" />


                <h3 className="mt-4 font-semibold text-white">

                  No active generated alerts

                </h3>


                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">

                  PRAVAAH has not detected a matching escalation,
                  significant risk increase or newly verified incident.

                </p>


              </div>

            )}


        </section>


      </div>


      {/* =================================================================== */}
      {/* EVIDENCE SIDEBAR                                                    */}
      {/* =================================================================== */}

      <EvidenceSidebar
        wardRisk={
          selectedWard
        }

        onClose={() =>
          setSelectedWard(
            null
          )
        }
      />


      </main>

    </OfficerRouteGuard>

  );
}


/* ========================================================================= */
/* ALERT CARD                                                                */
/* ========================================================================= */

function GeneratedAlertCard({
  alert,
  onReview,
  onPublish,
  onDismiss,
  publishing,
  dismissing,
}: {
  alert:
    ManagedAlert;

  onReview:
    () => void;

  onPublish:
    () => void;

  onDismiss:
    () => void;

  publishing:
    boolean;

  dismissing:
    boolean;
}) {

  const priorityStyles =
    getPriorityStyles(
      alert.priority
    );


  return (

    <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">


      <div className="flex items-start justify-between gap-3">


        <div className="flex flex-wrap items-center gap-2">


          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest ring-1 ${priorityStyles}`}
          >

            {
              alert.priority
            }

          </span>


          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-400">

            {
              alert.trigger.replaceAll(
                "_",
                " "
              )
            }

          </span>


        </div>


        <span className="text-xs font-semibold text-slate-500">

          {
            alert.ward
          }

        </span>


      </div>


      <h3 className="mt-4 text-base font-semibold text-white">

        {
          alert.title
        }

      </h3>


      <p className="mt-2 text-xs leading-5 text-slate-500">

        {
          alert.message
        }

      </p>


      {/* =================================================================== */}
      {/* METRICS                                                             */}
      {/* =================================================================== */}

      <div className="mt-5 grid grid-cols-2 gap-2">


        <Metric
          label="Risk"
          value={`${alert.risk}/100`}
        />


        <Metric
          label="Confidence"
          value={`${alert.confidence}%`}
        />


        <Metric
          label="Level"
          value={
            alert.level
          }
        />


        <Metric
          label="Hazard"
          value={
            alert.primaryHazard
          }
        />


      </div>


      {/* =================================================================== */}
      {/* ACTION                                                              */}
      {/* =================================================================== */}

      <div className="mt-4 rounded-lg border border-blue-400/10 bg-blue-500/[0.05] p-3">


        <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-400">

          Recommended Action

        </p>


        <p className="mt-2 text-[10px] leading-4 text-slate-400">

          {
            alert.recommendedAction
          }

        </p>


      </div>


      {/* =================================================================== */}
      {/* STATUS                                                              */}
      {/* =================================================================== */}

      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">


        <span
          className={`text-[10px] font-semibold ${
            alert.status ===
              "PUBLISHED"
              ? "text-emerald-400"
              : "text-yellow-400"
          }`}
        >

          {
            alert.status ===
            "PUBLISHED"
              ? "Published"
              : "Awaiting officer review"
          }

        </span>


        <span className="text-[9px] text-slate-600">

          {
            new Date(
              alert.createdAt
            ).toLocaleTimeString(
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

        </span>


      </div>


      {/* =================================================================== */}
      {/* BUTTONS                                                             */}
      {/* =================================================================== */}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">


        <button
          type="button"

          onClick={
            onReview
          }

          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-medium text-slate-300 transition hover:bg-white/[0.07]"
        >

          <Eye className="h-3.5 w-3.5" />

          Evidence

        </button>


        <button
          type="button"

          onClick={
            onPublish
          }

          disabled={
            alert.status ===
              "PUBLISHED" ||
            publishing ||
            dismissing
          }

          className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >

          <Send className="h-3.5 w-3.5" />


          {
            publishing
              ? "Publishing..."
              : alert.status ===
                  "PUBLISHED"
                ? "Published"
                : "Publish"
          }

        </button>


        <button
          type="button"

          onClick={
            onDismiss
          }

          disabled={
            dismissing ||
            publishing
          }

          className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-[10px] font-semibold text-red-300 ring-1 ring-red-500/20 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
        >

          <XCircle className="h-3.5 w-3.5" />

          {
            dismissing
              ? "Dismissing..."
              : "Dismiss"
          }

        </button>


      </div>


    </div>

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
  title:
    string;

  value:
    number;

  icon:
    typeof ShieldAlert;

  className:
    string;
}) {

  return (

    <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">


      <div className="flex items-center justify-between">


        <div>


          <p className="text-xs text-slate-500">

            {
              title
            }

          </p>


          <p className="mt-2 text-2xl font-bold">

            {
              value
            }

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

    <div className="rounded-lg bg-white/[0.03] p-3">


      <p className="text-[9px] uppercase tracking-wider text-slate-600">

        {
          label
        }

      </p>


      <p className="mt-1 break-words text-sm font-semibold text-slate-200">

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


      <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-blue-400" />


      <p className="mt-4 text-sm text-slate-400">

        Loading live alert intelligence...

      </p>


    </div>

  );
}


/* ========================================================================= */
/* BACKEND ERROR                                                             */
/* ========================================================================= */

function BackendError() {

  return (

    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.04] p-10 text-center">


      <Clock3 className="mx-auto h-8 w-8 text-yellow-400" />


      <h3 className="mt-4 font-semibold text-white">

        Backend connection unavailable

      </h3>


      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">

        PRAVAAH could not retrieve the latest ward information.
        The alert engine will automatically resume when the backend reconnects.

      </p>


    </div>

  );
}


/* ========================================================================= */
/* ALERT MERGE                                                               */
/* ========================================================================= */

function mergeAlertsWithHistory(
  current:
    ManagedAlert[],

  incoming:
    GeneratedAlert[],

  persisted:
    PersistedAlert[]
): ManagedAlert[] {

  const result =
    [
      ...current,
    ];


  for (
    const alert
    of incoming
  ) {

    const fingerprint =
      alertFingerprint(
        alert
      );


    const persistedMatch =
      persisted.find(
        (
          item
        ) =>
          persistedFingerprint(
            item
          ) ===
          fingerprint
      );


    const existingIndex =
      result.findIndex(
        (
          item
        ) =>
          alertFingerprint(
            item
          ) ===
          fingerprint
      );


    const resolvedStatus:
      AlertStatus =
      persistedMatch
        ? persistedMatch.status
        : existingIndex >= 0
          ? result[
              existingIndex
            ].status
          : "PENDING";


    const managed:
      ManagedAlert = {
        ...alert,

        status:
          resolvedStatus,
      };


    if (
      existingIndex >=
      0
    ) {

      result[
        existingIndex
      ] = managed;

    } else {

      result.push(
        managed
      );

    }

  }


  /*
   * Keep persisted history entries represented
   * even when the current frontend engine did
   * not regenerate them during this refresh.
   */

  for (
    const persistedAlert
    of persisted
  ) {

    const fingerprint =
      persistedFingerprint(
        persistedAlert
      );


    const exists =
      result.some(
        (
          item
        ) =>
          alertFingerprint(
            item
          ) ===
          fingerprint
      );


    if (
      exists
    ) {
      continue;
    }


    result.push({
      id:
        persistedAlert.id,

      ward:
        persistedAlert.ward,

      priority:
        persistedAlert.priority,

      trigger:
        persistedAlert.trigger,

      title:
        persistedAlert.title,

      message:
        persistedAlert.message,

      risk:
        persistedAlert.risk,

      level:
        persistedAlert.level,

      confidence:
        persistedAlert.confidence,

      primaryHazard:
        persistedAlert.primaryHazard,

      recommendedAction:
        persistedAlert.recommendedAction,

      createdAt:
        persistedAlert.createdAt,

      requiresOfficerReview:
        false,

      status:
        persistedAlert.status,
    });

  }


  return result.sort(
    (
      a,
      b
    ) =>
      b.createdAt -
      a.createdAt
  );
}


/* ========================================================================= */
/* PERSISTED ALERT FINGERPRINT                                               */
/* ========================================================================= */

function persistedFingerprint(
  alert:
    PersistedAlert
): string {

  return [

    alert.ward,

    alert.trigger,

    alert.level,

    alert.risk,

    alert.title,

  ].join(
    "|"
  );

}


/* ========================================================================= */
/* ALERT FINGERPRINT                                                         */
/* ========================================================================= */

function alertFingerprint(
  alert:
    GeneratedAlert
): string {

  return [

    alert.ward,

    alert.trigger,

    alert.level,

    alert.risk,

    alert.title,

  ].join(
    "|"
  );

}


/* ========================================================================= */
/* PRIORITY VALUE                                                            */
/* ========================================================================= */

function getPriorityValue(
  priority:
    GeneratedAlert["priority"]
): number {

  switch (
    priority
  ) {

    case "EMERGENCY":
      return 4;


    case "WARNING":
      return 3;


    case "ADVISORY":
      return 2;


    case "INFO":
      return 1;


    default:
      return 0;

  }

}


/* ========================================================================= */
/* PRIORITY STYLES                                                           */
/* ========================================================================= */

function getPriorityStyles(
  priority:
    GeneratedAlert["priority"]
): string {

  switch (
    priority
  ) {

    case "EMERGENCY":

      return (
        "bg-red-500/10 text-red-400 ring-red-500/20"
      );


    case "WARNING":

      return (
        "bg-orange-500/10 text-orange-400 ring-orange-500/20"
      );


    case "ADVISORY":

      return (
        "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20"
      );


    case "INFO":

      return (
        "bg-blue-500/10 text-blue-400 ring-blue-500/20"
      );


    default:

      return (
        "bg-white/5 text-slate-400 ring-white/10"
      );

  }

}