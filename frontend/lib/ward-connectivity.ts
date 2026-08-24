/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

export type WardCoordinate = {
  ward: string;

  latitude: number;

  longitude: number;
};

export type WardConnection = {
  ward: string;

  distanceKm: number;

  proximityWeight: number;
};

export type WardConnectivityGraph =
  Record<
    string,
    WardConnection[]
  >;


/* ========================================================================= */
/* CONFIGURATION                                                             */
/* ========================================================================= */

/*
 * Maximum geographic distance in which
 * another ward can be considered a
 * propagation neighbour.
 */

const MAX_NEIGHBOUR_DISTANCE_KM =
  3.5;


/*
 * Prevent one ward from connecting to
 * half the city.
 */

const MAX_NEIGHBOURS =
  5;


/* ========================================================================= */
/* HAVERSINE DISTANCE                                                        */
/* ========================================================================= */

function calculateDistanceKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
): number {

  const EARTH_RADIUS_KM =
    6371;


  const latitudeDifference =
    degreesToRadians(
      latitude2 -
      latitude1
    );


  const longitudeDifference =
    degreesToRadians(
      longitude2 -
      longitude1
    );


  const firstLatitude =
    degreesToRadians(
      latitude1
    );


  const secondLatitude =
    degreesToRadians(
      latitude2
    );


  const a =
    Math.sin(
      latitudeDifference /
        2
    ) **
      2 +
    Math.cos(
      firstLatitude
    ) *
      Math.cos(
        secondLatitude
      ) *
      Math.sin(
        longitudeDifference /
          2
      ) **
        2;


  const c =
    2 *
    Math.atan2(
      Math.sqrt(
        a
      ),
      Math.sqrt(
        1 -
          a
      )
    );


  return (
    EARTH_RADIUS_KM *
    c
  );
}


/* ========================================================================= */
/* DEGREES → RADIANS                                                         */
/* ========================================================================= */

function degreesToRadians(
  degrees: number
): number {

  return (
    degrees *
    (
      Math.PI /
      180
    )
  );
}


/* ========================================================================= */
/* PROXIMITY WEIGHT                                                          */
/* ========================================================================= */

/*
 * Nearby wards receive a stronger
 * propagation connection.
 *
 * Example:
 *
 * 0 km   → ~1.0
 * 1 km   → high
 * 2 km   → medium
 * 3.5 km → near zero
 */

function calculateProximityWeight(
  distanceKm: number
): number {

  const normalized =
    1 -
    (
      distanceKm /
      MAX_NEIGHBOUR_DISTANCE_KM
    );


  return Math.max(
    0,
    Math.min(
      1,
      normalized
    )
  );
}


/* ========================================================================= */
/* BUILD CONNECTIVITY GRAPH                                                  */
/* ========================================================================= */

export function buildWardConnectivity(
  wards:
    WardCoordinate[]
): WardConnectivityGraph {

  const graph:
    WardConnectivityGraph =
    {};


  for (
    const sourceWard
    of wards
  ) {

    const possibleConnections:
      WardConnection[] =
      [];


    for (
      const targetWard
      of wards
    ) {

      /*
       * A ward obviously cannot
       * propagate into itself.
       */

      if (
        sourceWard.ward ===
        targetWard.ward
      ) {
        continue;
      }


      const distanceKm =
        calculateDistanceKm(

          sourceWard.latitude,

          sourceWard.longitude,

          targetWard.latitude,

          targetWard.longitude
        );


      if (
        distanceKm >
        MAX_NEIGHBOUR_DISTANCE_KM
      ) {
        continue;
      }


      possibleConnections.push({

        ward:
          targetWard.ward,

        distanceKm:
          Number(
            distanceKm.toFixed(
              2
            )
          ),

        proximityWeight:
          Number(
            calculateProximityWeight(
              distanceKm
            ).toFixed(
              3
            )
          ),

      });
    }


    /*
     * Closest wards first.
     */

    possibleConnections.sort(
      (
        first,
        second
      ) =>
        first.distanceKm -
        second.distanceKm
    );


    /*
     * Keep only the strongest
     * geographic relationships.
     */

    graph[
      sourceWard.ward
    ] =
      possibleConnections.slice(
        0,
        MAX_NEIGHBOURS
      );
  }


  return graph;
}


/* ========================================================================= */
/* GET NEIGHBOURS                                                            */
/* ========================================================================= */

export function getWardNeighbours(
  graph:
    WardConnectivityGraph,

  ward:
    string
): WardConnection[] {

  return (
    graph[
      ward
    ] ??
    []
  );
}