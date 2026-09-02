"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Cross,
  Droplets,
  HeartHandshake,
  LocateFixed,
  MapPin,
  Navigation,
  ShieldCheck,
  Utensils,
} from "lucide-react";

import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";


/* ========================================================================= */
/* TYPES                                                                     */
/* ========================================================================= */

type SafePlaceType =
  | "RELIEF_CENTRE"
  | "SHELTER"
  | "NGO"
  | "HOSPITAL";

type SafePlaceStatus =
  | "AVAILABLE"
  | "LIMITED"
  | "UNAVAILABLE";

type SafePlace = {
  id: string;
  name: string;
  type: SafePlaceType;
  ward: string;
  address: string;
  latitude: number;
  longitude: number;
  status: SafePlaceStatus;
  capacityNote: string;
  services: string[];
};


/* ========================================================================= */
/* CONFIG                                                                    */
/* ========================================================================= */

const WARDS =
  Array.from(
    {
      length: 67,
    },
    (
      _,
      index
    ) =>
      `W${index + 1}`
  );


/*
 * Prototype safe-location registry.
 *
 * These are demo records used to validate the Safe Places workflow.
 * Replace them with verified BMC/ODRAF/NGO/government shelter data
 * before any real emergency deployment.
 */

const SAFE_PLACES:
  SafePlace[] = [
    {
      id: "sp-01",
      name: "Central Community Relief Centre",
      type: "RELIEF_CENTRE",
      ward: "W14",
      address:
        "Central Bhubaneswar relief zone",
      latitude:
        20.2961,
      longitude:
        85.8245,
      status:
        "AVAILABLE",
      capacityNote:
        "Open for emergency shelter",
      services: [
        "Shelter",
        "Food",
        "Drinking Water",
        "First Aid",
      ],
    },

    {
      id: "sp-02",
      name: "Ward 16 Emergency Shelter",
      type: "SHELTER",
      ward: "W16",
      address:
        "Ward 16 community shelter area",
      latitude:
        20.3058,
      longitude:
        85.8322,
      status:
        "AVAILABLE",
      capacityNote:
        "General shelter capacity available",
      services: [
        "Shelter",
        "Drinking Water",
        "Food",
      ],
    },

    {
      id: "sp-03",
      name: "Community Support NGO Centre",
      type: "NGO",
      ward: "W18",
      address:
        "Ward 18 community support zone",
      latitude:
        20.3151,
      longitude:
        85.8367,
      status:
        "LIMITED",
      capacityNote:
        "Limited overnight accommodation",
      services: [
        "Food",
        "Drinking Water",
        "Basic Supplies",
      ],
    },

    {
      id: "sp-04",
      name: "North Zone Relief Shelter",
      type: "RELIEF_CENTRE",
      ward: "W21",
      address:
        "North Bhubaneswar relief zone",
      latitude:
        20.3254,
      longitude:
        85.8217,
      status:
        "AVAILABLE",
      capacityNote:
        "Open for families and individuals",
      services: [
        "Shelter",
        "Food",
        "Drinking Water",
        "Basic Supplies",
      ],
    },

    {
      id: "sp-05",
      name: "Emergency Medical Support Centre",
      type: "HOSPITAL",
      ward: "W24",
      address:
        "Medical response zone, Bhubaneswar",
      latitude:
        20.3118,
      longitude:
        85.8512,
      status:
        "AVAILABLE",
      capacityNote:
        "Emergency medical support available",
      services: [
        "Medical Aid",
        "First Aid",
        "Drinking Water",
      ],
    },

    {
      id: "sp-06",
      name: "South Zone Community Shelter",
      type: "SHELTER",
      ward: "W30",
      address:
        "South Bhubaneswar community zone",
      latitude:
        20.2708,
      longitude:
        85.8335,
      status:
        "AVAILABLE",
      capacityNote:
        "Emergency shelter operational",
      services: [
        "Shelter",
        "Food",
        "Drinking Water",
      ],
    },

    {
      id: "sp-07",
      name: "East Zone Relief Point",
      type: "RELIEF_CENTRE",
      ward: "W35",
      address:
        "East Bhubaneswar relief zone",
      latitude:
        20.2905,
      longitude:
        85.8664,
      status:
        "LIMITED",
      capacityNote:
        "Limited capacity remaining",
      services: [
        "Shelter",
        "Drinking Water",
        "First Aid",
      ],
    },

    {
      id: "sp-08",
      name: "West Zone NGO Support Centre",
      type: "NGO",
      ward: "W41",
      address:
        "West Bhubaneswar support zone",
      latitude:
        20.3018,
      longitude:
        85.7894,
      status:
        "AVAILABLE",
      capacityNote:
        "Relief supplies and support available",
      services: [
        "Food",
        "Drinking Water",
        "Basic Supplies",
        "First Aid",
      ],
    },

    {
      id: "sp-09",
      name: "Ward 49 Community Relief Centre",
      type: "RELIEF_CENTRE",
      ward: "W49",
      address:
        "Ward 49 community relief zone",
      latitude:
        20.2788,
      longitude:
        85.8071,
      status:
        "AVAILABLE",
      capacityNote:
        "Emergency shelter available",
      services: [
        "Shelter",
        "Food",
        "Drinking Water",
      ],
    },

    {
      id: "sp-10",
      name: "Ward 56 Emergency Shelter",
      type: "SHELTER",
      ward: "W56",
      address:
        "Ward 56 emergency support zone",
      latitude:
        20.2554,
      longitude:
        85.8422,
      status:
        "AVAILABLE",
      capacityNote:
        "Open for temporary shelter",
      services: [
        "Shelter",
        "Food",
        "Drinking Water",
        "Basic Supplies",
      ],
    },
  ];


