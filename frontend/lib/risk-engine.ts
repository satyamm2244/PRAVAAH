import type {
  WardReading,
} from "./mock-engine";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

export type RiskLevel =
  | "CRITICAL"
  | "HIGH"
  | "WATCH"
  | "NORMAL";


export type RiskBreakdown = {
  rainScore: number;

  riverScore: number;

  reportScore: number;

  amplificationScore: number;

  total: number;
};


export type RiskFactor = {
  name: string;

  value: string;

  contribution: number;

  reason: string;
};


export type WardRisk = {
  ward: string;

  risk: number;

  confidence: number;

  level: RiskLevel;

  reading: WardReading;

  primaryHazard: string;

  factors: RiskFactor[];

  recommendedAction: string;
};


/* ========================================================================= */
/* CONFIGURATION                                                             */
/* ========================================================================= */

/*
 * Base score:
 *
 * Rainfall         → 40 points
 * River Level      → 40 points
 * Verified Reports → 20 points
 *
 * Multi-signal amplification can add
 * additional urgency, but final score
 * remains capped at 100.
 */

const MAX_RAIN_SCORE =
  40;

const MAX_RIVER_SCORE =
  40;

const MAX_REPORT_SCORE =
  20;


/*
 * Operational thresholds.
 *
 * These are prototype decision-support
 * parameters, NOT official government
 * warning thresholds.
 */

const WATCH_RAIN_MM =
  30;

const HIGH_RAIN_MM =
  60;

const CRITICAL_RAIN_MM =
  90;


const WATCH_RIVER_CM =
  60;

const HIGH_RIVER_CM =
  80;

const CRITICAL_RIVER_CM =
  95;


/* ========================================================================= */
/* HELPERS                                                                   */
/* ========================================================================= */

function clamp(
  value: number,
  min: number,
  max: number
): number {

  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}


function interpolate(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number
): number {

  if (
    inputMax ===
    inputMin
  ) {
    return outputMax;
  }


  const ratio =
    clamp(
      (
        value -
        inputMin
      ) /
        (
          inputMax -
          inputMin
        ),
      0,
      1
    );


  return (
    outputMin +
    ratio *
      (
        outputMax -
        outputMin
      )
  );
}


/* ========================================================================= */
/* RAIN SCORE                                                                */
/* ========================================================================= */

/*
 * Piecewise rainfall scoring.
 *
 * Light rain should barely affect risk,
 * while heavy rainfall should accelerate
 * much faster.
 */

function calculateRainScore(
  rainfallMm: number
): number {

  const rain =
    Math.max(
      0,
      rainfallMm
    );


  if (
    rain <= 10
  ) {

    return interpolate(
      rain,
      0,
      10,
      0,
      3
    );

  }


  if (
    rain <= 30
  ) {

    return interpolate(
      rain,
      10,
      30,
      3,
      12
    );

  }


  if (
    rain <= 60
  ) {

    return interpolate(
      rain,
      30,
      60,
      12,
      28
    );

  }


  if (
    rain <= 90
  ) {

    return interpolate(
      rain,
      60,
      90,
      28,
      38
    );

  }


  return MAX_RAIN_SCORE;
}


/* ========================================================================= */
/* RIVER SCORE                                                               */
/* ========================================================================= */

/*
 * River scoring also increases faster
 * as the level moves into elevated and
 * dangerous ranges.
 */

function calculateRiverScore(
  riverLevelCm: number
): number {

  const level =
    Math.max(
      0,
      riverLevelCm
    );


  if (
    level <= 20
  ) {
    return 0;
  }


  if (
    level <= 40
  ) {

    return interpolate(
      level,
      20,
      40,
      0,
      6
    );

  }


  if (
    level <= 60
  ) {

    return interpolate(
      level,
      40,
      60,
      6,
      16
    );

  }


  if (
    level <= 80
  ) {

    return interpolate(
      level,
      60,
      80,
      16,
      30
    );

  }


  if (
    level <= 95
  ) {

    return interpolate(
      level,
      80,
      95,
      30,
      38
    );

  }


  return MAX_RIVER_SCORE;
}


/* ========================================================================= */
/* REPORT SCORE                                                              */
/* ========================================================================= */

/*
 * Verified reports are intentionally
 * nonlinear.
 *
 * The first few verified reports matter
 * much more than report number 9 or 10.
 */

