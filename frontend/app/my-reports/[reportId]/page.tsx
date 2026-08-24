"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  MapPin,
  XCircle,
} from "lucide-react";

import {
  useParams,
  useRouter,
} from "next/navigation";

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


export default function MyReportDetailsPage() {

  const params =
    useParams();

  const router =
    useRouter();


  const reportId =
    typeof params.reportId ===
    "string"
      ? params.reportId
      : "";


  const [
    report,
    setReport,
  ] =
    useState<ReportItem | null>(
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
    useState(
      ""
    );


  useEffect(
    () => {

      if (
        !reportId
      ) {

        return;

      }


      loadReport();

    },
    [
      reportId,
    ]
  );


  async function loadReport() {

    try {

      setLoading(
        true
      );


      setError(
        ""
      );


      const response =
        await authFetch(
          `${API_BASE_URL}/api/my-reports/${encodeURIComponent(
            reportId
          )}`,
          {
            cache:
              "no-store",
          }
        );


      if (
        response.status === 401 ||
        response.status === 403
      ) {

        logout();

        window.location.href =
          "/login";

        return;
      }


      if (
        response.status === 404
      ) {

        setError(
          "This report could not be found."
        );

        return;
      }


      if (
        !response.ok
      ) {

        let message =
          "Unable to load this report.";


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


      const data:
        ReportItem =
        await response.json();


      setReport(
        data
      );


    } catch (
      err
    ) {

      console.error(
        "Unable to load report:",
        err
      );


      setError(
        err instanceof Error
          ? err.message
          : "Unable to load this report."
      );


    } finally {

      setLoading(
        false
      );

    }

  }


  const photoUrl =
    getPhotoUrl(
      report?.photoUrl ??
      null
    );


  return (

    <main className="min-h-screen bg-[#07111f] text-white">

      <Header />


      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[230px_1fr]">

        <Sidebar />


        <section className="min-w-0 p-5 lg:p-8">

          <div className="mx-auto max-w-5xl">


            <button
              type="button"
              onClick={() =>
                router.push(
                  "/my-reports"
                )
              }
              className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-blue-300"
            >

              <ArrowLeft className="h-4 w-4" />

              Back to My Reports

            </button>


            {
              loading && (

                <div className="rounded-3xl border border-white/10 bg-[#0a1728] p-12 text-center">

                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-400" />


                  <p className="mt-4 text-sm text-slate-400">

                    Loading report...

                  </p>

                </div>

              )
            }


            {
              !loading &&
              error && (

                <div className="rounded-3xl border border-red-500/20 bg-red-500/[0.06] p-8 text-center">

                  <AlertTriangle className="mx-auto h-9 w-9 text-red-400" />


                  <h2 className="mt-4 text-lg font-semibold text-white">

                    Unable to open report

                  </h2>


                  <p className="mt-2 text-sm text-red-300">

                    {
                      error
                    }

                  </p>


                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/my-reports"
                      )
                    }
                    className="mt-6 rounded-xl bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300 ring-1 ring-blue-500/20 transition hover:bg-blue-500/20"
                  >

                    Return to My Reports

                  </button>

                </div>

              )
            }


            {
              !loading &&
              !error &&
              report && (

                <>

                  <div className="mb-6">

                    <div className="flex flex-wrap items-center gap-3">

                      <p className="text-sm font-medium text-blue-400">

                        Citizen Report

                      </p>


                      <StatusBadge
                        status={
                          report.status
                        }
                      />

                    </div>


                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">

                      {
                        formatLabel(
                          report.reportType
                        )
                      }

                    </h1>


                    <p className="mt-2 text-sm text-slate-500">

                      View your submitted incident evidence and current verification status.

                    </p>

                  </div>


                  <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a1728] shadow-[0_25px_80px_rgba(0,0,0,0.25)]">


                    {
                      photoUrl && (

                        <div className="relative border-b border-white/10 bg-black/20">

                          <img
                            src={
                              photoUrl
                            }
                            alt="Incident evidence"
                            className="max-h-[480px] w-full object-contain"
                          />


                          <a
                            href={
                              photoUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#07111f]/90 px-3 py-2 text-xs font-medium text-slate-200 backdrop-blur transition hover:border-blue-400/30 hover:text-blue-300"
                          >

                            View Full Image

                            <ExternalLink className="h-3.5 w-3.5" />

                          </a>

                        </div>

                      )
                    }


                    <div className="p-6 lg:p-8">


                      <div className="flex flex-wrap items-center gap-3">

                        <StatusBadge
                          status={
                            report.status
                          }
                        />


                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getSeverityClass(
                            report.severity
                          )}`}
                        >

                          {
                            report.severity
                          }

                        </span>


                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">

                          <MapPin className="h-3.5 w-3.5 text-blue-400" />

                          {
                            report.ward
                          }

                        </span>

                      </div>


                      <div className="mt-8">

                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">

                          Incident Description

                        </p>


                        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.025] p-5">

                          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">

                            {
                              report.description
                            }

                          </p>

                        </div>

                      </div>


                      <div className="mt-8 grid gap-4 md:grid-cols-2">

                        <InfoCard
                          label="Ward"
                          value={
                            report.ward
                          }
                        />


                        <InfoCard
                          label="Incident Type"
                          value={
                            formatLabel(
                              report.reportType
                            )
                          }
                        />


                        <InfoCard
                          label="Severity"
                          value={
                            report.severity
                          }
                        />


                        <InfoCard
                          label="Current Status"
                          value={
                            report.status
                          }
                        />


                        <InfoCard
                          label="Submitted At"
                          value={
                            formatTime(
                              report.createdAt
                            )
                          }
                        />


                        <InfoCard
                          label="Reviewed At"
                          value={
                            report.verifiedAt
                              ? formatTime(
                                  report.verifiedAt
                                )
                              : "Awaiting officer review"
                          }
                        />

                      </div>


                      {
                        report.latitude !== null &&
                        report.longitude !== null && (

                          <div className="mt-8 rounded-2xl border border-blue-500/10 bg-blue-500/[0.035] p-5">

                            <div className="flex items-center gap-2">

                              <MapPin className="h-4 w-4 text-blue-400" />


                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">

                                GPS Evidence

                              </p>

                            </div>


                            <p className="mt-3 font-mono text-sm text-slate-300">

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


                            <a
                              href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-400 transition hover:text-blue-300"
                            >

                              Open Location in Google Maps

                              <ExternalLink className="h-4 w-4" />

                            </a>

                          </div>

                        )
                      }


                      <div className="mt-8 border-t border-white/10 pt-5">

                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">

                          Report ID

                        </p>


                        <p className="mt-2 break-all font-mono text-xs text-slate-500">

                          {
                            report.id
                          }

                        </p>

                      </div>

                    </div>

                  </div>

                </>

              )
            }

          </div>

        </section>

      </div>

    </main>

  );

}


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


function InfoCard({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {

  return (

    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">

      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">

        {
          label
        }

      </p>


      <p className="mt-2 break-words text-sm font-medium text-slate-200">

        {
          value
        }

      </p>

    </div>

  );

}


function getSeverityClass(
  severity:
    string
) {

  switch (
    severity.toUpperCase()
  ) {

    case "CRITICAL":

      return "border border-red-500/20 bg-red-500/10 text-red-400";


    case "HIGH":

      return "border border-orange-500/20 bg-orange-500/10 text-orange-400";


    case "MEDIUM":

      return "border border-yellow-500/20 bg-yellow-500/10 text-yellow-400";


    case "LOW":

      return "border border-blue-500/20 bg-blue-500/10 text-blue-400";


    default:

      return "border border-slate-500/20 bg-slate-500/10 text-slate-400";

  }

}


function getPhotoUrl(
  photoUrl:
    string | null
) {

  if (
    !photoUrl
  ) {

    return null;

  }


  if (
    photoUrl.startsWith(
      "http://"
    ) ||
    photoUrl.startsWith(
      "https://"
    )
  ) {

    return photoUrl;

  }


  if (
    photoUrl.startsWith(
      "/"
    )
  ) {

    return `${API_BASE_URL}${photoUrl}`;

  }


  return `${API_BASE_URL}/${photoUrl}`;

}


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