"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ImageIcon,
  MapPin,
  RefreshCw,
  XCircle,
} from "lucide-react";

import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import RequireOfficer from "@/components/auth/RequireOfficer";
import { authFetch, logout } from "@/lib/auth";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type BackendReportStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED";

type BackendReport = {
  id: string;

  ward: string;

  reportType: string;

  severity: string;

  description: string;

  latitude: number | null;

  longitude: number | null;

  photoUrl: string | null;

  status: BackendReportStatus;

  createdAt: number;

  verifiedAt: number | null;
};

type FilterTab =
  | "ALL"
  | BackendReportStatus;

type CategoryFilter =
  | "ALL"
  | "WATERLOGGING"
  | "FLOODING"
  | "ROAD_BLOCKAGE"
  | "DRAINAGE_OVERFLOW"
  | "TREE_FALL"
  | "ELECTRICAL_HAZARD"
  | "INFRASTRUCTURE_DAMAGE"
  | "OTHER";


/* ========================================================================= */
/* CONFIG                                                                    */
/* ========================================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

const REFRESH_INTERVAL = 5000;

const FILTERS: {
  label: string;
  value: FilterTab;
}[] = [
  {
    label: "All",
    value: "ALL",
  },

  {
    label: "Pending",
    value: "PENDING",
  },

  {
    label: "Verified",
    value: "VERIFIED",
  },

  {
    label: "Rejected",
    value: "REJECTED",
  },
];


const CATEGORY_FILTERS: {
  label: string;
  value: CategoryFilter;
}[] = [
  {
    label: "All Categories",
    value: "ALL",
  },

  {
    label: "Waterlogging",
    value: "WATERLOGGING",
  },

  {
    label: "Flooding",
    value: "FLOODING",
  },

  {
    label: "Road Blockage",
    value: "ROAD_BLOCKAGE",
  },

  {
    label: "Drainage Overflow",
    value: "DRAINAGE_OVERFLOW",
  },

  {
    label: "Tree Fall",
    value: "TREE_FALL",
  },

  {
    label: "Electrical Hazard",
    value: "ELECTRICAL_HAZARD",
  },

  {
    label: "Infrastructure Damage",
    value: "INFRASTRUCTURE_DAMAGE",
  },

  {
    label: "Other",
    value: "OTHER",
  },
];


/* ========================================================================= */
/* PAGE                                                                      */
/* ========================================================================= */