function calculateReportScore(
  reportCount: number
): number {

  const reports =
    Math.max(
      0,
      reportCount
    );


  if (
    reports === 0
  ) {
    return 0;
  }


  if (
    reports === 1
  ) {
    return 6;
  }


  if (
    reports === 2
  ) {
    return 9;
  }


  if (
    reports === 3
  ) {
    return 12;
  }


  if (
    reports <= 5
  ) {

    return interpolate(
      reports,
      3,
      5,
      12,
      16
    );

  }


  if (
    reports <= 8
  ) {

    return interpolate(
      reports,
      5,
      8,
      16,
      19
    );

  }


  return MAX_REPORT_SCORE;
}


/* ========================================================================= */
/* MULTI-SIGNAL AMPLIFICATION                                                */
/* ========================================================================= */

/*
 * Disaster risk becomes more convincing
 * when independent signals agree.
 *
 * Example:
 *
 * heavy rainfall
 * +
 * elevated river
 * +
 * verified citizen reports
 *
 * should be treated more seriously than
 * any one signal alone.
 */

function calculateAmplificationScore(
  reading: WardReading
): number {

  let activeSignals =
    0;


  if (
    reading.rainfallMm >=
    WATCH_RAIN_MM
  ) {
    activeSignals +=
      1;
  }


  if (
    reading.riverLevelCm >=
    WATCH_RIVER_CM
  ) {
    activeSignals +=
      1;
  }


  if (
    reading.reportCount >
    0
  ) {
    activeSignals +=
      1;
  }


  if (
    activeSignals === 3
  ) {
    return 10;
  }


  if (
    activeSignals === 2
  ) {
    return 5;
  }


  return 0;
}


/* ========================================================================= */
/* RISK BREAKDOWN                                                            */
/* ========================================================================= */

export function getRiskBreakdown(
  reading: WardReading
): RiskBreakdown {

  const rainScore =
    Math.round(
      calculateRainScore(
        reading.rainfallMm
      )
    );


  const riverScore =
    Math.round(
      calculateRiverScore(
        reading.riverLevelCm
      )
    );


  const reportScore =
    Math.round(
      calculateReportScore(
        reading.reportCount
      )
    );


  const amplificationScore =
    calculateAmplificationScore(
      reading
    );


  const total =
    Math.min(
      100,
      rainScore +
        riverScore +
        reportScore +
        amplificationScore
    );


  return {
    rainScore,

    riverScore,

    reportScore,

    amplificationScore,

    total,
  };
}


/* ========================================================================= */
/* RISK CALCULATION                                                          */
/* ========================================================================= */

function computeRisk(
  reading: WardReading
): number {

  return (
    getRiskBreakdown(
      reading
    ).total
  );
}


/* ========================================================================= */
/* CONFIDENCE                                                                */
/* ========================================================================= */

function computeConfidence(
  reading: WardReading
): number {

  /*
   * Machine-generated environmental
   * readings provide a baseline.
   */

  let confidence =
    50;


  /*
   * Verified human evidence substantially
   * strengthens confidence.
   */

  if (
    reading.reportCount >=
    1
  ) {
    confidence +=
      12;
  }


  if (
    reading.reportCount >=
    3
  ) {
    confidence +=
      8;
  }


  if (
    reading.reportCount >=
    6
  ) {
    confidence +=
      5;
  }


  /*
   * Strong physical signals improve
   * confidence independently.
   */

  if (
    reading.rainfallMm >=
    WATCH_RAIN_MM
  ) {
    confidence +=
      7;
  }


  if (
    reading.riverLevelCm >=
    WATCH_RIVER_CM
  ) {
    confidence +=
      7;
  }


  /*
   * When multiple independent signals
   * agree, confidence increases again.
   */

  let strongSignals =
    0;


  if (
    reading.rainfallMm >=
    WATCH_RAIN_MM
  ) {
    strongSignals +=
      1;
  }


  if (
    reading.riverLevelCm >=
    WATCH_RIVER_CM
  ) {
    strongSignals +=
      1;
  }


  if (
    reading.reportCount >
    0
  ) {
    strongSignals +=
      1;
  }


  if (
    strongSignals >=
    2
  ) {
    confidence +=
      8;
  }


  return Math.round(
    Math.min(
      100,
      confidence
    )
  );
}


