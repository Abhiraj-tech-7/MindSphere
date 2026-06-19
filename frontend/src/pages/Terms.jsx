import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import useDocTitle from "../hooks/useDocTitle";

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="font-display text-xl text-white mb-2">{title}</h2>
    <div className="text-sm text-white/70 leading-relaxed space-y-3">{children}</div>
  </section>
);

const Terms = () => {
  useDocTitle("Terms of Service");
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between">
        <button onClick={() => nav("/")} className="font-display text-xl tracking-tight" data-testid="terms-logo">MindSphere</button>
        <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm text-white/60 hover:text-white" data-testid="terms-back">
          <ArrowLeft size={14} /> back
        </button>
      </header>
      <main className="px-4 sm:px-6 max-w-3xl mx-auto pb-32">
        <div className="text-[11px] tracking-[0.3em] uppercase text-purple-300 mb-3">legal</div>
        <h1 className="font-display text-4xl mb-2">Terms of Service</h1>
        <p className="text-xs text-white/40 mb-10">Last updated: June 2, 2026</p>

        <Section title="1. Acceptance">
          <p>By creating an account or using MindSphere, you agree to these Terms and our Privacy Policy. If you don't agree, please don't use the service.</p>
        </Section>

        {/* Prominent medical disclaimer */}
        <div data-testid="medical-disclaimer" className="my-8 rounded-2xl p-5 flex gap-4 items-start"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.45)" }}>
          <AlertTriangle className="text-red-400 mt-0.5 shrink-0" size={20} />
          <div>
            <div className="font-medium text-red-300 mb-1">2. Not a medical service</div>
            <p className="text-sm text-white/85 leading-relaxed">
              MindSphere is not a medical device, clinical service, or substitute for professional mental health care.
              If you are in crisis, call emergency services or a crisis line immediately (US/Canada: 988).
            </p>
          </div>
        </div>

        <Section title="3. User responsibilities">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>You provide accurate information when registering and using the service.</li>
            <li>You will not misuse the service, including but not limited to: reverse-engineering, attempting to disrupt service availability, or submitting illegal content.</li>
            <li>You must be at least 13 years old to use MindSphere. Users between 13 and 18 must have parent/guardian consent.</li>
          </ul>
        </Section>

        <Section title="4. Subscription terms">
          <p>MindSphere Pro is available at <b>$14.99 USD per month</b> or <b>$149.99 USD per year</b>. Pricing may change with at least 30 days advance notice; existing paid periods are honoured at original pricing.</p>
        </Section>

        <Section title="5. Cancellation & refunds">
          <p>You may cancel anytime from your settings or Stripe's customer portal. Cancellation takes effect at the end of your current billing period — there are no refunds for partial billing periods. Access continues until the end of your paid period.</p>
        </Section>

        <Section title="6. Limitation of liability">
          <p>MindSphere is provided "as-is" and "as available", without warranties of any kind. To the maximum extent allowed by law, our total liability for any claim is limited to the amount you paid us in the 30 days preceding the event giving rise to the claim.</p>
        </Section>

        <Section title="7. Governing law">
          <p>These Terms are governed by the laws of British Columbia, Canada. Any disputes will be resolved in the courts of British Columbia.</p>
        </Section>

        <footer className="mt-16 text-center text-xs text-white/40 space-x-3">
          <a href="/privacy" className="hover:text-white/70">Privacy</a>
          <span>·</span>
          <a href="/pricing" className="hover:text-white/70">Pricing</a>
          <span>·</span>
          <span>© 2026 MindSphere</span>
        </footer>
      </main>
    </div>
  );
};

export default Terms;