function ReportsPageContent() {
  const [reports, setReports] =
    useState<BackendReport[]>([]);

  const [filter, setFilter] =
    useState<FilterTab>("ALL");

  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState<CategoryFilter>(
      "ALL"
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [
    updatingReportId,
    setUpdatingReportId,
  ] = useState<string | null>(
    null
  );


  /* ----------------------------------------------------------------------- */
  /* FETCH REPORTS                                                           */
  /* ----------------------------------------------------------------------- */

  const fetchReports =
    useCallback(
      async (
        showRefresh = false
      ) => {
        try {
          if (showRefresh) {
            setRefreshing(true);
          }

          const response =
            await fetch(
              `${API_BASE_URL}/api/reports`,
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
            BackendReport[] =
            await response.json();

          setReports(data);

          setError(null);
        } catch (err) {
          console.error(
            "Unable to fetch reports:",
            err
          );

          setError(
            "Unable to connect to the PRAVAAH backend."
          );
        } finally {
          setLoading(false);

          setRefreshing(false);
        }
      },
      []
    );


  /* ----------------------------------------------------------------------- */
  /* INITIAL LOAD + LIVE REFRESH                                             */
  /* ----------------------------------------------------------------------- */

  useEffect(() => {
    fetchReports();

    const interval =
      setInterval(
        () => {
          fetchReports();
        },
        REFRESH_INTERVAL
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, [fetchReports]);


  /* ----------------------------------------------------------------------- */
  /* UPDATE REPORT STATUS                                                    */
  /* ----------------------------------------------------------------------- */

  async function updateStatus(
    reportId: string,
    status: BackendReportStatus
  ) {
    try {
      setUpdatingReportId(
        reportId
      );

      setError(null);

      /*
       * Backend verification endpoint
       * now expects multipart/form-data.
       */
      const formData =
        new FormData();

      formData.append(
        "status",
        status
      );

      const response =
        await authFetch(
          `${API_BASE_URL}/api/reports/${reportId}/verification`,
          {
            method: "PATCH",

            body: formData,
          }
        );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        logout();

        window.location.href =
          "/officer-login";

        return;
      }

      if (!response.ok) {
        const data =
          await response.json();

        const detail =
          typeof data.detail ===
          "string"
            ? data.detail
            : JSON.stringify(
                data.detail
              );

        throw new Error(
          detail ||
            "Unable to update report."
        );
      }

      const updatedReport:
        BackendReport =
        await response.json();

      setReports(
        (previous) =>
          previous.map(
            (report) =>
              report.id ===
              updatedReport.id
                ? updatedReport
                : report
          )
      );
    } catch (err) {
      console.error(
        "Unable to update report:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update report."
      );
    } finally {
      setUpdatingReportId(
        null
      );
    }
  }


  /* ----------------------------------------------------------------------- */
  /* COUNTS                                                                  */
  /* ----------------------------------------------------------------------- */

  const pendingCount =
    reports.filter(
      (report) =>
        report.status ===
        "PENDING"
    ).length;

  const verifiedCount =
    reports.filter(
      (report) =>
        report.status ===
        "VERIFIED"
    ).length;

  const rejectedCount =
    reports.filter(
      (report) =>
        report.status ===
        "REJECTED"
    ).length;


  /* ----------------------------------------------------------------------- */
  /* FILTER                                                                  */
  /* ----------------------------------------------------------------------- */

  const filteredReports =
    reports.filter(
      (report) => {

        const statusMatches =
          filter === "ALL" ||
          report.status ===
            filter;

        const categoryMatches =
          categoryFilter === "ALL" ||
          getReportCategory(
            report.reportType
          ) ===
            categoryFilter;

        return (
          statusMatches &&
          categoryMatches
        );
      }
    );


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
          {/* PAGE HEADER                                                     */}
          {/* =============================================================== */}

          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <p className="mb-1 text-sm text-slate-500">
                Ground Intelligence
              </p>


              <h2 className="text-3xl font-bold tracking-tight">
                Evidence & Reports
              </h2>


              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Review citizen-submitted
                incident reports,
                location evidence, and
                photographs before
                verification.
              </p>

            </div>


            <div className="flex flex-wrap items-center gap-3">

              {/* PENDING STATUS */}

              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300">

                <span className="relative flex h-2 w-2">

                  {pendingCount >
                    0 && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                  )}

                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      pendingCount >
                      0
                        ? "bg-yellow-400"
                        : "bg-emerald-400"
                    }`}
                  />

                </span>


                {pendingCount} awaiting
                review

              </div>


              {/* REFRESH */}

              <button
                type="button"
                onClick={() =>
                  fetchReports(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
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

          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

            <SummaryCard
              label="Total Reports"
              value={
                reports.length
              }
            />

            <SummaryCard
              label="Pending"
              value={
                pendingCount
              }
            />

            <SummaryCard
              label="Verified"
              value={
                verifiedCount
              }
            />

            <SummaryCard
              label="Rejected"
              value={
                rejectedCount
              }
            />

          </div>


          {/* =============================================================== */}
          {/* ERROR                                                           */}
          {/* =============================================================== */}

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">

              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />


              <div>

                <p className="text-sm font-medium text-red-300">
                  Backend connection
                  problem
                </p>


                <p className="mt-1 text-xs text-red-300/70">
                  {error}
                </p>

              </div>

            </div>
          )}


          {/* =============================================================== */}
          {/* FILTERS                                                         */}
          {/* =============================================================== */}

          <div className="mb-6 rounded-2xl border border-white/10 bg-[#0a1728] p-4">

            {/* STATUS FILTER */}

            <div>

              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Verification Status
              </p>


              <div className="flex flex-wrap gap-2">

                {FILTERS.map(
                  (filterOption) => {

                    const count =
                      filterOption.value ===
                      "ALL"
                        ? reports.length
                        : reports.filter(
                            (
                              report
                            ) =>
                              report.status ===
                              filterOption.value
                          ).length;


                    return (
                      <button
                        key={
                          filterOption.value
                        }
                        type="button"
                        onClick={() =>
                          setFilter(
                            filterOption.value
                          )
                        }
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                          filter ===
                          filterOption.value
                            ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20"
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        }`}
                      >

                        {
                          filterOption.label
                        }


                        <span className="ml-1.5 text-xs text-slate-500">
                          ({count})
                        </span>

                      </button>
                    );
                  }
                )}

              </div>

            </div>


            {/* CATEGORY FILTER */}

            <div className="mt-4 border-t border-white/5 pt-4">

              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Incident Category
                </p>


                {(filter !== "ALL" ||
                  categoryFilter !==
                    "ALL") && (

                  <button
                    type="button"
                    onClick={() => {
                      setFilter(
                        "ALL"
                      );

                      setCategoryFilter(
                        "ALL"
                      );
                    }}
                    className="text-[10px] font-medium text-blue-400 transition hover:text-blue-300"
                  >
                    Clear filters
                  </button>

                )}

              </div>


              <div className="flex flex-wrap gap-2">

                {CATEGORY_FILTERS.map(
                  (
                    categoryOption
                  ) => {

                    const count =
                      categoryOption.value ===
                      "ALL"
                        ? reports.length
                        : reports.filter(
                            (
                              report
                            ) =>
                              getReportCategory(
                                report.reportType
                              ) ===
                              categoryOption.value
                          ).length;


                    return (
                      <button
                        key={
                          categoryOption.value
                        }
                        type="button"
                        onClick={() =>
                          setCategoryFilter(
                            categoryOption.value
                          )
                        }
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                          categoryFilter ===
                          categoryOption.value
                            ? "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/20"
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        }`}
                      >

                        {
                          categoryOption.label
                        }


                        <span className="ml-1.5 text-xs text-slate-500">
                          ({count})
                        </span>

                      </button>
                    );
                  }
                )}

              </div>

            </div>


            {/* ACTIVE RESULT COUNT */}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-4">

              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-300">
                  {
                    filteredReports.length
                  }
                </span>{" "}
                of{" "}
                {
                  reports.length
                }{" "}
                reports
              </p>


              {categoryFilter !==
                "ALL" && (

                <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-semibold text-purple-300 ring-1 ring-purple-500/20">
                  {
                    getCategoryLabel(
                      categoryFilter
                    )
                  }
                </span>

              )}

            </div>

          </div>


          {/* =============================================================== */}
          {/* CONTENT                                                         */}
          {/* =============================================================== */}

          {loading ? (

            <LoadingState />

          ) : (

            <div className="grid gap-5 xl:grid-cols-2">

              {filteredReports.length ===
              0 ? (

                <EmptyState
                  filter={
                    filter
                  }
                  categoryFilter={
                    categoryFilter
                  }
                />

              ) : (

                filteredReports.map(
                  (report) => (

                    <ReportCard
                      key={
                        report.id
                      }
                      report={
                        report
                      }
                      updating={
                        updatingReportId ===
                        report.id
                      }
                      onVerify={() =>
                        updateStatus(
                          report.id,
                          "VERIFIED"
                        )
                      }
                      onReject={() =>
                        updateStatus(
                          report.id,
                          "REJECTED"
                        )
                      }
                    />

                  )
                )

              )}

            </div>

          )}

        </section>

      </div>

    </main>
  );
}




/* ========================================================================= */
/* PROTECTED PAGE                                                            */
/* ========================================================================= */

export default function ReportsPage() {
  return (
    <RequireOfficer>
      <ReportsPageContent />
    </RequireOfficer>
  );
}


/* ========================================================================= */
/* REPORT CARD                                                               */
/* ========================================================================= */

function ReportCard({
  report,
  updating,
  onVerify,
  onReject,
}: {
  report: BackendReport;
  updating: boolean;
  onVerify: () => void;
  onReject: () => void;
}) {

  const statusStyles:
    Record<
      BackendReportStatus,
      string
    > = {

    PENDING:
      "text-yellow-400 bg-yellow-500/10 ring-yellow-500/20",

    VERIFIED:
      "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20",

    REJECTED:
      "text-slate-500 bg-white/5 ring-white/10",
  };


  const severityStyles:
    Record<
      string,
      string
    > = {

    LOW:
      "text-blue-400 bg-blue-500/10 ring-blue-500/20",

    MEDIUM:
      "text-yellow-400 bg-yellow-500/10 ring-yellow-500/20",

    HIGH:
      "text-orange-400 bg-orange-500/10 ring-orange-500/20",

    CRITICAL:
      "text-red-400 bg-red-500/10 ring-red-500/20",
  };


  const photoUrl =
    report.photoUrl
      ? `${API_BASE_URL}${report.photoUrl}`
      : null;


  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1728] transition hover:border-white/15">

      {/* ================================================================ */}
      {/* PHOTO                                                            */}
      {/* ================================================================ */}

      {photoUrl ? (

        <a
          href={photoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block h-[220px] overflow-hidden bg-black/20"
        >

          <img
            src={photoUrl}
            alt={`Incident evidence for ${report.ward}`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />


          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-[10px] text-white backdrop-blur">

            <ExternalLink className="h-3 w-3" />

            View evidence

          </div>

        </a>

      ) : (

        <div className="flex h-[120px] items-center justify-center border-b border-white/5 bg-white/[0.015]">

          <div className="text-center">

            <ImageIcon className="mx-auto h-6 w-6 text-slate-700" />

            <p className="mt-2 text-[10px] text-slate-600">
              No photo evidence
            </p>

          </div>

        </div>

      )}


      {/* ================================================================ */}
      {/* INFORMATION                                                      */}
      {/* ================================================================ */}

      <div className="p-5">

        {/* HEADER */}

        <div className="flex items-start justify-between gap-3">

          <div>

            <div className="flex flex-wrap items-center gap-2">

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest ring-1 ${
                  statusStyles[
                    report.status
                  ]
                }`}
              >
                {
                  report.status
                }
              </span>


              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest ring-1 ${
                  severityStyles[
                    report.severity
                  ] ||
                  "bg-white/5 text-slate-400 ring-white/10"
                }`}
              >
                {
                  report.severity
                }
              </span>

            </div>


            <h4 className="mt-3 text-base font-semibold">
              {
                report.reportType
              }
            </h4>

          </div>


          <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-400">

            <MapPin className="h-3.5 w-3.5" />

            {
              report.ward
            }

          </div>

        </div>


        {/* DESCRIPTION */}

        <p className="mt-4 text-sm leading-6 text-slate-300">
          {
            report.description
          }
        </p>


        {/* ================================================================ */}
        {/* LOCATION                                                         */}
        {/* ================================================================ */}

        {report.latitude !==
          null &&
          report.longitude !==
            null && (

          <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">

            <div className="flex items-start justify-between gap-3">

              <div>

                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  GPS Evidence
                </p>


                <p className="mt-1 font-mono text-xs text-slate-300">
                  {
                    report.latitude.toFixed(
                      6
                    )
                  }
                  ,{" "}
                  {
                    report.longitude.toFixed(
                      6
                    )
                  }
                </p>

              </div>


              <a
                href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 transition hover:text-blue-300"
              >

                Open map

                <ExternalLink className="h-3 w-3" />

              </a>

            </div>

          </div>

        )}


        {/* ================================================================ */}
        {/* TIME + ID                                                        */}
        {/* ================================================================ */}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">

          <span className="flex items-center gap-1.5">

            <Clock className="h-3.5 w-3.5" />

            {formatReportTime(
              report.createdAt
            )}

          </span>


          <span className="font-mono text-[10px] text-slate-600">
            ID:{" "}
            {report.id.slice(
              0,
              8
            )}
          </span>

        </div>


        {/* ================================================================ */}
        {/* VERIFIED                                                         */}
        {/* ================================================================ */}

        {report.status ===
          "VERIFIED" &&
          report.verifiedAt && (

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.05] px-3 py-2.5 text-xs text-emerald-400">

            <CheckCircle2 className="h-4 w-4" />

            Verified{" "}
            {formatReportTime(
              report.verifiedAt
            )}

          </div>

        )}


        {/* ================================================================ */}
        {/* REJECTED                                                         */}
        {/* ================================================================ */}

        {report.status ===
          "REJECTED" && (

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2.5 text-xs text-slate-500">

            <XCircle className="h-4 w-4" />

            Report rejected during
            verification

          </div>

        )}


        {/* ================================================================ */}
        {/* ACTIONS                                                          */}
        {/* ================================================================ */}

        {report.status ===
          "PENDING" && (

          <div className="mt-5 flex gap-2 border-t border-white/5 pt-4">

            <button
              type="button"
              disabled={
                updating
              }
              onClick={
                onVerify
              }
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 py-2.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {updating ? (

                <RefreshCw className="h-3.5 w-3.5 animate-spin" />

              ) : (

                <CheckCircle2 className="h-3.5 w-3.5" />

              )}

              Verify

            </button>


            <button
              type="button"
              disabled={
                updating
              }
              onClick={
                onReject
              }
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/5 py-2.5 text-xs font-medium text-slate-400 ring-1 ring-white/10 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >

              <XCircle className="h-3.5 w-3.5" />

              Reject

            </button>

          </div>

        )}

      </div>

    </article>
  );
}


/* ========================================================================= */
/* SUMMARY CARD                                                              */
/* ========================================================================= */

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a1728] p-4">

      <p className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </p>


      <p className="mt-2 text-2xl font-bold">
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
    <div className="col-span-full flex min-h-[250px] items-center justify-center rounded-2xl border border-white/10 bg-[#0a1728]">

      <div className="text-center">

        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-400" />


        <p className="mt-3 text-sm text-slate-400">
          Loading evidence...
        </p>

      </div>

    </div>
  );
}


/* ========================================================================= */
/* EMPTY                                                                     */
/* ========================================================================= */

function EmptyState({
  filter,
  categoryFilter,
}: {
  filter: FilterTab;
  categoryFilter:
    CategoryFilter;
}) {

  let message =
    "Citizen reports will appear here when submitted.";

  if (
    filter !== "ALL" &&
    categoryFilter !== "ALL"
  ) {
    message =
      `There are currently no ${filter.toLowerCase()} ${getCategoryLabel(
        categoryFilter
      ).toLowerCase()} reports.`;
  } else if (
    categoryFilter !== "ALL"
  ) {
    message =
      `There are currently no ${getCategoryLabel(
        categoryFilter
      ).toLowerCase()} reports.`;
  } else if (
    filter !== "ALL"
  ) {
    message =
      `There are currently no ${filter.toLowerCase()} reports.`;
  }


  return (
    <div className="col-span-full flex min-h-[250px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0a1728]">

      <div className="text-center">

        <CheckCircle2 className="mx-auto h-8 w-8 text-slate-600" />


        <p className="mt-3 text-sm font-medium text-slate-300">
          No reports found
        </p>


        <p className="mt-1 text-xs text-slate-500">
          {
            message
          }
        </p>

      </div>

    </div>
  );
}


/* ========================================================================= */
/* CATEGORY HELPERS                                                          */
/* ========================================================================= */

function getReportCategory(
  reportType:
    string
): CategoryFilter {

  const normalized =
    reportType
      .trim()
      .toLowerCase()
      .replaceAll(
        "_",
        " "
      )
      .replaceAll(
        "-",
        " "
      );


  if (
    normalized.includes(
      "waterlogging"
    ) ||
    normalized.includes(
      "water logging"
    )
  ) {
    return "WATERLOGGING";
  }


  if (
    normalized.includes(
      "flood"
    )
  ) {
    return "FLOODING";
  }


  if (
    normalized.includes(
      "road blockage"
    ) ||
    normalized.includes(
      "road blocked"
    ) ||
    normalized.includes(
      "blocked road"
    ) ||
    normalized.includes(
      "road block"
    )
  ) {
    return "ROAD_BLOCKAGE";
  }


  if (
    normalized.includes(
      "drainage overflow"
    ) ||
    normalized.includes(
      "drain overflow"
    ) ||
    normalized.includes(
      "overflowing drain"
    )
  ) {
    return "DRAINAGE_OVERFLOW";
  }


  if (
    normalized.includes(
      "tree fall"
    ) ||
    normalized.includes(
      "fallen tree"
    ) ||
    normalized.includes(
      "tree falling"
    ) ||
    (
      normalized.includes(
        "tree"
      ) &&
      normalized.includes(
        "fall"
      )
    )
  ) {
    return "TREE_FALL";
  }


  if (
    normalized.includes(
      "electrical hazard"
    ) ||
    normalized.includes(
      "electric hazard"
    ) ||
    normalized.includes(
      "electrical"
    ) ||
    normalized.includes(
      "electric wire"
    ) ||
    normalized.includes(
      "power line"
    )
  ) {
    return "ELECTRICAL_HAZARD";
  }


  if (
    normalized.includes(
      "infrastructure damage"
    ) ||
    normalized.includes(
      "structural damage"
    ) ||
    normalized.includes(
      "building damage"
    ) ||
    normalized.includes(
      "road damage"
    )
  ) {
    return "INFRASTRUCTURE_DAMAGE";
  }


  return "OTHER";
}


function getCategoryLabel(
  category:
    CategoryFilter
): string {

  switch (
    category
  ) {

    case "WATERLOGGING":
      return "Waterlogging";

    case "FLOODING":
      return "Flooding";

    case "ROAD_BLOCKAGE":
      return "Road Blockage";

    case "DRAINAGE_OVERFLOW":
      return "Drainage Overflow";

    case "TREE_FALL":
      return "Tree Fall";

    case "ELECTRICAL_HAZARD":
      return "Electrical Hazard";

    case "INFRASTRUCTURE_DAMAGE":
      return "Infrastructure Damage";

    case "OTHER":
      return "Other";

    default:
      return "All Categories";
  }
}


/* ========================================================================= */
/* TIME                                                                      */
/* ========================================================================= */

function formatReportTime(
  timestamp: number
) {
  const difference =
    Date.now() -
    timestamp;

  const minutes =
    Math.floor(
      difference / 60000
    );


  if (minutes < 1) {
    return "just now";
  }


  if (minutes < 60) {
    return `${minutes} min ago`;
  }


  const hours =
    Math.floor(
      minutes / 60
    );


  if (hours < 24) {
    return `${hours} hr${
      hours === 1
        ? ""
        : "s"
    } ago`;
  }


  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(
      timestamp
    )
  );
}