/* ========================================================================= */
/* NUMERIC RISK LEVEL                                                        */
/* ========================================================================= */

function levelFromRisk(
  risk: number
): RiskLevel {

  if (
    risk >= 75
  ) {
    return "CRITICAL";
  }


  if (
    risk >= 55
  ) {
    return "HIGH";
  }


  if (
    risk >= 30
  ) {
    return "WATCH";
  }


  return "NORMAL";
}


/* ========================================================================= */
/* OPERATIONAL ESCALATION                                                    */
/* ========================================================================= */

/*
 * Numeric score is useful, but certain
 * physical conditions should enforce a
 * minimum operational status.
 */

function applyOperationalEscalation(
  reading: WardReading,
  calculatedLevel: RiskLevel
): RiskLevel {

  let level =
    calculatedLevel;


  /* ----------------------------------------------------------------------- */
  /* VERIFIED GROUND INCIDENT                                                */
  /* ----------------------------------------------------------------------- */

  if (
    reading.reportCount >
      0 &&
    level ===
      "NORMAL"
  ) {

    level =
      "WATCH";

  }


  /* ----------------------------------------------------------------------- */
  /* ELEVATED RIVER                                                          */
  /* ----------------------------------------------------------------------- */

  if (
    reading.riverLevelCm >=
    WATCH_RIVER_CM
  ) {

    if (
      level ===
      "NORMAL"
    ) {

      level =
        "WATCH";

    }
  }


  /* ----------------------------------------------------------------------- */
  /* HEAVY RAINFALL                                                          */
  /* ----------------------------------------------------------------------- */

  if (
    reading.rainfallMm >=
    WATCH_RAIN_MM
  ) {

    if (
      level ===
      "NORMAL"
    ) {

      level =
        "WATCH";

    }
  }


  /* ----------------------------------------------------------------------- */
  /* HIGH PHYSICAL SIGNAL                                                    */
  /* ----------------------------------------------------------------------- */

  if (
    reading.riverLevelCm >=
      HIGH_RIVER_CM ||
    reading.rainfallMm >=
      HIGH_RAIN_MM
  ) {

    if (
      level ===
        "NORMAL" ||
      level ===
        "WATCH"
    ) {

      level =
        "HIGH";

    }
  }


  /* ----------------------------------------------------------------------- */
  /* CRITICAL PHYSICAL SIGNAL + SUPPORTING EVIDENCE                          */
  /* ----------------------------------------------------------------------- */

  const criticalPhysicalSignal =
    (
      reading.riverLevelCm >=
        CRITICAL_RIVER_CM ||
      reading.rainfallMm >=
        CRITICAL_RAIN_MM
    );


  const supportingEvidence =
    (
      reading.reportCount >
        0 ||
      reading.riverLevelCm >=
        HIGH_RIVER_CM &&
      reading.rainfallMm >=
        WATCH_RAIN_MM
    );


  if (
    criticalPhysicalSignal &&
    supportingEvidence
  ) {

    level =
      "CRITICAL";

  }


  return level;
}


/* ========================================================================= */
/* PRIMARY HAZARD                                                            */
/* ========================================================================= */

export function primaryHazard(
  reading: WardReading
): string {

  const rainContribution =
    calculateRainScore(
      reading.rainfallMm
    );


  const riverContribution =
    calculateRiverScore(
      reading.riverLevelCm
    );


  const reportContribution =
    calculateReportScore(
      reading.reportCount
    );


  /*
   * Verified ground evidence can indicate
   * localized waterlogging even when
   * environmental readings are moderate.
   */

  if (
    reportContribution >
      rainContribution &&
    reportContribution >
      riverContribution
  ) {

    return (
      "Water Logging"
    );

  }


  if (
    riverContribution >=
    rainContribution
  ) {

    if (
      riverContribution >
      0
    ) {

      return (
        "Flood Risk"
      );

    }
  }


  if (
    rainContribution >
    0
  ) {

    return (
      "Heavy Rainfall"
    );

  }


  if (
    reportContribution >
    0
  ) {

    return (
      "Water Logging"
    );

  }


  return (
    "General Risk"
  );
}


/* ========================================================================= */
/* EXPLAINABLE FACTORS                                                       */
/* ========================================================================= */

