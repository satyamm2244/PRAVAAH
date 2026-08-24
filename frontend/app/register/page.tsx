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
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import {
  register,
} from "@/lib/auth";


export default function RegisterPage() {

  const router =
    useRouter();


  const [
    name,
    setName,
  ] =
    useState("");


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
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");


  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);


  const [
    showConfirmPassword,
    setShowConfirmPassword,
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
  /* REGISTER                                                                  */
  /* ========================================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    setError("");


    if (
      name.trim() === "" ||
      email.trim() === "" ||
      password.trim() === "" ||
      confirmPassword.trim() === ""
    ) {

      setError(
        "Please complete all fields."
      );

      return;

    }


    if (
      password !==
      confirmPassword
    ) {

      setError(
        "Passwords do not match."
      );

      return;

    }


    if (
      password.length <
      6
    ) {

      setError(
        "Password must contain at least 6 characters."
      );

      return;

    }


    try {

      setLoading(
        true
      );


      /*
       * Creates a normal citizen account.
       *
       * Officer accounts should NOT be
       * publicly created from this page.
       */
      await register(
        name.trim(),
        email.trim(),
        password
      );


      /*
       * Your auth helper may automatically
       * save the user/session after registration.
       *
       * Send the new citizen to the dashboard.
       */
      router.push(
        "/"
      );

      router.refresh();

    } catch (
      registerError
    ) {

      setError(
        registerError instanceof Error
          ? registerError.message
          : "Unable to create account."
      );


      setLoading(
        false
      );

    }

  }


  return (

    <main className="relative min-h-screen overflow-hidden bg-[#020b15] text-white">


      {/* =================================================================== */}
      {/* BACKGROUND                                                          */}
      {/* =================================================================== */}

      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/login-city.png')",
        }}
      />


      {/* DARK BLUE FILTER */}

      <div className="absolute inset-0 bg-[#021225]/68" />


      {/* DEPTH */}

      <div className="absolute inset-0 bg-gradient-to-r from-[#020914]/35 via-[#031427]/30 to-[#010811]/92" />


      {/* TOP FADE */}

      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#010812]/90 to-transparent" />


      {/* BOTTOM FADE */}

      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#010812] via-[#010812]/75 to-transparent" />


      {/* GLOWS */}

      <div className="absolute left-[27%] top-[18%] h-96 w-96 rounded-full bg-blue-500/10 blur-[130px]" />

      <div className="absolute bottom-[-120px] left-[32%] h-96 w-96 rounded-full bg-cyan-400/10 blur-[130px]" />


      {/* =================================================================== */}
      {/* FLOWING PRAVAAH LINES                                               */}
      {/* =================================================================== */}

      <div className="pointer-events-none absolute bottom-[28%] left-[-5%] right-[35%] hidden lg:block">

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


      {/* =================================================================== */}
      {/* PAGE GRID                                                           */}
      {/* =================================================================== */}

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1800px] lg:grid-cols-[1fr_540px]">


        {/* ================================================================= */}
        {/* LEFT BRANDING                                                    */}
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


          {/* =============================================================== */}
          {/* MESSAGE                                                         */}
          {/* =============================================================== */}

          <div className="max-w-xl">

            <div className="mb-5 flex w-fit items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 backdrop-blur-lg">

              <Users className="h-3.5 w-3.5 text-cyan-400" />


              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">

                Community Safety Network

              </span>

            </div>


            <h2 className="text-5xl font-black leading-[1.1] tracking-tight xl:text-6xl">

              <span className="block text-white">

                REPORT.

              </span>


              <span className="mt-2 block text-white">

                ALERT.

              </span>


              <span className="mt-2 block text-cyan-400">

                PROTECT.

              </span>

            </h2>


            <p className="mt-6 max-w-md text-xl leading-8 text-slate-200">

              Become part of a safer,
              <br />

              more connected Bhubaneswar.

            </p>


            <div className="mt-5 h-px w-32 bg-gradient-to-r from-cyan-400 to-transparent" />

          </div>


          {/* =============================================================== */}
          {/* COMMUNITY FEATURES                                              */}
          {/* =============================================================== */}

          <div>

            <div className="grid max-w-[700px] grid-cols-3 gap-4">

              <CommunityFeature
                icon={Bell}
                title="REAL-TIME ALERTS"
                description="Receive important safety information."
              />


              <CommunityFeature
                icon={MapPin}
                title="REPORT INCIDENTS"
                description="Share verified ground information."
              />


              <CommunityFeature
                icon={ShieldCheck}
                title="STAY PREPARED"
                description="Access live disaster intelligence."
              />

            </div>


            {/* ============================================================= */}
            {/* COMMUNITY BAR                                                 */}
            {/* ============================================================= */}

            <div className="mt-8 flex max-w-[720px] items-center justify-between rounded-2xl border border-slate-500/30 bg-[#03101d]/80 px-6 py-4 backdrop-blur-xl">

              <div className="flex items-center gap-3">

                <span className="relative flex h-2.5 w-2.5">

                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />

                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />

                </span>


                <span className="text-xs font-medium tracking-wider text-slate-100">

                  LIVE MONITORING

                </span>

              </div>


              <div className="h-8 w-px bg-white/15" />


              <div className="flex items-center gap-3">

                <MapPin className="h-5 w-5 text-cyan-400" />


                <span className="text-xs font-medium tracking-wider text-slate-100">

                  67 WARDS COVERED

                </span>

              </div>


              <div className="h-8 w-px bg-white/15" />


              <div className="flex items-center gap-3">

                <ShieldCheck className="h-5 w-5 text-blue-400" />


                <span className="text-xs font-medium tracking-wider text-slate-100">

                  COMMUNITY READY

                </span>

              </div>

            </div>

          </div>

        </section>


        {/* ================================================================= */}
        {/* REGISTER PANEL                                                    */}
        {/* ================================================================= */}

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">


          <div className="w-full max-w-[500px] rounded-[28px] border border-cyan-400/30 bg-[#03101d]/92 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-8">


            {/* ============================================================= */}
            {/* LOGO                                                          */}
            {/* ============================================================= */}

            <div className="text-center">

              <div className="relative mx-auto h-24 w-24">

                <div className="absolute inset-2 rounded-full bg-blue-500/20 blur-2xl" />


                <Image
                  src="/pravaah-icon.png"
                  alt="PRAVAAH"
                  fill
                  priority
                  sizes="96px"
                  className="relative object-contain drop-shadow-[0_0_28px_rgba(34,211,238,0.28)]"
                />

              </div>


              <h2 className="mt-3 text-2xl font-semibold tracking-[0.12em] text-white">

                JOIN PRAVAAH

              </h2>


              <p className="mt-2 text-sm text-cyan-400">

                Create your citizen account.

              </p>


              <div className="mx-auto mt-5 h-px w-14 bg-cyan-400/60" />

            </div>


            {/* ============================================================= */}
            {/* CITIZEN REGISTRATION                                          */}
            {/* ============================================================= */}

            <div className="mt-6 flex items-center gap-4">

              <p className="shrink-0 text-xs font-semibold tracking-[0.16em] text-cyan-400">

                CITIZEN REGISTRATION

              </p>


              <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/50 to-transparent" />

            </div>


            {/* ============================================================= */}
            {/* FORM                                                          */}
            {/* ============================================================= */}

            <form
              onSubmit={handleSubmit}
              className="mt-5"
            >


              {/* FULL NAME */}

              <div>

                <label
                  htmlFor="name"
                  className="mb-2 block text-[11px] font-medium tracking-[0.13em] text-slate-300"
                >

                  FULL NAME

                </label>


                <div className="flex items-center gap-3 rounded-xl border border-slate-500/50 bg-[#061422]/80 px-4 transition focus-within:border-cyan-400/70 focus-within:ring-1 focus-within:ring-cyan-400/20">

                  <UserRound className="h-5 w-5 shrink-0 text-slate-300" />


                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="h-13 w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-500"
                  />

                </div>

              </div>


              {/* EMAIL */}

              <div className="mt-4">

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
                    className="w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-500"
                  />

                </div>

              </div>


              {/* PASSWORD */}

              <div className="mt-4">

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
                    placeholder="Create a password"
                    autoComplete="new-password"
                    className="w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-500"
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
                    className="shrink-0 text-slate-400 transition hover:text-cyan-300"
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


              {/* CONFIRM PASSWORD */}

              <div className="mt-4">

                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-[11px] font-medium tracking-[0.13em] text-slate-300"
                >

                  CONFIRM PASSWORD

                </label>


                <div className="flex items-center gap-3 rounded-xl border border-slate-500/50 bg-[#061422]/80 px-4 transition focus-within:border-cyan-400/70 focus-within:ring-1 focus-within:ring-cyan-400/20">

                  <Lock className="h-5 w-5 shrink-0 text-slate-300" />


                  <input
                    id="confirm-password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-500"
                  />


                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) =>
                          !current
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    className="shrink-0 text-slate-400 transition hover:text-cyan-300"
                  >

                    {
                      showConfirmPassword
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


              {/* PASSWORD INFO */}

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-500/10 bg-blue-500/[0.04] px-3 py-2.5">

                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />


                <p className="text-[10px] leading-5 text-slate-400">

                  Your PRAVAAH account gives you access to
                  incident reporting, public alerts and disaster
                  risk information.

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


              {/* CREATE ACCOUNT */}

              <button
                type="submit"
                disabled={loading}
                className="group mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-700 text-sm font-semibold tracking-[0.14em] text-white shadow-[0_12px_35px_rgba(37,99,235,0.32)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {
                  loading
                    ? "CREATING ACCOUNT..."
                    : "CREATE ACCOUNT"
                }


                {!loading && (

                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />

                )}

              </button>

            </form>


            {/* ============================================================= */}
            {/* EXISTING ACCOUNT                                              */}
            {/* ============================================================= */}

            <div className="my-6 flex items-center gap-4">

              <div className="h-px flex-1 bg-white/10" />


              <span className="text-[10px] uppercase tracking-wider text-slate-600">

                Already registered?

              </span>


              <div className="h-px flex-1 bg-white/10" />

            </div>


            <Link
              href="/login"
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.04] text-xs font-medium tracking-[0.12em] text-cyan-300 transition hover:bg-cyan-500/10"
            >

              RETURN TO CITIZEN LOGIN

              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />

            </Link>


            {/* ============================================================= */}
            {/* OFFICER NOTE                                                  */}
            {/* ============================================================= */}

            <div className="mt-5 flex items-center justify-center gap-2">

              <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />


              <p className="text-[9px] text-slate-600">

                Officer accounts are issued only to authorized personnel.

              </p>

            </div>

          </div>

        </section>

      </div>

    </main>

  );
}


/* ========================================================================= */
/* COMMUNITY FEATURE                                                         */
/* ========================================================================= */

function CommunityFeature({
  icon: Icon,
  title,
  description,
}: {
  icon:
    typeof Bell;

  title:
    string;

  description:
    string;
}) {

  return (

    <div className="rounded-2xl border border-white/10 bg-[#03101d]/65 p-4 text-center backdrop-blur-lg">

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10">

        <Icon className="h-5 w-5 text-cyan-400" />

      </div>


      <p className="mt-3 text-[11px] font-semibold tracking-wider text-slate-100">

        {title}

      </p>


      <p className="mt-2 text-[10px] leading-4 text-slate-500">

        {description}

      </p>

    </div>

  );
}