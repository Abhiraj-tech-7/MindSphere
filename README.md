
# 🧠 MindSphere

**Your mind, understood.**

MindSphere is a premium, AI-native mental wellness platform that unifies journaling, mood tracking, voice therapy, assessments, sleep, diet, exercise, and analytics into one deeply personal experience.

Built to feel calm, intelligent, and visually stunning — like a luxury product for mental clarity.

---

## 🚀 Live Demo

**Live App:** https://wellness-sphere-3.preview.emergentagent.com
**Demo Login:** `demo@mindsphere.app` / `demo1234`

---

## 🧩 The Problem

Mental health is a global crisis, yet the tools available today are fragmented, cold, and difficult to stick with.

Most users are forced to jump between separate apps for journaling, mood tracking, meditation, sleep, exercise, and therapy support. Instead of feeling supported, they end up managing a scattered collection of tools.

Current wellness apps often fail because they:

- Track only one part of a person’s mental health instead of the full picture.
- Give generic advice that does not understand a user’s history, triggers, or patterns.
- Feel clinical, repetitive, or uninspiring.
- Offer little real intelligence beyond data collection.
- Do not adapt meaningfully as the user changes over time.
- Make it hard to access support when it is actually needed.

There is also a real treatment gap in mental health care, which makes accessible, personalized, and engaging digital support even more important [web:11][web:12][web:16].

MindSphere is designed to close that gap by turning wellness into a connected, intelligent, and beautiful daily experience.

---

## 💡 The Solution

MindSphere is a full-stack, AI-first mental wellness platform that brings every part of emotional health into one premium product.

It is built around personalization, pattern recognition, and an experience people actually want to return to every day.

### What MindSphere does differently

- **AI at the core, not as a feature.**  
  OpenAI powers journaling, analysis, coaching, meal planning, exercise recommendations, disturbance detection, and voice support.

- **A signature visual experience.**  
  The Floating Bubble UI turns reflection into a beautiful, calm, immersive experience instead of a sterile form.

- **Real-time voice companionship.**  
  Lyra uses the OpenAI Realtime API over WebRTC for browser-based low-latency voice conversations, which matches OpenAI’s documented browser realtime approach [web:9].

- **Whole-person wellness.**  
  MindSphere connects mood, journal entries, sleep, diet, exercise, assessments, appointments, and meditation into one system.

- **Pattern intelligence.**  
  The platform does not just store data. It analyzes trends such as recurring anxiety triggers, sleep disruptions, and mood shifts across time.

- **Daily habit support.**  
  Every screen is designed to be visually rewarding, emotionally supportive, and easy to use consistently.

---

## ✨ Features

### 🌐 Mind Journal
A signature journaling experience built around a central iridescent orb and floating entry bubbles.

- Past journal entries orbit the main sphere as emotion-colored bubbles.
- Bubble colors reflect detected emotion, such as reflective purple, happy pink, sad blue, anxious orange, and calm green.
- Hovering a bubble reveals the date and preview text.
- Clicking a bubble opens the full entry.
- New journal entries run real-time emotion detection while typing.
- Voice journaling is supported through microphone input and live transcript display.

### 😊 Mood Bubble Tracker
A daily check-in system designed to feel intuitive and expressive.

- Animated emoji-orbs for emotion selection.
- Mood intensity slider from 1 to 10.
- Optional mood notes.
- Horizontal mood history timeline.
- Emotion wheel for emotional distribution over time.
- AI-generated insights such as recurring anxiety on Sunday evenings or improved mood after outdoor activity.

### 🎙️ Real-Time Voice AI — Lyra
An immersive full-screen voice mode for high-empathy AI conversation.

- Uses the OpenAI Realtime API with WebRTC.
- Waveform orb reacts to speaking and listening states.
- Live transcript streams word by word.
- Personalized opening greeting based on recent journal and mood data.
- Session summaries are automatically logged into the journal.

### 🧠 AI Health Assistant
A dark, glassmorphic chat experience where Lyra acts as a context-aware wellness companion.

- Remembers journal history, mood patterns, sleep data, and exercise behavior.
- Gives CBT-style coping support.
- Recommends exercises based on current emotional state.
- Can launch mini-assessments inline.
- Can suggest next steps or appointment actions.
- Uses `gpt-4o-mini` for fast text-based interactions.

