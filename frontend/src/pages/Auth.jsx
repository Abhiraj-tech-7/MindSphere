import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AuroraBackground } from "../components/AuroraBackground";
import { MindOrb } from "../components/MindOrb";
import { useAuth } from "../lib/auth.jsx";
import { toast } from "sonner";

const Auth = () => {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const u = await register(name, email, pw);
        nav(u.onboarded ? "/app/dashboard" : "/onboarding");
      } else {
        const u = await login(email, pw);
        nav(u.onboarded ? "/app/dashboard" : "/onboarding");
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Something went wrong");
    }
    setLoading(false);
  };

  const useDemo = async () => {
    setLoading(true);
    try {
      const u = await login("demo@mindsphere.app", "demo1234");
      nav(u.onboarded ? "/app/dashboard" : "/onboarding");
    } catch (e) {
      toast.error("Demo login failed");
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-black text-white flex items-center justify-center px-6">
      <AuroraBackground />
      <div className="absolute opacity-60" style={{ top: "10%" }}><MindOrb size={520} /></div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass relative z-10 w-full max-w-md p-9"
        data-testid="auth-card"
      >
        <Link to="/" className="text-xs text-white/40 hover:text-white">← back</Link>
        <h1 className="font-display text-4xl mt-3 text-glow">
          {mode === "signup" ? "Begin." : "Welcome back."}
        </h1>
        <p className="text-sm text-white/50 mt-2">
          {mode === "signup" ? "Create your space. It's free." : "Your space is waiting."}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-3">
          {mode === "signup" && (
            <input
              data-testid="auth-name"
              required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 outline-none focus:border-purple-400/60 placeholder-white/30 transition"
            />
          )}
          <input
            data-testid="auth-email"
            required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 outline-none focus:border-purple-400/60 placeholder-white/30 transition"
          />
          <input
            data-testid="auth-password"
            required type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 outline-none focus:border-purple-400/60 placeholder-white/30 transition"
          />
          <button
            data-testid="auth-submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-white text-black font-medium hover:scale-[1.02] transition disabled:opacity-60"
          >
            {loading ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 flex items-center gap-2">
          <div className="flex-1 h-px bg-white/10" />
          <div className="text-xs text-white/30">or</div>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button onClick={useDemo} data-testid="auth-demo"
          className="mt-5 w-full py-3 rounded-2xl border border-white/10 hover:bg-white/5 text-sm transition">
          Try the demo account
        </button>

        <div className="mt-6 text-center text-sm text-white/50">
          {mode === "signup" ? "Already have one?" : "New here?"}{" "}
          <button data-testid="auth-toggle" onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="text-white underline-offset-4 hover:underline">
            {mode === "signup" ? "Sign in" : "Create an account"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
