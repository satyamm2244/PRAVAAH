import {
  WARD_DATA,
} from "@/lib/ward-data";

import type {
  RiskLevel,
  WardRisk,
} from "@/lib/risk-engine";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

export type WardCoordinate = {
  ward: string;

  latitude: number;

  longitude: number;
};


export type EvacuationCandidate = {
  ward: string;

  risk: number;

  level: RiskLevel;

  distanceKm: number;

  latitude: number;

  longitude: number;

  suitabilityScore: number;

  source:
    | "BACKEND"
    | "FALLBACK";
};


export type EvacuationRecommendation = {
  currentWard: string;

  currentRisk: number;

  currentLevel: RiskLevel;

  recommendedWard:
    | EvacuationCandidate
    | null;

  alternatives:
    EvacuationCandidate[];

  reason: string;
};


/* ========================================================================= */
/* CONFIGURATION                                                             */
/* ========================================================================= */

/*
 * Maximum straight-line distance used
 * when searching for a lower-risk ward.
 *
 * Road distance will be calculated later
 * through the Google Routes API.
 */

const MAX_SEARCH_DISTANCE_KM =
  15;


/*
 * PRAVAAH will never recommend HIGH or
 * CRITICAL wards as evacuation targets.
 */

const ALLOWED_DESTINATION_LEVELS:
  RiskLevel[] = [
    "NORMAL",
    "WATCH",
  ];


/*
 * WATCH destinations must also have a
 * meaningfully lower numeric risk than
 * the source ward.
 */

const MINIMUM_RISK_REDUCTION =
  8;


/* ========================================================================= */
/* DISTANCE                                                                  */
/* ========================================================================= */

export function calculateDistanceKm(
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
/* POSITION LOOKUP                                                           */
/* ========================================================================= */

/*
 * Prefer backend coordinates because they
 * contain all 67 wards.
 *
 * WARD_DATA remains a fallback only.
 */

function getWardCoordinate(
  wardId: string,
  backendCoordinates:
    WardCoordinate[]
): {
  latitude: number;

  longitude: number;

  source:
    | "BACKEND"
    | "FALLBACK";
} | null {

  const backendWard =
    backendCoordinates.find(
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
      latitude:
        backendWard.latitude,

      longitude:
        backendWard.longitude,

      source:
        "BACKEND",
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
      latitude:
        fallbackWard.latitude,

      longitude:
        fallbackWard.longitude,

      source:
        "FALLBACK",
    };

  }


  return null;
}


/* ========================================================================= */
/* SUITABILITY                                                               */
/* ========================================================================= */

function calculateSuitability(
  sourceRisk: number,
  candidateRisk: number,
  candidateLevel: RiskLevel,
  distanceKm: number
): number {

  /*
   * How much safer is the destination?
   */

  const riskReduction =
    sourceRisk -
    candidateRisk;


  /*
   * Absolute safety also matters.
   */

  const safetyScore =
    100 -
    candidateRisk;


  /*
   * Nearby destinations are preferable,
   * but safety matters more than shaving
   * 500 metres off the journey.
   */

  const distancePenalty =
    distanceKm *
    2.5;


  /*
   * Prefer NORMAL wards strongly.
   */

  const levelBonus =
    candidateLevel ===
      "NORMAL"
      ? 30
      : 5;


  return Math.round(
    safetyScore +
      riskReduction *
        1.5 +
      levelBonus -
      distancePenalty
  );
}


/* ========================================================================= */
/* SAFE-ZONE ENGINE                                                          */
/* ========================================================================= */