### 📋 Mental Health Assessments
Beautiful, low-friction questionnaires inspired by clinically validated screenings.

Included assessments:
- PHQ-9
- GAD-7
- Perceived Stress Scale (PSS)
- Sleep Quality Index (PSQI)
- Wellbeing Wheel

Each assessment includes:
- Animated question transitions
- Score visualization
- Score history over time
- AI interpretation
- Suggested next actions

### 🥗 Diet & Nutrition Plan
A personalized nutrition planner based on onboarding data and wellness goals.

- 7-day meal plan with exact meal timing.
- Meals with ingredients and mental health benefit notes.
- Macro and calorie summaries.
- AI meal regeneration when a meal is not preferred.
- Hydration tracker with glass-fill progress animation.
- Mood-food correlation insights.

### 🏃 Exercise & Movement Plans
Mood-aware movement support tailored to energy and emotional state.

- Personalized daily workout recommendation.
- Weekly workout schedule.
- Library of 50+ exercises.
- Mental health benefit tags.
- Animated instruction cards.
- Support for yoga, walking, strength, cardio, stretching, and recovery.

### 🔍 Disturbance Detector
An intelligence layer that reveals recurring emotional strain patterns.

- Scans journal entries, mood logs, and chat history.
- Ranks recurring disturbances by frequency and trend.
- Shows first detected date and trend direction.
- Suggests next actions and coping strategies.
- Optional face or room photo analysis using OpenAI vision models.

### 📅 Appointments
A clean scheduling system for therapy and wellness sessions.

- Monthly and weekly calendar views.
- Book therapist, psychiatrist, counselor, or GP appointments.
- In-person, video, and phone format options.
- Preparation tips generated from recent context.
- Session notes stored for future reference.

### 🧘 Meditation & Breathing
A lightweight relaxation space for immediate calm.

- 4-7-8 breathing
- Box breathing
- Coherent breathing
- Guided meditations
- Ambient sound mixer
- Body tension logging

### 💤 Sleep Tracker
A personalized sleep and recovery system.

- Bedtime and wake-time logging
- Sleep quality rating
- Dream journaling
- Sleep debt tracking
- Morning mood capture
- AI bedtime routine suggestions

### 📖 Resource Library
Curated mental wellness resources in one place.

- Articles
- Videos
- Exercises
- Techniques
- Crisis resources

Includes always-visible support messaging and quick access to help links.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Charts | Recharts + D3.js |
| Icons | Lucide React |
| Auth & Database | Supabase (PostgreSQL, Auth, Realtime) |
| AI — Text | OpenAI `gpt-4o-mini` |
| AI — Vision | OpenAI `gpt-4o` |
| AI — Voice | OpenAI Realtime API via WebRTC |
| Voice Fallback | Web Speech API |
| Fonts | Clash Display + DM Sans |
| Deployment | Vercel + Supabase |

Supabase provides the React-friendly auth, database, and realtime foundation for the app [web:5].

---

## 🏗 Architecture
 
MindSphere is a client-heavy React SPA that talks directly to Supabase for all data persistence and auth, and to the OpenAI API for all intelligence features. The Realtime Voice layer uses a WebRTC peer connection to OpenAI's Realtime API for sub-200ms voice latency.
 
