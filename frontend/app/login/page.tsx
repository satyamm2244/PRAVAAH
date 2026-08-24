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
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  login,
  logout,
} from "@/lib/auth";


export default function LoginPage() {

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
        "Enter your email and password."
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


      if (
        response.user.role ===
        "OFFICER"
      ) {

        logout();


        setError(
          "Officer account detected. Please use Officer Login."
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


      {/* BACKGROUND */}

      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/login-city.png')",
        }}
      />


      {/* DARK BLUE FILTER */}

      <div className="absolute inset-0 bg-[#021225]/65" />


      {/* EXTRA DEPTH */}

      <div className="absolute inset-0 bg-gradient-to-r from-[#020914]/35 via-[#031427]/25 to-[#010811]/90" />


      {/* TOP FADE */}

      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#010812]/90 to-transparent" />


      {/* BOTTOM FADE */}

      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#010812] via-[#010812]/75 to-transparent" />


      {/* GLOWS */}

      <div className="absolute left-[30%] top-[20%] h-96 w-96 rounded-full bg-blue-500/10 blur-[130px]" />

      <div className="absolute bottom-[-100px] left-[35%] h-80 w-80 rounded-full bg-cyan-400/10 blur-[120px]" />


      {/* FLOWING DATA LINES */}

      <div className="pointer-events-none absolute bottom-[29%] left-[-5%] right-[35%] hidden lg:block">

        <svg
          viewBox="0 0 1100 180"
          className="h-[170px] w-full opacity-70"
          preserveAspectRatio="none"
        >

          <path
            d="M0 100 C150 10, 260 175, 430 95 S710 25, 1100 100"
            fill="none"
            stroke="rgba(14,165,233,0.85)"
            strokeWidth="2"
          />

          <path
            d="M0 118 C160 35, 280 160, 450 108 S720 40, 1100 115"
            fill="none"
            stroke="rgba(56,189,248,0.45)"
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


      {/* PAGE GRID */}

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1800px] lg:grid-cols-[1fr_520px]">


        {/* =============================================================== */}
        {/* LEFT PANEL                                                      */}
        {/* =============================================================== */}

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


          {/* MAIN MESSAGE */}

          <div className="max-w-lg">

            <h2 className="text-5xl font-black leading-[1.12] tracking-tight xl:text-6xl">

              <span className="block text-white">
                PREDICT.
              </span>

              <span className="mt-2 block text-white">
                PREPARE.
              </span>

              <span className="mt-2 block text-cyan-400">
                PROTECT.
              </span>

            </h2>


            <p className="mt-6 max-w-sm text-xl leading-8 text-slate-200">

              Intelligence that flows
              <br />
              before disaster strikes.

            </p>


            <div className="mt-5 h-px w-32 bg-gradient-to-r from-cyan-400 to-transparent" />

          </div>


          {/* FLOW */}

          <div>

            <div className="grid max-w-[650px] grid-cols-4 gap-4">

              <FlowItem
                icon={CloudRain}
                label="LIVE DATA"
                secondLine="SENSORS"
              />

              <FlowItem
                icon={Database}
                label="RISK"
                secondLine="ENGINE"
              />

              <FlowItem
                icon={Bell}
                label="SMART"
                secondLine="ALERTS"
                notification
              />

              <FlowItem
                icon={Users}
                label="SAFER"
                secondLine="COMMUNITIES"
              />

            </div>


            {/* STATUS BAR */}

            <div className="mt-8 flex max-w-[720px] items-center justify-between rounded-2xl border border-slate-500/30 bg-[#03101d]/80 px-6 py-4 backdrop-blur-xl">

              <StatusItem
                icon={Activity}
                label="LIVE MONITORING"
                tone="green"
              />

              <div className="h-8 w-px bg-white/15" />

              <StatusItem
                icon={MapPin}
                label="67 WARDS COVERED"
                tone="cyan"
              />

              <div className="h-8 w-px bg-white/15" />

              <StatusItem
                icon={ShieldCheck}
                label="SYSTEM OPERATIONAL"
                tone="blue"
              />

            </div>

          </div>

        </section>


        {/* =============================================================== */}
        {/* LOGIN PANEL                                                     */}
        {/* =============================================================== */}

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">

          <div className="w-full max-w-[480px] rounded-[28px] border border-cyan-400/35 bg-[#03101d]/90 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-8">


            {/* LOGO */}

            <div className="text-center">

              <div className="relative mx-auto h-28 w-28">

                <div className="absolute inset-2 rounded-full bg-blue-500/20 blur-2xl" />

                <Image
                  src="/pravaah-icon.png"
                  alt="PRAVAAH"
                  fill
                  priority
                  sizes="112px"
                  className="relative object-contain drop-shadow-[0_0_28px_rgba(34,211,238,0.28)]"
                />

              </div>


              <h2 className="mt-3 text-2xl font-semibold tracking-[0.14em] text-white">

                WELCOME TO PRAVAAH

              </h2>


              <p className="mt-2 text-sm text-cyan-400">

                Stay informed. Stay prepared.

              </p>


              <div className="mx-auto mt-5 h-px w-14 bg-cyan-400/60" />

            </div>


            {/* CITIZEN ACCESS */}

            <div className="mt-7 flex items-center gap-4">

              <p className="shrink-0 text-xs font-semibold tracking-[0.16em] text-cyan-400">

                CITIZEN ACCESS

              </p>


              <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/50 to-transparent" />

            </div>


            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="mt-6"
            >


              {/* EMAIL */}

              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-[11px] font-medium tracking-[0.13em] text-slate-300"
                >

                  EMAIL ADDRESS

                </label>


                <div className="flex items-center gap-3 rounded-xl border border-slate-500/50 bg-[#061422]/80 px-4 transition focus-within:border-cyan-400/70 focus-within:ring-1 focus-within:ring-cyan-400/20">

                  <Mail className="h-5 w-5 shrink-0 text-slate-300" />


                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="h-14 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />

                </div>

              </div>


              {/* PASSWORD */}

              <div className="mt-5">

                <label
                  htmlFor="password"
                  className="mb-2 block text-[11px] font-medium tracking-[0.13em] text-slate-300"
                >

                  PASSWORD

                </label>


                <div className="flex items-center gap-3 rounded-xl border border-slate-500/50 bg-[#061422]/80 px-4 transition focus-within:border-cyan-400/70 focus-within:ring-1 focus-within:ring-cyan-400/20">

                  <Lock className="h-5 w-5 shrink-0 text-slate-300" />


                  <input
                    id="password"
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
                    placeholder="Enter your password"
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
                    className="text-slate-400 transition hover:text-cyan-300"
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


              {/* ERROR */}

              {error && (

                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-3">

                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />

                  <p className="text-xs leading-5 text-red-300">

                    {error}

                  </p>

                </div>

              )}


              {/* SIGN IN */}

              <button
                type="submit"
                disabled={loading}
                className="group mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-700 text-sm font-semibold tracking-[0.16em] text-white shadow-[0_12px_35px_rgba(37,99,235,0.32)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {
                  loading
                    ? "SIGNING IN..."
                    : "SIGN IN"
                }


                {!loading && (

                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />

                )}

              </button>

            </form>


            {/* REGISTER */}

            <div className="mt-6 text-center">

              <p className="text-xs text-slate-400">

                New to PRAVAAH?

              </p>


              <Link
                href="/register"
                className="mt-1 inline-block text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
              >

                Create an account

              </Link>

            </div>


            {/* DIVIDER */}

            <div className="my-6 flex items-center gap-4">

              <div className="h-px flex-1 bg-white/10" />

              <span className="text-xs text-slate-500">

                OR

              </span>

              <div className="h-px flex-1 bg-white/10" />

            </div>


            {/* OFFICER ACCESS */}

            <div>

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">

                  <ShieldCheck className="h-6 w-6 text-emerald-400" />

                </div>


                <div>

                  <p className="text-sm font-semibold tracking-[0.08em] text-emerald-400">

                    AUTHORIZED PERSONNEL

                  </p>


                  <p className="mt-1 text-xs text-slate-400">

                    Disaster Management Officer

                  </p>

                </div>

              </div>


              <Link
                href="/officer-login"
                className="group mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-emerald-500/70 bg-emerald-500/[0.03] text-sm font-semibold tracking-[0.16em] text-emerald-400 transition hover:bg-emerald-500/10"
              >

                OFFICER LOGIN

                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />

              </Link>

            </div>

          </div>

        </section>

      </div>

    </main>

  );
}


/* ========================================================================= */
/* LEFT FLOW ITEM                                                            */
/* ========================================================================= */

function FlowItem({
  icon: Icon,
  label,
  secondLine,
  notification = false,
}: {
  icon:
    typeof CloudRain;

  label:
    string;

  secondLine:
    string;

  notification?:
    boolean;
}) {

  return (

    <div className="text-center">

      <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/70 bg-[#03101d]/80 shadow-[0_0_25px_rgba(34,211,238,0.12)] backdrop-blur-lg">

        <Icon className="h-7 w-7 text-cyan-400" />


        {notification && (

          <span className="absolute -right-1 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">

            1

          </span>

        )}

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
/* STATUS ITEM                                                               */
/* ========================================================================= */

function StatusItem({
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
    "cyan" |
    "blue";
}) {

  const classes = {

    green:
      "text-emerald-400",

    cyan:
      "text-cyan-400",

    blue:
      "text-blue-400",

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