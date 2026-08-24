import re
from typing import Any


# =============================================================================
# EMERGENCY TYPES
# =============================================================================

EMERGENCY_TYPES = {
    "FLOOD",
    "WATER_ENTERING_HOME",
    "ELECTRICAL_HAZARD",
    "TRAPPED",
    "INJURY",
    "EVACUATION",
    "VEHICLE_STUCK",
    "GENERAL",
}


# =============================================================================
# TEXT NORMALIZATION
# =============================================================================

def normalize_message(
    message: str,
) -> str:
    """
    Normalize citizen messages so small wording
    differences do not break classification.
    """

    text = (
        message
        .lower()
        .strip()
    )

    text = re.sub(
        r"[^\w\s']",
        " ",
        text,
    )

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text


# =============================================================================
# PHRASE MATCHING
# =============================================================================

def contains_any(
    text: str,
    phrases: list[str],
) -> bool:

    return any(
        phrase in text
        for phrase in phrases
    )


# =============================================================================
# EMERGENCY CLASSIFICATION
# =============================================================================

def classify_emergency(
    message: str,
) -> str:

    text = normalize_message(
        message
    )


    # -------------------------------------------------------------------------
    # ELECTRICAL HAZARD
    # -------------------------------------------------------------------------
    #
    # Electrical danger gets highest priority because
    # floodwater + electricity can immediately become
    # life-threatening.
    # -------------------------------------------------------------------------

    electrical_keywords = [
        "electric wire",
        "electrical wire",
        "live wire",
        "fallen wire",
        "electric pole",
        "electrical pole",
        "transformer",
        "electricity in water",
        "current in water",
        "electric shock",
        "electrocut",
        "sparking",
        "wire in water",
        "wires in water",
        "wire near water",
        "wires near water",
        "electric",
        "electricity",
    ]

    if contains_any(
        text,
        electrical_keywords,
    ):
        return (
            "ELECTRICAL_HAZARD"
        )


    # -------------------------------------------------------------------------
    # TRAPPED
    # -------------------------------------------------------------------------

    trapped_keywords = [
        "i am trapped",
        "i'm trapped",
        "im trapped",

        "we are trapped",
        "we're trapped",

        "i am stuck",
        "i'm stuck",
        "im stuck",

        "cannot get out",
        "can't get out",
        "cant get out",

        "cannot leave",
        "can't leave",
        "cant leave",

        "surrounded by water",
        "stuck in floodwater",
        "trapped in floodwater",
        "trapped by water",
        "water surrounding my house",
    ]

    if contains_any(
        text,
        trapped_keywords,
    ):
        return (
            "TRAPPED"
        )


    # -------------------------------------------------------------------------
    # SERIOUS INJURY
    # -------------------------------------------------------------------------

    injury_keywords = [
        "someone is injured",
        "person is injured",
        "i am injured",
        "i'm injured",

        "bleeding",
        "heavy bleeding",
        "badly hurt",

        "unconscious",
        "not breathing",
        "difficulty breathing",

        "fracture",
        "broken bone",
        "wound",
        "head injury",
    ]

    if contains_any(
        text,
        injury_keywords,
    ):
        return (
            "INJURY"
        )


    # -------------------------------------------------------------------------
    # WATER ENTERING HOME
    # -------------------------------------------------------------------------

    home_keywords = [
        "water entering my house",
        "water is entering my house",

        "water entering my home",
        "water is entering my home",

        "water coming into my house",
        "water is coming into my house",

        "water coming inside",
        "water is coming inside",

        "water inside my house",
        "water inside my home",

        "water in my house",
        "water in my home",

        "house is flooding",
        "home is flooding",

        "house flooding",
        "home flooding",

        "my house is flooded",
        "my home is flooded",

        "water level inside house",
        "water level inside home",
    ]

    if contains_any(
        text,
        home_keywords,
    ):
        return (
            "WATER_ENTERING_HOME"
        )


    # -------------------------------------------------------------------------
    # VEHICLE STUCK
    # -------------------------------------------------------------------------

    vehicle_keywords = [
        "car stuck",
        "car is stuck",

        "vehicle stuck",
        "vehicle is stuck",

        "bike stuck",
        "bike is stuck",

        "scooter stuck",
        "scooter is stuck",

        "inside car",
        "inside my car",

        "inside vehicle",
        "inside my vehicle",

        "water around my car",
        "water entering my car",

        "car in floodwater",
        "vehicle in floodwater",
    ]

    if contains_any(
        text,
        vehicle_keywords,
    ):
        return (
            "VEHICLE_STUCK"
        )


    # -------------------------------------------------------------------------
    # EVACUATION
    # -------------------------------------------------------------------------

    evacuation_keywords = [
        "should i evacuate",
        "do i need to evacuate",

        "should we evacuate",
        "do we need to evacuate",

        "evacuate",
        "evacuation",

        "leave my house",
        "leave my home",

        "where should i go",
        "where can i go",

        "safe place",
        "safer place",

        "relief shelter",
        "emergency shelter",
        "shelter",

        "where is safe",
        "where should we go",
    ]

    if contains_any(
        text,
        evacuation_keywords,
    ):
        return (
            "EVACUATION"
        )


    # -------------------------------------------------------------------------
    # FLOOD / WATERLOGGING
    # -------------------------------------------------------------------------

    flood_keywords = [
        "flood",
        "flooding",
        "floodwater",

        "waterlogging",
        "water logged",
        "waterlogged",

        "road underwater",
        "road under water",

        "street underwater",
        "street under water",

        "water on road",
        "water on the road",

        "road flooded",
        "street flooded",

        "rising water",
        "water level rising",

        "heavy waterlogging",
    ]

    if contains_any(
        text,
        flood_keywords,
    ):
        return (
            "FLOOD"
        )


    return (
        "GENERAL"
    )


