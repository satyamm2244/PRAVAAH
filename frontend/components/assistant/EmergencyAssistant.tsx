"use client";

import {
  Bot,
  ChevronDown,
  Loader2,
  LocateFixed,
  MapPin,
  MessageCircle,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getUserLocation,
} from "@/lib/geolocation";

import {
  findNearestWard,
} from "@/lib/location";


type AssistantResponse = {
  emergencyType: string;

  ward: string;

  riskLevel: string;

  riskScore: number;

  context: string;

  riskWarning: string | null;

  guidance: string[];

  immediateDanger: boolean;

  disclaimer: string;

  dataMode: string;

  sources: Record<
    string,
    unknown
  >;

  timestamp: number;
};


type ChatMessage = {
  id: string;

  role:
    | "USER"
    | "ASSISTANT";

  text: string;

  response?:
    AssistantResponse;
};


type BackendWard = {
  ward: string;
  rainfallMm: number;
  riverLevelCm: number;
  reportCount: number;
  latitude: number;
  longitude: number;
};


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


const QUICK_ACTIONS = [
  {
    label:
      "Flood near me",

    message:
      "There is flooding near me. What should I do?",
  },

  {
    label:
      "Water entering home",

    message:
      "Water is entering my house. What should I do?",
  },

  {
    label:
      "Electrical danger",

    message:
      "There are electric wires in the floodwater near me. What should I do?",
  },

  {
    label:
      "I am trapped",

    message:
      "I am trapped because of floodwater. What should I do?",
  },

  {
    label:
      "Someone is injured",

    message:
      "Someone is injured during the disaster. What should I do?",
  },

  {
    label:
      "Evacuation help",

    message:
      "Should I evacuate and what should I take with me?",
  },
];


