import { WARD_DATA } from "@/lib/ward-data";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

export type WardCoordinate = {
  ward: string;
  latitude: number;
  longitude: number;
};


export type DetectedWard = {
  ward: string;

  latitude: number;

  longitude: number;

  distanceKm: number;

  source:
    | "BACKEND"
    | "FALLBACK";
};


/* ========================================================================= */
/* DISTANCE                                                                  */
/* ========================================================================= */

/*
 * Calculates straight-line distance
 * between two GPS coordinates using
 * the Haversine formula.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {

  const earthRadiusKm =
    6371;


  const toRadians = (
    degrees: number
  ) =>
    (
      degrees *
      Math.PI
    ) /
    180;


  const dLat =
    toRadians(
      lat2 -
      lat1
    );


  const dLon =
    toRadians(
      lon2 -
      lon1
    );


  const firstLatitude =
    toRadians(
      lat1
    );


  const secondLatitude =
    toRadians(
      lat2
    );


  const a =
    Math.sin(
      dLat / 2
    ) ** 2 +
    Math.cos(
      firstLatitude
    ) *
      Math.cos(
        secondLatitude
      ) *
      Math.sin(
        dLon / 2
      ) ** 2;


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
    earthRadiusKm *
    c
  );
}


/* ========================================================================= */
/* BACKEND DETECTION                                                         */
/* ========================================================================= */

/*
 * Finds the nearest ward from a full
 * list of ward coordinates.
 *
 * This should be the primary method
 * because /api/wards contains all 67
 * Bhubaneswar wards.
 */
export function findNearestWardFromCoordinates(
  latitude: number,
  longitude: number,
  wards: WardCoordinate[]
): DetectedWard | null {

  if (
    wards.length ===
    0
  ) {
    return null;
  }


  let nearestWard:
    DetectedWard | null =
    null;


  for (
    const ward
    of wards
  ) {

    /*
     * Ignore invalid coordinates rather
     * than letting one broken backend
     * record ruin location detection.
     */
    if (
      !Number.isFinite(
        ward.latitude
      ) ||
      !Number.isFinite(
        ward.longitude
      )
    ) {
      continue;
    }


    const distanceKm =
      calculateDistance(
        latitude,
        longitude,
        ward.latitude,
        ward.longitude
      );


    if (
      !nearestWard ||
      distanceKm <
        nearestWard.distanceKm
    ) {

      nearestWard = {

        ward:
          ward.ward,

        latitude:
          ward.latitude,

        longitude:
          ward.longitude,

        distanceKm,

        source:
          "BACKEND",
      };

    }
  }


  return nearestWard;
}


/* ========================================================================= */
/* FALLBACK DETECTION                                                        */
/* ========================================================================= */

/*
 * Uses local ward-data.ts when the
 * backend is unavailable.
 *
 * This data may not contain all 67
 * wards, so it should only be fallback.
 */
export function findNearestWardFromFallback(
  latitude: number,
  longitude: number
): DetectedWard | null {

  let nearestWard:
    DetectedWard | null =
    null;


  for (
    const [
      ward,
      data,
    ]
    of Object.entries(
      WARD_DATA
    )
  ) {

    const distanceKm =
      calculateDistance(
        latitude,
        longitude,
        data.latitude,
        data.longitude
      );


    if (
      !nearestWard ||
      distanceKm <
        nearestWard.distanceKm
    ) {

      nearestWard = {

        ward,

        latitude:
          data.latitude,

        longitude:
          data.longitude,

        distanceKm,

        source:
          "FALLBACK",
      };

    }
  }


  return nearestWard;
}


/* ========================================================================= */
/* MAIN DETECTOR                                                             */
/* ========================================================================= */

/*
 * Primary public helper.
 *
 * If backend ward coordinates are
 * supplied, all 67 wards are evaluated.
 *
 * If backend data is missing, PRAVAAH
 * automatically falls back to WARD_DATA.
 */
export function findNearestWard(
  latitude: number,
  longitude: number,
  backendWards: WardCoordinate[] = []
): DetectedWard | null {

  const backendResult =
    findNearestWardFromCoordinates(
      latitude,
      longitude,
      backendWards
    );


  if (
    backendResult
  ) {
    return backendResult;
  }


  return (
    findNearestWardFromFallback(
      latitude,
      longitude
    )
  );
}