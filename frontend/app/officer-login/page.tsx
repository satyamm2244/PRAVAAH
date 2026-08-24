"use client";

import {
  useState,
  type FormEvent,
} from "react";

import Image from "next/image";
import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CloudRain,
  Database,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Radio,
  ShieldCheck,
} from "lucide-react";

import {
  login,
  logout,
} from "@/lib/auth";


export default function OfficerLoginPage() {

  const router =
    useRouter();


  const [
    email,
    setEmail,
  ] =
    useState("");


  const [
    password,
    setPassword,
  ] =
    useState("");


  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(false);


  /* ========================================================================= */
  /* OFFICER LOGIN                                                             */
  /* ========================================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    setError("");


    if (
      email.trim() === "" ||
      password.trim() === ""
    ) {

      setError(
        "Enter officer email and password."
      );

      return;

    }


    try {

      setLoading(
        true
      );


      const response =
        await login(
          email,
          password
        );


      /*
       * Only OFFICER accounts are
       * allowed through this login.
       */

      if (
        response.user.role !==
        "OFFICER"
      ) {

        logout();


        setError(
          "This account does not have officer access."
        );


        setLoading(
          false
        );

        return;

      }


      router.push(
        "/"
      );

      router.refresh();

    } catch (
      loginError
    ) {

      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in."
      );


      setLoading(
        false
      );

    }

  }


  return (

    <main className="relative min-h-screen overflow-hidden bg-[#020b15] text-white">


      {/* =================================================================== */}
      {/* CITY BACKGROUND                                                     */}
      {/* =================================================================== */}

      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/login-city.png')",
        }}
      />


      {/* DARK BLUE FILTER */}

      <div className="absolute inset-0 bg-[#021225]/70" />


      {/* OFFICER DEPTH */}

      <div className="absolute inset-0 bg-gradient-to-r from-[#020914]/30 via-[#031427]/35 to-[#010811]/95" />


      {/* TOP FADE */}

      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#010812]/95 to-transparent" />


      {/* BOTTOM FADE */}

      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#010812] via-[#010812]/80 to-transparent" />


      {/* BLUE GLOW */}

      <div className="absolute left-[26%] top-[18%] h-96 w-96 rounded-full bg-blue-500/10 blur-[130px]" />


      {/* GREEN COMMAND GLOW */}

      <div className="absolute right-[15%] top-[20%] h-80 w-80 rounded-full bg-emerald-500/[0.07] blur-[130px]" />


      {/* =================================================================== */}
      {/* DATA FLOW LINES                                                     */}
      {/* =================================================================== */}

      <div className="pointer-events-none absolute bottom-[29%] left-[-5%] right-[35%] hidden lg:block">

        <svg
          viewBox="0 0 1100 180"
          className="h-[170px] w-full opacity-65"
          preserveAspectRatio="none"
        >

          <path
            d="M0 100 C150 10, 260 175, 430 95 S710 25, 1100 100"
            fill="none"
            stroke="rgba(16,185,129,0.75)"
            strokeWidth="2"
          />

          <path
            d="M0 118 C160 35, 280 160, 450 108 S720 40, 1100 115"
            fill="none"
            stroke="rgba(34,211,238,0.45)"
            strokeWidth="1.5"
          />

          <path
            d="M0 82 C150 0, 300 145, 475 82 S740 12, 1100 88"
            fill="none"
            stroke="rgba(59,130,246,0.4)"
            strokeWidth="1.5"
          />

        </svg>

      </div>


      {/* =================================================================== */}
      {/* PAGE GRID                                                           */}
      {/* =================================================================== */}

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1800px] lg:grid-cols-[1fr_520px]">


        {/* ================================================================= */}
        {/* LEFT SIDE                                                        */}
        {/* ================================================================= */}

        <section className="hidden min-h-screen flex-col justify-between px-10 py-10 lg:flex xl:px-16 xl:py-12">


          {/* BRAND */}

          <div className="flex items-center gap-5">

            <div className="relative h-20 w-20 shrink-0">

              <Image
                src="/pravaah-icon.png"
                alt="PRAVAAH"
                fill
                priority
                sizes="80px"
                className="object-contain drop-shadow-[0_0_25px_rgba(14,165,233,0.35)]"
              />

            </div>


            <div>

              <h1 className="text-4xl font-black tracking-[0.18em] text-white xl:text-5xl">

                PRAV<span className="text-cyan-400">AAH</span>

              </h1>


              <p className="mt-1 text-sm uppercase tracking-[0.18em] text-slate-300">

                Disaster Intelligence Platform

              </p>

            </div>

          </div>


          {/* COMMAND MESSAGE */}

          <div className="max-w-xl">

            <div className="mb-5 flex w-fit items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">

              <span className="relative flex h-2 w-2">

                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />

                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />

              </span>


              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">

                Command Network Online

              </span>

            </div>


            <h2 className="text-5xl font-black leading-[1.12] tracking-tight xl:text-6xl">

              <span className="block text-white">
                MONITOR.
              </span>

              <span className="mt-2 block text-white">
                RESPOND.
              </span>

              <span className="mt-2 block text-emerald-400">
                PROTECT.
              </span>

            </h2>


            <p className="mt-6 max-w-md text-xl leading-8 text-slate-200">

              Operational intelligence for
              <br />
              faster disaster response.

            </p>


            <div className="mt-5 h-px w-32 bg-gradient-to-r from-emerald-400 to-transparent" />

          </div>


          {/* OFFICER CAPABILITIES */}

          <div>

            <div className="grid max-w-[650px] grid-cols-4 gap-4">

              <OfficerFlowItem
                icon={CloudRain}
                label="LIVE"
                secondLine="SENSORS"
              />


              <OfficerFlowItem
                icon={Database}
                label="RISK"
                secondLine="ENGINE"
              />


              <OfficerFlowItem
                icon={Bell}
                label="ALERT"
                secondLine="CONTROL"
              />


              <OfficerFlowItem
                icon={Radio}
                label="RESPONSE"
                secondLine="NETWORK"
              />

            </div>


            {/* COMMAND STATUS */}

            <div className="mt-8 flex max-w-[720px] items-center justify-between rounded-2xl border border-slate-500/30 bg-[#03101d]/80 px-6 py-4 backdrop-blur-xl">

              <CommandStatusItem
                icon={Activity}
                label="LIVE MONITORING"
                tone="green"
              />


              <div className="h-8 w-px bg-white/15" />


              <CommandStatusItem
                icon={MapPin}
                label="67 WARDS COVERED"
                tone="cyan"
              />


              <div className="h-8 w-px bg-white/15" />


              <CommandStatusItem
                icon={ShieldCheck}
                label="SECURE ACCESS"
                tone="green"
              />

            </div>

          </div>

        </section>


        {/* ================================================================= */}
        {/* OFFICER LOGIN PANEL                                               */}
        {/* ================================================================= */}

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">

          <div className="w-full max-w-[480px] rounded-[28px] border border-emerald-500/30 bg-[#03101d]/92 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-8">


            {/* LOGO */}

            <div className="text-center">

              <div className="relative mx-auto h-28 w-28">

                <div className="absolute inset-2 rounded-full bg-emerald-500/10 blur-2xl" />


                <Image
                  src="/pravaah-icon.png"
                  alt="PRAVAAH"
                  fill
                  priority
                  sizes="112px"
                  className="relative object-contain drop-shadow-[0_0_28px_rgba(34,211,238,0.25)]"
                />

              </div>


              <div className="mt-3 flex items-center justify-center gap-2">

                <ShieldCheck className="h-5 w-5 text-emerald-400" />


                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">

                  Authorized Access

                </p>

              </div>


              <h2 className="mt-3 text-2xl font-semibold tracking-[0.12em] text-white">

                OFFICER COMMAND LOGIN

              </h2>


              <p className="mt-2 text-sm text-slate-400">

                Disaster Management Personnel

              </p>


              <div className="mx-auto mt-5 h-px w-14 bg-emerald-400/60" />

            </div>


            {/* ACCESS TITLE */}

            <div className="mt-7 flex items-center gap-4">

              <p className="shrink-0 text-xs font-semibold tracking-[0.16em] text-emerald-400">

                SECURE ACCESS

              </p>


              <div className="h-px flex-1 bg-gradient-to-r from-emerald-400/50 to-transparent" />

            </div>


            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="mt-6"
            >


              {/* EMAIL */}

              <div>

                <label
                  htmlFor="officer-email"
                  className="mb-2 block text-[11px] font-medium tracking-[0.13em] text-slate-300"
                >

                  OFFICER EMAIL

                </label>


                <div className="flex items-center gap-3 rounded-xl border border-slate-500/50 bg-[#061422]/80 px-4 transition focus-within:border-emerald-400/70 focus-within:ring-1 focus-within:ring-emerald-400/20">

                  <Mail className="h-5 w-5 shrink-0 text-slate-300" />


                  <input
                    id="officer-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="officer@pravaah.gov"
                    autoComplete="email"
                    className="h-14 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />

                </div>

              </div>


              {/* PASSWORD */}

              <div className="mt-5">

                <label
                  htmlFor="officer-password"
                  className="mb-2 block text-[11px] font-medium tracking-[0.13em] text-slate-300"
                >

                  PASSWORD

                </label>


                <div className="flex items-center gap-3 rounded-xl border border-slate-500/50 bg-[#061422]/80 px-4 transition focus-within:border-emerald-400/70 focus-within:ring-1 focus-within:ring-emerald-400/20">

                  <Lock className="h-5 w-5 shrink-0 text-slate-300" />


                  <input
                    id="officer-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Enter officer password"
                    autoComplete="current-password"
                    className="h-14 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />


                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="text-slate-400 transition hover:text-emerald-300"
                  >

                    {
                      showPassword
                        ? (
                          <EyeOff className="h-5 w-5" />
                        )
                        : (
                          <Eye className="h-5 w-5" />
                        )
                    }

                  </button>

                </div>

              </div>


              {/* SECURITY INFO */}

              <div className="mt-4 flex items-center gap-2">

                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />


                <p className="text-[10px] leading-5 text-slate-500">

                  Restricted to authorized disaster management personnel.

                </p>

              </div>


              {/* ERROR */}

              {error && (

                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-3">

                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />


                  <p className="text-xs leading-5 text-red-300">

                    {error}

                  </p>

                </div>

              )}


              {/* OFFICER SIGN IN */}

              <button
                type="submit"
                disabled={loading}
                className="group mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-600 via-emerald-500 to-cyan-600 text-sm font-semibold tracking-[0.16em] text-white shadow-[0_12px_35px_rgba(16,185,129,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {
                  loading
                    ? "AUTHENTICATING..."
                    : "ENTER COMMAND CENTER"
                }


                {!loading && (

                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />

                )}

              </button>

            </form>


            {/* SECURITY STATUS */}

            <div className="mt-6 grid grid-cols-2 gap-3">

              <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3 text-center">

                <p className="text-[9px] uppercase tracking-wider text-slate-600">

                  Network

                </p>


                <div className="mt-2 flex items-center justify-center gap-2">

                  <span className="h-2 w-2 rounded-full bg-emerald-400" />


                  <p className="text-xs text-slate-300">

                    Operational

                  </p>

                </div>

              </div>


              <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3 text-center">

                <p className="text-[9px] uppercase tracking-wider text-slate-600">

                  Access Level

                </p>


                <p className="mt-2 text-xs font-medium text-emerald-400">

                  Officer

                </p>

              </div>

            </div>


            {/* BACK TO CITIZEN */}

            <div className="my-6 flex items-center gap-4">

              <div className="h-px flex-1 bg-white/10" />

              <span className="text-xs text-slate-500">
                OR
              </span>

              <div className="h-px flex-1 bg-white/10" />

            </div>


            <Link
              href="/login"
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/[0.04] text-xs font-medium tracking-wider text-blue-300 transition hover:bg-blue-500/10"
            >

              RETURN TO CITIZEN LOGIN

              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />

            </Link>

          </div>

        </section>

      </div>

    </main>

  );
}