export default function EmergencyAssistant() {
  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );

  const [
    backendWards,
    setBackendWards,
  ] =
    useState<
      BackendWard[]
    >([]);

  const [
    ward,
    setWard,
  ] =
    useState(
      "W16"
    );

  const [
    locationStatus,
    setLocationStatus,
  ] =
    useState<
      "IDLE" |
      "DETECTING" |
      "DETECTED" |
      "FAILED"
    >(
      "IDLE"
    );

  const [
    locationAccuracy,
    setLocationAccuracy,
  ] =
    useState<number | null>(
      null
    );

  const [
    locationError,
    setLocationError,
  ] =
    useState<string | null>(
      null
    );

  const [
    manualWardMode,
    setManualWardMode,
  ] =
    useState(
      false
    );

  const [
    input,
    setInput,
  ] =
    useState(
      ""
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );

  const [
    messages,
    setMessages,
  ] =
    useState<
      ChatMessage[]
    >([
      {
        id:
          "welcome",

        role:
          "ASSISTANT",

        text:
          "I can help with flood, waterlogging, electrical hazards, evacuation and emergency safety guidance using live PRAVAAH ward data.",
      },
    ]);


  const messagesEndRef =
    useRef<
      HTMLDivElement | null
    >(
      null
    );


  /* ----------------------------------------------------------------------- */
  /* LOAD ALL WARD COORDINATES                                               */
  /* ----------------------------------------------------------------------- */

  useEffect(
    () => {

      async function loadWards() {

        try {

          const response =
            await fetch(
              `${API_BASE_URL}/api/wards`,
              {
                cache:
                  "no-store",
              }
            );

          if (
            !response.ok
          ) {
            throw new Error(
              `Unable to load wards: ${response.status}`
            );
          }

          const data =
            await response.json();

          const wards:
            BackendWard[] =
            Array.isArray(
              data
            )
              ? data
              : Array.isArray(
                    data.wards
                  )
                ? data.wards
                : [];

          setBackendWards(
            wards
          );

          console.log(
            `PRAVAAH loaded ${wards.length} ward coordinates.`
          );

        } catch (
          error
        ) {

          console.error(
            "Unable to load backend ward coordinates:",
            error
          );

          setBackendWards(
            []
          );

        }
      }

      loadWards();

    },
    []
  );


  /* ----------------------------------------------------------------------- */
  /* LOCATION DETECTION                                                      */
  /* ----------------------------------------------------------------------- */

  async function detectLocation() {
    setLocationStatus("DETECTING");
    setLocationError(null);

    try {
      const position =
        await getUserLocation();

      const detectedWard =
        findNearestWard(
          position.latitude,
          position.longitude,
          backendWards
        );

      if (!detectedWard) {
        throw new Error(
          "Unable to match your location to a PRAVAAH ward."
        );
      }


      /*
       * Prevent users outside Bhubaneswar
       * from being incorrectly assigned to
       * the nearest city ward.
       */
      const MAX_WARD_DISTANCE_KM =
        10;


      if (
        detectedWard.distanceKm >
        MAX_WARD_DISTANCE_KM
      ) {

        console.log(
          "PRAVAAH location outside monitoring area:",
          {
            distanceKm:
              detectedWard.distanceKm,

            nearestWard:
              detectedWard.ward,

            source:
              detectedWard.source,
          }
        );


        setLocationAccuracy(
          Math.round(
            position.accuracy
          )
        );


        setLocationStatus(
          "FAILED"
        );


        setManualWardMode(
          true
        );


        setLocationError(
          "Your current location is outside the Bhubaneswar monitoring area. Select a ward manually to explore PRAVAAH services."
        );


        return;
      }


      console.log(
        "PRAVAAH location:",
        {
          userLatitude:
            position.latitude,

          userLongitude:
            position.longitude,

          ward:
            detectedWard.ward,

          wardLatitude:
            detectedWard.latitude,

          wardLongitude:
            detectedWard.longitude,

          distanceKm:
            detectedWard.distanceKm,

          source:
            detectedWard.source,
        }
      );

      setWard(
        detectedWard.ward
      );

      setLocationAccuracy(
        Math.round(
          position.accuracy
        )
      );

      setLocationStatus(
        "DETECTED"
      );

      setManualWardMode(
        false
      );
    } catch (error) {
      console.error(
        "Location detection failed:",
        error
      );

      setLocationStatus(
        "FAILED"
      );

      setManualWardMode(
        true
      );

      setLocationError(
        error instanceof Error
          ? error.message
          : "Unable to detect your location."
      );
    }
  }


  useEffect(
    () => {
      if (
        open &&
        locationStatus === "IDLE"
      ) {
        detectLocation();
      }
    },
    [
      open,
      locationStatus,
    ]
  );


  /* ----------------------------------------------------------------------- */
  /* AUTO SCROLL                                                             */
  /* ----------------------------------------------------------------------- */

  useEffect(
    () => {

      messagesEndRef.current
        ?.scrollIntoView({
          behavior:
            "smooth",
        });

    },
    [
      messages,
      loading,
    ]
  );


  /* ----------------------------------------------------------------------- */
  /* SEND MESSAGE                                                            */
  /* ----------------------------------------------------------------------- */

  async function sendMessage(
    message: string
  ) {

    const cleanMessage =
      message.trim();


    if (
      !cleanMessage ||
      loading
    ) {
      return;
    }


    const userMessage:
      ChatMessage = {

      id:
        crypto.randomUUID(),

      role:
        "USER",

      text:
        cleanMessage,
    };


    setMessages(
      (
        previous
      ) => [
        ...previous,
        userMessage,
      ]
    );


    setInput(
      ""
    );


    setLoading(
      true
    );


    try {

      const response =
        await fetch(
          `${API_BASE_URL}/api/assistant/chat`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                message:
                  cleanMessage,

                ward,
              }),
          }
        );


      if (
        !response.ok
      ) {

        throw new Error(
          `Assistant returned ${response.status}`
        );

      }


      const data:
        AssistantResponse =
        await response.json();


      const assistantMessage:
        ChatMessage = {

        id:
          crypto.randomUUID(),

        role:
          "ASSISTANT",

        text:
          data.riskWarning ??
          `Current status for ${data.ward}: ${data.riskLevel}.`,

        response:
          data,
      };


      setMessages(
        (
          previous
        ) => [
          ...previous,
          assistantMessage,
        ]
      );

    } catch (
      error
    ) {

      console.error(
        "Emergency assistant failed:",
        error
      );


      setMessages(
        (
          previous
        ) => [
          ...previous,

          {
            id:
              crypto.randomUUID(),

            role:
              "ASSISTANT",

            text:
              "I could not connect to the PRAVAAH emergency service. If you are in immediate danger, contact official emergency services or local authorities directly.",
          },
        ]
      );

    } finally {

      setLoading(
        false
      );

    }
  }


  /* ----------------------------------------------------------------------- */
  /* FORM                                                                    */
  /* ----------------------------------------------------------------------- */

  function handleSubmit(
    event:
      FormEvent
  ) {

    event.preventDefault();


    sendMessage(
      input
    );

  }


  return (
    <>

      {/* =================================================================== */}
      {/* FLOATING BUTTON                                                     */}
      {/* =================================================================== */}

      {!open && (

        <button
          type="button"
          onClick={() =>
            setOpen(
              true
            )
          }
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-2xl shadow-blue-500/30 transition hover:scale-105 hover:bg-blue-400"
          aria-label="Open PRAVAAH Assistant"
        >

          <MessageCircle className="h-6 w-6" />

        </button>

      )}


      {/* =================================================================== */}
      {/* CHAT PANEL                                                          */}
      {/* =================================================================== */}

      {open && (

        <div className="fixed bottom-4 right-4 z-50 flex h-[680px] max-h-[calc(100vh-2rem)] w-[390px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#081423] text-white shadow-2xl">

          {/* =============================================================== */}
          {/* HEADER                                                          */}
          {/* =============================================================== */}

          <div className="shrink-0 border-b border-white/10 bg-[#0a1728] px-4 py-4">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">

                  <Bot className="h-5 w-5 text-blue-400" />

                </div>


                <div>

                  <p className="text-sm font-semibold">
                    PRAVAAH Assistant
                  </p>


                  <p className="text-[10px] text-slate-500">
                    Emergency safety guidance
                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
                aria-label="Close PRAVAAH Assistant"
              >

                <X className="h-4 w-4" />

              </button>

            </div>

          </div>


          {/* =============================================================== */}
          {/* LOCATION / WARD                                                 */}
          {/* =============================================================== */}

          <div className="shrink-0 border-b border-white/10 px-4 py-3">

            {!manualWardMode ? (

              <div className="flex items-center justify-between gap-3">

                <div className="min-w-0">

                  <p className="text-[10px] uppercase tracking-wider text-slate-600">
                    Your Location
                  </p>

                  {locationStatus === "DETECTING" ? (

                    <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                      Detecting your ward...
                    </div>

                  ) : locationStatus === "DETECTED" ? (

                    <div className="mt-1.5 flex items-center gap-2">

                      <MapPin className="h-4 w-4 shrink-0 text-emerald-400" />

                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          Location detected • {ward}
                        </p>

                        {locationAccuracy !== null && (
                          <p className="mt-0.5 text-[9px] text-slate-600">
                            GPS accuracy approximately {locationAccuracy} m
                          </p>
                        )}
                      </div>

                    </div>

                  ) : (

                    <p className="mt-1.5 text-xs text-slate-500">
                      Location has not been detected yet.
                    </p>

                  )}

                </div>

                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locationStatus === "DETECTING"}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[10px] text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                  Refresh
                </button>

              </div>

            ) : (

              <div>

                <div className="flex items-center justify-between gap-3">

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      Select Your Ward
                    </p>

                    <p className="mt-1 text-[9px] text-yellow-400/80">
                      Automatic location unavailable
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={locationStatus === "DETECTING"}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[10px] text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                  >
                    {locationStatus === "DETECTING" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LocateFixed className="h-3.5 w-3.5" />
                    )}
                    Retry
                  </button>

                </div>

                {locationError && (
                  <p className="mt-2 text-[10px] leading-4 text-slate-600">
                    {locationError}
                  </p>
                )}

                <div className="relative mt-2">

                  <select
                    value={ward}
                    onChange={(event) =>
                      setWard(
                        event.target.value
                      )
                    }
                    className="w-full appearance-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 pr-8 text-xs text-slate-300 outline-none focus:border-blue-500/40"
                  >
                    {Array.from(
                      { length: 67 },
                      (_, index) =>
                        `W${index + 1}`
                    ).map((wardId) => (
                      <option
                        key={wardId}
                        value={wardId}
                      >
                        {wardId}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-600" />

                </div>

              </div>

            )}

          </div>


          {/* =============================================================== */}
          {/* MESSAGES                                                        */}
          {/* =============================================================== */}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">

            <div className="space-y-4">

              {messages.map(
                (
                  message
                ) => (

                <ChatBubble
                  key={
                    message.id
                  }
                  message={
                    message
                  }
                />

              )
            )}


              {loading && (

                <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2.5 text-xs text-slate-500">

                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />

                  Checking live PRAVAAH data...

                </div>

              )}


              <div
                ref={
                  messagesEndRef
                }
              />

            </div>

          </div>


          {/* =============================================================== */}
          {/* BOTTOM CONTROLS                                                 */}
          {/* =============================================================== */}

          <div className="shrink-0 border-t border-white/10 bg-[#081423] px-4 py-3">

            {/* ============================================================= */}
            {/* QUICK ACTIONS                                                 */}
            {/* ============================================================= */}

            <div
              className="
                mb-3 flex gap-2 overflow-x-auto
                [scrollbar-width:none]
                [&::-webkit-scrollbar]:hidden
              "
            >

              {QUICK_ACTIONS.map(
                (
                  action
                ) => (

                <button
                  key={
                    action.label
                  }
                  type="button"
                  onClick={() =>
                    sendMessage(
                      action.message
                    )
                  }
                  disabled={
                    loading
                  }
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                >

                  {
                    action.label
                  }

                </button>

              )
            )}

            </div>


            {/* ============================================================= */}
            {/* INPUT                                                         */}
            {/* ============================================================= */}

            <form
              onSubmit={
                handleSubmit
              }
              className="flex items-end gap-2"
            >

              <textarea
                rows={
                  1
                }
                value={
                  input
                }
                onChange={(
                  event
                ) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={(
                  event
                ) => {

                  if (
                    event.key ===
                      "Enter" &&
                    !event.shiftKey
                  ) {

                    event.preventDefault();


                    if (
                      input.trim()
                    ) {

                      sendMessage(
                        input
                      );

                    }
                  }
                }}
                placeholder="Describe what is happening..."
                className="max-h-24 min-h-10 min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm leading-5 text-white placeholder:text-slate-600 focus:border-blue-500/40 focus:outline-none"
              />


              <button
                type="submit"
                disabled={
                  loading ||
                  !input.trim()
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >

                {loading ? (

                  <Loader2 className="h-4 w-4 animate-spin" />

                ) : (

                  <Send className="h-4 w-4" />

                )}

              </button>

            </form>


            <p className="mt-2 text-center text-[9px] leading-4 text-slate-700">
              For immediate danger, follow official emergency instructions.
            </p>

          </div>

        </div>

      )}

    </>
  );
}


/* ========================================================================= */
/* CHAT BUBBLE                                                               */
/* ========================================================================= */

function ChatBubble({
  message,
}: {
  message:
    ChatMessage;
}) {

  const user =
    message.role ===
    "USER";


  return (
    <div
      className={`flex ${
        user
          ? "justify-end"
          : "justify-start"
      }`}
    >

      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-3 ${
          user
            ? "bg-blue-500 text-white"
            : "border border-white/10 bg-white/[0.035] text-slate-300"
        }`}
      >

        <p className="whitespace-pre-wrap break-words text-xs leading-5">
          {
            message.text
          }
        </p>


        {message.response && (

          <AssistantDetails
            response={
              message.response
            }
          />

        )}

      </div>

    </div>
  );
}


/* ========================================================================= */
/* ASSISTANT DETAILS                                                         */
/* ========================================================================= */

function AssistantDetails({
  response,
}: {
  response:
    AssistantResponse;
}) {

  return (
    <div className="mt-3 border-t border-white/10 pt-3">

      {/* =================================================================== */}
      {/* RISK CONTEXT                                                        */}
      {/* =================================================================== */}

      <div
        className={`rounded-lg p-3 ${
          response.immediateDanger
            ? "border border-red-500/10 bg-red-500/10"
            : "border border-blue-500/10 bg-blue-500/[0.06]"
        }`}
      >

        <div className="flex items-center gap-2">

          <ShieldAlert
            className={`h-4 w-4 shrink-0 ${
              response.immediateDanger
                ? "text-red-400"
                : "text-blue-400"
            }`}
          />


          <p className="text-[10px] font-semibold uppercase tracking-wider">
            {
              response.ward
            }{" "}
            •{" "}
            {
              response.riskLevel
            }{" "}
            • Risk{" "}
            {
              response.riskScore
            }
            /100
          </p>

        </div>


        <p className="mt-2 text-[11px] leading-5 text-slate-400">
          {
            response.context
          }
        </p>

      </div>


      {/* =================================================================== */}
      {/* GUIDANCE                                                            */}
      {/* =================================================================== */}

      <div className="mt-3">

        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          What to do
        </p>


        <ul className="mt-2 space-y-2.5">

          {response.guidance.map(
            (
              item,
              index
            ) => (

            <li
              key={
                index
              }
              className="flex gap-2 text-[11px] leading-5 text-slate-400"
            >

              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-blue-400" />


              <span>
                {
                  item
                }
              </span>

            </li>

          )
        )}

        </ul>

      </div>


      {/* =================================================================== */}
      {/* DISCLAIMER                                                          */}
      {/* =================================================================== */}

      <p className="mt-4 border-t border-white/5 pt-3 text-[9px] leading-4 text-slate-600">
        {
          response.disclaimer
        }
      </p>

    </div>
  );
}