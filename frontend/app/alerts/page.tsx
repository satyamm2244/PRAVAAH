"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  MapPin,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";

import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import OfficerRouteGuard from "@/components/auth/OfficerRouteGuard";

import {
  authFetch,
} from "@/lib/auth";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type RiskLevel =
  | "NORMAL"
  | "WATCH"
  | "HIGH"
  | "CRITICAL";


type CandidateAction =
  | "NEW"
  | "ESCALATE"
  | "OFFICER_REVIEW_STALE";


type EvidenceFreshness = {
  status?: string;

  ageMinutes?:
    number | null;

  score?:
    number;
};


type EvidenceItem = {
  sourceType:
    string;

  sourceName:
    string;

  mode:
    string;

  value?:
    number;

  unit?:
    string;

  description:
    string;

  freshness?:
    EvidenceFreshness;

  reliabilityScore?:
    number;
};


type AffectedArea = {
  primaryWard:
    string;

  scope:
    string;

  description:
    string;
};


type AlertCandidate = {
  id:
    string;

  ward:
    string;

  priority:
    string;

  trigger:
    string;

  level:
    RiskLevel;

  title:
    string;

  message:
    string;

  risk:
    number;

  confidence:
    number;

  primaryHazard:
    string;

  recommendedAction:
    string;

  createdAt:
    number;

  affectedArea:
    AffectedArea;

  evidence:
    EvidenceItem[];

  evidenceCount:
    number;

  citizenActions:
    string[];

  officerActions:
    string[];

  dataFreshness: {
    hasStaleSources:
      boolean;

    staleSourceCount:
      number;
  };

  staleOnlyPhysicalEvidence:
    boolean;

  publishRecommended:
    boolean;

  source:
    string;

  candidateAction:
    CandidateAction;

  existingAlertId?:
    string;

  existingLevel?:
    string;
};


type CandidateResponse = {
  count:
    number;

  suppressedDuplicates:
    number;

  suppressedCooldown:
    number;

  escalationCandidates:
    number;

  staleReviewCandidates:
    number;

  cooldownMinutes:
    number;

  candidateBucketMinutes:
    number;

  generatedAt:
    number;

  candidates:
    AlertCandidate[];
};


type PersistedAlert = {
  id:
    string;

  ward:
    string;

  priority:
    string;

  trigger:
    string;

  level:
    RiskLevel;

  title:
    string;

  message:
    string;

  risk:
    number;

  confidence:
    number;

  primaryHazard:
    string;

  recommendedAction:
    string;

  status:
    "PUBLISHED" | "DISMISSED";

  publishedBy?:
    string | null;

  createdAt:
    number;

  publishedAt?:
    number | null;

  dismissedAt?:
    number | null;
};


type FilterTab =
  | "ALL"
  | "CRITICAL"
  | "HIGH"
  | "WATCH";


type ViewTab =
  | "CANDIDATES"
  | "PUBLISHED"
  | "HISTORY";


/* ========================================================================= */
/* CONFIG                                                                    */
/* ========================================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


const REFRESH_MS =
  5000;


const FILTERS:
  FilterTab[] = [
    "ALL",
    "CRITICAL",
    "HIGH",
    "WATCH",
  ];


/* ========================================================================= */
/* PAGE                                                                      */
/* ========================================================================= */