export function findSaferWard(
  currentWard: string,
  wardRisks: WardRisk[],
  backendCoordinates:
    WardCoordinate[] = []
): EvacuationRecommendation | null {

  /* ----------------------------------------------------------------------- */
  /* CURRENT RISK                                                            */
  /* ----------------------------------------------------------------------- */

  const currentRisk =
    wardRisks.find(
      (
        ward
      ) =>
        ward.ward ===
        currentWard
    );


  if (
    !currentRisk
  ) {
    return null;
  }


  /* ----------------------------------------------------------------------- */
  /* CURRENT POSITION                                                        */
  /* ----------------------------------------------------------------------- */

  const currentPosition =
    getWardCoordinate(
      currentWard,
      backendCoordinates
    );


  if (
    !currentPosition
  ) {

    return {
      currentWard,

      currentRisk:
        currentRisk.risk,

      currentLevel:
        currentRisk.level,

      recommendedWard:
        null,

      alternatives:
        [],

      reason:
        "PRAVAAH could not determine the coordinates of the selected ward.",
    };

  }


  /* ----------------------------------------------------------------------- */
  /* NORMAL SOURCE                                                           */
  /* ----------------------------------------------------------------------- */

  if (
    currentRisk.level ===
    "NORMAL"
  ) {

    return {
      currentWard,

      currentRisk:
        currentRisk.risk,

      currentLevel:
        currentRisk.level,

      recommendedWard:
        null,

      alternatives:
        [],

      reason:
        "The selected ward is currently classified as NORMAL. No ward-level evacuation recommendation is required.",
    };

  }


  /* ----------------------------------------------------------------------- */
  /* BUILD CANDIDATES                                                        */
  /* ----------------------------------------------------------------------- */

  const candidates:
    EvacuationCandidate[] =
    [];


  for (
    const candidateRisk
    of wardRisks
  ) {

    /* --------------------------------------------------------------- */
    /* SAME WARD                                                       */
    /* --------------------------------------------------------------- */

    if (
      candidateRisk.ward ===
      currentWard
    ) {
      continue;
    }


    /* --------------------------------------------------------------- */
    /* REJECT HIGH / CRITICAL                                          */
    /* --------------------------------------------------------------- */

    if (
      !ALLOWED_DESTINATION_LEVELS.includes(
        candidateRisk.level
      )
    ) {
      continue;
    }


    /* --------------------------------------------------------------- */
    /* DESTINATION MUST ACTUALLY BE SAFER                              */
    /* --------------------------------------------------------------- */

    if (
      candidateRisk.risk >=
      currentRisk.risk
    ) {
      continue;
    }


    /*
     * NORMAL wards are accepted whenever
     * their risk is lower.
     *
     * WATCH wards require a meaningful
     * numeric improvement.
     */

    if (
      candidateRisk.level ===
        "WATCH" &&
      (
        currentRisk.risk -
        candidateRisk.risk
      ) <
        MINIMUM_RISK_REDUCTION
    ) {
      continue;
    }


    /* --------------------------------------------------------------- */
    /* POSITION                                                        */
    /* --------------------------------------------------------------- */

    const candidatePosition =
      getWardCoordinate(
        candidateRisk.ward,
        backendCoordinates
      );


    if (
      !candidatePosition
    ) {
      continue;
    }


    /* --------------------------------------------------------------- */
    /* DISTANCE                                                        */
    /* --------------------------------------------------------------- */

    const distanceKm =
      calculateDistanceKm(
        currentPosition.latitude,
        currentPosition.longitude,
        candidatePosition.latitude,
        candidatePosition.longitude
      );


    if (
      distanceKm >
      MAX_SEARCH_DISTANCE_KM
    ) {
      continue;
    }


    /* --------------------------------------------------------------- */
    /* SUITABILITY                                                     */
    /* --------------------------------------------------------------- */

    const suitabilityScore =
      calculateSuitability(
        currentRisk.risk,
        candidateRisk.risk,
        candidateRisk.level,
        distanceKm
      );


    candidates.push({
      ward:
        candidateRisk.ward,

      risk:
        candidateRisk.risk,

      level:
        candidateRisk.level,

      distanceKm:
        Number(
          distanceKm.toFixed(
            2
          )
        ),

      latitude:
        candidatePosition.latitude,

      longitude:
        candidatePosition.longitude,

      suitabilityScore,

      source:
        candidatePosition.source,
    });
  }


  /* ----------------------------------------------------------------------- */
  /* NO CANDIDATES                                                           */
  /* ----------------------------------------------------------------------- */

  if (
    candidates.length ===
    0
  ) {

    return {
      currentWard,

      currentRisk:
        currentRisk.risk,

      currentLevel:
        currentRisk.level,

      recommendedWard:
        null,

      alternatives:
        [],

      reason:
        "No sufficiently lower-risk monitored ward was identified within 15 km. PRAVAAH recommends following official evacuation instructions rather than suggesting an unsafe destination.",
    };

  }


  /* ----------------------------------------------------------------------- */
  /* SORT                                                                     */
  /* ----------------------------------------------------------------------- */

  candidates.sort(
    (
      a,
      b
    ) => {

      /*
       * NORMAL always beats WATCH.
       */

      if (
        a.level ===
          "NORMAL" &&
        b.level !==
          "NORMAL"
      ) {
        return -1;
      }


      if (
        b.level ===
          "NORMAL" &&
        a.level !==
          "NORMAL"
      ) {
        return 1;
      }


      /*
       * Then rank using suitability.
       */

      return (
        b.suitabilityScore -
        a.suitabilityScore
      );
    }
  );


  /* ----------------------------------------------------------------------- */
  /* RESULT                                                                   */
  /* ----------------------------------------------------------------------- */

  const recommendedWard =
    candidates[
      0
    ];


  const alternatives =
    candidates.slice(
      1,
      4
    );


  return {
    currentWard,

    currentRisk:
      currentRisk.risk,

    currentLevel:
      currentRisk.level,

    recommendedWard,

    alternatives,

    reason:
      `${recommendedWard.ward} is currently a lower-risk monitored ward approximately ${recommendedWard.distanceKm} km away. PRAVAAH selected it using risk reduction, operational risk level and geographic proximity.`,
  };
}


/* ========================================================================= */
/* SIMPLE SAFETY CHECK                                                       */
/* ========================================================================= */

export function isWardSafeForRouting(
  wardRisk: WardRisk
): boolean {

  return (
    wardRisk.level ===
      "NORMAL" ||
    wardRisk.level ===
      "WATCH"
  );
}