/* ========================================================================= */
/* PAGE                                                                      */
/* ========================================================================= */

export default function SafePlacesPage() {

  const [
    selectedWard,
    setSelectedWard,
  ] =
    useState(
      "W16"
    );


  const [
    userLocation,
    setUserLocation,
  ] =
    useState<{
      latitude:
        number;

      longitude:
        number;
    } | null>(
      null
    );


  const [
    locating,
    setLocating,
  ] =
    useState(
      false
    );


  const [
    locationError,
    setLocationError,
  ] =
    useState(
      ""
    );


  const wardReference =
    useMemo(
      () => {

        const exact =
          SAFE_PLACES.find(
            (
              place
            ) =>
              place.ward ===
              selectedWard
          );


        return (
          exact ??
          SAFE_PLACES[
            0
          ]
        );

      },
      [
        selectedWard,
      ]
    );


  const rankedPlaces =
    useMemo(
      () => {

        const origin =
          userLocation ??
          {
            latitude:
              wardReference.latitude,

            longitude:
              wardReference.longitude,
          };


        return SAFE_PLACES
          .map(
            (
              place
            ) => ({

              ...place,

              distanceKm:
                calculateDistanceKm(
                  origin.latitude,
                  origin.longitude,
                  place.latitude,
                  place.longitude
                ),

            })
          )
          .filter(
            (
              place
            ) =>
              place.status !==
              "UNAVAILABLE"
          )
          .sort(
            (
              a,
              b
            ) =>
              a.distanceKm -
              b.distanceKm
          )
          .slice(
            0,
            6
          );

      },
      [
        userLocation,
        wardReference,
      ]
    );


  function useCurrentLocation() {

    setLocationError(
      ""
    );


    if (
      !navigator.geolocation
    ) {

      setLocationError(
        "Location access is not supported on this device."
      );

      return;
    }


    setLocating(
      true
    );


    navigator.geolocation.getCurrentPosition(
      (
        position
      ) => {

        setUserLocation(
          {
            latitude:
              position.coords.latitude,

            longitude:
              position.coords.longitude,
          }
        );


        setLocating(
          false
        );

      },
      () => {

        setLocationError(
          "Unable to access your location. Select your ward instead."
        );


        setLocating(
          false
        );

      },
      {
        enableHighAccuracy:
          true,

        timeout:
          10000,

        maximumAge:
          60000,
      }
    );

  }


  return (

    <main className="min-h-screen bg-[#06101c] text-white">

      <Header />


      <div className="mx-auto grid max-w-[1700px] grid-cols-1 lg:grid-cols-[230px_1fr]">

        <Sidebar />


        <section className="min-w-0 p-4 sm:p-6 lg:p-8">

          {/* =============================================================== */}
          {/* HEADER                                                          */}
          {/* =============================================================== */}

          <div className="rounded-3xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.08] via-[#0a1728] to-[#07111f] p-6 sm:p-8">

            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

              <div>

                <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">

                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />

                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    Emergency Support
                  </span>

                </div>


                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Safe Places Near You
                </h1>


                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                  Find nearby shelters, relief centres, NGO support points and emergency medical locations during a disaster.
                </p>

              </div>


              <button
                type="button"
                onClick={
                  useCurrentLocation
                }
                disabled={
                  locating
                }
                className="flex w-fit items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-[#03130e] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >

                <LocateFixed className="h-4 w-4" />

                {
                  locating
                    ? "Locating..."
                    : "Use My Location"
                }

              </button>

            </div>

          </div>


          {/* =============================================================== */}
          {/* LOCATION CONTROLS                                               */}
          {/* =============================================================== */}

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a1728] p-5">

            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

              <div className="w-full max-w-md">

                <label
                  htmlFor="ward"
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-500"
                >
                  Select Your Ward
                </label>


                <select
                  id="ward"
                  value={
                    selectedWard
                  }
                  onChange={
                    (
                      event
                    ) => {

                      setSelectedWard(
                        event.target.value
                      );

                      setUserLocation(
                        null
                      );

                    }
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/40"
                >

                  {WARDS.map(
                    (
                      ward
                    ) => (

                    <option
                      key={
                        ward
                      }
                      value={
                        ward
                      }
                    >
                      {
                        ward
                      }
                    </option>

                  )
                  )}

                </select>

              </div>


              <div className="flex flex-wrap items-center gap-3">

                <div className="rounded-xl border border-white/5 bg-white/[0.025] px-4 py-3">

                  <p className="text-[9px] uppercase tracking-wider text-slate-600">
                    Search Mode
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-300">

                    {
                      userLocation
                        ? "GPS Location"
                        : `${selectedWard} Reference`
                    }

                  </p>

                </div>


                <div className="rounded-xl border border-white/5 bg-white/[0.025] px-4 py-3">

                  <p className="text-[9px] uppercase tracking-wider text-slate-600">
                    Results
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-300">
                    {
                      rankedPlaces.length
                    }{" "}
                    nearest places
                  </p>

                </div>

              </div>

            </div>


            {locationError && (

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.05] p-4">

                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />

                <p className="text-xs leading-5 text-amber-200/80">
                  {
                    locationError
                  }
                </p>

              </div>

            )}

          </div>


          {/* =============================================================== */}
          {/* RESULTS                                                         */}
          {/* =============================================================== */}

          <div className="mt-7">

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                  Recommended Safe Locations
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Nearest available support
                </h2>

              </div>


              <p className="text-xs text-slate-500">
                Ranked by approximate straight-line distance
              </p>

            </div>


            <div className="grid gap-5 xl:grid-cols-2">

              {rankedPlaces.map(
                (
                  place,
                  index
                ) => (

                <SafePlaceCard
                  key={
                    place.id
                  }
                  place={
                    place
                  }
                  rank={
                    index +
                    1
                  }
                />

              )
              )}

            </div>

          </div>


          {/* =============================================================== */}
          {/* SAFETY NOTE                                                     */}
          {/* =============================================================== */}

          <div className="mt-7 flex items-start gap-4 rounded-2xl border border-blue-500/15 bg-blue-500/[0.05] p-5">

            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

            <div>

              <p className="text-sm font-semibold text-blue-200">
                Prototype safe-place registry
              </p>

              <p className="mt-1 text-xs leading-6 text-slate-500">
                The current entries are demo data used to validate PRAVAAH&apos;s emergency-routing workflow. Production deployment should use verified government, municipal, hospital and NGO shelter datasets with live availability updates.
              </p>

            </div>

          </div>

        </section>

      </div>

    </main>

  );
}


