import type {
  WardRisk,
} from "./risk-engine";

import type {
  WardCoordinate,
} from "./ward-connectivity";

import {
  calculateWardPropagation,
  type WardPropagationResult,
} from "./propagation-engine";

import {
  WARD_DATA,
} from "./ward-data";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

export type SimulationHazard =
  | "FLOOD"
  | "SEVERE_WEATHER"
  | "FIRE"
  | "SEISMIC"
  | "INFRASTRUCTURE";


export type SimulationInput = {
  ward: string;

  rainfallMm: number;
  riverLevelCm: number;

  windSpeedKmh: number;

  fireRiskIndex: number;
  smokeLevel: number;

  seismicIntensity: number;

  infrastructureStress: number;

  verifiedReportCount: number;
};


export type HazardSimulation = {
  hazardType: SimulationHazard;

  risk: number;

  level:
    | "NORMAL"
    | "WATCH"
    | "HIGH"
    | "CRITICAL";

  confidence: number;
};


export type SimulationComparison = {
  previous:
    WardRisk | null;

  simulated:
    WardRisk;

  riskDelta:
    number;

  levelChanged:
    boolean;
};


export type SimulationImpact = {
  affectedWardCount:
    number;

  highRiskWardCount:
    number;

  criticalWardCount:
    number;

  populationExposure:
    number;

  propagation:
    WardPropagationResult;
};


export type SimulationResult = {
  input:
    SimulationInput;

  primaryHazard:
    SimulationHazard;

  hazards:
    HazardSimulation[];

  overallRisk:
    number;

  overallConfidence:
    number;

  comparison:
    SimulationComparison;

  impact:
    SimulationImpact;

  simulatedRisks:
    WardRisk[];
};


/* ========================================================================= */
/* HELPERS                                                                   */
/* ========================================================================= */

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {

  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}


function round(
  value: number
): number {

  return Math.round(
    clamp(
      value,
      0,
      100
    )
  );
}


function getLevel(
  risk: number
):
  | "NORMAL"
  | "WATCH"
  | "HIGH"
  | "CRITICAL" {

  if (
    risk >= 75
  ) {
    return "CRITICAL";
  }

  if (
    risk >= 50
  ) {
    return "HIGH";
  }

  if (
    risk >= 25
  ) {
    return "WATCH";
  }

  return "NORMAL";
}


/* ========================================================================= */
/* NORMALIZE INPUT                                                           */
/* ========================================================================= */

function normalizeInput(
  input:
    SimulationInput
): SimulationInput {

  return {

    ward:
      input.ward,

    rainfallMm:
      clamp(
        input.rainfallMm,
        0,
        250
      ),

    riverLevelCm:
      clamp(
        input.riverLevelCm,
        -50,
        200
      ),

    windSpeedKmh:
      clamp(
        input.windSpeedKmh,
        0,
        250
      ),

    fireRiskIndex:
      clamp(
        input.fireRiskIndex,
        0,
        100
      ),

    smokeLevel:
      clamp(
        input.smokeLevel,
        0,
        100
      ),

    seismicIntensity:
      clamp(
        input.seismicIntensity,
        0,
        10
      ),

    infrastructureStress:
      clamp(
        input.infrastructureStress,
        0,
        100
      ),

    verifiedReportCount:
      Math.round(
        clamp(
          input.verifiedReportCount,
          0,
          50
        )
      ),
  };
}


/* ========================================================================= */
/* CONFIDENCE                                                                */
/* ========================================================================= */

function calculateConfidence(
  evidenceCount:
    number,

  verifiedReports:
    number
): number {

  /*
   * Base confidence represents
   * one simulated physical source.
   *
   * Additional independent evidence
   * and verified citizen reports
   * increase confidence.
   */

  const base =
    55;

  const evidenceBonus =
    Math.max(
      0,
      evidenceCount - 1
    ) * 12;

  const reportBonus =
    Math.min(
      verifiedReports * 4,
      20
    );

  return round(
    base +
    evidenceBonus +
    reportBonus
  );
}


/* ========================================================================= */
/* FLOOD                                                                     */
/* ========================================================================= */

