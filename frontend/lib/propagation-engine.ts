import type {
  WardRisk,
} from "./risk-engine";

import {
  buildWardConnectivity,
  getWardNeighbours,
  type WardCoordinate,
} from "./ward-connectivity";

import {
  WARD_DATA,
} from "./ward-data";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

export type PropagationLikelihood =
  | "VERY HIGH"
  | "HIGH"
  | "MODERATE"
  | "LOW";

export type PropagationForecast = {
  sourceWard: string;

  targetWard: string;

  probability: number;

  likelihood:
    PropagationLikelihood;

  distanceKm: number;

  estimatedMinutes:
    number;

  targetRisk: number;

  targetLevel:
    string;

  affectedPopulation:
    number | null;

  drivers:
    string[];
};

export type WardPropagationResult = {
  sourceWard: string;

  sourceRisk: number;

  forecasts:
    PropagationForecast[];
};


/* ========================================================================= */
/* CONFIGURATION                                                             */
/* ========================================================================= */

/*
 * Only show meaningful propagation
 * possibilities.
 */

const MIN_PROPAGATION_PROBABILITY =
  15;


/* ========================================================================= */
/* CLAMP                                                                     */
/* ========================================================================= */

function clamp(
  value: number,

  minimum = 0,

  maximum = 100
): number {

  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}


/* ========================================================================= */
/* LIKELIHOOD                                                                */
/* ========================================================================= */

function getLikelihood(
  probability: number
): PropagationLikelihood {

  if (
    probability >= 75
  ) {
    return "VERY HIGH";
  }


  if (
    probability >= 55
  ) {
    return "HIGH";
  }


  if (
    probability >= 30
  ) {
    return "MODERATE";
  }


  return "LOW";
}


/* ========================================================================= */
/* PROPAGATION TIME                                                          */
/* ========================================================================= */

/*
 * Prototype decision-support estimate.
 *
 * Higher probability means the
 * neighbouring ward may deteriorate
 * sooner.
 */

function estimatePropagationMinutes(
  probability: number,
  distanceKm: number
): number {

  const riskDelay =
    100 -
    probability;


  const distanceDelay =
    distanceKm *
    10;


  return Math.round(
    Math.max(
      10,
      riskDelay *
        0.45 +
        distanceDelay
    )
  );
}


/* ========================================================================= */
/* PROPAGATION DRIVERS                                                       */
/* ========================================================================= */

function getPropagationDrivers(
  source:
    WardRisk,

  target:
    WardRisk,

  proximityWeight:
    number
): string[] {

  const drivers:
    string[] =
    [];


  if (
    source.risk >=
    55
  ) {

    drivers.push(
      "High source-ward risk"
    );

  }


  if (
    source.reading
      .riverLevelCm >=
    60
  ) {

    drivers.push(
      "Elevated river level"
    );

  }


  if (
    source.reading
      .rainfallMm >=
    20
  ) {

    drivers.push(
      "Significant rainfall"
    );

  }


  if (
    source.reading
      .reportCount >
    0
  ) {

    drivers.push(
      "Verified ground incident"
    );

  }


  if (
    target.reading
      .riverLevelCm >=
    50
  ) {

    drivers.push(
      "Neighbour already vulnerable"
    );

  }


  if (
    target.reading
      .rainfallMm >=
    20
  ) {

    drivers.push(
      "Rainfall affecting target ward"
    );

  }


  if (
    proximityWeight >=
    0.65
  ) {

    drivers.push(
      "Close geographic proximity"
    );

  }


  if (
    drivers.length ===
    0
  ) {

    drivers.push(
      "Geographic proximity"
    );

  }


  return drivers;
}


/* ========================================================================= */
/* SINGLE PROPAGATION SCORE                                                  */
/* ========================================================================= */

function calculatePropagationProbability(
  source:
    WardRisk,

  target:
    WardRisk,

  proximityWeight:
    number
): number {

  /*
   * SOURCE RISK
   *
   * Maximum contribution:
   * 40 points.
   */

  const sourceRiskComponent =
    (
      source.risk /
      100
    ) *
    40;


  /*
   * PROXIMITY
   *
   * Maximum contribution:
   * 25 points.
   */

  const proximityComponent =
    proximityWeight *
    25;


  /*
   * TARGET VULNERABILITY
   *
   * If the neighbouring ward already
   * has environmental stress, its
   * propagation probability increases.
   *
   * Maximum:
   * 15 points.
   */

  const targetRiskComponent =
    (
      target.risk /
      100
    ) *
    15;


  /*
   * VERIFIED HUMAN EVIDENCE
   *
   * Ground verification strengthens
   * confidence that the source event
   * is real.
   *
   * Maximum:
   * 10 points.
   */

  const reportComponent =
    Math.min(
      10,
      source.reading
        .reportCount *
        4
    );


  /*
   * STRONG PHYSICAL SIGNAL
   *
   * Maximum:
   * 10 points.
   */

  let physicalSignal =
    0;


  if (
    source.reading
      .riverLevelCm >=
    70
  ) {

    physicalSignal +=
      5;

  }


  if (
    source.reading
      .rainfallMm >=
    40
  ) {

    physicalSignal +=
      5;

  }


  const probability =
    sourceRiskComponent +
    proximityComponent +
    targetRiskComponent +
    reportComponent +
    physicalSignal;


  return Math.round(
    clamp(
      probability
    )
  );
}


/* ========================================================================= */
/* PUBLIC PROPAGATION ENGINE                                                 */
/* ========================================================================= */

export function calculateWardPropagation(
  sourceWard:
    string,

  risks:
    WardRisk[],

  coordinates:
    WardCoordinate[]
): WardPropagationResult {

  const source =
    risks.find(
      (
        ward
      ) =>
        ward.ward ===
        sourceWard
    );


  if (
    !source
  ) {

    return {
      sourceWard,

      sourceRisk:
        0,

      forecasts:
        [],
    };

  }


  const graph =
    buildWardConnectivity(
      coordinates
    );


  const neighbours =
    getWardNeighbours(
      graph,
      sourceWard
    );


  const forecasts:
    PropagationForecast[] =
    [];


  for (
    const connection
    of neighbours
  ) {

    const target =
      risks.find(
        (
          ward
        ) =>
          ward.ward ===
          connection.ward
      );


    if (
      !target
    ) {
      continue;
    }


    const probability =
      calculatePropagationProbability(

        source,

        target,

        connection.proximityWeight

      );


    if (
      probability <
      MIN_PROPAGATION_PROBABILITY
    ) {
      continue;
    }


    const detailedWard =
      WARD_DATA[
        target.ward
      ];


    forecasts.push({

      sourceWard:
        source.ward,

      targetWard:
        target.ward,

      probability,

      likelihood:
        getLikelihood(
          probability
        ),

      distanceKm:
        connection.distanceKm,

      estimatedMinutes:
        estimatePropagationMinutes(
          probability,
          connection.distanceKm
        ),

      targetRisk:
        target.risk,

      targetLevel:
        target.level,

      affectedPopulation:
        detailedWard
          ?.population ??
        null,

      drivers:
        getPropagationDrivers(

          source,

          target,

          connection.proximityWeight

        ),
    });

  }


  /*
   * Highest probability first.
   */

  forecasts.sort(
    (
      first,
      second
    ) =>
      second.probability -
      first.probability
  );


  return {

    sourceWard:
      source.ward,

    sourceRisk:
      source.risk,

    forecasts,

  };
}