import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth.jsx";
import { Toaster } from "sonner";
import "./App.css";
import ScrollToTop from "./components/ScrollToTop";
import TrialBanner from "./components/TrialBanner";
import { UpgradeProvider } from "./components/UpgradeModal";
import { MoodWidgetProvider } from "./components/MoodWidget";

import Landing from "./pages/Landing";
import MentalHealth from "./pages/MentalHealth";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import Mood from "./pages/Mood";
import Lyra from "./pages/Lyra";
import Voice from "./pages/Voice";
import Diet from "./pages/Diet";
import Exercise from "./pages/Exercise";
import Assessments from "./pages/Assessments";
import Appointments from "./pages/Appointments";
import Analytics from "./pages/Analytics";
import Disturbance from "./pages/Disturbance";
import Meditation from "./pages/Meditation";
import Sleep from "./pages/Sleep";
import Resources from "./pages/Resources";
import SettingsPage from "./pages/Settings";
import Pricing from "./pages/Pricing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Welcome from "./pages/Welcome";
import Community from "./pages/Community";
import ChoosePlan from "./pages/ChoosePlan";
import ErrorBoundary from "./components/ErrorBoundary";
import { AIStatusProvider } from "./components/AIStatus";

const ROUTE_TITLES = {
  "/": "MindSphere — Mental Wellness, Reimagined",
  "/auth": "Sign in — MindSphere",
  "/onboarding": "Welcome — MindSphere",
  "/pricing": "Pricing — MindSphere",
  "/privacy": "Privacy Policy — MindSphere",
  "/terms": "Terms of Service — MindSphere",
  "/welcome": "Welcome — MindSphere",
  "/choose-plan": "Choose your plan — MindSphere",
  "/app/community": "Community — MindSphere",
  "/app/dashboard": "Dashboard — MindSphere",
  "/app/journal": "Journal — MindSphere",
  "/app/mood": "Mood — MindSphere",
  "/app/lyra": "Lyra — MindSphere",
  "/app/voice": "Voice — MindSphere",
  "/app/diet": "Diet & Nutrition — MindSphere",
  "/app/exercise": "Exercise — MindSphere",
  "/app/assessments": "Assessments — MindSphere",
  "/app/appointments": "Appointments — MindSphere",
  "/app/analytics": "Analytics — MindSphere",
  "/app/disturbance": "Disturbance — MindSphere",
  "/app/meditation": "Meditation — MindSphere",
  "/app/sleep": "Sleep — MindSphere",
  "/app/mental-health": "Mental Health — MindSphere",
  "/app/resources": "Resources — MindSphere",
  "/app/settings": "Settings — MindSphere",
};

const TitleManager = () => {
  const loc = useLocation();
  useEffect(() => {
    document.title = ROUTE_TITLES[loc.pathname] || "MindSphere — Mental Wellness, Reimagined";
  }, [loc.pathname]);
  return null;
};

const Protected = ({ children, needOnboarded = true }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-white/60">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (needOnboarded && !user.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
};

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <UpgradeProvider>
            <MoodWidgetProvider>
            <AIStatusProvider>
            <ScrollToTop />
            <TitleManager />
            <TrialBanner />
            <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", color: "white" } }} />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/welcome" element={<Protected needOnboarded={false}><Welcome /></Protected>} />
              <Route path="/choose-plan" element={<Protected needOnboarded={false}><ChoosePlan /></Protected>} />
              <Route path="/onboarding" element={<Protected needOnboarded={false}><Onboarding /></Protected>} />
              <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/app/dashboard" element={<Protected><Dashboard /></Protected>} />
              <Route path="/app/journal" element={<Protected><Journal /></Protected>} />
              <Route path="/app/mood" element={<Protected><Mood /></Protected>} />
              <Route path="/app/lyra" element={<Protected><Lyra /></Protected>} />
              <Route path="/app/mental-health" element={<Protected><MentalHealth /></Protected>} />
              <Route path="/app/voice" element={<Protected><Voice /></Protected>} />
              <Route path="/app/diet" element={<Protected><Diet /></Protected>} />
              <Route path="/app/exercise" element={<Protected><Exercise /></Protected>} />
              <Route path="/app/assessments" element={<Protected><Assessments /></Protected>} />
              <Route path="/app/appointments" element={<Protected><Appointments /></Protected>} />
              <Route path="/app/analytics" element={<Protected><Analytics /></Protected>} />
              <Route path="/app/disturbance" element={<Protected><Disturbance /></Protected>} />
              <Route path="/app/meditation" element={<Protected><Meditation /></Protected>} />
              <Route path="/app/sleep" element={<Protected><Sleep /></Protected>} />
              <Route path="/app/resources" element={<Protected><Resources /></Protected>} />
              <Route path="/app/community" element={<Protected><Community /></Protected>} />
              <Route path="/app/settings" element={<Protected><SettingsPage /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </AIStatusProvider>
            </MoodWidgetProvider>
          </UpgradeProvider>
        </BrowserRouter>
      </AuthProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;