function evaluateFlood(
  input:
    SimulationInput
): HazardSimulation {

  const rainfallScore =
    clamp(
      input.rainfallMm / 150,
      0,
      1
    ) * 100;

  const riverScore =
    clamp(
      input.riverLevelCm / 120,
      0,
      1
    ) * 100;

  const reportScore =
    clamp(
      input.verifiedReportCount / 5,
      0,
      1
    ) * 100;


  const risk =
    round(
      rainfallScore * 0.45 +
      riverScore * 0.40 +
      reportScore * 0.15
    );


  return {
    hazardType:
      "FLOOD",

    risk,

    level:
      getLevel(
        risk
      ),

    confidence:
      calculateConfidence(
        2,
        input.verifiedReportCount
      ),
  };
}


/* ========================================================================= */
/* SEVERE WEATHER                                                            */
/* ========================================================================= */

function evaluateSevereWeather(
  input:
    SimulationInput
): HazardSimulation {

  const windScore =
    clamp(
      input.windSpeedKmh / 120,
      0,
      1
    ) * 100;

  const rainfallScore =
    clamp(
      input.rainfallMm / 150,
      0,
      1
    ) * 100;


  const risk =
    round(
      windScore * 0.70 +
      rainfallScore * 0.30
    );


  return {
    hazardType:
      "SEVERE_WEATHER",

    risk,

    level:
      getLevel(
        risk
      ),

    confidence:
      calculateConfidence(
        2,
        input.verifiedReportCount
      ),
  };
}


/* ========================================================================= */
/* FIRE                                                                      */
/* ========================================================================= */

function evaluateFire(
  input:
    SimulationInput
): HazardSimulation {

  const fireScore =
    input.fireRiskIndex;

  const smokeScore =
    input.smokeLevel;

  const reportScore =
    clamp(
      input.verifiedReportCount / 5,
      0,
      1
    ) * 100;


  const risk =
    round(
      fireScore * 0.50 +
      smokeScore * 0.35 +
      reportScore * 0.15
    );


  return {
    hazardType:
      "FIRE",

    risk,

    level:
      getLevel(
        risk
      ),

    confidence:
      calculateConfidence(
        2,
        input.verifiedReportCount
      ),
  };
}


/* ========================================================================= */
/* SEISMIC                                                                   */
/* ========================================================================= */

function evaluateSeismic(
  input:
    SimulationInput
): HazardSimulation {

  const seismicScore =
    clamp(
      input.seismicIntensity / 10,
      0,
      1
    ) * 100;


  const infrastructureCoupling =
    clamp(
      input.infrastructureStress / 100,
      0,
      1
    ) * 100;


  const risk =
    round(
      seismicScore * 0.80 +
      infrastructureCoupling * 0.20
    );


  return {
    hazardType:
      "SEISMIC",

    risk,

    level:
      getLevel(
        risk
      ),

    confidence:
      calculateConfidence(
        input.infrastructureStress > 0
          ? 2
          : 1,
        input.verifiedReportCount
      ),
  };
}


/* ========================================================================= */
/* INFRASTRUCTURE                                                            */
/* ========================================================================= */

function evaluateInfrastructure(
  input:
    SimulationInput
): HazardSimulation {

  const stressScore =
    input.infrastructureStress;


  const seismicContribution =
    clamp(
      input.seismicIntensity / 10,
      0,
      1
    ) * 100;


  const reportScore =
    clamp(
      input.verifiedReportCount / 5,
      0,
      1
    ) * 100;


  const risk =
    round(
      stressScore * 0.65 +
      seismicContribution * 0.20 +
      reportScore * 0.15
    );


  return {
    hazardType:
      "INFRASTRUCTURE",

    risk,

    level:
      getLevel(
        risk
      ),

    confidence:
      calculateConfidence(
        input.seismicIntensity > 0
          ? 2
          : 1,
        input.verifiedReportCount
      ),
  };
}


/* ========================================================================= */
/* POPULATION EXPOSURE                                                       */
/* ========================================================================= */

function calculatePopulationExposure(
  propagation:
    WardPropagationResult
): number {

  let total =
    0;


  for (
    const forecast
    of propagation.forecasts
  ) {

    if (
      forecast.probability <
      30
    ) {
      continue;
    }


    const ward =
      WARD_DATA[
        forecast.targetWard
      ];


    if (
      ward
    ) {
      total +=
        ward.population;
    }
  }


  return total;
}


/* ========================================================================= */
/* PUBLIC SIMULATION ENGINE                                                  */
/* ========================================================================= */

