import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Check, Eye, EyeOff, Lock, Mail, Mic2, Sparkles, User } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { toast } from "sonner";

const AUTH_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4";

const promisePlay = (video) => {
  const request = video.play();
  if (request?.catch) request.catch(() => {});
};

const FadingVideo = ({ src, className = "", style }) => {
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);
  const fadingOutRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const fadeTo = (target, duration = 500) => {
      cancelAnimationFrame(rafRef.current);
      const start = Number.parseFloat(video.style.opacity || "0") || 0;
      const startTime = performance.now();

      const tick = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        video.style.opacity = String(start + (target - start) * eased);
        if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    const handleLoadedData = () => {
      video.style.opacity = "0";
      promisePlay(video);
      fadeTo(1);
    };

    const handleTimeUpdate = () => {
      if (!video.duration || fadingOutRef.current) return;
      const remaining = video.duration - video.currentTime;
      if (remaining <= 0.55 && remaining > 0) {
        fadingOutRef.current = true;
        fadeTo(0);
      }
    };

    const handleEnded = () => {
      video.style.opacity = "0";
      timeoutRef.current = window.setTimeout(() => {
        video.currentTime = 0;
        promisePlay(video);
        fadingOutRef.current = false;
        fadeTo(1);
      }, 100);
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    if (video.readyState >= 2) handleLoadedData();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(timeoutRef.current);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      style={{ opacity: 0, ...style }}
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
};

const Field = ({ icon: Icon, right, ...props }) => (
  <label className="liquid-glass flex items-center gap-3 rounded-full px-4 py-3.5">
    <Icon className="h-4 w-4 shrink-0 text-white/70" strokeWidth={1.7} />
    <input
      {...props}
      className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
    />
    {right}
  </label>
);

const Auth = () => {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    document.title = mode === "signup" ? "Sign up — MindSphere" : "Sign in — MindSphere";
  }, [mode]);

  useEffect(() => {
    setMode(params.get("mode") === "signup" ? "signup" : "login");
    if (params.get("deleted") === "true") {
      toast.success("Your MindSphere account has been deleted. We're sorry to see you go.");
    }
  }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        await register(name, email, pw);
        nav("/choose-plan");
      } else {
        const user = await login(email, pw);
        nav(user.onboarded ? "/app/dashboard" : "/onboarding");
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Something went wrong");
    }
    setLoading(false);
  };

  const useDemo = async () => {
    setLoading(true);
    try {
      const user = await login("demo@mindsphere.app", "demo1234");
      nav(user.onboarded ? "/app/dashboard" : "/onboarding");
    } catch (e) {
      toast.error("Demo login failed");
    }
    setLoading(false);
  };

  const isSignup = mode === "signup";

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white font-body">
      <FadingVideo
        src={AUTH_VIDEO}
        className="absolute left-1/2 top-0 z-0 h-[120%] w-[120%] -translate-x-1/2 object-cover object-top"
      />

      <div className="relative z-10 flex min-h-screen flex-col px-4 py-5 sm:px-8">
        <header className="flex items-center justify-between">
          <Link to="/" className="liquid-glass inline-flex h-12 w-12 items-center justify-center rounded-full text-white" aria-label="Back to MindSphere">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="liquid-glass hidden rounded-full px-4 py-2 text-sm text-white/90 sm:block">
            MindSphere
          </div>
          <button
            type="button"
            onClick={() => setMode(isSignup ? "login" : "signup")}
            className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-white"
            data-testid="auth-header-toggle"
          >
            {isSignup ? "Sign in" : "Sign up"} <ArrowUpRight className="h-4 w-4" />
          </button>
        </header>

        <main className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-[1fr_460px] lg:px-8">
          <motion.section
            initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left"
          >
            <div className="liquid-glass inline-flex items-center gap-2 rounded-full px-1.5 py-1.5">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">Lyra</span>
              <span className="pr-3 text-sm text-white/90">{isSignup ? "Create your wellness orbit" : "Return to your wellness orbit"}</span>
            </div>
            <h1 className="mt-6 font-heading italic text-5xl leading-[0.88] text-white sm:text-7xl lg:text-[5.5rem]">
              {isSignup ? "Begin with context, not a blank page." : "Welcome back to your inner map."}
            </h1>
            <p className="mt-6 max-w-2xl text-sm font-light leading-tight text-white/90 sm:text-base">
              Lyra connects conversations, journal reflections, mood patterns, sleep, nutrition, movement, and care planning into one evolving MindSphere.
            </p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {["CBT-informed", "Voice-ready", "Private by design"].map((item) => (
                <div key={item} className="liquid-glass flex items-center gap-2 rounded-full px-3 py-2 text-xs text-white/90">
                  <Check className="h-3.5 w-3.5" /> {item}
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.75, ease: "easeOut" }}
            className="liquid-glass-strong mx-auto w-full max-w-[460px] rounded-[1.5rem] p-5 sm:p-7"
            data-testid="auth-card"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-white/60">
                  {isSignup ? "get started" : "sign in"}
                </div>
                <h2 className="mt-3 font-heading italic text-4xl leading-none text-white">
                  {isSignup ? "Create account" : "Enter MindSphere"}
                </h2>
              </div>
              <div className="liquid-glass grid h-12 w-12 shrink-0 place-items-center rounded-full">
                {isSignup ? <Sparkles className="h-5 w-5" /> : <Mic2 className="h-5 w-5" />}
              </div>
            </div>

            <form onSubmit={submit} className="mt-7 space-y-3">
              {isSignup && (
                <Field
                  icon={User}
                  data-testid="auth-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              )}
              <Field
                icon={Mail}
                data-testid="auth-email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
              />
              <Field
                icon={Lock}
                data-testid="auth-password"
                required
                type={showPassword ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                right={
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="rounded-full p-1 text-white/70 hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
              <button
                data-testid="auth-submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
              >
                {loading ? "Opening..." : isSignup ? "Create your MindSphere" : "Sign in"}
                {!loading && <ArrowUpRight className="h-4 w-4" />}
              </button>
            </form>

            <button
              type="button"
              onClick={useDemo}
              disabled={loading}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60"
              data-testid="auth-demo"
            >
              Try demo account <ArrowUpRight className="h-4 w-4" />
            </button>

            <div className="mt-6 text-center text-sm text-white/60">
              {isSignup ? "Already have an account?" : "New to MindSphere?"}{" "}
              <button
                data-testid="auth-toggle"
                type="button"
                onClick={() => setMode(isSignup ? "login" : "signup")}
                className="font-medium text-white underline-offset-4 hover:underline"
              >
                {isSignup ? "Sign in" : "Sign up"}
              </button>
            </div>
            <div className="mt-4 text-center text-[11px] leading-relaxed text-white/40">
              By continuing you agree to our{" "}
              <Link to="/terms" className="text-white/70 underline underline-offset-2 hover:text-white">Terms</Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-white/70 underline underline-offset-2 hover:text-white">Privacy Policy</Link>.
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
};

export default Auth;
