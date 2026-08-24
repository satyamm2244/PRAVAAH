import type {
  WardRisk,
} from "./risk-engine";

import {
  evaluateWard,
} from "./risk-engine";

import type {
  WardReading,
} from "./mock-engine";

import {
  calculateWardPropagation,
  type WardPropagationResult,
} from "./propagation-engine";

import type {
  WardCoordinate,
} from "./ward-connectivity";

import {
  WARD_DATA,
} from "./ward-data";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

export type SimulationInput = {
  ward:
    string;

  rainfallMm:
    number;

  riverLevelCm:
    number;

  verifiedReportCount:
    number;
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

  comparison:
    SimulationComparison;

  impact:
    SimulationImpact;

  simulatedRisks:
    WardRisk[];
};


/* ========================================================================= */
/* CLAMP                                                                     */
/* ========================================================================= */

function clamp(
  value:
    number,

  minimum:
    number,

  maximum:
    number
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
/* CREATE SIMULATED READING                                                  */
/* ========================================================================= */

function createSimulatedReading(
  input:
    SimulationInput
): WardReading {

  return {

    ward:
      input.ward,

    rainfallMm:
      input.rainfallMm,

    riverLevelCm:
      input.riverLevelCm,

    reportCount:
      input.verifiedReportCount,
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


  const currentWardRisk =
    currentRisks.find(
      (
        risk
      ) =>
        risk.ward ===
        normalized.ward
    ) ??
    null;


  const simulatedReading =
    createSimulatedReading(
      normalized
    );


  const simulatedWardRisk =
    evaluateWard(
      simulatedReading
    );


  /*
   * Replace only the selected ward
   * with the simulated state.
   *
   * Every other ward keeps its
   * current live risk.
   */

  const simulatedRisks =
    currentRisks.map(
      (
        risk
      ) => {

        if (
          risk.ward !==
          normalized.ward
        ) {
          return risk;
        }


        return simulatedWardRisk;
      }
    );


  /*
   * Calculate propagation using
   * simulated source conditions.
   */

  const propagation =
    calculateWardPropagation(
      normalized.ward,
      simulatedRisks,
      coordinates
    );


  const affectedWardCount =
    propagation.forecasts.filter(
      (
        forecast
      ) =>
        forecast.probability >=
        30
    ).length;


  const highRiskWardCount =
    simulatedRisks.filter(
      (
        risk
      ) =>
        risk.level ===
          "HIGH" ||
        risk.level ===
          "CRITICAL"
    ).length;


  const criticalWardCount =
    simulatedRisks.filter(
      (
        risk
      ) =>
        risk.level ===
        "CRITICAL"
    ).length;


  const populationExposure =
    calculatePopulationExposure(
      propagation
    );


  const riskDelta =
    currentWardRisk
      ? simulatedWardRisk.risk -
        currentWardRisk.risk
      : simulatedWardRisk.risk;


  return {

    input:
      normalized,


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