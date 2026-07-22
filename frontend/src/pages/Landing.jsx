import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BedDouble,
  BookOpenText,
  Bot,
  Brain,
  CalendarCheck,
  Check,
  ChevronRight,
  HeartPulse,
  Mic2,
  Moon,
  Play,
  Salad,
  Search,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Waves,
  Wind,
  Dumbbell,
} from "lucide-react";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4";
const CAPABILITIES_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_094631_d30ab262-45ee-4b7d-99f3-5d5848c8ef13.mp4";

const fadeIn = {
  initial: { filter: "blur(10px)", opacity: 0, y: 20 },
  whileInView: { filter: "blur(0px)", opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.75, ease: "easeOut" },
};

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Lyra", href: "#lyra" },
  { label: "Plans", href: "#pricing" },
  { label: "Safety", href: "#safety" },
  { label: "FAQ", href: "#faq" },
];

const capabilities = [
  {
    icon: Bot,
    title: "Lyra AI Companion",
    body: "A CBT-informed companion for late-night venting, reflective check-ins, and real-time voice support that remembers your context.",
    tags: ["CBT-guided", "Voice", "Memory", "Judgment-free"],
    to: "/app/lyra",
  },
  {
    icon: BookOpenText,
    title: "Guided Journal",
    body: "Prompts adapt to your mood, sleep, and recent patterns, turning blank pages into useful self-reflection.",
    tags: ["AI prompts", "Insights", "Gratitude", "Weekly review"],
    to: "/app/journal",
  },
  {
    icon: Search,
    title: "Disturbance Detector",
    body: "MindSphere watches for meaningful emotional shifts and recommends early interventions before overwhelm grows.",
    tags: ["Pattern shifts", "Triggers", "Signals", "Care nudges"],
    to: "/app/disturbance",
  },
];

const ecosystem = [
  { icon: Activity, title: "Mood Tracker", copy: "See emotional trends, recurring triggers, and progress over time.", to: "/app/mood" },
  { icon: Wind, title: "Breathing Suite", copy: "Box, 4-7-8, resonance, diaphragmatic, and guided timers.", to: "/app/meditation" },
  { icon: Moon, title: "Meditation Library", copy: "Sessions for anxiety, sleep, gratitude, focus, confidence, and body scans.", to: "/app/meditation" },
  { icon: Salad, title: "Diet Planning", copy: "Meal ideas and recipes that consider mood, energy, and wellbeing goals.", to: "/app/diet" },
  { icon: Dumbbell, title: "Exercise Plans", copy: "Movement recommendations shaped around goals, energy, and motivation.", to: "/app/exercise" },
  { icon: CalendarCheck, title: "Appointments", copy: "Book professional support and bring AI-prepared talking points.", to: "/app/appointments" },
  { icon: BadgeCheck, title: "Assessments", copy: "Understand anxiety, depression, stress, and emotional wellbeing signals.", to: "/app/assessments" },
  { icon: BedDouble, title: "Sleep Tracker", copy: "Connect sleep duration and quality with mood, energy, and patterns.", to: "/app/sleep" },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    badge: "Start gently",
    cta: "Get started",
    to: "/auth?mode=signup",
    features: ["Basic mood tracking", "Meditation and breathing", "Sleep logs", "Community access"],
  },
  {
    name: "Pro",
    price: "$14.99",
    cadence: "per month",
    badge: "Most popular",
    cta: "Start Pro trial",
    to: "/auth?mode=signup&plan=pro",
    featured: true,
    features: ["Full Lyra chat and voice", "AI journaling insights", "Disturbance detection", "Nutrition and exercise plans", "Assessments and analytics"],
  },
  {
    name: "Annual",
    price: "$149.99",
    cadence: "per year",
    badge: "Save $30",
    cta: "Choose annual",
    to: "/auth?mode=signup&plan=annual",
    features: ["Everything in Pro", "Two months included", "Priority support", "Advanced weekly reflections"],
  },
];

const faqs = [
  ["Is MindSphere therapy?", "No. MindSphere supports everyday reflection and wellness, but it is not a substitute for clinical care or emergency services."],
  ["What makes Lyra different?", "Lyra connects your journal, mood, sleep, assessments, and routines so conversations can reflect your real patterns instead of treating every chat as a blank slate."],
  ["Can I use it for free?", "Yes. You can begin with core mood, breathing, sleep, and community tools, then upgrade when you want the full AI ecosystem."],
];