/* ========================================================================= */
/* SAFE PLACE CARD                                                           */
/* ========================================================================= */

function SafePlaceCard({
  place,
  rank,
}: {
  place:
    SafePlace & {
      distanceKm:
        number;
    };

  rank:
    number;
}) {

  const TypeIcon =
    getTypeIcon(
      place.type
    );


  const statusClass =
    place.status ===
      "AVAILABLE"
      ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
      : "bg-amber-500/10 text-amber-400 ring-amber-500/20";


  const directionsUrl =
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${place.latitude},${place.longitude}`
    )}`;


  return (

    <article className="rounded-2xl border border-white/10 bg-[#0a1728] p-5 transition hover:border-emerald-500/20">

      <div className="flex items-start justify-between gap-4">

        <div className="flex min-w-0 gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">

            <TypeIcon className="h-5 w-5 text-emerald-400" />

          </div>


          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2">

              <span className="text-[9px] font-bold text-slate-600">
                #{rank}
              </span>

              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ${statusClass}`}
              >
                {
                  place.status
                }
              </span>

            </div>


            <h3 className="mt-2 text-base font-bold text-white">
              {
                place.name
              }
            </h3>


            <p className="mt-1 text-xs text-slate-500">
              {
                getTypeLabel(
                  place.type
                )
              }{" "}
              •{" "}
              {
                place.ward
              }
            </p>

          </div>

        </div>


        <div className="shrink-0 text-right">

          <p className="text-xl font-black text-emerald-400">
            {
              place.distanceKm.toFixed(
                1
              )
            }
          </p>

          <p className="text-[9px] text-slate-600">
            km away
          </p>

        </div>

      </div>


      <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">

        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />

        <p className="text-xs leading-5 text-slate-400">
          {
            place.address
          }
        </p>

      </div>


      <p className="mt-4 text-xs text-slate-500">
        {
          place.capacityNote
        }
      </p>


      <div className="mt-4 flex flex-wrap gap-2">

        {place.services.map(
          (
            service
          ) => (

          <ServiceBadge
            key={
              service
            }
            service={
              service
            }
          />

        )
        )}

      </div>


      <a
        href={
          directionsUrl
        }
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex w-full items-center justify-between rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/15"
      >

        <span className="flex items-center gap-2">

          <Navigation className="h-4 w-4" />

          Get Directions

        </span>


        <ChevronRight className="h-4 w-4" />

      </a>

    </article>

  );
}


/* ========================================================================= */
/* SERVICE BADGE                                                             */
/* ========================================================================= */

function ServiceBadge({
  service,
}: {
  service:
    string;
}) {

  const Icon =
    service.includes(
      "Food"
    )
      ? Utensils
      : service.includes(
          "Water"
        )
        ? Droplets
        : service.includes(
            "Medical"
          ) ||
          service.includes(
            "First Aid"
          )
          ? Cross
          : service.includes(
              "Shelter"
            )
            ? Building2
            : HeartHandshake;


  return (

    <span className="flex items-center gap-1.5 rounded-full bg-white/[0.035] px-2.5 py-1.5 text-[10px] text-slate-400 ring-1 ring-white/5">

      <Icon className="h-3 w-3" />

      {
        service
      }

    </span>

  );
}


/* ========================================================================= */
/* HELPERS                                                                   */
/* ========================================================================= */

function getTypeIcon(
  type:
    SafePlaceType
) {

  switch (
    type
  ) {

    case "HOSPITAL":
      return Cross;

    case "NGO":
      return HeartHandshake;

    case "SHELTER":
      return Building2;

    default:
      return ShieldCheck;
  }

}


function getTypeLabel(
  type:
    SafePlaceType
) {

  switch (
    type
  ) {

    case "RELIEF_CENTRE":
      return "Relief Centre";

    case "SHELTER":
      return "Emergency Shelter";

    case "NGO":
      return "NGO Support";

    case "HOSPITAL":
      return "Medical Support";

    default:
      return type;
  }

}


function calculateDistanceKm(
  lat1:
    number,

  lon1:
    number,

  lat2:
    number,

  lon2:
    number
) {

  const earthRadiusKm =
    6371;


  const toRadians =
    (
      degrees:
        number
    ) =>
      (
        degrees *
        Math.PI
      ) /
      180;


  const deltaLatitude =
    toRadians(
      lat2 -
      lat1
    );


  const deltaLongitude =
    toRadians(
      lon2 -
      lon1
    );


  const a =
    Math.sin(
      deltaLatitude /
      2
    ) **
      2 +
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
        deltaLongitude /
        2
      ) **
        2;


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
