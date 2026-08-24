"use client";

import {
  APIProvider,
  AdvancedMarker,
  Map,
  Pin,
} from "@vis.gl/react-google-maps";

import type {
  RiskLevel,
  WardRisk,
} from "@/lib/risk-engine";

import type {
  PropagationForecast,
} from "@/lib/propagation-engine";

import {
  findSaferWard,
  type EvacuationRecommendation,
} from "@/lib/evacuation-engine";

import EvacuationRoute from "@/components/map/EvacuationRoute";

import {
  WARD_DATA,
} from "@/lib/ward-data";


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


type GoogleRiskMapProps = {
  wardRisks:
    WardRisk[];

  backendWards:
    BackendWard[];

  onWardSelect:
    (
      wardRisk: WardRisk
    ) => void;

  selectedWard?:
    string | null;

  propagationForecasts?:
    PropagationForecast[];
};


type LatLng = {
  lat: number;
  lng: number;
};


/* ========================================================================= */
/* CONFIG                                                                    */
/* ========================================================================= */

const BHUBANESWAR = {
  lat:
    20.2961,

  lng:
    85.8245,
};


const LEVEL_COLORS:
  Record<
    RiskLevel,
    string
  > = {

  CRITICAL:
    "#ef4444",

  HIGH:
    "#f97316",

  WATCH:
    "#eab308",

  NORMAL:
    "#22c55e",
};


/* ========================================================================= */
/* COMPONENT                                                                 */
/* ========================================================================= */