const FadingVideo = ({ src, className = "", style }) => {
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);
  const fadingOutRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const FADE_MS = 500;
    const FADE_OUT_LEAD = 0.55;

    const fadeTo = (target, duration = FADE_MS) => {
      cancelAnimationFrame(rafRef.current);
      const start = Number.parseFloat(video.style.opacity || "0") || 0;
      const startTime = performance.now();

      const tick = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        video.style.opacity = String(start + (target - start) * eased);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
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
      if (remaining <= FADE_OUT_LEAD && remaining > 0) {
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
      style={{ opacity: 0, ...style }}
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
};

const BlurText = ({ text, className = "" }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <p ref={ref} className={`flex flex-wrap justify-center ${className}`} style={{ rowGap: "0.1em" }}>
      {text.split(" ").map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          initial={{ filter: "blur(10px)", opacity: 0, y: 50 }}
          animate={
            visible
              ? {
                  filter: ["blur(10px)", "blur(5px)", "blur(0px)"],
                  opacity: [0, 0.5, 1],
                  y: [50, -5, 0],
                }
              : {}
          }
          transition={{ duration: 0.7, times: [0, 0.5, 1], ease: "easeOut", delay: index * 0.1 }}
          style={{ display: "inline-block", marginRight: "0.28em" }}
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
};

const SectionLink = ({ href, children }) => (
  <a className="px-3 py-2 text-sm font-medium text-white/90 font-body hover:text-white" href={href}>
    {children}
  </a>
);

const MiniMetric = ({ icon: Icon, value, label }) => (
  <motion.div {...fadeIn} className="liquid-glass p-5 w-full max-w-[220px] rounded-[1.25rem]">
    <Icon className="h-7 w-7 text-white" strokeWidth={1.7} />
    <div className="mt-8 font-heading italic text-4xl tracking-normal leading-none text-white">{value}</div>
    <div className="mt-2 text-xs text-white font-body font-light">{label}</div>
  </motion.div>
);

const CapabilityCard = ({ item, index }) => {
  const Icon = item.icon;
  return (
    <motion.div
      {...fadeIn}
      transition={{ duration: 0.75, ease: "easeOut", delay: index * 0.08 }}
      className="liquid-glass rounded-[1.25rem] p-6 min-h-[360px] flex flex-col"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="liquid-glass grid h-11 w-11 shrink-0 place-items-center rounded-[0.75rem]">
          <Icon className="h-6 w-6 text-white" strokeWidth={1.65} />
        </div>
        <div className="flex flex-wrap justify-end gap-1.5 max-w-[72%]">
          {item.tags.map((tag) => (
            <span key={tag} className="liquid-glass rounded-full px-3 py-1 text-[11px] text-white/90 font-body whitespace-nowrap">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-1" />
      <h3 className="font-heading italic text-white text-3xl md:text-4xl tracking-normal leading-none">{item.title}</h3>
      <p className="mt-3 text-sm text-white/90 font-body font-light leading-snug max-w-[32ch]">{item.body}</p>
      <Link to={item.to} className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-body text-white/90 hover:text-white">
        Open module <ArrowUpRight className="h-4 w-4" />
      </Link>
    </motion.div>
  );
};

const EcosystemTile = ({ item, index }) => {
  const Icon = item.icon;
  return (
    <motion.div
      {...fadeIn}
      transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.04 }}
      className="group rounded-[1.25rem] border border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl"
    >
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
          <Icon className="h-5 w-5 text-white" strokeWidth={1.7} />
        </div>
        <div>
          <h3 className="font-heading italic text-2xl leading-none text-white">{item.title}</h3>
          <p className="mt-2 text-sm leading-snug text-white/60">{item.copy}</p>
          <Link to={item.to} className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-white/75 group-hover:text-white">
            Explore <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

const PlanCard = ({ plan, index }) => (
  <motion.div
    {...fadeIn}
    transition={{ duration: 0.65, ease: "easeOut", delay: index * 0.08 }}
    className={`rounded-[1.25rem] p-6 ${plan.featured ? "liquid-glass-strong" : "liquid-glass"}`}
  >
    <div className="flex items-center justify-between gap-3">
      <span className="liquid-glass rounded-full px-3 py-1 text-xs text-white/90">{plan.badge}</span>
      {plan.featured && <Sparkles className="h-5 w-5 text-white" />}
    </div>
    <h3 className="mt-8 font-heading italic text-4xl text-white">{plan.name}</h3>
    <div className="mt-2 flex items-end gap-2">
      <span className="font-heading italic text-5xl leading-none text-white">{plan.price}</span>
      <span className="pb-1 text-sm text-white/70">{plan.cadence}</span>
    </div>
    <ul className="mt-7 space-y-3 text-sm text-white/80">
      {plan.features.map((feature) => (
        <li key={feature} className="flex gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-white" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
    <Link
      to={plan.to}
      className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium ${
        plan.featured ? "bg-white text-black hover:bg-white/90" : "border border-white/20 text-white hover:bg-white/10"
      }`}
    >
      {plan.cta} <ArrowUpRight className="h-4 w-4" />
    </Link>
  </motion.div>
);

const Landing = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white font-body">
      <nav className="fixed left-0 right-0 top-4 z-50 flex items-center justify-between px-4 md:px-8 lg:px-16">
        <a href="#home" className="liquid-glass grid h-12 w-12 place-items-center rounded-full font-heading italic text-3xl leading-none text-white">
          m
        </a>
        <div className="liquid-glass hidden items-center rounded-full px-1.5 py-1.5 md:flex">
          {navLinks.map((link) => (
            <SectionLink key={link.href} href={link.href}>
              {link.label}
            </SectionLink>
          ))}
          <Link to="/auth?mode=signup" className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-medium text-black">
            Get started <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <Link to="/auth" className="liquid-glass grid h-12 w-12 place-items-center rounded-full text-white" aria-label="Sign in">
          <ArrowUpRight className="h-5 w-5" />
        </Link>
      </nav>

      <section id="home" className="relative flex min-h-screen overflow-hidden bg-black">
        <FadingVideo
          src={HERO_VIDEO}
          className="absolute left-1/2 top-0 z-0 -translate-x-1/2 object-cover object-top"
          style={{ width: "120%", height: "120%" }}
        />
        <div className="relative z-10 flex min-h-screen w-full flex-col px-4 pt-24">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <motion.div
              initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
              animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.75, ease: "easeOut" }}
              className="liquid-glass inline-flex items-center gap-2 rounded-full px-1.5 py-1.5"
            >
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">New</span>
              <span className="pr-3 text-sm text-white/90">Lyra voice, guided care, and pattern detection in one orbit</span>
            </motion.div>

            <BlurText
              text="MindSphere Turns Inner Weather Into Guidance"
              className="mt-6 max-w-4xl justify-center font-heading italic text-5xl leading-[0.86] tracking-normal text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]"
            />

            <motion.p
              initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
              animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.75, ease: "easeOut" }}
              className="mt-5 max-w-2xl text-sm font-light leading-tight text-white md:text-base"
            >
              A cinematic AI wellness platform for stress, anxiety, burnout, low motivation, and the ordinary hard days. Lyra listens, remembers, and connects your journal, mood, sleep, nutrition, movement, and care routines.
            </motion.p>

            <motion.div
              initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
              animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.75, ease: "easeOut" }}
              className="mt-7 flex flex-wrap items-center justify-center gap-5"
            >
              <Link to="/auth?mode=signup" className="liquid-glass-strong inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white">
                Start free with Lyra <ArrowUpRight className="h-5 w-5" />
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 text-sm font-medium text-white">
                View the ecosystem <Play className="h-4 w-4 fill-current" />
              </a>
            </motion.div>

            <div className="mt-9 grid w-full max-w-md grid-cols-2 justify-items-center gap-4">
              <MiniMetric icon={TimerReset} value="2 AM" label="Judgment-free support window" />
              <MiniMetric icon={HeartPulse} value="8+" label="Connected wellness modules" />
            </div>
          </div>

          <motion.div
            initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.75, ease: "easeOut" }}
            className="flex flex-col items-center gap-4 pb-8"
          >
            <span className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white">
              A connected mental wellness ecosystem built by Abhiraj
            </span>
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-2 font-heading italic text-2xl tracking-normal text-white md:gap-x-16 md:text-3xl">
              <span>Lyra</span>
              <span>Journal</span>
              <span>Mood</span>
              <span>Sleep</span>
              <span>Care</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="relative min-h-screen overflow-hidden bg-black">
        <FadingVideo src={CAPABILITIES_VIDEO} className="absolute inset-0 z-0 h-full w-full object-cover" />
        <div className="relative z-10 flex min-h-screen flex-col px-4 pb-10 pt-24 md:px-16 lg:px-20">
          <div className="mb-auto">
            <motion.div {...fadeIn} className="mb-6 text-sm text-white/80">
              // Capabilities
            </motion.div>
            <motion.h2 {...fadeIn} className="font-heading italic text-6xl leading-[0.9] tracking-normal text-white md:text-7xl lg:text-[6rem]">
              Care signals
              <br />
              connected
            </motion.h2>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {capabilities.map((item, index) => (
              <CapabilityCard key={item.title} item={item} index={index} />
            ))}
          </div>
        </div>
      </section>

      <main className="relative z-10 bg-black">
        <section id="lyra" className="mx-auto grid max-w-7xl gap-10 px-4 py-24 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:px-12">
          <motion.div {...fadeIn}>
            <div className="text-sm text-white/60">// Lyra</div>
            <h2 className="mt-5 font-heading italic text-5xl leading-[0.92] text-white md:text-6xl">A companion that keeps the whole picture in view.</h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70">
              MindSphere is not eight isolated tools. Mood history shapes Lyra's conversations. Sleep quality changes journal prompts. Breathing recommendations adapt to anxiety trends. Nutrition, exercise, assessments, and care planning all feed one evolving understanding of you.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/auth?mode=signup" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black">
                Talk to Lyra <Mic2 className="h-4 w-4" />
              </Link>
              <Link to="/app/voice" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white">
                Try voice mode <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2">
            {ecosystem.map((item, index) => (
              <EcosystemTile key={item.title} item={item} index={index} />
            ))}
          </div>
        </section>

        <section id="pricing" className="px-4 py-24 md:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <motion.div {...fadeIn} className="mx-auto max-w-3xl text-center">
              <div className="text-sm text-white/60">// Pricing</div>
              <h2 className="mt-5 font-heading italic text-5xl leading-[0.92] text-white md:text-6xl">Begin gently. Upgrade when it helps.</h2>
              <p className="mt-5 text-white/70">Start with the basics, or unlock the full MindSphere ecosystem with Lyra voice, proactive insights, planning, and analytics.</p>
            </motion.div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {plans.map((plan, index) => (
                <PlanCard key={plan.name} plan={plan} index={index} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link to="/pricing" className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white">
                Compare every plan detail <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="safety" className="mx-auto grid max-w-7xl gap-6 px-4 py-24 md:grid-cols-3 md:px-8 lg:px-12">
          {[
            { icon: ShieldCheck, title: "Privacy-first posture", copy: "Clear privacy and terms links are built in, with no selling your personal wellness data." },
            { icon: Brain, title: "Evidence-based tone", copy: "Lyra is shaped around supportive CBT principles while staying honest about its role." },
            { icon: Waves, title: "Human support ready", copy: "Appointments help you connect with professionals when you want care beyond self-guided support." },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.title} {...fadeIn} transition={{ duration: 0.65, ease: "easeOut", delay: index * 0.08 }} className="liquid-glass rounded-[1.25rem] p-6">
                <Icon className="h-7 w-7 text-white" strokeWidth={1.7} />
                <h3 className="mt-8 font-heading italic text-3xl text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{item.copy}</p>
              </motion.div>
            );
          })}
        </section>

        <section id="faq" className="mx-auto max-w-4xl px-4 py-24 md:px-8">
          <motion.div {...fadeIn} className="text-center">
            <div className="text-sm text-white/60">// FAQ</div>
            <h2 className="mt-5 font-heading italic text-5xl leading-[0.92] text-white md:text-6xl">Good things to know.</h2>
          </motion.div>
          <div className="mt-10 space-y-3">
            {faqs.map(([question, answer], index) => (
              <motion.details
                key={question}
                {...fadeIn}
                transition={{ duration: 0.55, ease: "easeOut", delay: index * 0.06 }}
                className="liquid-glass group rounded-[1.25rem] px-6 py-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium text-white">
                  {question}
                  <ChevronRight className="h-5 w-5 shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-white/70">{answer}</p>
              </motion.details>
            ))}
          </div>
        </section>

        <section className="px-4 py-24 text-center md:px-8">
          <motion.div {...fadeIn} className="mx-auto max-w-3xl">
            <h2 className="font-heading italic text-5xl leading-[0.92] text-white md:text-7xl">Your mind, held with context.</h2>
            <p className="mx-auto mt-5 max-w-xl text-white/70">One account for reflection, calming, sleep, food, movement, assessments, appointments, and a companion that learns alongside you.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/auth?mode=signup" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black">
                Get started free <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/pricing" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white">
                View pricing <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </section>

        <footer className="border-t border-white/10 px-4 py-10 text-center text-xs text-white/50">
          <div className="mb-3 flex flex-wrap justify-center gap-4">
            <Link to="/pricing" className="hover:text-white/75">Pricing</Link>
            <Link to="/privacy" className="hover:text-white/75">Privacy</Link>
            <Link to="/terms" className="hover:text-white/75">Terms</Link>
            <Link to="/auth" className="hover:text-white/75">Sign in</Link>
          </div>
          <p>© 2026 MindSphere. Not a substitute for clinical care. In crisis, contact local emergency services or a crisis hotline.</p>
        </footer>
      </main>
    </div>
  );
};

export default Landing;
