import type {
  RiskLevel,
  WardRisk,
} from "@/lib/risk-engine";

import type {
  PropagationForecast,
} from "@/lib/propagation-engine";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

export type AlertPriority =
  | "INFO"
  | "ADVISORY"
  | "WARNING"
  | "EMERGENCY";


export type AlertTrigger =
  | "RISK_LEVEL"
  | "RISK_INCREASE"
  | "VERIFIED_REPORT"
  | "PROPAGATION";


export type GeneratedAlert = {
  id: string;

  ward: string;

  priority: AlertPriority;

  trigger: AlertTrigger;

  title: string;

  message: string;

  risk: number;

  level: RiskLevel;

  confidence: number;

  primaryHazard: string;

  recommendedAction: string;

  createdAt: number;

  requiresOfficerReview: boolean;
};


export type AlertEngineInput = {
  currentRisk: WardRisk;

  previousRisk?:
    WardRisk | null;

  propagationForecasts?:
    PropagationForecast[];
};


/* ========================================================================= */
/* CONFIGURATION                                                             */
/* ========================================================================= */

/*
 * A sudden increase of this many risk
 * points can generate an alert even if
 * the operational category has not yet
 * changed.
 */

const SIGNIFICANT_RISK_INCREASE =
  15;


/*
 * Propagation probability required before
 * PRAVAAH treats a neighbouring threat as
 * significant enough for an alert.
 */

const PROPAGATION_ALERT_THRESHOLD =
  55;


/* ========================================================================= */
/* PRIORITY                                                                  */
/* ========================================================================= */

function priorityFromLevel(
  level: RiskLevel
): AlertPriority {

  if (
    level ===
    "CRITICAL"
  ) {
    return "EMERGENCY";
  }


  if (
    level ===
    "HIGH"
  ) {
    return "WARNING";
  }


  if (
    level ===
    "WATCH"
  ) {
    return "ADVISORY";
  }


  return "INFO";
}


/* ========================================================================= */
/* LEVEL SEVERITY                                                            */
/* ========================================================================= */

function levelValue(
  level: RiskLevel
): number {

  switch (
    level
  ) {

    case "NORMAL":
      return 0;

    case "WATCH":
      return 1;

    case "HIGH":
      return 2;

    case "CRITICAL":
      return 3;

    default:
      return 0;
  }
}


/* ========================================================================= */
/* LEVEL ESCALATION                                                          */
/* ========================================================================= */

function hasLevelEscalated(
  previousRisk: WardRisk | null | undefined,
  currentRisk: WardRisk
): boolean {

  if (
    !previousRisk
  ) {
    return false;
  }


  return (
    levelValue(
      currentRisk.level
    ) >
    levelValue(
      previousRisk.level
    )
  );
}


/* ========================================================================= */
/* SIGNIFICANT RISK INCREASE                                                 */
/* ========================================================================= */

function hasSignificantRiskIncrease(
  previousRisk: WardRisk | null | undefined,
  currentRisk: WardRisk
): boolean {

  if (
    !previousRisk
  ) {
    return false;
  }


  return (
    currentRisk.risk -
      previousRisk.risk >=
    SIGNIFICANT_RISK_INCREASE
  );
}


/* ========================================================================= */
/* VERIFIED REPORT DETECTION                                                 */
/* ========================================================================= */

function hasNewVerifiedReport(
  previousRisk: WardRisk | null | undefined,
  currentRisk: WardRisk
): boolean {

  if (
    !previousRisk
  ) {

    return (
      currentRisk.reading
        .reportCount >
      0
    );
  }


  return (
    currentRisk.reading
      .reportCount >
    previousRisk.reading
      .reportCount
  );
}


/* ========================================================================= */
/* PROPAGATION THREAT                                                        */
/* ========================================================================= */

function getStrongestPropagationThreat(
  forecasts:
    PropagationForecast[]
): PropagationForecast | null {

  if (
    forecasts.length ===
    0
  ) {
    return null;
  }


  const sorted =
    [...forecasts]
      .filter(
        (
          forecast
        ) =>
          forecast.probability >=
          PROPAGATION_ALERT_THRESHOLD
      )
      .sort(
        (
          a,
          b
        ) =>
          b.probability -
          a.probability
      );


  return (
    sorted[
      0
    ] ??
    null
  );
}