export default function GoogleRiskMap({
  wardRisks,
  backendWards,
  onWardSelect,
  selectedWard = null,
  propagationForecasts = [],
}: GoogleRiskMapProps) {

  const apiKey =
    process.env
      .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;


  const mapId =
    process.env
      .NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;


  /* ----------------------------------------------------------------------- */
  /* API KEY CHECK                                                           */
  /* ----------------------------------------------------------------------- */

  if (
    !apiKey
  ) {

    return (
      <div className="flex h-[480px] items-center justify-center rounded-2xl border border-red-500/20 bg-[#10243a] p-6 text-center">

        <div>

          <p className="font-semibold text-red-400">
            Google Maps API key is missing
          </p>


          <p className="mt-2 text-xs text-slate-500">
            Check your .env.local configuration.
          </p>

        </div>

      </div>
    );
  }


  /* ----------------------------------------------------------------------- */
  /* MAP ID CHECK                                                            */
  /* ----------------------------------------------------------------------- */

  if (
    !mapId
  ) {

    return (
      <div className="flex h-[480px] items-center justify-center rounded-2xl border border-yellow-500/20 bg-[#10243a] p-6 text-center">

        <div>

          <p className="font-semibold text-yellow-400">
            Google Maps Map ID is missing
          </p>


          <p className="mt-2 text-xs text-slate-500">
            Add NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID to .env.local.
          </p>

        </div>

      </div>
    );
  }


  /* ----------------------------------------------------------------------- */
  /* PROPAGATION LOOKUP                                                      */
  /* ----------------------------------------------------------------------- */

  const propagationLookup =
    new globalThis.Map<
      string,
      PropagationForecast
    >(
      propagationForecasts.map(
        (
          forecast
        ) => [
          forecast.targetWard,
          forecast,
        ]
      )
    );


  /* ----------------------------------------------------------------------- */
  /* SELECTED WARD                                                           */
  /* ----------------------------------------------------------------------- */

  const selectedRisk =
    selectedWard
      ? wardRisks.find(
          (
            ward
          ) =>
            ward.ward ===
            selectedWard
        ) ?? null
      : null;


  /* ----------------------------------------------------------------------- */
  /* ALL BACKEND COORDINATES                                                 */
  /* ----------------------------------------------------------------------- */

  const backendCoordinates =
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
    );


  /* ----------------------------------------------------------------------- */
  /* EVACUATION RECOMMENDATION                                               */
  /* ----------------------------------------------------------------------- */

  const evacuationRecommendation:
    EvacuationRecommendation | null =

    selectedRisk &&
    (
      selectedRisk.level ===
        "HIGH" ||

      selectedRisk.level ===
        "CRITICAL"
    )

      ? findSaferWard(
          selectedRisk.ward,
          wardRisks,
          backendCoordinates
        )

      : null;


  const recommendedDestination =
    evacuationRecommendation
      ?.recommendedWard ??
    null;


  /* ----------------------------------------------------------------------- */
  /* ORIGIN COORDINATES                                                      */
  /* ----------------------------------------------------------------------- */

  const originPosition =
    selectedRisk
      ? getWardPosition(
          selectedRisk.ward,
          backendWards
        )
      : null;


  /* ----------------------------------------------------------------------- */
  /* DESTINATION COORDINATES                                                 */
  /* ----------------------------------------------------------------------- */

  const destinationPosition =
    recommendedDestination
      ? getWardPosition(
          recommendedDestination.ward,
          backendWards
        )
      : null;


  /* ----------------------------------------------------------------------- */
  /* UI                                                                      */
  /* ----------------------------------------------------------------------- */

  return (

    <div className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-white/10">

      <APIProvider
        apiKey={
          apiKey
        }
      >

        <Map
          defaultCenter={
            BHUBANESWAR
          }

          defaultZoom={
            12
          }

          mapId={
            mapId
          }

          gestureHandling="greedy"

          mapTypeControl={
            false
          }

          streetViewControl={
            false
          }

          fullscreenControl
        >


          {/* =============================================================== */}
          {/* WARD MARKERS                                                    */}
          {/* =============================================================== */}

          {wardRisks.map(
            (
              wardRisk
            ) => {

              const position =
                getWardPosition(
                  wardRisk.ward,
                  backendWards
                );


              if (
                !position
              ) {
                return null;
              }


              const markerColor =
                LEVEL_COLORS[
                  wardRisk.level
                ];


              const propagationForecast =
                propagationLookup.get(
                  wardRisk.ward
                );


              const isSelected =
                selectedWard ===
                wardRisk.ward;


              const isPropagationTarget =
                Boolean(
                  propagationForecast
                );


              const isRecommendedDestination =
                recommendedDestination
                  ?.ward ===
                wardRisk.ward;


              const borderColor =

                isRecommendedDestination
                  ? "#38bdf8"

                  : isSelected
                    ? "#38bdf8"

                    : isPropagationTarget
                      ? "#a855f7"

                      : "#ffffff";


              const markerScale =

                isRecommendedDestination
                  ? 1.7

                  : isSelected
                    ? 1.65

                    : isPropagationTarget
                      ? getPropagationScale(
                          propagationForecast!
                            .probability
                        )

                      : 1.15;


              let title =
                `${wardRisk.ward} • ${wardRisk.level} • Risk ${wardRisk.risk}/100`;


              if (
                propagationForecast
              ) {

                title +=
                  ` • Propagation ${propagationForecast.probability}%`;

              }


              if (
                isRecommendedDestination
              ) {

                title +=
                  " • Recommended safer monitored ward";

              }


              return (

                <AdvancedMarker
                  key={
                    wardRisk.ward
                  }

                  position={
                    position
                  }

                  title={
                    title
                  }

                  onClick={() =>
                    onWardSelect(
                      wardRisk
                    )
                  }

                  zIndex={
                    isRecommendedDestination

                      ? 200

                      : isSelected
                        ? 100

                        : isPropagationTarget
                          ? 50

                          : 1
                  }
                >

                  <div className="relative">


                    {/* ===================================================== */}
                    {/* PROPAGATION PULSE                                     */}
                    {/* ===================================================== */}

                    {isPropagationTarget &&
                      !isRecommendedDestination && (

                      <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-purple-400/60" />

                    )}


                    {/* ===================================================== */}
                    {/* SAFER WARD PULSE                                      */}
                    {/* ===================================================== */}

                    {isRecommendedDestination && (

                      <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-sky-300/70 bg-sky-400/10" />

                    )}


                    {/* ===================================================== */}
                    {/* PIN                                                   */}
                    {/* ===================================================== */}

                    <Pin
                      background={
                        isRecommendedDestination
                          ? "#0ea5e9"
                          : markerColor
                      }

                      borderColor={
                        borderColor
                      }

                      glyphColor="#ffffff"

                      glyph={
                        isRecommendedDestination
                          ? "S"
                          : undefined
                      }

                      scale={
                        markerScale
                      }
                    />


                    {/* ===================================================== */}
                    {/* PROPAGATION %                                         */}
                    {/* ===================================================== */}

                    {propagationForecast &&
                      !isRecommendedDestination && (

                      <span className="absolute -right-6 -top-3 rounded-md border border-purple-400/30 bg-[#07111f]/95 px-1.5 py-0.5 text-[9px] font-bold text-purple-300 shadow-lg">

                        {
                          propagationForecast
                            .probability
                        }
                        %

                      </span>

                    )}


                    {/* ===================================================== */}
                    {/* SAFER WARD LABEL                                      */}
                    {/* ===================================================== */}

                    {isRecommendedDestination && (

                      <span className="absolute left-1/2 top-12 -translate-x-1/2 whitespace-nowrap rounded-md border border-sky-400/30 bg-[#07111f]/95 px-2 py-1 text-[9px] font-bold text-sky-300 shadow-lg">

                        Safer Ward{" "}
                        {
                          wardRisk.ward
                        }

                      </span>

                    )}

                  </div>

                </AdvancedMarker>

              );
            }
          )}


          {/* =============================================================== */}
          {/* EVACUATION ROUTE                                                */}
          {/* =============================================================== */}

          <EvacuationRoute
            origin={
              originPosition
            }

            destination={
              destinationPosition
            }

            originWard={
              selectedRisk
                ?.ward ??
              null
            }

            destinationWard={
              recommendedDestination
                ?.ward ??
              null
            }
          />

        </Map>

      </APIProvider>


      {/* =================================================================== */}
      {/* LIVE BACKEND INDICATOR                                              */}
      {/* =================================================================== */}

      <div className="absolute right-4 top-4 rounded-lg border border-white/10 bg-[#07111f]/90 px-3 py-2 text-xs shadow-xl backdrop-blur">

        <div className="flex items-center gap-2">

          <span
            className={`h-2 w-2 rounded-full ${
              backendWards.length >
              0
                ? "bg-emerald-400"
                : "bg-yellow-400"
            }`}
          />


          <span className="text-slate-300">

            {
              backendWards.length >
              0

                ? `${backendWards.length} wards connected`

                : "Fallback coordinates"
            }

          </span>

        </div>


        {selectedWard && (

          <div className="mt-2 border-t border-white/10 pt-2">

            <p className="text-[10px] text-purple-300">
              Propagation Forecast Active
            </p>


            <p className="mt-0.5 text-[9px] text-slate-600">

              {
                propagationForecasts.length
              }{" "}
              neighbouring wards evaluated

            </p>

          </div>

        )}

      </div>


      {/* =================================================================== */}
      {/* SAFER WARD PANEL                                                    */}
      {/* =================================================================== */}

      {selectedRisk &&
        (
          selectedRisk.level ===
            "HIGH" ||

          selectedRisk.level ===
            "CRITICAL"
        ) && (

        <div className="absolute bottom-4 right-4 w-[285px] rounded-xl border border-sky-400/20 bg-[#07111f]/95 p-4 text-xs shadow-2xl backdrop-blur">

          <div className="flex items-center justify-between gap-3">

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                Safer Ward Recommendation
              </p>


              <p className="mt-1 text-[9px] text-slate-600">
                Decision-support guidance
              </p>

            </div>


            <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[9px] font-bold text-sky-300 ring-1 ring-sky-400/20">
              ROUTING
            </span>

          </div>


          {recommendedDestination ? (

            <>

              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">

                <div className="flex items-end justify-between gap-3">

                  <div>

                    <p className="text-[9px] uppercase tracking-wider text-slate-600">
                      Recommended
                    </p>


                    <p className="mt-1 text-lg font-bold text-white">
                      {
                        recommendedDestination.ward
                      }
                    </p>

                  </div>


                  <div className="text-right">

                    <p
                      className={
                        recommendedDestination.level ===
                        "NORMAL"

                          ? "text-[10px] font-semibold text-emerald-400"

                          : "text-[10px] font-semibold text-yellow-400"
                      }
                    >

                      {
                        recommendedDestination.level
                      }

                    </p>


                    <p className="mt-0.5 text-[10px] text-slate-500">

                      Risk{" "}
                      {
                        recommendedDestination.risk
                      }
                      /100

                    </p>

                  </div>

                </div>


                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">

                  <span className="text-slate-500">
                    Approx. distance
                  </span>


                  <span className="font-semibold text-slate-200">

                    {
                      recommendedDestination.distanceKm
                    }{" "}
                    km

                  </span>

                </div>

              </div>


              <p className="mt-3 text-[10px] leading-4 text-slate-500">

                {
                  evacuationRecommendation
                    ?.reason
                }

              </p>


              {/* =========================================================== */}
              {/* ALTERNATIVES                                                */}
              {/* =========================================================== */}

              {evacuationRecommendation &&
                evacuationRecommendation
                  .alternatives.length >
                  0 && (

                <div className="mt-3">

                  <p className="text-[9px] uppercase tracking-wider text-slate-600">
                    Alternatives
                  </p>


                  <div className="mt-2 flex flex-wrap gap-1.5">

                    {
                      evacuationRecommendation
                        .alternatives
                        .map(
                          (
                            candidate
                          ) => (

                          <span
                            key={
                              candidate.ward
                            }

                            className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] text-slate-400"
                          >

                            {
                              candidate.ward
                            }
                            {" • "}
                            {
                              candidate.level
                            }
                            {" • "}
                            {
                              candidate.distanceKm
                            }
                            {" km"}

                          </span>

                        )
                      )
                    }

                  </div>

                </div>

              )}


              <p className="mt-3 border-t border-white/5 pt-3 text-[9px] leading-4 text-slate-600">

                This identifies a lower-risk monitored ward, not a guaranteed safe evacuation route. Follow official instructions and current road conditions.

              </p>

            </>

          ) : (

            <div className="mt-3 rounded-lg border border-yellow-500/15 bg-yellow-500/[0.05] p-3">

              <p className="font-medium text-yellow-300">
                No nearby lower-risk ward identified
              </p>


              <p className="mt-1 text-[10px] leading-4 text-slate-500">

                Follow official evacuation instructions and emergency response guidance.

              </p>

            </div>

          )}

        </div>

      )}


      {/* =================================================================== */}
      {/* LEGEND                                                              */}
      {/* =================================================================== */}

      <RiskLegend
        showPropagation={
          propagationForecasts.length >
          0
        }

        showEvacuation={
          Boolean(
            recommendedDestination
          )
        }
      />

    </div>
  );
}


