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
};


/*
 * Maximum reasonable distance from a
 * monitored ward before PRAVAAH considers
 * the citizen outside the coverage area.
 */

const MAX_COVERAGE_DISTANCE_KM =
  15;


/* ========================================================================= */
/* DISTANCE                                                                  */
/* ========================================================================= */

function calculateDistanceKm(
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


  const a =
    Math.sin(
      dLat / 2
    ) ** 2 +

    Math.cos(
      toRadians(
        lat1
      )
    ) *

    Math.cos(
      toRadians(
        lat2
      )
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
        1 - a
      )
    );


  return (
    earthRadiusKm *
    c
  );
}


/* ========================================================================= */
/* FIND NEAREST WARD                                                         */
/* ========================================================================= */

export function findNearestWard(
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
      calculateDistanceKm(
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

        distanceKm:
          Number(
            distanceKm.toFixed(
              2
            )
          ),
      };

    }

  }


  return nearestWard;
}


/* ========================================================================= */
/* COVERAGE CHECK                                                            */
/* ========================================================================= */

export function isInsidePravaahCoverage(
  detectedWard:
    DetectedWard | null
): boolean {

  if (
    !detectedWard
  ) {
    return false;
  }


  return (
    detectedWard.distanceKm <=
    MAX_COVERAGE_DISTANCE_KM
  );
}