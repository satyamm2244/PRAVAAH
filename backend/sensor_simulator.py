import json
import random
import time
import urllib.parse
import urllib.request
from datetime import datetime


# =============================================================================
# CONFIGURATION
# =============================================================================

API_URL = (
    "http://127.0.0.1:8000"
    "/api/sensors/readings"
)

SENSOR_ID = "BBSR-W58-RIVER-01"

WARD = "W58"

SENSOR_TYPE = "RIVER_LEVEL"

UNIT = "cm"

LATITUDE = 20.235138
LONGITUDE = 85.846

SEND_INTERVAL_SECONDS = 4


# =============================================================================
# SIMULATION CONFIGURATION
# =============================================================================

MIN_LEVEL = 10.0
MAX_LEVEL = 95.0

current_level = 37.5

direction = 1


# =============================================================================
# GENERATE NEXT READING
# =============================================================================

def generate_next_level():

    global current_level
    global direction

    change = random.uniform(
        1.5,
        5.0,
    )

    current_level += (
        change * direction
    )

    # -------------------------------------------------------------------------
    # CHANGE DIRECTION AT LIMITS
    # -------------------------------------------------------------------------

    if current_level >= MAX_LEVEL:

        current_level = MAX_LEVEL

        direction = -1

    elif current_level <= MIN_LEVEL:

        current_level = MIN_LEVEL

        direction = 1

    # -------------------------------------------------------------------------
    # SMALL NATURAL VARIATION
    # -------------------------------------------------------------------------

    noise = random.uniform(
        -0.8,
        0.8,
    )

    value = (
        current_level
        + noise
    )

    value = max(
        MIN_LEVEL,
        min(
            MAX_LEVEL,
            value,
        ),
    )

    return round(
        value,
        1,
    )


# =============================================================================
# SEND READING
# =============================================================================

def send_reading(
    value: float,
):

    payload = {
        "sensorId":
            SENSOR_ID,

        "ward":
            WARD,

        "sensorType":
            SENSOR_TYPE,

        "value":
            str(value),

        "unit":
            UNIT,

        "latitude":
            str(LATITUDE),

        "longitude":
            str(LONGITUDE),

        "status":
            "ONLINE",

        "source":
            "IOT_SIMULATOR",
    }

    encoded_data = (
        urllib.parse
        .urlencode(
            payload
        )
        .encode(
            "utf-8"
        )
    )

    request = urllib.request.Request(
        API_URL,
        data=encoded_data,
        method="POST",
    )

    request.add_header(
        "Content-Type",
        "application/x-www-form-urlencoded",
    )

    try:

        with urllib.request.urlopen(
            request,
            timeout=5,
        ) as response:

            response_data = (
                response
                .read()
                .decode(
                    "utf-8"
                )
            )

            data = json.loads(
                response_data
            )

            return data

    except Exception as error:

        print()
        print(
            "Unable to send sensor reading."
        )

        print(
            "Error:",
            error,
        )

        return None


# =============================================================================
# DISPLAY READING
# =============================================================================

def display_reading(
    value: float,
    response,
):

    now = datetime.now().strftime(
        "%H:%M:%S"
    )

    print()
    print(
        "============================================"
    )

    print(
        f"[{now}] PRAVAAH IoT Sensor"
    )

    print(
        "============================================"
    )

    print(
        f"Sensor : {SENSOR_ID}"
    )

    print(
        f"Ward   : {WARD}"
    )

    print(
        f"Level  : {value} {UNIT}"
    )

    if response:

        print(
            "Status : SENT"
        )

        print(
            f"Reading ID: {response.get('id')}"
        )

    else:

        print(
            "Status : FAILED"
        )


# =============================================================================
# MAIN SIMULATOR
# =============================================================================

def run_simulator():

    print()
    print(
        "============================================"
    )

    print(
        "      PRAVAAH SENSOR SIMULATOR"
    )

    print(
        "============================================"
    )

    print()

    print(
        f"Sensor ID : {SENSOR_ID}"
    )

    print(
        f"Ward      : {WARD}"
    )

    print(
        f"Type      : {SENSOR_TYPE}"
    )

    print(
        f"Interval  : {SEND_INTERVAL_SECONDS} seconds"
    )

    print()

    print(
        "Simulation started."
    )

    print(
        "Press CTRL+C to stop."
    )


    try:

        while True:

            value = (
                generate_next_level()
            )

            response = (
                send_reading(
                    value
                )
            )

            display_reading(
                value,
                response,
            )

            time.sleep(
                SEND_INTERVAL_SECONDS
            )

    except KeyboardInterrupt:

        print()
        print()

        print(
            "============================================"
        )

        print(
            "Sensor simulator stopped."
        )

        print(
            "============================================"
        )


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":

    run_simulator()