/* ========================================================================= */
/* WARD POSITION                                                             */
/* ========================================================================= */

function getWardPosition(
  wardId: string,
  backendWards: BackendWard[]
): LatLng | null {

  const backendWard =
    backendWards.find(
      (
        ward
      ) =>
        ward.ward ===
        wardId
    );


  if (
    backendWard &&
    Number.isFinite(
      backendWard.latitude
    ) &&
    Number.isFinite(
      backendWard.longitude
    )
  ) {

    return {
      lat:
        backendWard.latitude,

      lng:
        backendWard.longitude,
    };

  }


  const fallbackWard =
    WARD_DATA[
      wardId
    ];


  if (
    fallbackWard
  ) {

    return {
      lat:
        fallbackWard.latitude,

      lng:
        fallbackWard.longitude,
    };

  }


  return null;
}


/* ========================================================================= */
/* PROPAGATION SCALE                                                         */
/* ========================================================================= */

function getPropagationScale(
  probability:
    number
): number {

  if (
    probability >=
    75
  ) {
    return 1.55;
  }


  if (
    probability >=
    55
  ) {
    return 1.45;
  }


  if (
    probability >=
    30
  ) {
    return 1.35;
  }


  return 1.25;
}


/* ========================================================================= */
/* MAP LEGEND                                                                */
/* ========================================================================= */