```
┌──────────────────────────────────────────────────────────────────┐
│                        React 18 Frontend (Vite)                  │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  ┌─────────┐  │
│  │  Bubble UI  │  │  Lyra Chat   │  │ Analytics │  │ Assess- │  │
│  │  (Journal)  │  │  + Voice     │  │ Dashboard │  │  ments  │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  └────┬────┘  │
│         │                │                │              │       │
│  ┌──────┴────────────────┴────────────────┴──────────────┴────┐  │
│  │               Zustand Global Store + React Query           │  │
│  └──────┬──────────────────────────────────┬──────────────────┘  │
└─────────┼────────────────────────────────── ┼───────────────────┘
          │                                   │
          ▼                                   ▼
┌─────────────────────┐           ┌───────────────────────────────┐
│      Supabase       │           │           OpenAI              │
│                     │           │                               │
│  ┌───────────────┐  │           │  ┌─────────────────────────┐  │
│  │  Auth (JWT)   │  │           │  │  GPT-4o-mini            │  │
│  └───────────────┘  │           │  │  · Chat (Lyra)          │  │
│  ┌───────────────┐  │           │  │  · Journal analysis     │  │
│  │  PostgreSQL   │  │           │  │  · Meal/exercise plans  │  │
│  │  · profiles   │  │           │  │  · Disturbance detect   │  │
│  │  · journals   │  │           │  └─────────────────────────┘  │
│  │  · moods      │  │           │  ┌─────────────────────────┐  │
│  │  · sleep      │  │           │  │  GPT-4o Vision          │  │
│  │  · meals      │  │           │  │  · Face wellness scan   │  │
│  │  · exercises  │  │           │  │  · Room environment     │  │
│  │  · assessments│  │           │  └─────────────────────────┘  │
│  │  · appts      │  │           │  ┌─────────────────────────┐  │
│  └───────────────┘  │           │  │  Realtime API (WebRTC)  │  │
│  ┌───────────────┐  │           │  │  · Lyra voice mode      │  │
│  │  Realtime     │  │           │  │  · Live transcript      │  │
│  │  Subscriptions│  │           │  │  · Session summaries    │  │
│  └───────────────┘  │           │  └─────────────────────────┘  │
└─────────────────────┘           └───────────────────────────────┘
```
 
### Data Flow — Journal Entry
 
```
User types entry
      │
      ▼
Emotion detector fires (GPT-4o-mini, debounced 800ms)
      │
      ▼
User submits
      │
      ├──► Supabase: INSERT journal_entries
      │
      ├──► OpenAI: Generate AI reflection (2 sentences)
      │
      ├──► OpenAI: Detect disturbances → UPDATE disturbances table
      │
      └──► Supabase Realtime: Bubble UI receives new entry → animates new orb in
```
 
### Data Flow — Voice Session (Lyra)
 
```
User opens Voice Mode
      │
      ▼
Fetch last 5 journal entries + mood history from Supabase
      │
      ▼
Establish WebRTC peer connection to OpenAI Realtime API
      │
      ▼
Lyra greets user with personalized opener
      │
      ▼  (conversation loop)
User speaks → WebRTC audio stream → OpenAI → Lyra responds (audio + transcript)
      │
      ▼
On session end → GPT-4o-mini summarizes session → INSERT to journal_entries
```
 
---
 
## 🚀 Getting Started
 
### Prerequisites
 
Make sure you have the following installed and set up:
 