# =============================================================================
# BASE SAFETY GUIDANCE
# =============================================================================

def get_safety_guidance(
    emergency_type: str,
) -> list[str]:


    # -------------------------------------------------------------------------
    # ELECTRICAL HAZARD
    # -------------------------------------------------------------------------

    if (
        emergency_type ==
        "ELECTRICAL_HAZARD"
    ):

        return [
            (
                "Do not enter or touch standing water near electrical poles, "
                "wires, transformers, street lights, or electrical equipment."
            ),

            (
                "Move away from the electrical source without touching nearby "
                "metal objects, fences, poles, or damaged equipment."
            ),

            (
                "Never attempt to move or inspect a fallen electrical wire yourself."
            ),

            (
                "Move to a dry and elevated location if you can do so safely."
            ),

            (
                "Warn other people to stay away from the affected area."
            ),

            (
                "Contact official emergency services or the local electricity "
                "authority immediately."
            ),
        ]


    # -------------------------------------------------------------------------
    # TRAPPED
    # -------------------------------------------------------------------------

    if (
        emergency_type ==
        "TRAPPED"
    ):

        return [
            (
                "Move to the highest safe location available without entering "
                "fast-moving or deep floodwater."
            ),

            (
                "Do not attempt to walk, swim, or drive through moving floodwater."
            ),

            (
                "Keep your phone dry and conserve battery power."
            ),

            (
                "Share your exact location with family members and official "
                "emergency responders."
            ),

            (
                "Use a flashlight, bright cloth, whistle, balcony, or visible "
                "window to help rescuers identify your location."
            ),

            (
                "If the structure becomes unsafe, follow instructions from "
                "authorized rescue personnel."
            ),
        ]


    # -------------------------------------------------------------------------
    # INJURY
    # -------------------------------------------------------------------------

    if (
        emergency_type ==
        "INJURY"
    ):

        return [
            (
                "Move the injured person away from immediate hazards only if "
                "it can be done safely."
            ),

            (
                "Avoid unnecessary movement if a serious head, neck, back, "
                "or fracture injury is suspected."
            ),

            (
                "For serious external bleeding, apply firm continuous pressure "
                "with a clean cloth or dressing if available."
            ),

            (
                "Keep the injured person warm and monitor their breathing and "
                "responsiveness."
            ),

            (
                "Seek urgent professional medical assistance for serious bleeding, "
                "unconsciousness, breathing difficulty, or major injuries."
            ),
        ]


    # -------------------------------------------------------------------------
    # WATER ENTERING HOME
    # -------------------------------------------------------------------------

    if (
        emergency_type ==
        "WATER_ENTERING_HOME"
    ):

        return [
            (
                "Move children, older adults, medicines, drinking water, "
                "important documents, and essential supplies to a higher floor "
                "or elevated location."
            ),

            (
                "Switch off the main electricity supply only if the switch can "
                "be reached safely without entering or touching water."
            ),

            (
                "Do not touch electrical appliances, switches, sockets, or wires "
                "while standing in water."
            ),

            (
                "Do not remain on the ground floor if the water level continues "
                "to rise."
            ),

            (
                "Keep an emergency bag ready with medicines, identification, "
                "documents, drinking water, phone charger or power bank, and "
                "basic essentials."
            ),

            (
                "If authorities issue an evacuation instruction, leave through "
                "the recommended safe route as soon as it is safe to do so."
            ),
        ]


    # -------------------------------------------------------------------------
    # VEHICLE STUCK
    # -------------------------------------------------------------------------

    if (
        emergency_type ==
        "VEHICLE_STUCK"
    ):

        return [
            (
                "Do not attempt to drive deeper into floodwater."
            ),

            (
                "If water is rising around the vehicle and you can safely reach "
                "higher ground, leave the vehicle before conditions worsen."
            ),

            (
                "Do not walk through fast-moving or deep floodwater after leaving "
                "the vehicle."
            ),

            (
                "If you cannot leave safely, contact emergency responders and "
                "share your exact location."
            ),

            (
                "Avoid restarting a vehicle that has been deeply submerged until "
                "it has been professionally inspected."
            ),
        ]


    # -------------------------------------------------------------------------
    # EVACUATION
    # -------------------------------------------------------------------------

    if (
        emergency_type ==
        "EVACUATION"
    ):

        return [
            (
                "Follow evacuation instructions issued by official authorities."
            ),

            (
                "Take essential medicines, identification documents, drinking "
                "water, a charged phone, power bank, and necessary clothing."
            ),

            (
                "Avoid flooded roads, underpasses, open drains, canals, "
                "riverbanks, and low-lying routes."
            ),

            (
                "Assist children, older adults, and people with disabilities."
            ),

            (
                "Move toward a designated shelter or known safe elevated location."
            ),

            (
                "Do not return to an evacuated area until authorities indicate "
                "that it is safe."
            ),
        ]


    # -------------------------------------------------------------------------
    # FLOOD
    # -------------------------------------------------------------------------

    if (
        emergency_type ==
        "FLOOD"
    ):

        return [
            (
                "Avoid walking or driving through floodwater."
            ),

            (
                "Move toward higher ground if water levels are increasing."
            ),

            (
                "Stay away from open drains, canals, riverbanks, damaged roads, "
                "and electrical infrastructure."
            ),

            (
                "Keep children and older adults away from floodwater."
            ),

            (
                "Keep your phone charged and monitor official warnings and "
                "evacuation instructions."
            ),
        ]


    # -------------------------------------------------------------------------
    # GENERAL
    # -------------------------------------------------------------------------

    return [
        (
            "Stay aware of current local conditions."
        ),

        (
            "Avoid areas affected by flooding, damaged electrical infrastructure, "
            "open drains, or unstable structures."
        ),

        (
            "Follow instructions issued by local authorities."
        ),

        (
            "Contact official emergency services immediately if there is an "
            "immediate threat to life or safety."
        ),
    ]