export default function AlertsPage() {

  const [
    candidateData,
    setCandidateData,
  ] =
    useState<CandidateResponse | null>(
      null
    );


  const [
    history,
    setHistory,
  ] =
    useState<PersistedAlert[]>(
      []
    );


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
    useState<Date | null>(
      null
    );


  const [
    filter,
    setFilter,
  ] =
    useState<FilterTab>(
      "ALL"
    );


  const [
    viewTab,
    setViewTab,
  ] =
    useState<ViewTab>(
      "CANDIDATES"
    );


  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );


  const [
    selectedCandidate,
    setSelectedCandidate,
  ] =
    useState<AlertCandidate | null>(
      null
    );


  const [
    publishingId,
    setPublishingId,
  ] =
    useState<string | null>(
      null
    );


  const [
    dismissingId,
    setDismissingId,
  ] =
    useState<string | null>(
      null
    );


  const [
    actionError,
    setActionError,
  ] =
    useState<string | null>(
      null
    );


  const [
    actionSuccess,
    setActionSuccess,
  ] =
    useState<string | null>(
      null
    );


  /* ========================================================================= */
  /* FETCH DATA                                                                */
  /* ========================================================================= */

  const fetchData =
    useCallback(
      async (
        manual = false
      ) => {

        try {

          if (
            manual
          ) {

            setRefreshing(
              true
            );

          }


          setActionError(
            null
          );


          const [
            candidateResponse,
            historyResponse,
          ] =
            await Promise.all(
              [

                authFetch(
                  `${API_BASE_URL}/api/alerts/candidates`,
                  {
                    cache:
                      "no-store",
                  }
                ),

                authFetch(
                  `${API_BASE_URL}/api/alerts/history/all`,
                  {
                    cache:
                      "no-store",
                  }
                ),

              ]
            );


          if (
            !candidateResponse.ok
          ) {

            const data =
              await safeJson(
                candidateResponse
              );


            throw new Error(
              getErrorMessage(
                data,
                "Unable to load alert candidates."
              )
            );

          }


          if (
            !historyResponse.ok
          ) {

            const data =
              await safeJson(
                historyResponse
              );


            throw new Error(
              getErrorMessage(
                data,
                "Unable to load alert history."
              )
            );

          }


          const candidateJson:
            CandidateResponse =
            await candidateResponse.json();


          const historyJson:
            PersistedAlert[] =
            await historyResponse.json();


          setCandidateData(
            candidateJson
          );


          setHistory(
            historyJson
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
            "Unable to load alert center:",
            error
          );


          setBackendOnline(
            false
          );


          setActionError(
            error instanceof Error
              ? error.message
              : "Unable to load alert center."
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


  useEffect(
    () => {

      fetchData();


      const interval =
        setInterval(
          () => {

            fetchData();

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
      fetchData,
    ]
  );


  /* ========================================================================= */
  /* PUBLISH                                                                   */
  /* ========================================================================= */

  async function publishCandidate(
    candidate:
      AlertCandidate
  ) {

    if (
      !candidate.publishRecommended &&
      candidate.candidateAction ===
        "OFFICER_REVIEW_STALE"
    ) {

      setSelectedCandidate(
        candidate
      );


      setActionError(
        "This candidate relies entirely on stale physical evidence. Review the evidence before taking action."
      );


      return;
    }


    try {

      setPublishingId(
        candidate.id
      );


      setActionError(
        null
      );


      setActionSuccess(
        null
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
              JSON.stringify(
                {
                  id:
                    candidate.id,

                  ward:
                    candidate.ward,

                  priority:
                    candidate.priority,

                  trigger:
                    candidate.trigger,

                  level:
                    candidate.level,

                  title:
                    candidate.title,

                  message:
                    candidate.message,

                  risk:
                    candidate.risk,

                  confidence:
                    candidate.confidence,

                  primaryHazard:
                    candidate.primaryHazard,

                  recommendedAction:
                    candidate.recommendedAction,

                  createdAt:
                    candidate.createdAt,
                }
              ),
          }
        );


      const data =
        await safeJson(
          response
        );


      if (
        !response.ok
      ) {

        throw new Error(
          getErrorMessage(
            data,
            "Unable to publish alert."
          )
        );

      }


      setActionSuccess(
        candidate.candidateAction ===
        "ESCALATE"
          ? `${candidate.primaryHazard} alert for ${candidate.ward} escalated successfully.`
          : `${candidate.primaryHazard} alert for ${candidate.ward} published successfully.`
      );


      setSelectedCandidate(
        null
      );


      await fetchData();


    } catch (
      error
    ) {

      console.error(
        "Unable to publish candidate:",
        error
      );


      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to publish alert."
      );


    } finally {

      setPublishingId(
        null
      );

    }

  }


  /* ========================================================================= */
  /* DISMISS CANDIDATE                                                         */
  /* ========================================================================= */

  async function dismissCandidate(
    candidate:
      AlertCandidate
  ) {

    try {

      setDismissingId(
        candidate.id
      );


      setActionError(
        null
      );


      setActionSuccess(
        null
      );


      const params =
        new URLSearchParams(
          {
            ward:
              candidate.ward,

            hazard:
              candidate.primaryHazard,

            level:
              candidate.level,

            risk:
              String(
                candidate.risk
              ),

            confidence:
              String(
                candidate.confidence
              ),
          }
        );


      const response =
        await authFetch(
          `${API_BASE_URL}/api/alerts/candidates/${encodeURIComponent(
            candidate.id
          )}/dismiss?${params.toString()}`,
          {
            method:
              "POST",
          }
        );


      const data =
        await safeJson(
          response
        );


      if (
        !response.ok
      ) {

        throw new Error(
          getErrorMessage(
            data,
            "Unable to dismiss candidate."
          )
        );

      }


      setActionSuccess(
        `${candidate.primaryHazard} candidate for ${candidate.ward} dismissed. Cooldown protection is now active.`
      );


      setSelectedCandidate(
        null
      );


      await fetchData();


    } catch (
      error
    ) {

      console.error(
        "Unable to dismiss candidate:",
        error
      );


      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to dismiss candidate."
      );


    } finally {

      setDismissingId(
        null
      );

    }

  }


  /* ========================================================================= */
  /* DISMISS PUBLISHED ALERT                                                   */
  /* ========================================================================= */

  async function dismissPublishedAlert(
    alert:
      PersistedAlert
  ) {

    try {

      setDismissingId(
        alert.id
      );


      setActionError(
        null
      );


      setActionSuccess(
        null
      );


      const response =
        await authFetch(
          `${API_BASE_URL}/api/alerts/${encodeURIComponent(
            alert.id
          )}/dismiss`,
          {
            method:
              "PATCH",
          }
        );


      const data =
        await safeJson(
          response
        );


      if (
        !response.ok
      ) {

        throw new Error(
          getErrorMessage(
            data,
            "Unable to dismiss published alert."
          )
        );

      }


      setActionSuccess(
        `${alert.primaryHazard} alert for ${alert.ward} dismissed.`
      );


      await fetchData();


    } catch (
      error
    ) {

      console.error(
        "Unable to dismiss published alert:",
        error
      );


      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to dismiss alert."
      );


    } finally {

      setDismissingId(
        null
      );

    }

  }


  /* ========================================================================= */
  /* DERIVED DATA                                                              */
  /* ========================================================================= */

  const candidates =
    candidateData?.candidates ??
    [];


  const publishedAlerts =
    history.filter(
      (
        alert
      ) =>
        alert.status ===
        "PUBLISHED"
    );


  const dismissedAlerts =
    history.filter(
      (
        alert
      ) =>
        alert.status ===
        "DISMISSED"
    );


  const visibleCandidates =
    useMemo(
      () =>
        filterAndSearchCandidates(
          candidates,
          filter,
          search
        ),
      [
        candidates,
        filter,
        search,
      ]
    );


  const visiblePublished =
    useMemo(
      () =>
        filterAndSearchPersisted(
          publishedAlerts,
          filter,
          search
        ),
      [
        publishedAlerts,
        filter,
        search,
      ]
    );


  const visibleHistory =
    useMemo(
      () =>
        filterAndSearchPersisted(
          dismissedAlerts,
          filter,
          search
        ),
      [
        dismissedAlerts,
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


        <div className="mx-auto grid max-w-[1700px] grid-cols-1 lg:grid-cols-[230px_1fr]">

          <Sidebar />


          <section className="min-w-0 p-4 sm:p-5 lg:p-8">


            {/* =============================================================== */}
            {/* PAGE HEADER                                                     */}
            {/* =============================================================== */}

            <div className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">


              <div>

                <p className="mb-1 text-sm text-slate-500">

                  Multi-Hazard Early Warning

                </p>


                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">

                  Alert Review Center

                </h2>


                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">

                  Review evidence-backed hazard candidates before public
                  publication. PRAVAAH automatically checks confidence,
                  evidence freshness, duplicate alerts and officer cooldowns.

                </p>

              </div>


              <div className="flex flex-wrap items-center gap-3">


                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">

                  <span
                    className={`h-2 w-2 rounded-full ${
                      backendOnline
                        ? "bg-emerald-400"
                        : "bg-red-400"
                    }`}
                  />


                  <div>

                    <p className="text-xs font-medium text-slate-300">

                      {
                        backendOnline
                          ? "Backend Online"
                          : "Backend Offline"
                      }

                    </p>


                    {lastUpdated && (

                      <p className="mt-0.5 text-[9px] text-slate-600">

                        Updated{" "}

                        {
                          lastUpdated
                            .toLocaleTimeString(
                              "en-IN"
                            )
                        }

                      </p>

                    )}

                  </div>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    fetchData(
                      true
                    )
                  }
                  disabled={
                    refreshing
                  }
                  className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50"
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


            {/* =============================================================== */}
            {/* SUMMARY                                                         */}
            {/* =============================================================== */}

            <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

              <SummaryCard
                title="Candidates"
                value={
                  candidateData?.count ??
                  0
                }
                icon={
                  BellRing
                }
                className="text-blue-400"
              />


              <SummaryCard
                title="Stale Review"
                value={
                  candidateData
                    ?.staleReviewCandidates ??
                  0
                }
                icon={
                  AlertTriangle
                }
                className="text-yellow-400"
              />


              <SummaryCard
                title="Duplicates Blocked"
                value={
                  candidateData
                    ?.suppressedDuplicates ??
                  0
                }
                icon={
                  ShieldAlert
                }
                className="text-purple-400"
              />


              <SummaryCard
                title="Cooldown Blocked"
                value={
                  candidateData
                    ?.suppressedCooldown ??
                  0
                }
                icon={
                  Clock3
                }
                className="text-orange-400"
              />


              <SummaryCard
                title="Published"
                value={
                  publishedAlerts.length
                }
                icon={
                  CheckCircle2
                }
                className="text-emerald-400"
              />

            </div>


            {/* =============================================================== */}
            {/* SUCCESS                                                         */}
            {/* =============================================================== */}

            {actionSuccess && (

              <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">

                <div className="flex gap-3">

                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />


                  <p className="text-xs leading-5 text-emerald-300">

                    {
                      actionSuccess
                    }

                  </p>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setActionSuccess(
                      null
                    )
                  }
                  className="text-emerald-300/60 transition hover:text-emerald-200"
                >

                  <X className="h-4 w-4" />

                </button>

              </div>

            )}


            {/* =============================================================== */}
            {/* ERROR                                                           */}
            {/* =============================================================== */}

            {actionError && (

              <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">

                <div className="flex gap-3">

                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />


                  <p className="text-xs leading-5 text-red-300">

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
                  className="text-red-300/60 transition hover:text-red-200"
                >

                  <X className="h-4 w-4" />

                </button>

              </div>

            )}


            {/* =============================================================== */}
            {/* TABS                                                              */}
            {/* =============================================================== */}

            <div className="mb-5 flex flex-wrap gap-2">

              <TabButton
                active={
                  viewTab ===
                  "CANDIDATES"
                }
                onClick={() =>
                  setViewTab(
                    "CANDIDATES"
                  )
                }
                label="Candidates"
                count={
                  candidates.length
                }
              />


              <TabButton
                active={
                  viewTab ===
                  "PUBLISHED"
                }
                onClick={() =>
                  setViewTab(
                    "PUBLISHED"
                  )
                }
                label="Published"
                count={
                  publishedAlerts.length
                }
              />


              <TabButton
                active={
                  viewTab ===
                  "HISTORY"
                }
                onClick={() =>
                  setViewTab(
                    "HISTORY"
                  )
                }
                label="Dismissed History"
                count={
                  dismissedAlerts.length
                }
              />

            </div>


            {/* =============================================================== */}
            {/* FILTERS                                                          */}
            {/* =============================================================== */}

            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              <div className="flex flex-wrap gap-2">

                {
                  FILTERS.map(
                    (
                      currentFilter
                    ) => (

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
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                          filter ===
                          currentFilter
                            ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20"
                            : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                        }`}
                      >

                        {
                          currentFilter
                        }

                      </button>

                    )
                  )
                }

              </div>


              <div className="relative w-full xl:w-[340px]">

                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />


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
                  placeholder="Search ward, hazard or alert..."
                  className="w-full rounded-xl border border-white/10 bg-[#0a1728] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500/40"
                />

              </div>

            </div>


            {/* =============================================================== */}
            {/* LOADING                                                          */}
            {/* =============================================================== */}

            {loading && (

              <LoadingState />

            )}


            {/* =============================================================== */}
            {/* CANDIDATES                                                       */}
            {/* =============================================================== */}

            {!loading &&
              viewTab ===
                "CANDIDATES" && (

              <>

                {
                  visibleCandidates.length >
                  0
                    ? (

                      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">

                        {
                          visibleCandidates.map(
                            (
                              candidate
                            ) => (

                              <CandidateCard
                                key={
                                  candidate.id
                                }
                                candidate={
                                  candidate
                                }
                                publishing={
                                  publishingId ===
                                  candidate.id
                                }
                                dismissing={
                                  dismissingId ===
                                  candidate.id
                                }
                                onReview={() =>
                                  setSelectedCandidate(
                                    candidate
                                  )
                                }
                                onPublish={() =>
                                  publishCandidate(
                                    candidate
                                  )
                                }
                                onDismiss={() =>
                                  dismissCandidate(
                                    candidate
                                  )
                                }
                              />

                            )
                          )
                        }

                      </div>

                    )
                    : (

                      <EmptyState
                        title="No alert candidates"
                        message="No candidates match the current filters. Duplicate and cooldown protection may also be suppressing repeated alerts."
                      />

                    )
                }

              </>

            )}


            {/* =============================================================== */}
            {/* PUBLISHED                                                        */}
            {/* =============================================================== */}

            {!loading &&
              viewTab ===
                "PUBLISHED" && (

              <>

                {
                  visiblePublished.length >
                  0
                    ? (

                      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">

                        {
                          visiblePublished.map(
                            (
                              alert
                            ) => (

                              <PersistedAlertCard
                                key={
                                  alert.id
                                }
                                alert={
                                  alert
                                }
                                dismissing={
                                  dismissingId ===
                                  alert.id
                                }
                                onDismiss={() =>
                                  dismissPublishedAlert(
                                    alert
                                  )
                                }
                              />

                            )
                          )
                        }

                      </div>

                    )
                    : (

                      <EmptyState
                        title="No published alerts"
                        message="No active published alerts match the selected filters."
                      />

                    )
                }

              </>

            )}


            {/* =============================================================== */}
            {/* HISTORY                                                          */}
            {/* =============================================================== */}

            {!loading &&
              viewTab ===
                "HISTORY" && (

              <>

                {
                  visibleHistory.length >
                  0
                    ? (

                      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">

                        {
                          visibleHistory.map(
                            (
                              alert
                            ) => (

                              <PersistedAlertCard
                                key={
                                  alert.id
                                }
                                alert={
                                  alert
                                }
                                dismissing={
                                  false
                                }
                              />

                            )
                          )
                        }

                      </div>

                    )
                    : (

                      <EmptyState
                        title="No dismissed alerts"
                        message="Dismissed alert history will appear here."
                      />

                    )
                }

              </>

            )}

          </section>

        </div>


        {/* =================================================================== */}
        {/* EVIDENCE DRAWER                                                     */}
        {/* =================================================================== */}

        {selectedCandidate && (

          <EvidenceDrawer
            candidate={
              selectedCandidate
            }
            publishing={
              publishingId ===
              selectedCandidate.id
            }
            dismissing={
              dismissingId ===
              selectedCandidate.id
            }
            onClose={() =>
              setSelectedCandidate(
                null
              )
            }
            onPublish={() =>
              publishCandidate(
                selectedCandidate
              )
            }
            onDismiss={() =>
              dismissCandidate(
                selectedCandidate
              )
            }
          />

        )}

      </main>

    </OfficerRouteGuard>

  );

}


/* ========================================================================= */
/* CANDIDATE CARD                                                            */
/* ========================================================================= */

function CandidateCard({
  candidate,
  publishing,
  dismissing,
  onReview,
  onPublish,
  onDismiss,
}: {
  candidate:
    AlertCandidate;

  publishing:
    boolean;

  dismissing:
    boolean;

  onReview:
    () => void;

  onPublish:
    () => void;

  onDismiss:
    () => void;
}) {

  const staleReview =
    candidate.candidateAction ===
    "OFFICER_REVIEW_STALE";


  const escalation =
    candidate.candidateAction ===
    "ESCALATE";


  return (

    <div
      className={`rounded-2xl border p-5 ${
        staleReview
          ? "border-yellow-500/20 bg-yellow-500/[0.035]"
          : escalation
            ? "border-orange-500/20 bg-orange-500/[0.035]"
            : "border-white/10 bg-[#0a1728]"
      }`}
    >

      <div className="flex items-start justify-between gap-3">

        <div className="flex flex-wrap items-center gap-2">

          <span
            className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ring-1 ${getLevelStyle(
              candidate.level
            )}`}
          >

            {
              candidate.level
            }

          </span>


          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[9px] font-semibold text-slate-400">

            {
              candidate.primaryHazard
                .replaceAll(
                  "_",
                  " "
                )
            }

          </span>

        </div>


        <span className="text-xs font-semibold text-slate-500">

          {
            candidate.ward
          }

        </span>

      </div>


      {staleReview && (

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">

          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />


          <div>

            <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-300">

              Stale evidence review required

            </p>


            <p className="mt-1 text-[10px] leading-4 text-yellow-200/60">

              Physical evidence supporting this candidate is outdated.
              Publishing is not recommended until an officer reviews it.

            </p>

          </div>

        </div>

      )}


      {escalation && (

        <div className="mt-4 rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">

          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">

            Escalation Candidate

          </p>


          <p className="mt-1 text-[10px] text-orange-200/60">

            Existing level:{" "}

            <span className="font-semibold text-orange-300">

              {
                candidate.existingLevel ??
                "Unknown"
              }

            </span>

            {" "}→{" "}

            <span className="font-semibold text-orange-300">

              {
                candidate.level
              }

            </span>

          </p>

        </div>

      )}


      <h3 className="mt-4 text-base font-semibold text-white">

        {
          candidate.title
        }

      </h3>


      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">

        {
          candidate.message
        }

      </p>


      <div className="mt-5 grid grid-cols-2 gap-2">

        <Metric
          label="Risk"
          value={`${candidate.risk}/100`}
        />


        <Metric
          label="Confidence"
          value={`${candidate.confidence}%`}
        />


        <Metric
          label="Evidence"
          value={`${candidate.evidenceCount} source${
            candidate.evidenceCount ===
            1
              ? ""
              : "s"
          }`}
        />


        <Metric
          label="Freshness"
          value={
            candidate.dataFreshness
              .hasStaleSources
              ? `${candidate.dataFreshness.staleSourceCount} stale`
              : "Fresh"
          }
        />

      </div>


      <div className="mt-4 rounded-lg border border-blue-500/10 bg-blue-500/[0.045] p-3">

        <p className="text-[9px] font-bold uppercase tracking-wider text-blue-400">

          Recommended Citizen Action

        </p>


        <p className="mt-2 text-[10px] leading-4 text-slate-400">

          {
            candidate.recommendedAction
          }

        </p>

      </div>


      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">

        <button
          type="button"
          onClick={
            onReview
          }
          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[10px] font-medium text-slate-300 transition hover:bg-white/[0.07]"
        >

          <Eye className="h-3.5 w-3.5" />

          Evidence

        </button>


        {!staleReview && (

          <button
            type="button"
            onClick={
              onPublish
            }
            disabled={
              publishing ||
              dismissing
            }
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[10px] font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${
              escalation
                ? "bg-orange-500/10 text-orange-300 ring-orange-500/20 hover:bg-orange-500/15"
                : "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20 hover:bg-emerald-500/15"
            }`}
          >

            <Send className="h-3.5 w-3.5" />


            {
              publishing
                ? "Processing..."
                : escalation
                  ? "Escalate"
                  : "Publish"
            }

          </button>

        )}


        <button
          type="button"
          onClick={
            onDismiss
          }
          disabled={
            publishing ||
            dismissing
          }
          className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-500/20 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
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
/* EVIDENCE DRAWER                                                           */
/* ========================================================================= */

function EvidenceDrawer({
  candidate,
  publishing,
  dismissing,
  onClose,
  onPublish,
  onDismiss,
}: {
  candidate:
    AlertCandidate;

  publishing:
    boolean;

  dismissing:
    boolean;

  onClose:
    () => void;

  onPublish:
    () => void;

  onDismiss:
    () => void;
}) {

  const staleReview =
    candidate.candidateAction ===
    "OFFICER_REVIEW_STALE";


  return (

    <div className="fixed inset-0 z-[90]">

      <button
        type="button"
        aria-label="Close evidence panel"
        onClick={
          onClose
        }
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />


      <div className="absolute bottom-0 right-0 top-0 w-full overflow-y-auto border-l border-white/10 bg-[#081423] shadow-2xl sm:max-w-[560px]">

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#081423]/95 px-5 py-4 backdrop-blur-xl">

          <div>

            <p className="text-[10px] uppercase tracking-widest text-slate-600">

              Evidence Review

            </p>


            <h3 className="mt-1 font-semibold text-white">

              {
                candidate.title
              }

            </h3>

          </div>


          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white"
          >

            <X className="h-4 w-4" />

          </button>

        </div>


        <div className="p-5">


          {staleReview && (

            <div className="mb-5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">

              <div className="flex gap-3">

                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />


                <div>

                  <p className="text-sm font-semibold text-yellow-300">

                    Publication not recommended

                  </p>


                  <p className="mt-1 text-xs leading-5 text-yellow-200/60">

                    This assessment depends entirely on stale physical
                    evidence. Obtain or verify newer observations before
                    issuing a public warning.

                  </p>

                </div>

              </div>

            </div>

          )}


          <div className="grid grid-cols-2 gap-3">

            <Metric
              label="Ward"
              value={
                candidate.ward
              }
            />


            <Metric
              label="Hazard"
              value={
                candidate.primaryHazard
                  .replaceAll(
                    "_",
                    " "
                  )
              }
            />


            <Metric
              label="Risk"
              value={`${candidate.risk}/100`}
            />


            <Metric
              label="Confidence"
              value={`${candidate.confidence}%`}
            />

          </div>


          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">

            <div className="flex items-center gap-2">

              <MapPin className="h-4 w-4 text-blue-400" />


              <p className="text-xs font-semibold text-slate-200">

                Affected Area

              </p>

            </div>


            <p className="mt-2 text-xs leading-5 text-slate-500">

              {
                candidate.affectedArea
                  .description
              }

            </p>

          </div>


          <div className="mt-6">

            <div className="mb-3 flex items-center gap-2">

              <Database className="h-4 w-4 text-purple-400" />


              <h4 className="text-sm font-semibold text-white">

                Evidence Sources

              </h4>

            </div>


            <div className="space-y-3">

              {
                candidate.evidence.length >
                0
                  ? candidate.evidence.map(
                      (
                        evidence,
                        index
                      ) => (

                        <EvidenceCard
                          key={`${evidence.sourceName}-${index}`}
                          evidence={
                            evidence
                          }
                        />

                      )
                    )
                  : (

                    <p className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-xs text-slate-600">

                      No supporting evidence is currently available.

                    </p>

                  )
              }

            </div>

          </div>


          <ActionSection
            title="Citizen Guidance"
            actions={
              candidate.citizenActions
            }
          />


          <ActionSection
            title="Officer Actions"
            actions={
              candidate.officerActions
            }
          />


          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">

            {!staleReview && (

              <button
                type="button"
                onClick={
                  onPublish
                }
                disabled={
                  publishing ||
                  dismissing
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/15 disabled:opacity-40"
              >

                <Send className="h-4 w-4" />


                {
                  publishing
                    ? "Processing..."
                    : candidate.candidateAction ===
                        "ESCALATE"
                      ? "Escalate Alert"
                      : "Publish Alert"
                }

              </button>

            )}


            <button
              type="button"
              onClick={
                onDismiss
              }
              disabled={
                publishing ||
                dismissing
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300 ring-1 ring-red-500/20 transition hover:bg-red-500/15 disabled:opacity-40"
            >

              <XCircle className="h-4 w-4" />


              {
                dismissing
                  ? "Dismissing..."
                  : "Dismiss Candidate"
              }

            </button>

          </div>

        </div>

      </div>

    </div>

  );

}


/* ========================================================================= */
/* EVIDENCE CARD                                                             */
/* ========================================================================= */

function EvidenceCard({
  evidence,
}: {
  evidence:
    EvidenceItem;
}) {

  const freshness =
    evidence.freshness?.status ??
    "UNKNOWN";


  const stale =
    freshness ===
      "STALE" ||
    freshness ===
      "VERY_STALE";


  return (

    <div
      className={`rounded-xl border p-4 ${
        stale
          ? "border-yellow-500/20 bg-yellow-500/[0.04]"
          : "border-white/10 bg-white/[0.025]"
      }`}
    >

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-xs font-semibold text-slate-200">

            {
              evidence.sourceName
            }

          </p>


          <p className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">

            {
              evidence.sourceType
                .replaceAll(
                  "_",
                  " "
                )
            }

            {" · "}

            {
              evidence.mode
            }

          </p>

        </div>


        <span
          className={`rounded-full px-2 py-1 text-[8px] font-bold uppercase ${
            stale
              ? "bg-yellow-500/10 text-yellow-300"
              : freshness ===
                  "FRESH"
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-white/5 text-slate-500"
          }`}
        >

          {
            freshness
              .replaceAll(
                "_",
                " "
              )
          }

        </span>

      </div>


      <p className="mt-3 text-[10px] leading-5 text-slate-500">

        {
          evidence.description
        }

      </p>


      <div className="mt-3 flex flex-wrap gap-3 text-[9px] text-slate-600">

        {
          evidence.value !==
          undefined && (

            <span>

              Value:{" "}

              <strong className="font-medium text-slate-400">

                {
                  evidence.value
                }

                {
                  evidence.unit
                    ? ` ${evidence.unit}`
                    : ""
                }

              </strong>

            </span>

          )
        }


        {
          evidence.freshness
            ?.ageMinutes !==
            undefined &&
          evidence.freshness
            ?.ageMinutes !==
            null && (

            <span>

              Age:{" "}

              <strong className="font-medium text-slate-400">

                {
                  formatAge(
                    evidence.freshness
                      .ageMinutes
                  )
                }

              </strong>

            </span>

          )
        }


        {
          evidence.reliabilityScore !==
          undefined && (

            <span>

              Reliability:{" "}

              <strong className="font-medium text-slate-400">

                {
                  evidence.reliabilityScore
                }%

              </strong>

            </span>

          )
        }

      </div>

    </div>

  );

}


/* ========================================================================= */
/* ACTION SECTION                                                            */
/* ========================================================================= */

function ActionSection({
  title,
  actions,
}: {
  title:
    string;

  actions:
    string[];
}) {

  if (
    actions.length ===
    0
  ) {

    return null;

  }


  return (

    <div className="mt-6">

      <h4 className="text-sm font-semibold text-white">

        {
          title
        }

      </h4>


      <div className="mt-3 space-y-2">

        {
          actions.map(
            (
              action,
              index
            ) => (

              <div
                key={`${title}-${index}`}
                className="flex gap-2 rounded-lg bg-white/[0.025] p-3"
              >

                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />


                <p className="text-[10px] leading-5 text-slate-500">

                  {
                    action
                  }

                </p>

              </div>

            )
          )
        }

      </div>

    </div>

  );

}


/* ========================================================================= */
/* PERSISTED ALERT CARD                                                      */
/* ========================================================================= */

function PersistedAlertCard({
  alert,
  dismissing,
  onDismiss,
}: {
  alert:
    PersistedAlert;

  dismissing:
    boolean;

  onDismiss?:
    () => void;
}) {

  return (

    <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-5">

      <div className="flex items-start justify-between gap-3">

        <span
          className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ring-1 ${getLevelStyle(
            alert.level
          )}`}
        >

          {
            alert.level
          }

        </span>


        <span
          className={`text-[9px] font-semibold uppercase ${
            alert.status ===
            "PUBLISHED"
              ? "text-emerald-400"
              : "text-slate-600"
          }`}
        >

          {
            alert.status
          }

        </span>

      </div>


      <h3 className="mt-4 font-semibold text-white">

        {
          alert.title
        }

      </h3>


      <p className="mt-2 text-xs leading-5 text-slate-500">

        {
          alert.message
        }

      </p>


      <div className="mt-5 grid grid-cols-2 gap-2">

        <Metric
          label="Ward"
          value={
            alert.ward
          }
        />


        <Metric
          label="Hazard"
          value={
            alert.primaryHazard
          }
        />


        <Metric
          label="Risk"
          value={`${alert.risk}/100`}
        />


        <Metric
          label="Confidence"
          value={`${alert.confidence}%`}
        />

      </div>


      <p className="mt-4 text-[9px] text-slate-600">

        {
          new Date(
            alert.publishedAt ??
            alert.createdAt
          ).toLocaleString(
            "en-IN"
          )
        }

      </p>


      {
        alert.status ===
          "PUBLISHED" &&
        onDismiss && (

          <button
            type="button"
            onClick={
              onDismiss
            }
            disabled={
              dismissing
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/10 py-2.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-500/20 transition hover:bg-red-500/15 disabled:opacity-40"
          >

            <XCircle className="h-3.5 w-3.5" />


            {
              dismissing
                ? "Dismissing..."
                : "Dismiss Published Alert"
            }

          </button>

        )
      }

    </div>

  );

}


/* ========================================================================= */
/* SUMMARY                                                                    */
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

    <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-4">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-[10px] text-slate-500">

            {
              title
            }

          </p>


          <p className="mt-2 text-2xl font-bold text-white">

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
/* TAB                                                                        */
/* ========================================================================= */

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active:
    boolean;

  label:
    string;

  count:
    number;

  onClick:
    () => void;
}) {

  return (

    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-xl px-4 py-2.5 text-xs font-medium transition ${
        active
          ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20"
          : "border border-white/10 bg-white/[0.025] text-slate-500 hover:bg-white/5 hover:text-slate-300"
      }`}
    >

      {
        label
      }

      <span className="ml-2 text-[10px] opacity-60">

        {
          count
        }

      </span>

    </button>

  );

}


/* ========================================================================= */
/* METRIC                                                                     */
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

      <p className="text-[8px] uppercase tracking-wider text-slate-600">

        {
          label
        }

      </p>


      <p className="mt-1 break-words text-xs font-semibold text-slate-300">

        {
          value
        }

      </p>

    </div>

  );

}


/* ========================================================================= */
/* LOADING                                                                    */
/* ========================================================================= */

function LoadingState() {

  return (

    <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-12 text-center">

      <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-blue-400" />


      <p className="mt-4 text-sm text-slate-400">

        Loading multi-hazard alert intelligence...

      </p>

    </div>

  );

}


/* ========================================================================= */
/* EMPTY                                                                      */
/* ========================================================================= */

function EmptyState({
  title,
  message,
}: {
  title:
    string;

  message:
    string;
}) {

  return (

    <div className="rounded-2xl border border-white/10 bg-[#0a1728] p-12 text-center">

      <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/50" />


      <h3 className="mt-4 font-semibold text-white">

        {
          title
        }

      </h3>


      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">

        {
          message
        }

      </p>

    </div>

  );

}


/* ========================================================================= */
/* FILTER CANDIDATES                                                         */
/* ========================================================================= */

function filterAndSearchCandidates(
  candidates:
    AlertCandidate[],

  filter:
    FilterTab,

  search:
    string
) {

  let result =
    candidates;


  if (
    filter !==
    "ALL"
  ) {

    result =
      result.filter(
        (
          candidate
        ) =>
          candidate.level ===
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
          candidate
        ) =>

          candidate.ward
            .toLowerCase()
            .includes(
              query
            ) ||

          candidate.title
            .toLowerCase()
            .includes(
              query
            ) ||

          candidate.primaryHazard
            .toLowerCase()
            .includes(
              query
            )

      );

  }


  return [
    ...result,
  ].sort(
    (
      a,
      b
    ) =>

      getLevelValue(
        b.level
      ) -
        getLevelValue(
          a.level
        ) ||

      b.risk -
        a.risk
  );

}


/* ========================================================================= */
/* FILTER PERSISTED                                                          */
/* ========================================================================= */

function filterAndSearchPersisted(
  alerts:
    PersistedAlert[],

  filter:
    FilterTab,

  search:
    string
) {

  let result =
    alerts;


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
            )

      );

  }


  return result;

}


/* ========================================================================= */
/* LEVEL                                                                      */
/* ========================================================================= */

function getLevelValue(
  level:
    RiskLevel
) {

  switch (
    level
  ) {

    case "CRITICAL":
      return 4;

    case "HIGH":
      return 3;

    case "WATCH":
      return 2;

    case "NORMAL":
      return 1;

    default:
      return 0;

  }

}


/* ========================================================================= */
/* LEVEL STYLE                                                                */
/* ========================================================================= */

function getLevelStyle(
  level:
    RiskLevel
) {

  switch (
    level
  ) {

    case "CRITICAL":

      return (
        "bg-red-500/10 text-red-400 ring-red-500/20"
      );


    case "HIGH":

      return (
        "bg-orange-500/10 text-orange-400 ring-orange-500/20"
      );


    case "WATCH":

      return (
        "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20"
      );


    default:

      return (
        "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
      );

  }

}


/* ========================================================================= */
/* AGE                                                                        */
/* ========================================================================= */

function formatAge(
  minutes:
    number
) {

  if (
    minutes <
    1
  ) {

    return "Just now";

  }


  if (
    minutes <
    60
  ) {

    return `${Math.round(
      minutes
    )} min`;

  }


  const hours =
    minutes /
    60;


  if (
    hours <
    24
  ) {

    return `${hours.toFixed(
      1
    )} hr`;

  }


  return `${(
    hours /
    24
  ).toFixed(
    1
  )} days`;

}


/* ========================================================================= */
/* JSON                                                                       */
/* ========================================================================= */

async function safeJson(
  response:
    Response
) {

  try {

    return await response.json();

  } catch {

    return {};

  }

}


/* ========================================================================= */
/* ERROR                                                                      */
/* ========================================================================= */

function getErrorMessage(
  data:
    any,

  fallback:
    string
) {

  if (
    typeof data?.detail ===
    "string"
  ) {

    return data.detail;

  }


  if (
    typeof data?.detail?.message ===
    "string"
  ) {

    return data.detail.message;

  }


  return fallback;

}