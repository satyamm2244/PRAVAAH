"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  XCircle,
} from "lucide-react";

import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";

import {
  authFetch,
  logout,
} from "@/lib/auth";


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


type ReportStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED";


type ReportItem = {
  id: string;

  reporterUserId:
    string | null;

  ward:
    string;

  reportType:
    string;

  severity:
    string;

  description:
    string;

  latitude:
    number | null;

  longitude:
    number | null;

  photoUrl:
    string | null;

  status:
    ReportStatus;

  createdAt:
    number;

  verifiedAt:
    number | null;
};


export default function MyReportsPage() {

  const [
    reports,
    setReports,
  ] =
    useState<ReportItem[]>(
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
    error,
    setError,
  ] =
    useState(
      ""
    );


  /* ========================================================================= */
  /* LOAD REPORTS                                                              */
  /* ========================================================================= */

  useEffect(
    () => {

      async function loadReports() {

        try {

          setLoading(
            true
          );

          setError(
            ""
          );


          const response =
            await authFetch(
              `${API_BASE_URL}/api/my-reports`,
              {
                cache:
                  "no-store",
              }
            );


          /* --------------------------------------------------------------- */
          /* AUTH ERROR                                                      */
          /* --------------------------------------------------------------- */

          if (
            response.status ===
              401 ||
            response.status ===
              403
          ) {

            logout();

            window.location.href =
              "/login";

            return;
          }


          /* --------------------------------------------------------------- */
          /* OTHER ERROR                                                     */
          /* --------------------------------------------------------------- */

          if (
            !response.ok
          ) {

            let message =
              "Unable to load your reports.";


            try {

              const data =
                await response.json();


              if (
                data?.detail
              ) {

                message =
                  data.detail;

              }

            } catch {

              // Ignore invalid JSON.

            }


            throw new Error(
              message
            );

          }


          /* --------------------------------------------------------------- */
          /* SUCCESS                                                         */
          /* --------------------------------------------------------------- */

          const data:
            ReportItem[] =
            await response.json();


          setReports(
            Array.isArray(
              data
            )
              ? data
              : []
          );


        } catch (
          err
        ) {

          console.error(
            "Unable to load reports:",
            err
          );


          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your reports."
          );


        } finally {

          setLoading(
            false
          );

        }

      }


      loadReports();

    },
    []
  );


  /* ========================================================================= */
  /* UI                                                                        */
  /* ========================================================================= */

  return (

    <main className="min-h-screen bg-[#07111f] text-white">

      <Header />


      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[230px_1fr]">

        <Sidebar />


        <section className="min-w-0 p-5 lg:p-8">

          <div className="mx-auto max-w-6xl">


            {/* ============================================================= */}
            {/* PAGE HEADER                                                   */}
            {/* ============================================================= */}

            <div className="mb-8">

              <p className="text-sm font-medium text-blue-400">

                Citizen Reports

              </p>


              <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">

                My Reports

              </h1>


              <p className="mt-2 text-sm text-slate-400">

                Track the incidents you have reported and monitor their verification status.

              </p>

            </div>


            {/* ============================================================= */}
            {/* LOADING                                                       */}
            {/* ============================================================= */}

            {
              loading && (

                <div className="rounded-3xl border border-white/10 bg-[#0a1728] p-12 text-center">

                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-400" />


                  <p className="mt-4 text-sm text-slate-400">

                    Loading your reports...

                  </p>

                </div>

              )
            }


            {/* ============================================================= */}
            {/* ERROR                                                         */}
            {/* ============================================================= */}

            {
              !loading &&
              error && (

                <div className="rounded-3xl border border-red-500/20 bg-red-500/[0.06] p-8 text-center">

                  <AlertTriangle className="mx-auto h-9 w-9 text-red-400" />


                  <h2 className="mt-4 text-lg font-semibold text-white">

                    Unable to load reports

                  </h2>


                  <p className="mt-2 text-sm text-red-300">

                    {
                      error
                    }

                  </p>

                </div>

              )
            }


            {/* ============================================================= */}
            {/* EMPTY                                                         */}
            {/* ============================================================= */}

            {
              !loading &&
              !error &&
              reports.length ===
                0 && (

                <div className="rounded-3xl border border-dashed border-white/10 bg-[#0a1728] p-12 text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">

                    <FileText className="h-6 w-6 text-blue-400" />

                  </div>


                  <h2 className="mt-5 text-lg font-semibold text-white">

                    No reports yet

                  </h2>


                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">

                    Incident reports submitted using this citizen account will appear here.

                  </p>


                  <button
                    type="button"
                    onClick={() => {

                      window.location.href =
                        "/report-incident";

                    }}
                    className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >

                    Report an Incident

                  </button>

                </div>

              )
            }


            {/* ============================================================= */}
            {/* REPORT CARDS                                                  */}
            {/* ============================================================= */}

            {
              !loading &&
              !error &&
              reports.length >
                0 && (

                <div className="grid gap-5 xl:grid-cols-2">

                  {
                    reports.map(
                      (
                        report
                      ) => (

                        <button
                          key={
                            report.id
                          }
                          type="button"
                          onClick={() => {

                            window.location.href =
                              `/my-reports/${encodeURIComponent(
                                report.id
                              )}`;

                          }}
                          className="group rounded-2xl border border-white/10 bg-[#0a1728] p-5 text-left transition duration-200 hover:border-blue-500/30 hover:bg-[#0c1b30] hover:shadow-[0_15px_50px_rgba(0,0,0,0.2)]"
                        >

                          {/* ================================================= */}
                          {/* TOP ROW                                           */}
                          {/* ================================================= */}

                          <div className="flex items-start justify-between gap-4">

                            <div>

                              <StatusBadge
                                status={
                                  report.status
                                }
                              />


                              <h2 className="mt-3 text-lg font-semibold text-white transition group-hover:text-blue-300">

                                {
                                  formatLabel(
                                    report.reportType
                                  )
                                }

                              </h2>

                            </div>


                            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">

                              <MapPin className="h-3.5 w-3.5 text-blue-400" />

                              {
                                report.ward
                              }

                            </div>

                          </div>


                          {/* ================================================= */}
                          {/* DESCRIPTION                                       */}
                          {/* ================================================= */}

                          <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">

                            {
                              report.description
                            }

                          </p>


                          {/* ================================================= */}
                          {/* META                                              */}
                          {/* ================================================= */}

                          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4">

                            <div className="flex items-center gap-2 text-xs text-slate-500">

                              <Clock className="h-3.5 w-3.5" />

                              {
                                formatTime(
                                  report.createdAt
                                )
                              }

                            </div>


                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${severityClass(
                                report.severity
                              )}`}
                            >

                              {
                                report.severity
                              }

                            </span>

                          </div>


                          {/* ================================================= */}
                          {/* VIEW DETAILS                                      */}
                          {/* ================================================= */}

                          <div className="mt-4 text-right">

                            <span className="text-xs font-medium text-blue-400 transition group-hover:text-blue-300">

                              View Report →

                            </span>

                          </div>

                        </button>

                      )
                    )
                  }

                </div>

              )
            }

          </div>

        </section>

      </div>

    </main>

  );

}


/* ========================================================================= */
/* STATUS                                                                    */
/* ========================================================================= */

function StatusBadge({
  status,
}: {
  status:
    ReportStatus;
}) {

  if (
    status ===
    "VERIFIED"
  ) {

    return (

      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400">

        <CheckCircle2 className="h-3.5 w-3.5" />

        VERIFIED

      </span>

    );

  }


  if (
    status ===
    "REJECTED"
  ) {

    return (

      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[10px] font-bold text-red-400">

        <XCircle className="h-3.5 w-3.5" />

        REJECTED

      </span>

    );

  }


  return (

    <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-[10px] font-bold text-yellow-400">

      <AlertTriangle className="h-3.5 w-3.5" />

      PENDING

    </span>

  );

}


/* ========================================================================= */
/* SEVERITY                                                                  */
/* ========================================================================= */

function severityClass(
  severity:
    string
) {

  switch (
    severity.toUpperCase()
  ) {

    case "CRITICAL":

      return "bg-red-500/10 text-red-400";


    case "HIGH":

      return "bg-orange-500/10 text-orange-400";


    case "MEDIUM":

      return "bg-yellow-500/10 text-yellow-400";


    case "LOW":

      return "bg-blue-500/10 text-blue-400";


    default:

      return "bg-slate-500/10 text-slate-400";

  }

}


/* ========================================================================= */
/* FORMAT LABEL                                                              */
/* ========================================================================= */

function formatLabel(
  value:
    string
) {

  return value
    .replace(
      /_/g,
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character.toUpperCase()
    );

}


/* ========================================================================= */
/* FORMAT TIME                                                               */
/* ========================================================================= */

function formatTime(
  timestamp:
    number
) {

  try {

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        dateStyle:
          "medium",

        timeStyle:
          "short",
      }
    ).format(
      new Date(
        timestamp
      )
    );

  } catch {

    return "Unknown";

  }

}