export function runDisasterSimulation(
  input:
    SimulationInput,

  currentRisks:
    WardRisk[],

  coordinates:
    WardCoordinate[]
): SimulationResult {

  const normalized =
    normalizeInput(
      input
    );


  const hazards:
    HazardSimulation[] = [

      evaluateFlood(
        normalized
      ),

      evaluateSevereWeather(
        normalized
      ),

      evaluateFire(
        normalized
      ),

      evaluateSeismic(
        normalized
      ),

      evaluateInfrastructure(
        normalized
      ),
    ];


  /*
   * Highest individual hazard becomes
   * the primary hazard.
   */

  const primary =
    hazards.reduce(
      (
        strongest,
        current
      ) =>
        current.risk >
        strongest.risk
          ? current
          : strongest
    );


  /*
   * Multi-hazard fusion.
   *
   * Primary hazard dominates the score,
   * while simultaneous secondary hazards
   * contribute additional risk.
   */

  const sortedRisks =
    hazards
      .map(
        hazard =>
          hazard.risk
      )
      .sort(
        (
          a,
          b
        ) =>
          b - a
      );


  const overallRisk =
    round(
      sortedRisks[0] * 0.70 +
      sortedRisks[1] * 0.20 +
      sortedRisks[2] * 0.10
    );


  const activeHazards =
    hazards.filter(
      hazard =>
        hazard.risk >=
        25
    );


  const overallConfidence =
    activeHazards.length > 0
      ? round(
          activeHazards.reduce(
            (
              total,
              hazard
            ) =>
              total +
              hazard.confidence,
            0
          ) /
          activeHazards.length
        )
      : primary.confidence;


  const currentWardRisk =
    currentRisks.find(
      risk =>
        risk.ward ===
        normalized.ward
    ) ??
    null;


  /*
   * Preserve the WardRisk shape expected
   * by the rest of the existing frontend.
   */

  const simulatedWardRisk:
  WardRisk = {

  ward:
    normalized.ward,

  risk:
    overallRisk,

  confidence:
    overallConfidence,

  level:
    getLevel(
      overallRisk
    ),

  reading: {
    ward:
      normalized.ward,

    rainfallMm:
      normalized.rainfallMm,

    riverLevelCm:
      normalized.riverLevelCm,

    reportCount:
      normalized.verifiedReportCount,
  },

  primaryHazard:
    primary.hazardType,

  factors: [],

  recommendedAction:
    `Primary simulated hazard: ${
      primary.hazardType.replaceAll(
        "_",
        " "
      )
    }. Review the individual hazard assessments before taking action.`,
};


  /*
   * Replace selected ward with
   * simulated multi-hazard state.
   */

  let foundWard =
    false;


  const simulatedRisks =
    currentRisks.map(
      risk => {

        if (
          risk.ward !==
          normalized.ward
        ) {
          return risk;
        }


        foundWard =
          true;

        return simulatedWardRisk;
      }
    );


  if (
    !foundWard
  ) {
    simulatedRisks.push(
      simulatedWardRisk
    );
  }


  /*
   * Existing geographic propagation
   * engine remains untouched.
   */

  const propagation =
    calculateWardPropagation(
      normalized.ward,
      simulatedRisks,
      coordinates
    );


  const affectedWardCount =
    propagation.forecasts.filter(
      forecast =>
        forecast.probability >=
        30
    ).length;


  const highRiskWardCount =
    simulatedRisks.filter(
      risk =>
        risk.level ===
          "HIGH" ||
        risk.level ===
          "CRITICAL"
    ).length;


  const criticalWardCount =
    simulatedRisks.filter(
      risk =>
        risk.level ===
        "CRITICAL"
    ).length;


  const populationExposure =
    calculatePopulationExposure(
      propagation
    );


  const previousRisk =
    currentWardRisk
      ? currentWardRisk.risk
      : 0;


  const riskDelta =
    overallRisk -
    previousRisk;


  return {

    input:
      normalized,

    primaryHazard:
      primary.hazardType,

    hazards,

    overallRisk,

    overallConfidence,


    comparison: {

      previous:
        currentWardRisk,

      simulated:
        simulatedWardRisk,

      riskDelta,

      levelChanged:
        currentWardRisk
          ? currentWardRisk.level !==
            simulatedWardRisk.level
          : true,
    },


    impact: {

      affectedWardCount,

      highRiskWardCount,

      criticalWardCount,

      populationExposure,

      propagation,
    },


    simulatedRisks,
  };
}