# =============================================================================
# RISK CONTEXT
# =============================================================================

def build_risk_context(
    ward_data:
        dict[str, Any],
) -> str:

    ward = (
        ward_data.get(
            "ward",
            "Unknown Ward",
        )
    )


    rainfall = (
        ward_data.get(
            "rainfallMm",
            0,
        )
    )


    river_level = (
        ward_data.get(
            "riverLevelCm",
            0,
        )
    )


    verified_reports = (
        ward_data.get(
            "verifiedReportCount",

            ward_data.get(
                "reportCount",
                0,
            ),
        )
    )


    return (
        f"{ward} currently reports "
        f"{rainfall} mm/hr rainfall, "
        f"a river-level reading of "
        f"{river_level} cm, and "
        f"{verified_reports} verified "
        f"citizen incident report(s)."
    )


# =============================================================================
# RISK WARNING
# =============================================================================

def get_risk_warning(
    risk_level: str,
) -> str | None:

    risk_level = (
        risk_level
        or "NORMAL"
    ).upper()


    if (
        risk_level ==
        "CRITICAL"
    ):

        return (
            "Your ward is currently under CRITICAL risk. "
            "Treat official evacuation and emergency instructions as urgent."
        )


    if (
        risk_level ==
        "HIGH"
    ):

        return (
            "Your ward is currently under HIGH risk. "
            "Avoid unnecessary travel and prepare for possible evacuation."
        )


    if (
        risk_level ==
        "WATCH"
    ):

        return (
            "Your ward is currently under WATCH. "
            "Conditions require close monitoring."
        )


    return (
        "Your ward is currently classified as NORMAL, but local hazards can "
        "still exist. Follow the safety guidance for the situation you described."
    )


# =============================================================================
# IMMEDIATE DANGER
# =============================================================================

def is_immediate_danger(
    emergency_type: str,
) -> bool:

    return (
        emergency_type
        in {
            "ELECTRICAL_HAZARD",
            "TRAPPED",
            "INJURY",
        }
    )


# =============================================================================
# ASSISTANT RESPONSE
# =============================================================================

def generate_emergency_response(
    message: str,

    ward_data:
        dict[str, Any],

    risk_level: str,
) -> dict[str, Any]:

    emergency_type = (
        classify_emergency(
            message
        )
    )


    guidance = (
        get_safety_guidance(
            emergency_type
        )
    )


    context = (
        build_risk_context(
            ward_data
        )
    )


    risk_warning = (
        get_risk_warning(
            risk_level
        )
    )


    immediate_danger = (
        is_immediate_danger(
            emergency_type
        )
    )


    return {

        "emergencyType":
            emergency_type,

        "ward":
            ward_data.get(
                "ward"
            ),

        "riskLevel":
            risk_level,

        "context":
            context,

        "riskWarning":
            risk_warning,

        "guidance":
            guidance,

        "immediateDanger":
            immediate_danger,

        "disclaimer":
            (
                "PRAVAAH provides safety and decision-support guidance. "
                "It does not replace official emergency responders, medical "
                "professionals, disaster-management authorities, or evacuation orders."
            ),
    }