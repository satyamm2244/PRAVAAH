"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type LatLng = {
  lat: number;
  lng: number;
};


type EvacuationRouteProps = {
  origin:
    LatLng | null;

  destination:
    LatLng | null;

  originWard:
    string | null;

  destinationWard:
    string | null;
};


type RouteInfo = {
  distance:
    string;

  duration:
    string;
};


/* ========================================================================= */
/* COMPONENT                                                                 */
/* ========================================================================= */

export default function EvacuationRoute({
  origin,
  destination,
  originWard,
  destinationWard,
}: EvacuationRouteProps) {

  const map =
    useMap();


  const routesLibrary =
    useMapsLibrary(
      "routes"
    );


  const rendererRef =
    useRef<
      google.maps.DirectionsRenderer | null
    >(
      null
    );


  const [
    routeInfo,
    setRouteInfo,
  ] =
    useState<
      RouteInfo | null
    >(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );


  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );


  /* ========================================================================= */
  /* ROUTE CALCULATION                                                         */
  /* ========================================================================= */

  useEffect(
    () => {

      if (
        !map ||
        !routesLibrary ||
        !origin ||
        !destination
      ) {

        return;

      }


      /*
       * Store non-null values locally.
       *
       * TypeScript does not preserve
       * React-hook null checks across
       * an async function boundary.
       */

      const currentMap =
        map;


      const currentRoutesLibrary =
        routesLibrary;


      const currentOrigin =
        origin;


      const currentDestination =
        destination;


      let cancelled =
        false;


      /* ===================================================================== */
      /* CALCULATE                                                             */
      /* ===================================================================== */

      async function calculateRoute() {

        setLoading(
          true
        );


        setError(
          null
        );


        setRouteInfo(
          null
        );


        try {

          /* ================================================================= */
          /* REMOVE PREVIOUS ROUTE                                             */
          /* ================================================================= */

          if (
            rendererRef.current
          ) {

            rendererRef.current.setMap(
              null
            );


            rendererRef.current =
              null;

          }


          /* ================================================================= */
          /* DIRECTIONS SERVICE                                                */
          /* ================================================================= */

          const directionsService =
            new currentRoutesLibrary.DirectionsService();


          /* ================================================================= */
          /* DIRECTIONS RENDERER                                               */
          /* ================================================================= */

          const directionsRenderer =
            new currentRoutesLibrary.DirectionsRenderer({
              map:
                currentMap,

              suppressMarkers:
                false,

              preserveViewport:
                false,

              polylineOptions: {
                strokeColor:
                  "#0ea5e9",

                strokeOpacity:
                  0.9,

                strokeWeight:
                  6,

                zIndex:
                  500,
              },
            });


          rendererRef.current =
            directionsRenderer;


          /* ================================================================= */
          /* ROUTE REQUEST                                                     */
          /* ================================================================= */

          const result =
            await directionsService.route({

              origin: {
                lat:
                  currentOrigin.lat,

                lng:
                  currentOrigin.lng,
              },


              destination: {
                lat:
                  currentDestination.lat,

                lng:
                  currentDestination.lng,
              },


              travelMode:
                google.maps.TravelMode.DRIVING,


              provideRouteAlternatives:
                false,

            });


          /* ================================================================= */
          /* COMPONENT CLEANED UP                                              */
          /* ================================================================= */

          if (
            cancelled
          ) {

            return;

          }


          /* ================================================================= */
          /* VALIDATE ROUTES                                                   */
          /* ================================================================= */

          if (
            !result.routes ||
            result.routes.length ===
              0
          ) {

            throw new Error(
              "No driving route was found between these wards."
            );

          }


          /* ================================================================= */
          /* DRAW ROUTE                                                        */
          /* ================================================================= */

          directionsRenderer.setDirections(
            result
          );


          /* ================================================================= */
          /* ROUTE + LEG                                                       */
          /* ================================================================= */

          const route =
            result.routes[
              0
            ];


          const leg =
            route.legs?.[
              0
            ];


          if (
            !leg
          ) {

            throw new Error(
              "Route information is unavailable."
            );

          }


          /* ================================================================= */
          /* DISTANCE                                                          */
          /* ================================================================= */

          let distance =
            "Unknown";


          if (
            leg.distance?.text
          ) {

            distance =
              leg.distance.text;

          } else if (
            typeof leg.distance?.value ===
            "number"
          ) {

            distance =
              formatDistance(
                leg.distance.value
              );

          }


          /* ================================================================= */
          /* DURATION                                                          */
          /* ================================================================= */

          let duration =
            "Unknown";


          if (
            leg.duration?.text
          ) {

            duration =
              leg.duration.text;

          } else if (
            typeof leg.duration?.value ===
            "number"
          ) {

            duration =
              formatDurationSeconds(
                leg.duration.value
              );

          }


          /* ================================================================= */
          /* SAVE DATA                                                         */
          /* ================================================================= */

          setRouteInfo({
            distance,
            duration,
          });


          console.log(
            "PRAVAAH evacuation route:",
            {
              originWard,

              destinationWard,

              distance,

              duration,

              distanceMeters:
                leg.distance?.value,

              durationSeconds:
                leg.duration?.value,
            }
          );


        } catch (
          routeError
        ) {

          console.error(
            "PRAVAAH route error:",
            routeError
          );


          if (
            cancelled
          ) {

            return;

          }


          setRouteInfo(
            null
          );


          if (
            rendererRef.current
          ) {

            rendererRef.current.setMap(
              null
            );


            rendererRef.current =
              null;

          }


          setError(
            routeError instanceof Error
              ? routeError.message
              : "Unable to calculate evacuation route."
          );


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


      calculateRoute();


      /* ===================================================================== */
      /* CLEANUP                                                               */
      /* ===================================================================== */

      return () => {

        cancelled =
          true;


        if (
          rendererRef.current
        ) {

          rendererRef.current.setMap(
            null
          );


          rendererRef.current =
            null;

        }

      };

    },
    [
      map,
      routesLibrary,
      origin,
      destination,
      originWard,
      destinationWard,
    ]
  );


  /* ========================================================================= */
  /* NO ROUTE REQUEST                                                          */
  /* ========================================================================= */

  if (
    !origin ||
    !destination ||
    !originWard ||
    !destinationWard
  ) {

    return null;

  }


  /* ========================================================================= */
  /* LOADING                                                                   */
  /* ========================================================================= */

  if (
    loading
  ) {

    return (

      <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-sky-400/20 bg-[#07111f]/95 px-4 py-2.5 text-[10px] text-slate-400 shadow-xl backdrop-blur">

        Calculating safer road route...

      </div>

    );

  }


  /* ========================================================================= */
  /* ERROR                                                                     */
  /* ========================================================================= */

  if (
    error
  ) {

    return (

      <div className="absolute bottom-4 left-1/2 z-20 w-[270px] -translate-x-1/2 rounded-xl border border-yellow-500/20 bg-[#07111f]/95 p-3 shadow-xl backdrop-blur">

        <p className="text-[10px] font-semibold uppercase tracking-wider text-yellow-400">

          Route unavailable

        </p>


        <p className="mt-2 text-[10px] leading-4 text-slate-500">

          {
            error
          }

        </p>


        <p className="mt-2 border-t border-white/5 pt-2 text-[9px] leading-4 text-slate-600">

          PRAVAAH can still recommend a lower-risk monitored ward,
          but road routing could not be calculated.

        </p>

      </div>

    );

  }


  /* ========================================================================= */
  /* NO ROUTE INFO                                                             */
  /* ========================================================================= */

  if (
    !routeInfo
  ) {

    return null;

  }


  /* ========================================================================= */
  /* ROUTE INFORMATION                                                         */
  /* ========================================================================= */

  return (

    <div className="absolute bottom-4 left-1/2 z-20 w-[260px] -translate-x-1/2 rounded-xl border border-sky-400/20 bg-[#07111f]/95 p-3 text-xs shadow-2xl backdrop-blur">


      {/* =================================================================== */}
      {/* TITLE                                                               */}
      {/* =================================================================== */}

      <div className="flex items-center justify-between gap-3">

        <div>

          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">

            Evacuation Route

          </p>


          <p className="mt-1 text-[9px] text-slate-600">

            Google Maps • Driving

          </p>

        </div>


        <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[9px] font-bold text-sky-300 ring-1 ring-sky-400/20">

          LIVE ROUTE

        </span>

      </div>


      {/* =================================================================== */}
      {/* ORIGIN → DESTINATION                                                */}
      {/* =================================================================== */}

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] p-3">

        <div>

          <p className="text-[9px] uppercase tracking-wider text-slate-600">

            From

          </p>


          <p className="mt-1 font-semibold text-white">

            {
              originWard
            }

          </p>

        </div>


        <div className="text-lg text-sky-400">

          →

        </div>


        <div className="text-right">

          <p className="text-[9px] uppercase tracking-wider text-slate-600">

            Recommended

          </p>


          <p className="mt-1 font-semibold text-sky-300">

            {
              destinationWard
            }

          </p>

        </div>

      </div>


      {/* =================================================================== */}
      {/* METRICS                                                             */}
      {/* =================================================================== */}

      <div className="mt-3 grid grid-cols-2 gap-2">

        <div className="rounded-lg bg-white/[0.03] p-2.5">

          <p className="text-[9px] uppercase tracking-wider text-slate-600">

            Road Distance

          </p>


          <p className="mt-1 font-semibold text-slate-200">

            {
              routeInfo.distance
            }

          </p>

        </div>


        <div className="rounded-lg bg-white/[0.03] p-2.5">

          <p className="text-[9px] uppercase tracking-wider text-slate-600">

            Est. Time

          </p>


          <p className="mt-1 font-semibold text-slate-200">

            {
              routeInfo.duration
            }

          </p>

        </div>

      </div>


      {/* =================================================================== */}
      {/* DISCLAIMER                                                          */}
      {/* =================================================================== */}

      <p className="mt-3 border-t border-white/5 pt-2 text-[9px] leading-4 text-slate-600">

        Decision-support route only. Road availability may change during
        disasters. Follow official evacuation orders and current emergency
        instructions.

      </p>

    </div>

  );

}


/* ========================================================================= */
/* DISTANCE FORMATTER                                                        */
/* ========================================================================= */

function formatDistance(
  meters:
    number
): string {

  if (
    meters <
    1000
  ) {

    return `${Math.round(
      meters
    )} m`;

  }


  return `${(
    meters /
    1000
  ).toFixed(
    1
  )} km`;

}


/* ========================================================================= */
/* DURATION FORMATTER                                                        */
/* ========================================================================= */

function formatDurationSeconds(
  seconds:
    number
): string {

  const totalMinutes =
    Math.max(
      1,
      Math.round(
        seconds /
        60
      )
    );


  if (
    totalMinutes <
    60
  ) {

    return `${totalMinutes} min`;

  }


  const hours =
    Math.floor(
      totalMinutes /
      60
    );


  const minutes =
    totalMinutes %
    60;


  if (
    minutes ===
    0
  ) {

    return `${hours} hr`;

  }


  return `${hours} hr ${minutes} min`;

}