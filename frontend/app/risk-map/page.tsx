"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import GoogleRiskMap from "@/components/dashboard/GoogleRiskMap";
import WardDetailModal from "@/components/dashboard/WardDetailModal";

import {
  evaluateAllWards,
  type WardRisk,
} from "@/lib/risk-engine";

import type {
  WardReading,
} from "@/lib/mock-engine";

import {
  calculateWardPropagation,
  type WardPropagationResult,
} from "@/lib/propagation-engine";

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

  verifiedReportCount?: number;

  pendingReportCount?: number;

  rejectedReportCount?: number;

  totalReportCount?: number;

  latitude: number;

  longitude: number;

  dataMode?: string;

  sources?: {
    rainfall?: string;

    rainfallMode?: string;

    riverLevel?: string;

    riverLevelMode?: string;

    riverLevelTimestamp?: number | null;

    crowdReports?: string;

    crowdReportsMode?: string;
  };

  timestamp?: number;
};


/* ========================================================================= */
/* CONFIG                                                                    */
/* ========================================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


const REFRESH_INTERVAL =
  30000;


/* ========================================================================= */
/* PAGE                                                                      */
/* ========================================================================= */

export default function RiskMapPage() {

  const fetchInProgress =
    useRef(
      false
    );


  /* ----------------------------------------------------------------------- */
  /* STATE                                                                   */
  /* ----------------------------------------------------------------------- */

  const [
    wardRisks,
    setWardRisks,
  ] =
    useState<WardRisk[]>(
      []
    );


  const [
    backendWards,
    setBackendWards,
  ] =
    useState<BackendWard[]>(
      []
    );


  /*
   * selectedWard controls the map selection.
   *
   * Closing the modal intentionally does not
   * clear this value because propagation
   * forecasting can continue using it.
   */

  const [
    selectedWard,
    setSelectedWard,
  ] =
    useState<WardRisk | null>(
      null
    );


  const [
    modalOpen,
    setModalOpen,
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
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );


  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );


  /* ========================================================================= */
  /* FETCH WARDS                                                               */
  /* ========================================================================= */

  const fetchWardRisks =
    useCallback(
      async (
        showRefresh = false
      ) => {

        if (
          fetchInProgress.current
        ) {

          return;
        }


        if (
          typeof document !==
            "undefined" &&
          document.visibilityState ===
            "hidden" &&
          !showRefresh
        ) {

          return;
        }


        fetchInProgress.current =
          true;


        const controller =
          new AbortController();


        const timeout =
          window.setTimeout(
            () => {

              controller.abort();

            },
            15000
          );


        try {

          if (
            showRefresh
          ) {

            setRefreshing(
              true
            );

          }


          const response =
            await fetch(
              `${API_BASE_URL}/api/wards`,
              {
                cache:
                  "no-store",

                signal:
                  controller.signal,
              }
            );


          if (
            !response.ok
          ) {

            throw new Error(
              `Backend returned ${response.status}`
            );

          }


          const backendData:
            BackendWard[] =
            await response.json();


          setBackendWards(
            backendData
          );


          const readings:
            WardReading[] =
            backendData.map(
              (
                ward
              ) => ({

                ward:
                  ward.ward as WardReading["ward"],

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
                risks.find(
                  (
                    risk
                  ) =>
                    risk.ward ===
                    current.ward
                ) ??
                null
              );

            }
          );


          setError(
            null
          );

        } catch (
          fetchError
        ) {

          if (
            fetchError instanceof DOMException &&
            fetchError.name ===
              "AbortError"
          ) {

            console.warn(
              "Risk map request timed out."
            );

            setError(
              "The PRAVAAH backend took too long to respond."
            );

          } else {

            console.error(
              "Unable to fetch ward risk data:",
              fetchError
            );

            setError(
              "Unable to connect to the PRAVAAH backend."
            );

          }

        } finally {

          window.clearTimeout(
            timeout
          );


          fetchInProgress.current =
            false;


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


  /* ========================================================================= */
  /* LIVE REFRESH                                                              */
  /* ========================================================================= */

  useEffect(
    () => {

      fetchWardRisks();


      const interval =
        window.setInterval(
          () => {

            if (
              document.visibilityState ===
              "visible"
            ) {

              fetchWardRisks();

            }

          },
          REFRESH_INTERVAL
        );


      function handleVisibilityChange() {

        if (
          document.visibilityState ===
          "visible"
        ) {

          fetchWardRisks();

        }

      }


      document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
      );


      return () => {

        window.clearInterval(
          interval
        );


        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );

      };

    },
    [
      fetchWardRisks,
    ]
  );


  /* ========================================================================= */
  /* WARD COORDINATES                                                          */
  /* ========================================================================= */

  const coordinates =
    useMemo<WardCoordinate[]>(
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


  /* ========================================================================= */
  /* SELECTED BACKEND WARD                                                     */
  /* ========================================================================= */

  const selectedWardData =
    useMemo(
      () => {

        if (
          !selectedWard
        ) {

          return null;

        }


        return (
          backendWards.find(
            (
              ward
            ) =>
              ward.ward ===
              selectedWard.ward
          ) ??
          null
        );

      },
      [
        selectedWard,
        backendWards,
      ]
    );


  /* ========================================================================= */
  /* PROPAGATION FORECAST                                                      */
  /* ========================================================================= */

  const propagation:
    WardPropagationResult | null =
    useMemo(
      () => {

        if (
          !selectedWard ||
          coordinates.length ===
            0
        ) {

          return null;

        }


        return calculateWardPropagation(
          selectedWard.ward,
          wardRisks,
          coordinates
        );

      },
      [
        selectedWard,
        wardRisks,
        coordinates,
      ]
    );


  /* ========================================================================= */
  /* MARKER SELECTION                                                          */
  /* ========================================================================= */

  const handleWardSelect =
    useCallback(
      (
        wardRisk:
          WardRisk
      ) => {

        setSelectedWard(
          wardRisk
        );


        setModalOpen(
          true
        );

      },
      []
    );


  /* ========================================================================= */
  /* CLOSE MODAL                                                               */
  /* ========================================================================= */

  const handleCloseModal =
    useCallback(
      () => {

        setModalOpen(
          false
        );

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

          {/* =============================================================== */}
          {/* PAGE HEADER                                                     */}
          {/* =============================================================== */}

          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <h2 className="text-3xl font-bold tracking-tight">
                Live Risk Map
              </h2>


              <p className="mt-2 max-w-2xl text-sm text-slate-400">

                Live Bhubaneswar ward risk monitoring with predictive
                propagation forecasting using weather, IoT sensors and
                officer-verified citizen evidence.

              </p>

            </div>


            <div className="flex flex-wrap items-center gap-3">

              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-slate-400">

                <span className="relative flex h-2 w-2">

                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />


                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />

                </span>


                Live • 30 sec refresh

              </div>


              <button
                type="button"
                onClick={() =>
                  fetchWardRisks(
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
          {/* BACKEND ERROR                                                   */}
          {/* =============================================================== */}

          {error && (

            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">

              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />


              <div>

                <p className="text-sm font-medium text-red-300">
                  Risk data unavailable
                </p>


                <p className="mt-1 text-xs text-red-300/70">
                  {
                    error
                  }
                </p>

              </div>

            </div>

          )}


          {/* =============================================================== */}
          {/* MAP                                                             */}
          {/* =============================================================== */}

          {loading ? (

            <MapLoadingState />

          ) : wardRisks.length ===
            0 ? (

            <MapEmptyState />

          ) : (

            <div className="overflow-hidden rounded-2xl border border-white/10">

              <GoogleRiskMap
                wardRisks={
                  wardRisks
                }

                backendWards={
                  backendWards
                }

                onWardSelect={
                  handleWardSelect
                }

                selectedWard={
                  selectedWard
                    ?.ward ??
                  null
                }

                propagationForecasts={
                  propagation
                    ?.forecasts ??
                  []
                }
              />

            </div>

          )}


          {/* =============================================================== */}
          {/* DESCRIPTION                                                     */}
          {/* =============================================================== */}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">

            <p>
              Click a ward marker to inspect live conditions,
              risk evidence, propagation and recommended response.
            </p>


            <p>
              Prototype risk thresholds are for decision-support demonstration.
            </p>

          </div>

        </section>

      </div>


      {/* =================================================================== */}
      {/* WARD DETAIL MODAL                                                   */}
      {/* =================================================================== */}

      {selectedWard &&
        modalOpen && (

        <WardDetailModal
          wardRisk={
            selectedWard
          }

          wardData={
            selectedWardData
          }

          propagation={
            propagation
          }

          onClose={
            handleCloseModal
          }
        />

      )}

    </main>

  );
}


/* ========================================================================= */
/* LOADING                                                                   */
/* ========================================================================= */

function MapLoadingState() {

  return (

    <div className="flex h-[480px] items-center justify-center rounded-2xl border border-white/10 bg-[#10243a]">

      <div className="text-center">

        <RefreshCw className="mx-auto h-7 w-7 animate-spin text-blue-400" />


        <p className="mt-3 text-sm text-slate-400">
          Loading live risk map...
        </p>

      </div>

    </div>

  );
}


/* ========================================================================= */
/* EMPTY                                                                     */
/* ========================================================================= */

function MapEmptyState() {

  return (

    <div className="flex h-[480px] items-center justify-center rounded-2xl border border-white/10 bg-[#10243a]">

      <div className="text-center">

        <AlertTriangle className="mx-auto h-7 w-7 text-slate-600" />


        <p className="mt-3 text-sm font-medium text-slate-300">
          No ward risk data available
        </p>


        <p className="mt-1 text-xs text-slate-600">
          Check the backend connection.
        </p>

      </div>

    </div>

  );
}