/* ========================================================================= */
/* MESSAGE GENERATION                                                        */
/* ========================================================================= */

function buildRiskMessage(
  risk: WardRisk
): string {

  if (
    risk.level ===
    "CRITICAL"
  ) {

    return (
      `${risk.ward} has reached CRITICAL risk with a score of ${risk.risk}/100. ` +
      `${risk.primaryHazard} is currently the primary identified hazard. ` +
      `Immediate operational review and emergency response may be required.`
    );
  }


  if (
    risk.level ===
    "HIGH"
  ) {

    return (
      `${risk.ward} is currently classified as HIGH risk with a score of ${risk.risk}/100. ` +
      `${risk.primaryHazard} is the primary contributing hazard. ` +
      `Authorities should review conditions and prepare appropriate response measures.`
    );
  }


  if (
    risk.level ===
    "WATCH"
  ) {

    return (
      `${risk.ward} has entered WATCH status with a risk score of ${risk.risk}/100. ` +
      `Conditions should be monitored closely for further escalation.`
    );
  }


  return (
    `${risk.ward} is currently classified as NORMAL with a risk score of ${risk.risk}/100.`
  );
}


/* ========================================================================= */
/* ALERT FACTORY                                                             */
/* ========================================================================= */

function createAlert(
  risk: WardRisk,
  trigger: AlertTrigger,
  title: string,
  message: string,
  priority?:
    AlertPriority
): GeneratedAlert {

  return {
    id:
      createAlertId(
        risk.ward,
        trigger
      ),

    ward:
      risk.ward,

    priority:
      priority ??
      priorityFromLevel(
        risk.level
      ),

    trigger,

    title,

    message,

    risk:
      risk.risk,

    level:
      risk.level,

    confidence:
      risk.confidence,

    primaryHazard:
      risk.primaryHazard,

    recommendedAction:
      risk.recommendedAction,

    createdAt:
      Date.now(),

    /*
     * For now every automatically generated
     * warning requires officer review before
     * public publication.
     *
     * This prevents the prototype from
     * pretending AI should autonomously issue
     * evacuation orders. Humanity already has
     * enough exciting ways to create panic.
     */

    requiresOfficerReview:
      true,
  };
}


/* ========================================================================= */
/* ALERT ID                                                                  */
/* ========================================================================= */

function createAlertId(
  ward: string,
  trigger: AlertTrigger
): string {

  return (
    `${ward}-${trigger}-${Date.now()}`
  );
}


/* ========================================================================= */
/* MAIN ALERT ENGINE                                                         */
/* ========================================================================= */

