"use client";

import {
  ChangeEvent,
  FormEvent,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  Send,
  Upload,
  X,
} from "lucide-react";

import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";

import {
  authFetch,
  getToken,
  getStoredUser,
  logout,
} from "@/lib/auth";


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


const WARDS =
  Array.from(
    {
      length:
        67,
    },
    (
      _,
      index
    ) =>
      `W${index + 1}`
  );


const REPORT_TYPES = [
  "Waterlogging",
  "Flooding",
  "Road Blockage",
  "Drainage Overflow",
  "Tree Fall",
  "Electrical Hazard",
  "Infrastructure Damage",
  "Other",
];


const SEVERITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];


export default function ReportIncidentPage() {

  const [
    ward,
    setWard,
  ] =
    useState(
      "W1"
    );


  const [
    reportType,
    setReportType,
  ] =
    useState(
      "Waterlogging"
    );


  const [
    severity,
    setSeverity,
  ] =
    useState(
      "MEDIUM"
    );


  const [
    description,
    setDescription,
  ] =
    useState(
      ""
    );


  const [
    latitude,
    setLatitude,
  ] =
    useState<number | null>(
      null
    );


  const [
    longitude,
    setLongitude,
  ] =
    useState<number | null>(
      null
    );


  const [
    photo,
    setPhoto,
  ] =
    useState<File | null>(
      null
    );


  const [
    photoPreview,
    setPhotoPreview,
  ] =
    useState<string | null>(
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
    submitting,
    setSubmitting,
  ] =
    useState(
      false
    );


  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );


  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null
    );


  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  /* CURRENT LOCATION */

  function useCurrentLocation() {

    setError(
      null
    );


    if (
      !navigator.geolocation
    ) {

      setError(
        "Location services are not supported by this browser."
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

        setLatitude(
          position.coords.latitude
        );

        setLongitude(
          position.coords.longitude
        );

        setLocating(
          false
        );

      },

      (
        locationError
      ) => {

        console.error(
          "Location error:",
          locationError
        );


        setError(
          "Unable to access your current location."
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
          30000,
      }
    );

  }


  /* PHOTO */

  function handlePhotoChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {

    const file =
      event.target.files?.[
        0
      ];


    if (
      !file
    ) {

      return;
    }


    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      setError(
        "Only JPEG, PNG, or WEBP images are allowed."
      );

      return;
    }


    const maxSize =
      5 *
      1024 *
      1024;


    if (
      file.size >
      maxSize
    ) {

      setError(
        "Photo must be smaller than 5 MB."
      );

      return;
    }


    setPhoto(
      file
    );


    if (
      photoPreview
    ) {

      URL.revokeObjectURL(
        photoPreview
      );

    }


    setPhotoPreview(
      URL.createObjectURL(
        file
      )
    );


    setError(
      null
    );

  }


  function removePhoto() {

    if (
      photoPreview
    ) {

      URL.revokeObjectURL(
        photoPreview
      );

    }


    setPhoto(
      null
    );

    setPhotoPreview(
      null
    );


    if (
      fileInputRef.current
    ) {

      fileInputRef.current.value =
        "";

    }

  }


  /* SUBMIT */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    setError(
      null
    );

    setSuccess(
      null
    );


    /*
     * REPORT OWNERSHIP REQUIRES
     * AUTHENTICATED CITIZEN.
     */

    const token =
      getToken();


    const user =
      getStoredUser();


    if (
      !token ||
      !user
    ) {

      setError(
        "Please log in before submitting an incident report."
      );


      window.setTimeout(
        () => {

          window.location.href =
            "/login";

        },
        700
      );


      return;
    }


    if (
      user.role !==
      "USER"
    ) {

      setError(
        "Incident reports must be submitted using a citizen account."
      );

      return;
    }


    if (
      description
        .trim()
        .length <
      3
    ) {

      setError(
        "Please provide a short description of the incident."
      );

      return;
    }


    try {

      setSubmitting(
        true
      );


      const formData =
        new FormData();


      formData.append(
        "ward",
        ward
      );


      formData.append(
        "reportType",
        reportType
      );


      formData.append(
        "severity",
        severity
      );


      formData.append(
        "description",
        description.trim()
      );


      if (
        latitude !==
        null
      ) {

        formData.append(
          "latitude",
          latitude.toString()
        );

      }


      if (
        longitude !==
        null
      ) {

        formData.append(
          "longitude",
          longitude.toString()
        );

      }


      if (
        photo
      ) {

        formData.append(
          "photo",
          photo
        );

      }


      /*
       * IMPORTANT:
       *
       * authFetch attaches:
       *
       * Authorization:
       * Bearer <JWT>
       *
       * Do NOT manually set Content-Type
       * when using FormData.
       */

      const response =
        await authFetch(
          `${API_BASE_URL}/api/reports`,
          {
            method:
              "POST",

            body:
              formData,
          }
        );


      /*
       * Session expired.
       */

      if (
        response.status ===
          401 ||
        response.status ===
          403
      ) {

        logout();


        setError(
          "Your session has expired. Please log in again."
        );


        window.setTimeout(
          () => {

            window.location.href =
              "/login";

          },
          700
        );


        return;
      }


      let data:
        any = null;


      try {

        data =
          await response.json();

      } catch {

        data =
          null;

      }


      if (
        !response.ok
      ) {

        const detail =
          typeof data?.detail ===
          "string"
            ? data.detail
            : "Unable to submit report.";


        throw new Error(
          detail
        );

      }


      setSuccess(
        `Incident report submitted successfully for ${ward}.`
      );


      setDescription(
        ""
      );


      setSeverity(
        "MEDIUM"
      );


      setReportType(
        "Waterlogging"
      );


      setLatitude(
        null
      );


      setLongitude(
        null
      );


      removePhoto();


    } catch (
      submitError
    ) {

      console.error(
        "Unable to submit incident report:",
        submitError
      );


      setError(
        submitError instanceof
        Error
          ? submitError.message
          : "Unable to submit report."
      );


    } finally {

      setSubmitting(
        false
      );

    }

  }


  return (

    <main className="min-h-screen bg-[#07111f] text-white">

      <Header />


      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[230px_1fr]">

        <Sidebar />


        <section className="min-w-0 p-5 lg:p-8">


          {/* PAGE HEADER */}

          <div className="mb-7">

            <p className="text-sm text-blue-400">
              Community Intelligence
            </p>


            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Report Incident
            </h1>


            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">

              Report real-world hazards and incidents to help PRAVAAH
              improve ward-level situational awareness.

            </p>

          </div>


          <form
            onSubmit={
              handleSubmit
            }
            className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-[#0a1728] p-6 shadow-2xl lg:p-8"
          >


            {/* WARD + TYPE */}

            <div className="grid gap-5 md:grid-cols-2">

              <FormField
                label="Ward"
              >

                <select
                  value={
                    ward
                  }
                  onChange={(
                    event
                  ) =>
                    setWard(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50"
                >

                  {
                    WARDS.map(
                      (
                        wardId
                      ) => (

                        <option
                          key={
                            wardId
                          }
                          value={
                            wardId
                          }
                        >
                          {wardId}
                        </option>

                      )
                    )
                  }

                </select>

              </FormField>


              <FormField
                label="Incident Type"
              >

                <select
                  value={
                    reportType
                  }
                  onChange={(
                    event
                  ) =>
                    setReportType(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50"
                >

                  {
                    REPORT_TYPES.map(
                      (
                        type
                      ) => (

                        <option
                          key={
                            type
                          }
                          value={
                            type
                          }
                        >
                          {type}
                        </option>

                      )
                    )
                  }

                </select>

              </FormField>

            </div>


            {/* SEVERITY */}

            <div className="mt-6">

              <label className="text-sm font-medium text-slate-200">
                Severity
              </label>


              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">

                {
                  SEVERITIES.map(
                    (
                      level
                    ) => (

                      <button
                        key={
                          level
                        }
                        type="button"
                        onClick={() =>
                          setSeverity(
                            level
                          )
                        }
                        className={`rounded-xl border px-3 py-3 text-xs font-semibold transition ${
                          severity ===
                          level
                            ? severitySelectedClass(
                                level
                              )
                            : "border-white/10 bg-[#07111f] text-slate-400 hover:bg-white/5"
                        }`}
                      >

                        {level}

                      </button>

                    )
                  )
                }

              </div>

            </div>


            {/* DESCRIPTION */}

            <div className="mt-6">

              <label className="text-sm font-medium text-slate-200">
                Description
              </label>


              <textarea
                rows={
                  5
                }
                value={
                  description
                }
                onChange={(
                  event
                ) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Describe what happened, where it happened, and any immediate danger..."
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50"
              />

            </div>


            {/* GPS */}

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                <div className="flex items-start gap-3">

                  <Crosshair className="mt-0.5 h-5 w-5 text-blue-400" />


                  <div>

                    <p className="font-medium text-white">
                      GPS Location
                    </p>


                    <p className="mt-1 text-xs text-slate-500">
                      Optional location evidence
                    </p>


                    {
                      latitude !==
                        null &&
                      longitude !==
                        null && (

                        <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">

                          <MapPin className="h-3.5 w-3.5" />

                          {
                            latitude.toFixed(
                              6
                            )
                          }
                          ,{" "}
                          {
                            longitude.toFixed(
                              6
                            )
                          }

                        </div>

                      )
                    }

                  </div>

                </div>


                <button
                  type="button"
                  onClick={
                    useCurrentLocation
                  }
                  disabled={
                    locating
                  }
                  className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-5 py-3 text-sm font-medium text-blue-400 transition hover:bg-blue-500/20 disabled:opacity-50"
                >

                  {
                    locating
                      ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )
                      : (
                        <MapPin className="h-4 w-4" />
                      )
                  }


                  {
                    locating
                      ? "Locating..."
                      : "Use Current Location"
                  }

                </button>

              </div>

            </div>


            {/* PHOTO */}

            <div className="mt-6">

              <label className="text-sm font-medium text-slate-200">
                Photo Evidence
              </label>


              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handlePhotoChange
                }
                className="hidden"
              />


              {
                photoPreview
                  ? (

                    <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/10">

                      <img
                        src={
                          photoPreview
                        }
                        alt="Incident preview"
                        className="max-h-[360px] w-full object-cover"
                      />


                      <button
                        type="button"
                        onClick={
                          removePhoto
                        }
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-black/70 text-white"
                      >

                        <X className="h-4 w-4" />

                      </button>

                    </div>

                  )
                  : (

                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current
                          ?.click()
                      }
                      className="mt-3 flex min-h-[180px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] transition hover:border-blue-500/30 hover:bg-blue-500/[0.03]"
                    >

                      <Camera className="h-7 w-7 text-slate-500" />


                      <p className="mt-4 text-sm font-medium text-white">
                        Attach Photo Evidence
                      </p>


                      <p className="mt-2 text-xs text-slate-600">
                        JPEG, PNG or WEBP • Max 5 MB
                      </p>


                      <div className="mt-4 flex items-center gap-2 text-xs text-blue-400">

                        <Upload className="h-3.5 w-3.5" />

                        Choose file

                      </div>

                    </button>

                  )
              }

            </div>


            {/* ERROR */}

            {error && (

              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">

                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

                <span>
                  {error}
                </span>

              </div>

            )}


            {/* SUCCESS */}

            {success && (

              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">

                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                <span>
                  {success}
                </span>

              </div>

            )}


            {/* SUBMIT */}

            <button
              type="submit"
              disabled={
                submitting
              }
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {
                submitting
                  ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )
                  : (
                    <Send className="h-5 w-5" />
                  )
              }


              {
                submitting
                  ? "Submitting Report..."
                  : "Submit Incident Report"
              }

            </button>

          </form>

        </section>

      </div>

    </main>

  );
}


function FormField({
  label,
  children,
}: {
  label:
    string;

  children:
    React.ReactNode;
}) {

  return (

    <div>

      <label className="text-sm font-medium text-slate-200">
        {label}
      </label>


      <div className="mt-2">
        {children}
      </div>

    </div>

  );

}


function severitySelectedClass(
  level:
    string
) {

  switch (
    level
  ) {

    case "CRITICAL":
      return "border-red-500/30 bg-red-500/15 text-red-400";

    case "HIGH":
      return "border-orange-500/30 bg-orange-500/15 text-orange-400";

    case "MEDIUM":
      return "border-yellow-500/30 bg-yellow-500/15 text-yellow-400";

    default:
      return "border-blue-500/30 bg-blue-500/15 text-blue-400";

  }

}