function RiskLegend({
  showPropagation,
  showEvacuation,
}: {
  showPropagation:
    boolean;

  showEvacuation:
    boolean;
}) {

  return (

    <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-[#07111f]/90 px-4 py-3 text-xs text-slate-300 shadow-xl backdrop-blur">

      <p className="mb-2 font-semibold text-white">
        Risk Level
      </p>


      <div className="space-y-1.5">

        <LegendItem
          color="#ef4444"
          label="Critical"
        />


        <LegendItem
          color="#f97316"
          label="High"
        />


        <LegendItem
          color="#eab308"
          label="Watch"
        />


        <LegendItem
          color="#22c55e"
          label="Normal"
        />


        {showPropagation && (

          <LegendItem
            color="#a855f7"
            label="Propagation Target"
          />

        )}


        {showEvacuation && (

          <LegendItem
            color="#0ea5e9"
            label="Safer Ward"
          />

        )}

      </div>

    </div>

  );
}


/* ========================================================================= */
/* LEGEND ITEM                                                               */
/* ========================================================================= */

function LegendItem({
  color,
  label,
}: {
  color:
    string;

  label:
    string;
}) {

  return (

    <div className="flex items-center gap-2">

      <span
        className="h-2.5 w-2.5 rounded-full"

        style={{
          backgroundColor:
            color,
        }}
      />


      <span>
        {
          label
        }
      </span>

    </div>

  );
}