import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { http } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";
import { toast } from "sonner";
import useDocTitle from "../hooks/useDocTitle";

const PRICING_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_094631_d30ab262-45ee-4b7d-99f3-5d5848c8ef13.mp4";

const PRO_FEATURES = [
  "AI journaling & emotion detection (up to daily cap)",
  "Lyra Voice — real-time voice AI (5 sessions/day, 10 min each)",
  "Full Lyra AI companion chat (CBT-informed support)",
  "7-day personalised meal plans + recipe library",
  "Mood-adaptive exercise programs",
  "PHQ-9, GAD-7 & complete mental health assessments",
  "AI disturbance pattern detection",
  "Sleep tracking & bedtime AI coaching",
  "Appointment scheduling",
  "Meditation, breathing & mindfulness tools",
  "Full analytics dashboard + mood forecasting",
  "Gratitude journal & weekly AI reflections",
  "Priority support",
];

const FREE_FEATURES = [
  "2 journal entries (lifetime)",
  "Basic mood tracking",
  "Meditation & breathing",
  "Sleep tracking",
  "Community board",
];

const TESTIMONIALS = [
  { quote: "MindSphere helped me understand my anxiety patterns in a way no other app has. The disturbance detection spotted that my anxiety spikes every Sunday evening — now I have a ritual to counter it.", name: "Sarah K.", meta: "28 · Toronto" },
  { quote: "Lyra's voice mode is genuinely unlike anything I've tried. It felt like talking to someone who actually remembered everything about me. I cancelled my 3 other wellness apps.", name: "Marcus T.", meta: "34 · Vancouver" },
  { quote: "As someone who's been to therapy for years, I was sceptical. But MindSphere's journaling and emotion detection gave me insights I'd never surfaced with a human therapist. Wild.", name: "Priya M.", meta: "31 · London" },
  { quote: "The meal plans that connect to my mood state are surprisingly accurate. When I'm anxious, it suggests foods I genuinely find calming. The science behind it shows.", name: "James L.", meta: "41 · New York" },
  { quote: "I did the PHQ-9 and the AI interpretation was kinder and more useful than I expected. It didn't just give me a score — it gave me a path forward.", name: "Aisha R.", meta: "26 · Montreal" },
  { quote: "7 days felt too short for the free trial. I upgraded on day 3.", name: "Daniel H.", meta: "29 · Calgary" },
];

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes. Cancel from your settings at any time — no penalties, no questions asked." },
  { q: "What happens when my trial ends?", a: "Your account moves to the free tier automatically. Your data is always safe. Upgrade whenever you're ready." },
  { q: "Is my data private?", a: "Yes. We never sell your data. See our Privacy Policy." },
  { q: "Do you offer refunds?", a: "We don't offer partial-month refunds, but you can cancel before your next billing date to avoid future charges." },
  { q: "What is the AI cost cap?", a: "To keep the service sustainable, Pro accounts have a generous daily AI usage cap. If you hit it, core features like mood logging still work, and top-ups are available." },
];

const fadeIn = {
  initial: { filter: "blur(10px)", opacity: 0, y: 20 },
  whileInView: { filter: "blur(0px)", opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: "easeOut" },
};