function getRiskFactors(
  reading: WardReading
): RiskFactor[] {

  const breakdown =
    getRiskBreakdown(
      reading
    );


  const factors:
    RiskFactor[] = [

    {
      name:
        "Rainfall",

      value:
        `${reading.rainfallMm} mm/hr`,

      contribution:
        breakdown.rainScore,

      reason:
        getRainReason(
          reading.rainfallMm
        ),
    },


    {
      name:
        "River Level",

      value:
        `${reading.riverLevelCm} cm`,

      contribution:
        breakdown.riverScore,

      reason:
        getRiverReason(
          reading.riverLevelCm
        ),
    },


    {
      name:
        "Verified Reports",

      value:
        `${reading.reportCount} verified`,

      contribution:
        breakdown.reportScore,

      reason:
        getReportReason(
          reading.reportCount
        ),
    },

  ];


  /*
   * Only display fusion as a factor when
   * more than one signal corroborates risk.
   */

  if (
    breakdown.amplificationScore >
    0
  ) {

    factors.push({
      name:
        "Signal Fusion",

      value:
        "Multiple signals aligned",

      contribution:
        breakdown.amplificationScore,

      reason:
        (
          "Independent environmental and ground-level signals are reinforcing the current risk assessment."
        ),
    });

  }


  return factors.sort(
    (
      a,
      b
    ) =>
      b.contribution -
      a.contribution
  );
}


/* ========================================================================= */
/* RAIN EXPLANATION                                                          */
/* ========================================================================= */

function getRainReason(
  rainfallMm: number
): string {

  if (
    rainfallMm >=
    CRITICAL_RAIN_MM
  ) {

    return (
      "Extremely intense rainfall is creating a severe waterlogging and flood threat."
    );

  }


  if (
    rainfallMm >=
    HIGH_RAIN_MM
  ) {

    return (
      "Very heavy rainfall is creating a significant drainage and flooding threat."
    );

  }


  if (
    rainfallMm >=
    WATCH_RAIN_MM
  ) {

    return (
      "Rainfall intensity has entered the prototype watch range and requires closer monitoring."
    );

  }


  if (
    rainfallMm >=
    10
  ) {

    return (
      "Moderate rainfall is making a measurable contribution to local risk."
    );

  }


  if (
    rainfallMm >
    0
  ) {

    return (
      "Light rainfall currently contributes only a small amount to overall risk."
    );

  }


  return (
    "No significant rainfall contribution is currently detected."
  );
}


/* ========================================================================= */
/* RIVER EXPLANATION                                                         */
/* ========================================================================= */

function getRiverReason(
  riverLevelCm: number
): string {

  if (
    riverLevelCm >=
    CRITICAL_RIVER_CM
  ) {

    return (
      "River level has entered the prototype critical range and requires urgent verification."
    );

  }


  if (
    riverLevelCm >=
    HIGH_RIVER_CM
  ) {

    return (
      "River level is highly elevated and represents a major flood-risk signal."
    );

  }


  if (
    riverLevelCm >=
    WATCH_RIVER_CM
  ) {

    return (
      "River level is elevated enough to trigger enhanced monitoring."
    );

  }


  if (
    riverLevelCm >=
    40
  ) {

    return (
      "River level is moderately elevated and is contributing to current risk."
    );

  }


  if (
    riverLevelCm >
    20
  ) {

    return (
      "River level is slightly above the prototype baseline."
    );

  }


  return (
    "River level is currently within the normal prototype monitoring range."
  );
}


/* ========================================================================= */
/* REPORT EXPLANATION                                                        */
/* ========================================================================= */

function getReportReason(
  reportCount: number
): string {

  if (
    reportCount >=
    8
  ) {

    return (
      "A large number of officer-verified citizen reports strongly confirms a widespread ground-level problem."
    );

  }


  if (
    reportCount >=
    4
  ) {

    return (
      "Several verified ground reports provide strong human confirmation of current conditions."
    );

  }


  if (
    reportCount >=
    2
  ) {

    return (
      "Multiple officer-verified citizen incidents corroborate the current risk assessment."
    );

  }


  if (
    reportCount ===
    1
  ) {

    return (
      "One officer-verified citizen incident confirms a real ground-level issue in this ward."
    );

  }


  return (
    "No verified citizen reports are currently contributing to this ward assessment."
  );
}