export function generateWardAlerts({
  currentRisk,
  previousRisk = null,
  propagationForecasts = [],
}: AlertEngineInput): GeneratedAlert[] {

  const alerts:
    GeneratedAlert[] =
    [];


  /* ----------------------------------------------------------------------- */
  /* LEVEL ESCALATION                                                        */
  /* ----------------------------------------------------------------------- */

  if (
    hasLevelEscalated(
      previousRisk,
      currentRisk
    )
  ) {

    alerts.push(
      createAlert(
        currentRisk,

        "RISK_LEVEL",

        `${currentRisk.ward} escalated to ${currentRisk.level}`,

        buildRiskMessage(
          currentRisk
        )
      )
    );
  }


  /* ----------------------------------------------------------------------- */
  /* INITIAL HIGH / CRITICAL DETECTION                                       */
  /* ----------------------------------------------------------------------- */

  /*
   * When the system starts there may be
   * no previous risk snapshot.
   *
   * We still need HIGH and CRITICAL wards
   * to appear in the alert system.
   */

  if (
    !previousRisk &&
    (
      currentRisk.level ===
        "HIGH" ||

      currentRisk.level ===
        "CRITICAL"
    )
  ) {

    alerts.push(
      createAlert(
        currentRisk,

        "RISK_LEVEL",

        `${currentRisk.level} risk detected in ${currentRisk.ward}`,

        buildRiskMessage(
          currentRisk
        )
      )
    );
  }


  /* ----------------------------------------------------------------------- */
  /* SUDDEN RISK INCREASE                                                    */
  /* ----------------------------------------------------------------------- */

  if (
    hasSignificantRiskIncrease(
      previousRisk,
      currentRisk
    )
  ) {

    const increase =
      previousRisk
        ? currentRisk.risk -
          previousRisk.risk
        : 0;


    alerts.push(
      createAlert(
        currentRisk,

        "RISK_INCREASE",

        `Rapid risk increase detected in ${currentRisk.ward}`,

        `${currentRisk.ward}'s risk score increased by ${increase} points and is now ${currentRisk.risk}/100. Immediate review of current sensor and incident evidence is recommended.`,

        currentRisk.level ===
          "CRITICAL"
          ? "EMERGENCY"
          : "WARNING"
      )
    );
  }


  /* ----------------------------------------------------------------------- */
  /* VERIFIED CITIZEN REPORT                                                 */
  /* ----------------------------------------------------------------------- */

  if (
    hasNewVerifiedReport(
      previousRisk,
      currentRisk
    )
  ) {

    alerts.push(
      createAlert(
        currentRisk,

        "VERIFIED_REPORT",

        `Verified ground incident in ${currentRisk.ward}`,

        `${currentRisk.ward} now has ${currentRisk.reading.reportCount} officer-verified citizen incident report(s). Ground-level evidence should be reviewed alongside current sensor conditions.`,

        currentRisk.level ===
          "CRITICAL"
          ? "EMERGENCY"
          : currentRisk.level ===
              "HIGH"
            ? "WARNING"
            : "ADVISORY"
      )
    );
  }


  /* ----------------------------------------------------------------------- */
  /* PROPAGATION                                                             */
  /* ----------------------------------------------------------------------- */

  const propagationThreat =
    getStrongestPropagationThreat(
      propagationForecasts
    );


  if (
    propagationThreat
  ) {

    alerts.push(
      createAlert(
        currentRisk,

        "PROPAGATION",

        `Risk propagation toward ${propagationThreat.targetWard}`,

        `Current conditions indicate a ${propagationThreat.probability}% estimated probability of risk propagation toward ${propagationThreat.targetWard}. Authorities should monitor the neighbouring ward and prepare preventive measures.`,

        propagationThreat.probability >=
          75
          ? "WARNING"
          : "ADVISORY"
      )
    );
  }


  /* ----------------------------------------------------------------------- */
  /* REMOVE DUPLICATES                                                       */
  /* ----------------------------------------------------------------------- */

  return removeDuplicateAlerts(
    alerts
  );
}


/* ========================================================================= */
/* DUPLICATE FILTER                                                          */
/* ========================================================================= */

function removeDuplicateAlerts(
  alerts:
    GeneratedAlert[]
): GeneratedAlert[] {

  const seen =
    new Set<
      string
    >();


  return alerts.filter(
    (
      alert
    ) => {

      const key =
        `${alert.ward}-${alert.trigger}`;


      if (
        seen.has(
          key
        )
      ) {
        return false;
      }


      seen.add(
        key
      );


      return true;
    }
  );
}


/* ========================================================================= */
/* ALL WARDS                                                                 */
/* ========================================================================= */

export function generateAllWardAlerts(
  currentRisks:
    WardRisk[],
  previousRisks:
    WardRisk[] = []
): GeneratedAlert[] {

  const alerts:
    GeneratedAlert[] =
    [];


  for (
    const currentRisk
    of currentRisks
  ) {

    const previousRisk =
      previousRisks.find(
        (
          risk
        ) =>
          risk.ward ===
          currentRisk.ward
      ) ??
      null;


    alerts.push(
      ...generateWardAlerts({
        currentRisk,

        previousRisk,
      })
    );
  }


  return alerts.sort(
    (
      a,
      b
    ) =>
      getPriorityValue(
        b.priority
      ) -
      getPriorityValue(
        a.priority
      )
  );
}


/* ========================================================================= */
/* PRIORITY SORTING                                                          */
/* ========================================================================= */

function getPriorityValue(
  priority:
    AlertPriority
): number {

  switch (
    priority
  ) {

    case "EMERGENCY":
      return 4;

    case "WARNING":
      return 3;

    case "ADVISORY":
      return 2;

    case "INFO":
      return 1;

    default:
      return 0;
  }
}