- [Node.js](https://nodejs.org/) v18 or higher
- npm v9+ or yarn
- A [Supabase](https://supabase.com) account and project (free tier is fine)
- An [OpenAI](https://platform.openai.com) account with API key — ensure your account has access to:
  - `gpt-4o-mini` (text/chat)
  - `gpt-4o` (vision)
  - Realtime API (`gpt-4o-realtime-preview`) — currently requires joining the waitlist or having a paid plan
### Installation
 
```bash
# 1. Clone the repository
git clone https://github.com/yourusername/mindsphere.git
cd mindsphere
 
# 2. Install all dependencies
npm install
 
# 3. Set up environment variables
cp .env.example .env.local
# Then open .env.local and fill in your keys (see Environment Variables below)
 
# 4. Push the database schema to Supabase
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
 
# 5. (Optional) Seed the database with demo data
npm run db:seed
 
# 6. Start the development server
npm run dev
```
 
Open [http://localhost:5173](http://localhost:5173) — you should see the MindSphere landing page.
 
### Building for Production
 
```bash
# Create an optimised production build
npm run build
 
# Preview the production build locally
npm run preview
```
 
### Deploying to Vercel
 
```bash
# Install the Vercel CLI
npm install -g vercel
 
# Deploy (follow the prompts)
vercel
 
# Set environment variables on Vercel
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_OPENAI_API_KEY
```
 
---
 
## 🔐 Environment Variables
 
Create a `.env.local` file in the root of the project:
 
```env
# ── Supabase ───────────────────────────────────────────
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
 
# ── OpenAI ─────────────────────────────────────────────
VITE_OPENAI_API_KEY=sk-your-openai-api-key
 
# ── App ────────────────────────────────────────────────
VITE_APP_URL=http://localhost:5173
```
 
> ⚠️ `.env.local` is already listed in `.gitignore`. Never commit your API keys.
 
You can find your Supabase URL and anon key in your Supabase project under **Settings → API**.
 
---
 
## 🗄 Database Schema
 
All migrations live in `/supabase/migrations/`. The core tables are:
 
```sql
-- Stores user profile data collected during the 15-question onboarding
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  goals TEXT[],
  stress_sources TEXT[],
  sleep_hours NUMERIC,
  diet_type TEXT,
  allergies TEXT,
  water_glasses INT,
  has_therapist TEXT,
  journal_frequency TEXT,
  wake_time TIME,
  sleep_time TIME,
  positive_triggers TEXT[],
  negative_triggers TEXT[],
  energy_level INT,
  ideal_wellness_day TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
 
-- Journal entries with AI-generated metadata
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  detected_emotion TEXT,
  emotion_color TEXT,
  ai_reflection TEXT,
  word_count INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
 
-- Daily mood check-ins
CREATE TABLE mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  emotion TEXT NOT NULL,
  intensity INT CHECK (intensity BETWEEN 1 AND 10),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
 
-- Sleep tracking
CREATE TABLE sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  bedtime TIMESTAMPTZ,
  wake_time TIMESTAMPTZ,
  quality INT CHECK (quality BETWEEN 1 AND 5),
  dream_notes TEXT,
  morning_mood TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
 
-- Assessment results (PHQ-9, GAD-7, PSS, PSQI)
CREATE TABLE assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  score INT,
  answers JSONB,
  interpretation TEXT,
  taken_at TIMESTAMPTZ DEFAULT now()
);
 
-- Scheduled appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  appt_type TEXT,
  format TEXT,
  scheduled_at TIMESTAMPTZ,
  notes TEXT,
  prep_tips TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
 
-- AI-detected recurring disturbances
CREATE TABLE disturbances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  label TEXT,
  frequency INT,
  first_detected TIMESTAMPTZ,
  trend TEXT CHECK (trend IN ('increasing', 'decreasing', 'stable')),
  recommendation TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
 
Row Level Security (RLS) is enabled on all tables — users can only read and write their own rows.
 
---
 
## 🎯 What Makes MindSphere Different
 
| Feature | MindSphere | Headspace | Calm | Woebot |
|---|---|---|---|---|
| Real-time AI voice therapy | ✅ WebRTC | ❌ | ❌ | ❌ |
| Personalized meal plans | ✅ | ❌ | ❌ | ❌ |
| AI disturbance detection | ✅ | ❌ | ❌ | ❌ |
| Mood-adaptive exercise plans | ✅ | ❌ | ❌ | ❌ |
| Journal → AI pattern analysis | ✅ | ❌ | ❌ | Partial |
| Computer vision wellness scan | ✅ GPT-4o | ❌ | ❌ | ❌ |
| Full clinical assessments (PHQ-9, GAD-7) | ✅ | ❌ | ❌ | Partial |
| Everything in one platform | ✅ | ❌ | ❌ | ❌ |
 
---
 
## 👥 Team
 
It's only me : Abhiraj Balyan✌️
---
 
## 🗺 Roadmap
 
- [ ] Native iOS & Android apps (React Native)
- [ ] Apple Health & Google Fit integration
- [ ] Therapist portal — professional dashboard for practitioners
- [ ] Group therapy rooms — real-time shared sessions
- [ ] Wearable data ingestion (HRV, sleep stages from watch)
- [ ] Offline mode with local-first sync
---
 
## ⚠️ Disclaimer
 
MindSphere is a wellness support tool and is **not a substitute for professional mental health care.** If you are in crisis, please contact a licensed professional or a crisis helpline in your region.
 
🇺🇸 **USA:** 988 Suicide & Crisis Lifeline — call or text **988**
🇨🇦 **Canada:** Crisis Services Canada — **1-833-456-4566**
🌍 **International:** [findahelpline.com](https://findahelpline.com)
 
---
 
## 📄 License
 
This project is licensed under the [MIT License](LICENSE).
 
---
 
Made with 💜
 
**If MindSphere resonates with you, please ⭐ this repo.**