/* ========================================================================= */
/* RECOMMENDED RESPONSE                                                      */
/* ========================================================================= */

function getRecommendedAction(
  reading: WardReading,
  level: RiskLevel
): string {

  const hazard =
    primaryHazard(
      reading
    );


  /* ----------------------------------------------------------------------- */
  /* CRITICAL                                                                */
  /* ----------------------------------------------------------------------- */

  if (
    level ===
    "CRITICAL"
  ) {

    if (
      hazard ===
      "Flood Risk"
    ) {

      return (
        "Activate emergency response protocols, verify vulnerable locations immediately, restrict unsafe routes, and prepare evacuation and rescue support."
      );

    }


    if (
      hazard ===
      "Heavy Rainfall"
    ) {

      return (
        "Deploy field teams to vulnerable zones, inspect drainage and low-lying areas, and prepare emergency response resources."
      );

    }


    return (
      "Dispatch field teams immediately, verify severe ground incidents, restrict unsafe locations, and prepare emergency assistance."
    );
  }


  /* ----------------------------------------------------------------------- */
  /* HIGH                                                                    */
  /* ----------------------------------------------------------------------- */

  if (
    level ===
    "HIGH"
  ) {

    if (
      hazard ===
      "Flood Risk"
    ) {

      return (
        "Increase river monitoring frequency, inspect vulnerable locations, warn response teams, and prepare for possible evacuation support."
      );

    }


    if (
      hazard ===
      "Heavy Rainfall"
    ) {

      return (
        "Closely monitor rainfall progression, inspect drainage hotspots, and place local response teams on standby."
      );

    }


    return (
      "Inspect verified incident locations and place local response teams on standby."
    );
  }


  /* ----------------------------------------------------------------------- */
  /* WATCH                                                                   */
  /* ----------------------------------------------------------------------- */

  if (
    level ===
    "WATCH"
  ) {

    if (
      reading.reportCount >
      0
    ) {

      return (
        "A ground incident has been verified. Monitor the ward closely and inspect the reported location if conditions continue or additional evidence is received."
      );

    }


    if (
      hazard ===
      "Flood Risk"
    ) {

      return (
        "Increase river-level monitoring and verify conditions around vulnerable and flood-prone locations."
      );

    }


    if (
      hazard ===
      "Heavy Rainfall"
    ) {

      return (
        "Monitor rainfall progression and check drainage or waterlogging hotspots."
      );

    }


    return (
      "Continue enhanced monitoring and verify incoming sensor or citizen evidence."
    );
  }


  /* ----------------------------------------------------------------------- */
  /* NORMAL                                                                  */
  /* ----------------------------------------------------------------------- */

  return (
    "No immediate intervention is indicated. Continue routine monitoring for changing conditions."
  );
}


/* ========================================================================= */
/* PUBLIC API                                                                */
/* ========================================================================= */

export function evaluateWard(
  reading: WardReading
): WardRisk {

  const risk =
    computeRisk(
      reading
    );


  const confidence =
    computeConfidence(
      reading
    );


  const numericLevel =
    levelFromRisk(
      risk
    );


  const level =
    applyOperationalEscalation(
      reading,
      numericLevel
    );


  const hazard =
    primaryHazard(
      reading
    );


  return {
    ward:
      reading.ward,

    risk,

    confidence,

    level,

    reading,

    primaryHazard:
      hazard,

    factors:
      getRiskFactors(
        reading
      ),

    recommendedAction:
      getRecommendedAction(
        reading,
        level
      ),
  };
}


/* ========================================================================= */
/* ALL WARDS                                                                 */
/* ========================================================================= */

export function evaluateAllWards(
  readings:
    WardReading[]
): WardRisk[] {

  return readings
    .map(
      evaluateWard
    )
    .sort(
      (
        a,
        b
      ) => {

        /*
         * Sort by operational severity
         * first, then numeric risk.
         */

        const severity: Record<
          RiskLevel,
          number
        > = {
          CRITICAL:
            4,

          HIGH:
            3,

          WATCH:
            2,

          NORMAL:
            1,
        };


        const levelDifference =
          severity[
            b.level
          ] -
          severity[
            a.level
          ];


        if (
          levelDifference !==
          0
        ) {
          return levelDifference;
        }


        return (
          b.risk -
          a.risk
        );
      }
    );
}