const FadingVideo = ({ src, className = "" }) => {
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

    const playVideo = () => {
      const request = video.play();
      if (request?.catch) request.catch(() => {});
    };

    const handleLoadedData = () => {
      video.style.opacity = "0";
      playVideo();
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
        playVideo();
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
      style={{ opacity: 0 }}
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
};

const PlanCard = ({ children, featured = false, delay = 0, testId }) => (
  <motion.div
    {...fadeIn}
    transition={{ duration: 0.7, ease: "easeOut", delay }}
    className={`${featured ? "liquid-glass-strong" : "liquid-glass"} relative flex flex-col rounded-[1.25rem] p-6 md:p-7`}
    data-testid={testId}
  >
    {children}
  </motion.div>
);

const Pricing = () => {
  useDocTitle("Pricing");
  const { user } = useAuth();
  const nav = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const upgrade = async (plan) => {
    if (!user) {
      nav("/auth?mode=signup");
      return;
    }
    setLoadingPlan(plan);
    try {
      const { data } = await http.post("/billing/create-checkout-session", { plan });
      window.location.href = data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start checkout");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white font-body">
      <section className="relative min-h-[86vh] overflow-hidden bg-black">
        <FadingVideo src={PRICING_VIDEO} className="absolute inset-0 z-0 h-full w-full object-cover" />
        <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(0,0,0,0.1),#000_88%)] pointer-events-none" />

        <div className="relative z-10 flex min-h-[86vh] flex-col px-4 py-5 sm:px-8 lg:px-12">
          <header className="flex items-center justify-between">
            <button onClick={() => nav("/")} className="liquid-glass inline-flex h-12 w-12 items-center justify-center rounded-full text-white" data-testid="pricing-logo" aria-label="Back home">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="liquid-glass hidden rounded-full px-4 py-2 text-sm text-white/90 sm:block">MindSphere</div>
            <button
              onClick={() => user ? nav("/app/dashboard") : nav("/auth")}
              className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-white"
              data-testid={user ? "pricing-dashboard" : "pricing-signin"}
            >
              {user ? "Dashboard" : "Sign in"} <ArrowUpRight className="h-4 w-4" />
            </button>
          </header>

          <div className="mx-auto flex flex-1 max-w-4xl flex-col items-center justify-center text-center">
            <motion.div
              initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
              animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: "easeOut" }}
              className="liquid-glass inline-flex items-center gap-2 rounded-full px-1.5 py-1.5"
            >
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">Plans</span>
              <span className="pr-3 text-sm text-white/90">7 days free, no card needed</span>
            </motion.div>
            <motion.h1
              initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
              animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.75, ease: "easeOut" }}
              className="mt-6 font-heading italic text-5xl leading-[0.88] text-white sm:text-7xl lg:text-[5.75rem]"
            >
              Begin gently. Stay if it helps.
            </motion.h1>
            <motion.p
              initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
              animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.75, ease: "easeOut" }}
              className="mt-6 max-w-2xl text-sm font-light leading-tight text-white/90 sm:text-base"
            >
              Choose the amount of MindSphere you need today. Start with free reflection tools, or unlock Lyra voice, AI insights, forecasts, planning, and professional support flows.
            </motion.p>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-10">
        <div className="-mt-24 grid gap-5 md:grid-cols-3">
          <PlanCard delay={0.05} testId="plan-trial-card">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-2">start free</div>
            <div className="font-heading italic text-5xl leading-none mb-1">7 days free</div>
            <div className="text-sm text-white/60 mb-6">then $14.99/month if you upgrade</div>
            <ul className="space-y-2.5 text-sm text-white/80 mb-7 flex-1">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex gap-2"><Check size={15} className="text-white mt-0.5 shrink-0" />{feature}</li>
              ))}
            </ul>
            <button onClick={() => nav("/auth?mode=signup")} data-testid="plan-trial-cta"
              className="w-full rounded-full border border-white/20 py-3 text-sm font-medium text-white hover:bg-white/10">
              Start Free Trial
            </button>
            <div className="mt-2 text-center text-[11px] text-white/50">No credit card required</div>
          </PlanCard>

          <PlanCard featured delay={0.12} testId="plan-monthly-card">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-black">Most Popular</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/70 mb-2">MindSphere Pro</div>
            <div className="font-heading italic text-6xl leading-none mb-1">$14.99<span className="text-base text-white/60">/month</span></div>
            <div className="text-sm text-white/60 mb-6">Billed monthly, cancel anytime</div>
            <ul className="space-y-2.5 text-sm text-white/85 mb-7 flex-1">
              {PRO_FEATURES.slice(0, 8).map((feature) => (
                <li key={feature} className="flex gap-2"><Check size={15} className="text-white mt-0.5 shrink-0" />{feature}</li>
              ))}
              <li className="pl-5 text-xs text-white/50">+ {PRO_FEATURES.length - 8} more Pro features</li>
            </ul>
            <button onClick={() => upgrade("monthly")} disabled={loadingPlan === "monthly"} data-testid="plan-monthly-cta"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50">
              {loadingPlan === "monthly" ? "Opening checkout..." : "Upgrade to Pro"} {loadingPlan !== "monthly" && <ArrowUpRight className="h-4 w-4" />}
            </button>
          </PlanCard>

          <PlanCard delay={0.2} testId="plan-annual-card">
            <div className="absolute right-5 top-0 -translate-y-1/2 rounded-full bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-black">Best Value · Save $30</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-2">MindSphere Pro</div>
            <div className="font-heading italic text-6xl leading-none mb-1">$12.49<span className="text-base text-white/60">/month</span></div>
            <div className="text-sm text-white/60 mb-1">Billed $149.99/year</div>
            <div className="text-xs text-white/75 mb-6">That's 2 months free vs. monthly</div>
            <ul className="space-y-2.5 text-sm text-white/85 mb-7 flex-1">
              {PRO_FEATURES.slice(0, 8).map((feature) => (
                <li key={feature} className="flex gap-2"><Check size={15} className="text-white mt-0.5 shrink-0" />{feature}</li>
              ))}
              <li className="pl-5 text-xs text-white/50">+ {PRO_FEATURES.length - 8} more Pro features</li>
            </ul>
            <button onClick={() => upgrade("annual")} disabled={loadingPlan === "annual"} data-testid="plan-annual-cta"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 py-3 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50">
              {loadingPlan === "annual" ? "Opening checkout..." : "Get Annual Plan"} {loadingPlan !== "annual" && <ArrowUpRight className="h-4 w-4" />}
            </button>
          </PlanCard>
        </div>

        <motion.section {...fadeIn} className="mt-16 rounded-[1.25rem] py-16">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-3">everything in pro</div>
            <h2 className="font-heading italic text-5xl leading-none text-white">One ecosystem, not scattered tools.</h2>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-x-8 gap-y-3 sm:grid-cols-2">
            {PRO_FEATURES.map((feature, index) => (
              <motion.div key={feature} initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: index * 0.03 }}
                className="liquid-glass flex gap-2 rounded-full px-4 py-3 text-sm text-white/80">
                <Check size={16} className="text-white mt-0.5 shrink-0" /> {feature}
              </motion.div>
            ))}
          </div>
        </motion.section>

        <section className="mt-10">
          <motion.div {...fadeIn} className="mb-8 text-center">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-3">from our community</div>
            <h2 className="font-heading italic text-5xl leading-none text-white">People are using MindSphere differently.</h2>
          </motion.div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4" data-testid="testimonials">
            {TESTIMONIALS.map((testimonial, index) => (
              <motion.div key={testimonial.name} {...fadeIn} transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.04 }}
                className="liquid-glass min-w-[320px] snap-start rounded-[1.25rem] p-6 sm:min-w-[380px]">
                <div className="mb-4 flex gap-0.5">
                  {[...Array(5)].map((_, starIndex) => <Star key={starIndex} size={14} fill="currentColor" className="text-white" />)}
                </div>
                <p className="mb-5 text-sm italic leading-relaxed text-white/80">"{testimonial.quote}"</p>
                <div className="text-xs text-white/70">{testimonial.name}, <span className="text-white/50">{testimonial.meta}</span></div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-3xl">
          <motion.div {...fadeIn} className="mb-8 text-center">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-3">questions</div>
            <h2 className="font-heading italic text-5xl leading-none text-white">Good things to know.</h2>
          </motion.div>
          <div className="space-y-3">
            {FAQS.map((faq, index) => (
              <motion.div key={faq.q} {...fadeIn} transition={{ duration: 0.55, ease: "easeOut", delay: index * 0.04 }}
                className="liquid-glass rounded-[1.25rem]" data-testid={`faq-${index}`}>
                <button onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                  <span className="text-sm text-white/90">{faq.q}</span>
                  {openFaq === index ? <ChevronUp size={16} className="text-white/60" /> : <ChevronDown size={16} className="text-white/60" />}
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-4 text-sm leading-relaxed text-white/70">{faq.a}</div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        <motion.section {...fadeIn} className="mx-auto mt-24 max-w-3xl text-center">
          <div className="liquid-glass mx-auto mb-6 grid h-12 w-12 place-items-center rounded-full">
            <ShieldCheck className="h-6 w-6 text-white" strokeWidth={1.7} />
          </div>
          <h2 className="font-heading italic text-5xl leading-none text-white">Begin gently.</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">7 days free. No card. No fluff. Upgrade only when MindSphere starts earning its place in your day.</p>
          <button onClick={() => user ? upgrade("monthly") : nav("/auth?mode=signup")} data-testid="final-cta"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-medium text-black hover:bg-white/90">
            <Sparkles size={16} /> Start your trial <ArrowRight size={16} />
          </button>
        </motion.section>

        <footer className="mt-20 flex flex-wrap justify-center gap-4 border-t border-white/10 pt-10 text-center text-xs text-white/50">
          <button onClick={() => nav("/privacy")} className="hover:text-white/75">Privacy</button>
          <button onClick={() => nav("/terms")} className="hover:text-white/75">Terms</button>
          <span>© 2026 MindSphere</span>
        </footer>
      </main>
    </div>
  );
};

export default Pricing;