/* ========================================================================= */
/* OFFICER FLOW ITEM                                                         */
/* ========================================================================= */

function OfficerFlowItem({
  icon: Icon,
  label,
  secondLine,
}: {
  icon:
    typeof CloudRain;

  label:
    string;

  secondLine:
    string;
}) {

  return (

    <div className="text-center">

      <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/60 bg-[#03101d]/80 shadow-[0_0_25px_rgba(16,185,129,0.1)] backdrop-blur-lg">

        <Icon className="h-7 w-7 text-emerald-400" />

      </div>


      <p className="mt-3 text-xs font-medium tracking-wider text-slate-100">

        {label}

      </p>


      <p className="mt-1 text-xs tracking-wider text-slate-100">

        {secondLine}

      </p>

    </div>

  );
}


/* ========================================================================= */
/* COMMAND STATUS ITEM                                                       */
/* ========================================================================= */

function CommandStatusItem({
  icon: Icon,
  label,
  tone,
}: {
  icon:
    typeof Activity;

  label:
    string;

  tone:
    "green" |
    "cyan";
}) {

  const classes = {

    green:
      "text-emerald-400",

    cyan:
      "text-cyan-400",

  };


  return (

    <div className="flex items-center gap-3">

      <Icon
        className={`h-5 w-5 ${classes[tone]}`}
      />


      <span className="text-xs font-medium tracking-wider text-slate-100">

        {label}

      </span>

    </div>

  );
}