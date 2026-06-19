import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import useDocTitle from "../hooks/useDocTitle";

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="font-display text-xl text-white mb-2">{title}</h2>
    <div className="text-sm text-white/70 leading-relaxed space-y-3">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
  useDocTitle("Privacy Policy");
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between">
        <button onClick={() => nav("/")} className="font-display text-xl tracking-tight" data-testid="privacy-logo">MindSphere</button>
        <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm text-white/60 hover:text-white" data-testid="privacy-back">
          <ArrowLeft size={14} /> back
        </button>
      </header>
      <main className="px-4 sm:px-6 max-w-3xl mx-auto pb-32">
        <div className="text-[11px] tracking-[0.3em] uppercase text-purple-300 mb-3">privacy</div>
        <h1 className="font-display text-4xl mb-2">Privacy Policy</h1>
        <p className="text-xs text-white/40 mb-10">Last updated: June 2, 2026</p>

        <Section title="1. What we collect">
          <p>We collect only what's needed to make MindSphere work for you:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><b>Account data</b>: your name, email, hashed password.</li>
            <li><b>Wellness data</b>: journal entries, mood logs, sleep logs, meditation sessions, assessment responses, dietary preferences, and similar self-reported data you choose to enter.</li>
            <li><b>Usage data</b>: feature engagement and aggregated metrics that help us improve the product. Never sold.</li>
          </ul>
        </Section>

        <Section title="2. How we use it">
          <p>Your data powers your personalised AI experience — Lyra's understanding of your patterns, your mood forecasts, your meal plans. We <b>do not sell</b> your data. We <b>do not show ads</b>. We do not share your wellness data with employers, insurers, or advertising networks.</p>
        </Section>

        <Section title="3. Data storage">
          <p>Data is stored in MongoDB clusters hosted in North America, encrypted at rest (AES-256) and in transit (TLS 1.2+). Backups are encrypted and rotated weekly.</p>
        </Section>

        <Section title="4. AI processing">
          <p>To produce AI features, we send relevant text excerpts to OpenAI for text-based generation, and audio streams to Google's Gemini Live API for voice mode. We do not include your name, email, or identifying account fields in those requests. Both vendors are bound by data-processing agreements and do not train their general-purpose models on MindSphere user input.</p>
        </Section>

        <Section title="5. Your rights">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><b>Export</b>: get a complete JSON of all your data anytime from <i>Settings → Privacy → Export My Data</i>.</li>
            <li><b>Delete</b>: erase your account and all associated data anytime from <i>Settings → Danger Zone</i>. This is permanent and irreversible.</li>
            <li><b>Access & correction</b>: edit any of your personal data from inside the app.</li>
          </ul>
        </Section>

        <Section title="6. Contact">
          <p>Privacy questions or requests? <a href="mailto:privacy@mindsphere.app" className="text-purple-300 underline">privacy@mindsphere.app</a></p>
        </Section>

        <footer className="mt-16 text-center text-xs text-white/40 space-x-3">
          <a href="/terms" className="hover:text-white/70">Terms</a>
          <span>·</span>
          <a href="/pricing" className="hover:text-white/70">Pricing</a>
          <span>·</span>
          <span>© 2026 MindSphere</span>
        </footer>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
