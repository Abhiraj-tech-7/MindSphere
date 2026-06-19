"""MindSphere – mental wellness SaaS backend (FastAPI + Mongo + OpenAI + Gemini Live + Stripe)."""
import os
import uuid
import logging
import asyncio
import base64
import json
import hashlib
import time
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, WebSocket, WebSocketDisconnect, Query, Request
from fastapi.responses import JSONResponse, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import bcrypt
import jwt
import openai
import stripe
import resend

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from google import genai as google_genai
from google.genai import types as gtypes

# ---------- bootstrap ----------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = os.environ.get("JWT_ALGO", "HS256")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_LIVE_MODEL = os.environ.get("GEMINI_LIVE_MODEL", "gemini-3.1-flash-live-preview")

# OpenAI key rotation pool
try:
    OPENAI_KEY_POOL = json.loads(os.environ.get("OPENAI_KEY_POOL", "[]"))
except Exception:
    OPENAI_KEY_POOL = []
if not OPENAI_KEY_POOL and os.environ.get("OPENAI_API_KEY"):
    OPENAI_KEY_POOL = [os.environ["OPENAI_API_KEY"]]
_openai_idx = 0
_openai_key_failures: Dict[int, float] = {}  # index -> failed_at ts

def _next_openai_key() -> Optional[str]:
    """Return current OpenAI key, skipping ones that failed in last 60s."""
    global _openai_idx
    if not OPENAI_KEY_POOL:
        return None
    n = len(OPENAI_KEY_POOL)
    for _ in range(n):
        idx = _openai_idx % n
        failed_at = _openai_key_failures.get(idx, 0)
        if time.time() - failed_at > 60:
            return OPENAI_KEY_POOL[idx]
        _openai_idx += 1
    return None

# Stripe
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_MONTHLY = os.environ.get("STRIPE_PRICE_MONTHLY", "")
STRIPE_PRICE_ANNUAL = os.environ.get("STRIPE_PRICE_ANNUAL", "")

# Resend
resend.api_key = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "info@mindsphere.fit")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="MindSphere API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

LLM_MODEL = ("openai", "gpt-4o")
LLM_VISION_MODEL = ("openai", "gpt-4o")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s :: %(message)s")
log = logging.getLogger("mindsphere")


# ---------- helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> Dict[str, Any]:
    if not creds:
        raise HTTPException(401, "Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        uid = payload["sub"]
    except Exception:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": uid}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(401, "User not found")
    user = await resolve_plan(user)
    return user


def check_access(user: Dict[str, Any], feature: str) -> bool:
    """Return True if user's plan grants access to feature."""
    plan = user.get("plan", "trial")
    if plan in ("trial", "pro"):
        return True
    # free plan
    return feature in FREE_FEATURES


def require_access(feature: str):
    """FastAPI dependency factory: enforce check_access or raise 403."""
    async def _dep(user=Depends(current_user)):
        if not check_access(user, feature):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "upgrade_required",
                    "feature": feature,
                    "message": "Upgrade to MindSphere Pro to access this feature.",
                },
            )
        return user
    return _dep


def strip_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


# ---------- models ----------
class RegisterReq(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class OnboardingReq(BaseModel):
    answers: Dict[str, Any]


class JournalCreate(BaseModel):
    content: str
    voice: bool = False


class MoodCreate(BaseModel):
    emotion: str  # happy/calm/sad/anxious/angry/grateful/reflective
    intensity: int = 5
    note: Optional[str] = ""


class ChatMsgReq(BaseModel):
    message: str
    session_id: Optional[str] = None


class AssessmentSubmit(BaseModel):
    type: str  # phq9 | gad7 | pss | psqi | wellbeing
    answers: List[int]


class AppointmentCreate(BaseModel):
    provider_type: str
    format: str
    date: str  # iso
    notes: Optional[str] = ""


class SleepCreate(BaseModel):
    bedtime: str
    wake_time: str
    quality: int
    dream: Optional[str] = ""
    morning_mood: Optional[int] = 5


class VisionAnalyzeReq(BaseModel):
    image_base64: str  # data URL or raw b64
    kind: str = "environment"  # "face" or "environment"


class EnergyCheck(BaseModel):
    level: int  # 1-5


class GratitudeReq(BaseModel):
    text: str


class BreathingLog(BaseModel):
    technique: str
    duration_sec: int


# ---------- emotion / mood color map ----------
EMOTION_COLOR = {
    "happy": "#ff7eb3",
    "calm": "#5eead4",
    "sad": "#60a5fa",
    "anxious": "#f59e0b",
    "angry": "#ef4444",
    "grateful": "#a78bfa",
    "reflective": "#c084fc",
    "neutral": "#94a3b8",
    "tired": "#7c8db5",
    "excited": "#fb7185",
}


# ---------- LLM (Official OpenAI SDK with key rotation) ----------
async def llm_chat(system: str, user_text: str, session_id: str = "default", images: List[str] = None) -> str:
    """OpenAI chat with 15s timeout, key rotation pool, and graceful fallback."""
    model = "gpt-4o" if images else "gpt-4o-mini"
    content: List[Dict[str, Any]] = [{"type": "text", "text": user_text}]
    if images:
        for img in images:
            content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img}"}})

    global _openai_idx
    n = len(OPENAI_KEY_POOL)
    if n == 0:
        log.error("No OpenAI keys configured")
        return "MindSphere's AI is taking a short break — we'll be back in a few minutes. Your data is safe."

    last_err: Optional[Exception] = None
    for attempt in range(min(n, 3)):
        key = _next_openai_key()
        if not key:
            break
        try:
            cli = openai.AsyncOpenAI(api_key=key)
            resp = await asyncio.wait_for(
                cli.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": content},
                    ],
                    max_tokens=1500,
                ),
                timeout=15.0,
            )
            return resp.choices[0].message.content or ""
        except asyncio.TimeoutError:
            log.warning("llm_chat timeout session=%s", session_id)
            return "Lyra is taking a breath — please try again in a moment."
        except (openai.RateLimitError, openai.AuthenticationError) as e:
            log.warning("OpenAI key idx=%s failed (%s); rotating", _openai_idx % n, type(e).__name__)
            _openai_key_failures[_openai_idx % n] = time.time()
            _openai_idx += 1
            last_err = e
            continue
        except Exception as e:
            log.exception("llm_chat error session=%s", session_id)
            return f"Lyra is briefly resting. Please try again. ({str(e)[:80]})"

    log.error("All OpenAI keys exhausted: %s", last_err)
    # Emergency fallback: use Emergent LLM key via legacy wrapper so the app stays functional
    if EMERGENT_LLM_KEY:
        try:
            log.warning("Falling back to EMERGENT_LLM_KEY (OpenAI quota exhausted)")
            chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system).with_model(*LLM_MODEL)
            if images:
                chat = chat.with_model(*LLM_VISION_MODEL)
                msg = UserMessage(text=user_text, file_contents=[ImageContent(image_base64=i) for i in images])
            else:
                msg = UserMessage(text=user_text)
            return await asyncio.wait_for(chat.send_message(msg), timeout=15.0)
        except Exception as e:
            log.exception("Emergent fallback also failed")
    return "MindSphere's AI is taking a short break — we'll be back in a few minutes. Your data is safe."


# ---------- Plan / Trial logic ----------
TRIAL_DAYS = 7
PRO_FEATURES = {"chat", "journal", "voice", "diet", "assessments", "disturbance"}
FREE_FEATURES = {"mood_log", "sleep_log", "meditation", "community"}
FREE_JOURNAL_LIFETIME_CAP = 2

def _parse_iso(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None

async def resolve_plan(user: Dict[str, Any]) -> Dict[str, Any]:
    """Reconcile a user's plan against trial_end + subscription_status. Mutates DB if needed."""
    plan = user.get("plan")
    if not plan:
        # Backfill for legacy users
        start = datetime.now(timezone.utc)
        end = start + timedelta(days=TRIAL_DAYS)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"plan": "trial", "trial_start": start.isoformat(),
                      "trial_end": end.isoformat()}},
        )
        user["plan"] = "trial"
        user["trial_start"] = start.isoformat()
        user["trial_end"] = end.isoformat()
        return user

    if plan == "trial":
        end = _parse_iso(user.get("trial_end"))
        if end and datetime.now(timezone.utc) > end and user.get("subscription_status") != "active":
            await db.users.update_one({"id": user["id"]}, {"$set": {"plan": "free"}})
            user["plan"] = "free"
    return user





async def detect_emotion(text: str) -> Dict[str, Any]:
    system = (
        "You are an emotion tagger. Given a short journal entry, return STRICT JSON with keys: "
        "emotion (one of: happy, calm, sad, anxious, angry, grateful, reflective, neutral, tired, excited), "
        "intensity (1-10 int), summary (one sentence reflection back to writer, warm, second person), "
        "topics (array of up to 4 short lowercase topic keywords)."
    )
    raw = await llm_chat(system, text, session_id=f"emo-{new_id()[:8]}")
    raw = raw.strip().strip("`")
    if raw.startswith("json"):
        raw = raw[4:].strip()
    try:
        data = json.loads(raw)
    except Exception:
        data = {"emotion": "reflective", "intensity": 5, "summary": "Thank you for sharing.", "topics": []}
    data["color"] = EMOTION_COLOR.get(data.get("emotion", "reflective"), "#c084fc")
    return data


# ============================================================
# AUTH
# ============================================================
@api.post("/auth/register")
async def register(req: RegisterReq):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    uid = new_id()
    trial_start = datetime.now(timezone.utc)
    trial_end = trial_start + timedelta(days=TRIAL_DAYS)
    doc = {
        "id": uid,
        "name": req.name,
        "email": req.email.lower(),
        "password": hash_pw(req.password),
        "avatar": None,
        "onboarded": False,
        "onboarding": {},
        "tutorial_completed": False,
        "preferences": {"lyra_name": "Lyra", "voice": "alloy", "style": "warm", "accent": "purple", "theme": "midnight"},
        "notification_prefs": {
            "daily_journal": True, "journal_time": "20:00",
            "mood_checkin": False, "mood_time": "19:00",
            "weekly_digest": False, "appointment_reminders": True,
            "trial_warnings": True, "promotional": False,
        },
        "plan": "trial",
        "trial_start": trial_start.isoformat(),
        "trial_end": trial_end.isoformat(),
        "stripe_customer_id": None,
        "stripe_subscription_id": None,
        "subscription_status": None,
        "billing_cycle": None,
        "next_billing_date": None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = make_token(uid)
    # Fire welcome email (best-effort; never blocks)
    asyncio.create_task(send_email(
        to=req.email,
        subject=f"Welcome to MindSphere, {req.name} 💜",
        html=_welcome_email_html(req.name),
    ))
    return {"token": token, "user": {k: v for k, v in doc.items() if k not in ("password", "_id")}}


@api.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not verify_pw(req.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(user["id"])
    user.pop("password", None)
    user.pop("_id", None)
    return {"token": token, "user": user}


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


# ============================================================
# ONBOARDING / USER
# ============================================================
@api.post("/users/onboarding")
async def save_onboarding(req: OnboardingReq, user=Depends(current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"onboarding": req.answers, "onboarded": True, "onboarded_at": now_iso()}},
    )
    return {"ok": True}


@api.post("/users/tutorial-complete")
async def complete_tutorial(user=Depends(current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"tutorial_completed": True, "tutorial_completed_at": now_iso()}},
    )
    return {"ok": True}


@api.post("/users/tutorial-reset")
async def reset_tutorial(user=Depends(current_user)):
    """Lets a user re-run the tutorial from Settings."""
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"tutorial_completed": False}, "$unset": {"tutorial_completed_at": ""}},
    )
    return {"ok": True}


@api.patch("/users/preferences")
async def update_prefs(prefs: Dict[str, Any], user=Depends(current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"preferences": {**user.get("preferences", {}), **prefs}}})
    return {"ok": True}


@api.patch("/users/profile")
async def update_profile(data: Dict[str, Any], user=Depends(current_user)):
    allowed = {k: v for k, v in data.items() if k in ("name", "avatar", "timezone", "language", "notification_prefs")}
    await db.users.update_one({"id": user["id"]}, {"$set": allowed})
    return {"ok": True}


# ============================================================
# JOURNAL
# ============================================================
@api.post("/journal")
async def create_journal(req: JournalCreate, user=Depends(current_user)):
    emo = await detect_emotion(req.content)
    entry = {
        "id": new_id(),
        "user_id": user["id"],
        "content": req.content,
        "voice": req.voice,
        "emotion": emo["emotion"],
        "intensity": emo["intensity"],
        "color": emo["color"],
        "summary": emo["summary"],
        "topics": emo.get("topics", []),
        "created_at": now_iso(),
    }
    await db.journal.insert_one(entry)
    # also log as mood
    await db.mood.insert_one({
        "id": new_id(), "user_id": user["id"], "emotion": emo["emotion"],
        "intensity": emo["intensity"], "color": emo["color"], "note": "from journal",
        "source": "journal", "created_at": now_iso(),
    })
    entry.pop("_id", None)
    return entry


@api.get("/journal")
async def list_journal(user=Depends(current_user), limit: int = 200):
    cur = db.journal.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cur.to_list(limit)


@api.delete("/journal/{entry_id}")
async def del_journal(entry_id: str, user=Depends(current_user)):
    await db.journal.delete_one({"id": entry_id, "user_id": user["id"]})
    return {"ok": True}


# ============================================================
# MOOD
# ============================================================
@api.post("/mood")
async def log_mood(req: MoodCreate, user=Depends(current_user)):
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "emotion": req.emotion,
        "intensity": req.intensity,
        "color": EMOTION_COLOR.get(req.emotion, "#c084fc"),
        "note": req.note,
        "source": "manual",
        "created_at": now_iso(),
    }
    await db.mood.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/mood")
async def list_mood(user=Depends(current_user), days: int = 60):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    cur = db.mood.find({"user_id": user["id"], "created_at": {"$gte": cutoff}}, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(2000)


# ============================================================
# LYRA CHAT
# ============================================================
async def build_lyra_system(user) -> str:
    journals = await db.journal.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    moods = await db.mood.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(7).to_list(7)
    name = user.get("name", "friend")
    lyra_name = user.get("preferences", {}).get("lyra_name", "Lyra")
    style = user.get("preferences", {}).get("style", "warm")
    onboarding = user.get("onboarding", {})
    j_summary = "; ".join([f"({j.get('emotion')}) {j.get('content','')[:80]}" for j in journals]) or "no entries yet"
    m_summary = ", ".join([f"{m.get('emotion')}({m.get('intensity')})" for m in moods]) or "none"
    return (
        f"You are {lyra_name}, a warm, evidence-based mental wellness companion for {name}. "
        f"Style: {style}. Use CBT and mindfulness techniques. Be concise (under 130 words), "
        f"empathetic, second person. NEVER replace professional care—suggest a clinician for crisis signs. "
        f"User onboarding: {json.dumps(onboarding)[:600]}. "
        f"Last 5 journal entries: {j_summary}. Recent moods: {m_summary}. "
        f"When user asks for an exercise, breathing technique, or assessment, recommend specific in-app actions."
    )


@api.post("/chat")
async def chat(req: ChatMsgReq, user=Depends(current_user)):
    session_id = req.session_id or f"lyra-{user['id']}"
    system = await build_lyra_system(user)
    reply = await llm_chat(system, req.message, session_id=session_id)
    # persist
    await db.chats.insert_one({
        "id": new_id(), "user_id": user["id"], "session_id": session_id,
        "role": "user", "content": req.message, "created_at": now_iso(),
    })
    await db.chats.insert_one({
        "id": new_id(), "user_id": user["id"], "session_id": session_id,
        "role": "assistant", "content": reply, "created_at": now_iso(),
    })
    return {"reply": reply, "session_id": session_id}


@api.get("/chat/history")
async def chat_history(user=Depends(current_user), session_id: Optional[str] = None):
    q = {"user_id": user["id"]}
    if session_id:
        q["session_id"] = session_id
    cur = db.chats.find(q, {"_id": 0}).sort("created_at", 1).limit(500)
    return await cur.to_list(500)


# ============================================================
# DIET
# ============================================================
@api.get("/diet/plan")
async def get_diet(user=Depends(current_user)):
    existing = await db.diet.find_one({"user_id": user["id"]}, {"_id": 0})
    if existing:
        return existing
    return await _generate_diet(user)


@api.post("/diet/regenerate")
async def regen_diet(payload: Dict[str, Any], user=Depends(current_user)):
    reason = payload.get("reason", "Please regenerate the whole plan.")
    day = payload.get("day")
    meal = payload.get("meal")
    return await _generate_diet(user, reason=reason, day=day, meal=meal)


async def _generate_diet(user, reason: str = "", day: Optional[str] = None, meal: Optional[str] = None) -> Dict[str, Any]:
    onb = user.get("onboarding", {})
    diet_type = onb.get("diet_type", "non-vegetarian")
    allergies = onb.get("allergies", "")
    wake = onb.get("wake_time", "7:00 AM")
    sleep_t = onb.get("sleep_time", "11:00 PM")
    goal = onb.get("primary_goal", "Improve mood")
    system = (
        "You are a clinical nutritionist designing mental-health-supporting meal plans. Return STRICT JSON. "
        "Schema: { days: [ { day: 'Monday', meals: [ { time: '8:00 AM', name, emoji, ingredients: [..], "
        "benefit: 'short mental-health benefit', calories: int, macros: {protein, carbs, fat} } ] } ] } "
        "Exactly 7 days Monday..Sunday. Each day 4 meals: breakfast, lunch, snack, dinner."
    )
    prompt = (
        f"User diet type: {diet_type}. Allergies/intolerances: {allergies}. "
        f"Wake: {wake}, Sleep: {sleep_t}. Primary wellness goal: {goal}. "
        f"{('Regenerate only day=' + str(day) + ', meal=' + str(meal) + '.') if day else 'Build the full 7-day plan.'} "
        f"User feedback: {reason}"
    )
    raw = await llm_chat(system, prompt, session_id=f"diet-{user['id']}")
    raw = raw.strip().strip("`")
    if raw.startswith("json"):
        raw = raw[4:].strip()
    try:
        plan = json.loads(raw)
    except Exception:
        plan = _fallback_diet(diet_type)
    plan["user_id"] = user["id"]
    plan["updated_at"] = now_iso()
    await db.diet.delete_many({"user_id": user["id"]})
    await db.diet.insert_one(plan)
    plan.pop("_id", None)
    return plan


def _fallback_diet(diet_type: str) -> Dict[str, Any]:
    protein = "Tofu scramble" if "veg" in diet_type else "Grilled chicken"
    days = []
    for d in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]:
        days.append({
            "day": d,
            "meals": [
                {"time": "8:00 AM", "name": "Berry oatmeal bowl", "emoji": "🥣", "ingredients": ["oats", "blueberries", "almonds", "honey"],
                 "benefit": "Steady glucose supports mood stability", "calories": 380, "macros": {"protein": 12, "carbs": 58, "fat": 10}},
                {"time": "1:00 PM", "name": f"{protein} grain bowl", "emoji": "🥗", "ingredients": [protein.lower(), "quinoa", "spinach", "avocado"],
                 "benefit": "Omega-3 + magnesium reduce anxiety", "calories": 540, "macros": {"protein": 38, "carbs": 45, "fat": 22}},
                {"time": "4:30 PM", "name": "Greek yogurt + walnuts", "emoji": "🥜", "ingredients": ["greek yogurt", "walnuts", "honey"],
                 "benefit": "Probiotics support gut-brain axis", "calories": 220, "macros": {"protein": 14, "carbs": 18, "fat": 11}},
                {"time": "7:30 PM", "name": "Salmon and sweet potato" if "veg" not in diet_type else "Lentil stew",
                 "emoji": "🍣" if "veg" not in diet_type else "🍲",
                 "ingredients": ["salmon" if "veg" not in diet_type else "lentils", "sweet potato", "broccoli", "olive oil"],
                 "benefit": "Tryptophan supports serotonin", "calories": 560, "macros": {"protein": 35, "carbs": 50, "fat": 22}},
            ],
        })
    return {"days": days}


@api.post("/hydration")
async def log_hydration(payload: Dict[str, Any], user=Depends(current_user)):
    glasses = int(payload.get("glasses", 1))
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await db.hydration.update_one(
        {"user_id": user["id"], "date": today},
        {"$inc": {"glasses": glasses}, "$set": {"updated_at": now_iso()}},
        upsert=True,
    )
    doc = await db.hydration.find_one({"user_id": user["id"], "date": today}, {"_id": 0})
    return doc


@api.get("/hydration/today")
async def hydration_today(user=Depends(current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = await db.hydration.find_one({"user_id": user["id"], "date": today}, {"_id": 0})
    return doc or {"glasses": 0, "date": today}


# ============================================================
# RECIPES — detailed cook-along + custom recipe creator
# ============================================================
class RecipeRequest(BaseModel):
    meal_name: str
    ingredients: Optional[List[str]] = None
    benefit: Optional[str] = None
    calories: Optional[int] = None
    macros: Optional[Dict[str, Any]] = None


class CustomRecipeRequest(BaseModel):
    cuisine: Optional[str] = ""
    dietary: Optional[str] = ""
    available_ingredients: Optional[str] = ""
    prep_time: Optional[str] = ""
    calorie_target: Optional[str] = ""
    mood_goal: Optional[str] = ""
    notes: Optional[str] = ""


def _parse_llm_json(raw: str) -> Optional[Dict[str, Any]]:
    raw = (raw or "").strip().strip("`")
    if raw.startswith("json"):
        raw = raw[4:].strip()
    # Best-effort: find first { and last }
    try:
        return json.loads(raw)
    except Exception:
        try:
            s = raw.index("{"); e = raw.rindex("}") + 1
            return json.loads(raw[s:e])
        except Exception:
            return None


async def _generate_recipe_detail(meal_name: str, ingredients: List[str], benefit: str,
                                   calories: Optional[int], macros: Optional[Dict[str, Any]],
                                   user_id: str) -> Dict[str, Any]:
    system = (
        "You are a clinical nutritionist + home-chef. Given a meal, return STRICT JSON with full cook-along recipe. "
        "Schema: { "
        "name: string, emoji: string, cuisine: string, servings: int, prep_time_min: int, cook_time_min: int, "
        "total_time_min: int, difficulty: 'easy'|'medium'|'hard', "
        "ingredients: [ { item: string, quantity: string, note?: string } ], "
        "equipment: [ string ], "
        "steps: [ { step: int, title: string, instruction: string, tip?: string, duration_min?: int } ], "
        "nutrition: { calories: int, protein: int, carbs: int, fat: int, fiber?: int, sugar?: int }, "
        "mental_health_benefit: string, "
        "tags: [ string ], "
        "chef_notes: string"
        " } "
        "Be specific with quantities. 5-9 numbered steps. Each step instruction 1-2 sentences max."
    )
    prompt = (
        f"Meal: {meal_name}. "
        f"Known ingredients (use as starting point, expand as needed): {', '.join(ingredients or []) or 'use your judgment'}. "
        f"Mental-health benefit context: {benefit or 'general mood support'}. "
        f"Target calories: {calories or 'not specified'}. "
        f"Target macros: {macros or 'balanced'}. "
        "Return ONLY the JSON object — no prose, no markdown."
    )
    raw = await llm_chat(system, prompt, session_id=f"recipe-{user_id}-{meal_name[:24]}")
    parsed = _parse_llm_json(raw)
    if not parsed:
        parsed = _fallback_recipe(meal_name, ingredients, benefit, calories, macros)
    return parsed


def _fallback_recipe(meal_name: str, ingredients: List[str], benefit: str,
                     calories: Optional[int], macros: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    ings = ingredients or ["main ingredient", "olive oil", "salt", "pepper"]
    return {
        "name": meal_name,
        "emoji": "🍽️",
        "cuisine": "Wholesome",
        "servings": 1,
        "prep_time_min": 10,
        "cook_time_min": 15,
        "total_time_min": 25,
        "difficulty": "easy",
        "ingredients": [{"item": i, "quantity": "to taste"} for i in ings],
        "equipment": ["pan", "knife", "cutting board"],
        "steps": [
            {"step": 1, "title": "Prep", "instruction": f"Wash and chop: {', '.join(ings[:3])}.", "duration_min": 5},
            {"step": 2, "title": "Cook", "instruction": "Warm oil in pan, add ingredients, season.", "duration_min": 10},
            {"step": 3, "title": "Plate", "instruction": "Serve warm, breathe, eat mindfully.", "duration_min": 2},
        ],
        "nutrition": {"calories": calories or 400, "protein": (macros or {}).get("protein", 20),
                      "carbs": (macros or {}).get("carbs", 40), "fat": (macros or {}).get("fat", 15)},
        "mental_health_benefit": benefit or "Balanced macros support steady mood.",
        "tags": ["wholesome", "balanced"],
        "chef_notes": "Eat slowly and notice flavor — mindful eating supports digestion and mood.",
    }


@api.post("/diet/recipe/detail")
async def recipe_detail(payload: RecipeRequest, user=Depends(current_user)):
    """Return a full cook-along recipe for an AI-suggested meal."""
    # Cache: keyed by user + meal name
    cached = await db.recipes.find_one(
        {"user_id": user["id"], "name": payload.meal_name, "source": "ai_plan"},
        {"_id": 0},
    )
    if cached:
        return cached
    recipe = await _generate_recipe_detail(
        payload.meal_name, payload.ingredients or [], payload.benefit or "",
        payload.calories, payload.macros, user["id"],
    )
    doc = {**recipe, "id": new_id(), "user_id": user["id"], "source": "ai_plan",
           "saved": False, "created_at": now_iso()}
    await db.recipes.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.post("/diet/recipe/custom")
async def recipe_custom(payload: CustomRecipeRequest, user=Depends(current_user)):
    """Build a custom recipe from the user's answers and save it to their cookbook."""
    onb = user.get("onboarding", {})
    diet_type = onb.get("diet_type", "")
    allergies = onb.get("allergies", "")
    system = (
        "You are a clinical nutritionist + home-chef designing a custom mood-supporting recipe. "
        "Return STRICT JSON only. Schema: { "
        "name: string, emoji: string, cuisine: string, servings: int, prep_time_min: int, cook_time_min: int, "
        "total_time_min: int, difficulty: 'easy'|'medium'|'hard', "
        "ingredients: [ { item, quantity, note? } ], "
        "equipment: [ string ], "
        "steps: [ { step:int, title:string, instruction:string, tip?:string, duration_min?:int } ], "
        "nutrition: { calories:int, protein:int, carbs:int, fat:int, fiber?:int, sugar?:int }, "
        "mental_health_benefit: string, "
        "tags: [ string ], "
        "chef_notes: string }. "
        "5-9 steps, specific quantities, respect allergies strictly."
    )
    prompt = (
        f"Build ONE custom recipe based on the user's choices. "
        f"User diet_type: {diet_type or 'unspecified'}. Allergies (avoid strictly): {allergies or 'none'}. "
        f"Cuisine preference: {payload.cuisine or 'open'}. "
        f"Additional dietary constraints: {payload.dietary or 'none'}. "
        f"Available ingredients (prefer these): {payload.available_ingredients or 'any pantry staples'}. "
        f"Prep time available: {payload.prep_time or 'flexible'}. "
        f"Calorie / macro target: {payload.calorie_target or 'balanced'}. "
        f"Mood / mental-health goal: {payload.mood_goal or 'general well-being'}. "
        f"Other notes: {payload.notes or '—'}. "
        "Return ONLY the JSON object — no prose, no markdown."
    )
    raw = await llm_chat(system, prompt, session_id=f"custom-recipe-{user['id']}")
    recipe = _parse_llm_json(raw) or _fallback_recipe(
        f"Custom {payload.cuisine or ''} bowl".strip(),
        [i.strip() for i in (payload.available_ingredients or "").split(",") if i.strip()],
        payload.mood_goal or "", None, None,
    )
    doc = {
        **recipe,
        "id": new_id(),
        "user_id": user["id"],
        "source": "custom",
        "saved": True,
        "inputs": payload.model_dump(),
        "created_at": now_iso(),
    }
    await db.recipes.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.get("/diet/recipes")
async def list_recipes(user=Depends(current_user)):
    """Return user's saved recipes (cookbook), newest first."""
    cursor = db.recipes.find(
        {"user_id": user["id"], "saved": True},
        {"_id": 0},
    ).sort("created_at", -1)
    items = await cursor.to_list(length=100)
    return {"items": items}


@api.post("/diet/recipes/{recipe_id}/save")
async def save_recipe(recipe_id: str, user=Depends(current_user)):
    res = await db.recipes.update_one(
        {"user_id": user["id"], "id": recipe_id},
        {"$set": {"saved": True, "saved_at": now_iso()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Recipe not found")
    doc = await db.recipes.find_one({"user_id": user["id"], "id": recipe_id}, {"_id": 0})
    return doc


@api.delete("/diet/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, user=Depends(current_user)):
    res = await db.recipes.delete_one({"user_id": user["id"], "id": recipe_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Recipe not found")
    return {"deleted": True}


# ============================================================
# EXERCISE
# ============================================================
EXERCISE_LIBRARY = [
    {"id": "e1", "name": "Morning Sun Salutation", "type": "yoga", "duration": 10, "difficulty": "easy",
     "benefit": "Reduces cortisol, boosts mood", "color": "purple",
     "steps": ["Mountain pose", "Forward fold", "Plank", "Cobra", "Downward dog", "Repeat 5x"]},
    {"id": "e2", "name": "10-Min Brisk Walk", "type": "walking", "duration": 10, "difficulty": "easy",
     "benefit": "Lifts low energy, clears mental fog", "color": "green",
     "steps": ["Step outside", "Walk at a brisk pace", "Notice 5 sights / 4 sounds"]},
    {"id": "e3", "name": "HIIT 7-min", "type": "cardio", "duration": 7, "difficulty": "hard",
     "benefit": "Big endorphin release", "color": "orange",
     "steps": ["Jumping jacks 45s", "Push-ups 45s", "Squats 45s", "Mountain climbers 45s", "Plank 30s", "Repeat"]},
    {"id": "e4", "name": "Box Breathing", "type": "breathing", "duration": 5, "difficulty": "easy",
     "benefit": "Calms anxiety in minutes", "color": "teal",
     "steps": ["Inhale 4s", "Hold 4s", "Exhale 4s", "Hold 4s", "Repeat 10 cycles"]},
    {"id": "e5", "name": "Tension Release Stretch", "type": "yoga", "duration": 8, "difficulty": "easy",
     "benefit": "Releases stored body tension", "color": "purple",
     "steps": ["Neck rolls", "Shoulder rolls", "Cat-cow", "Child's pose", "Seated twist"]},
    {"id": "e6", "name": "Strength Circuit", "type": "strength", "duration": 20, "difficulty": "medium",
     "benefit": "Builds confidence & resilience", "color": "red",
     "steps": ["Squats 3x12", "Push-ups 3x10", "Rows 3x12", "Plank 3x45s"]},
    {"id": "e7", "name": "Mindful Walking", "type": "walking", "duration": 20, "difficulty": "easy",
     "benefit": "Grounds you in present", "color": "green",
     "steps": ["Walk slowly", "Sync breath to steps", "Notice each footfall"]},
    {"id": "e8", "name": "Yin Yoga Wind-down", "type": "yoga", "duration": 15, "difficulty": "easy",
     "benefit": "Prep for restful sleep", "color": "purple",
     "steps": ["Butterfly", "Pigeon", "Supine twist", "Legs up the wall"]},
    {"id": "e9", "name": "Dance It Out", "type": "cardio", "duration": 10, "difficulty": "easy",
     "benefit": "Joyful dopamine boost", "color": "orange",
     "steps": ["Pick favorite playlist", "Move freely", "No judgment"]},
    {"id": "e10", "name": "Progressive Muscle Relaxation", "type": "breathing", "duration": 12, "difficulty": "easy",
     "benefit": "Reduces physical anxiety", "color": "teal",
     "steps": ["Tense feet 5s, release", "Move up body part by part", "Finish with face"]},
]


@api.get("/exercise/library")
async def exercise_library(user=Depends(current_user)):
    return EXERCISE_LIBRARY


@api.get("/exercise/today")
async def exercise_today(user=Depends(current_user)):
    # Pick based on latest mood
    mood = await db.mood.find_one({"user_id": user["id"]}, {"_id": 0}, sort=[("created_at", -1)])
    emo = (mood or {}).get("emotion", "calm")
    if emo == "anxious":
        pick = next(x for x in EXERCISE_LIBRARY if x["id"] == "e4")
    elif emo == "tired" or emo == "sad":
        pick = next(x for x in EXERCISE_LIBRARY if x["id"] == "e2")
    elif emo == "happy" or emo == "excited":
        pick = next(x for x in EXERCISE_LIBRARY if x["id"] == "e3")
    else:
        pick = next(x for x in EXERCISE_LIBRARY if x["id"] == "e1")
    return pick


@api.post("/exercise/complete")
async def complete_exercise(payload: Dict[str, Any], user=Depends(current_user)):
    await db.exercise_log.insert_one({
        "id": new_id(), "user_id": user["id"], "exercise_id": payload.get("exercise_id"),
        "created_at": now_iso(),
    })
    return {"ok": True}


@api.get("/exercise/log")
async def exercise_log(user=Depends(current_user)):
    return await db.exercise_log.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


# ============================================================
# ASSESSMENTS
# ============================================================
ASSESSMENT_DEFS = {
    "phq9": {
        "name": "PHQ-9 Depression Screening", "scale": [0, 1, 2, 3],
        "scale_labels": ["Not at all", "Several days", "More than half", "Nearly every day"],
        "questions": [
            "Little interest or pleasure in doing things",
            "Feeling down, depressed, or hopeless",
            "Trouble falling/staying asleep, or sleeping too much",
            "Feeling tired or having little energy",
            "Poor appetite or overeating",
            "Feeling bad about yourself",
            "Trouble concentrating",
            "Moving or speaking slowly, or being fidgety/restless",
            "Thoughts of being better off dead or hurting yourself",
        ],
        "ranges": [(0, 4, "Minimal"), (5, 9, "Mild"), (10, 14, "Moderate"), (15, 19, "Moderately Severe"), (20, 27, "Severe")],
    },
    "gad7": {
        "name": "GAD-7 Anxiety Screening", "scale": [0, 1, 2, 3],
        "scale_labels": ["Not at all", "Several days", "More than half", "Nearly every day"],
        "questions": [
            "Feeling nervous, anxious, or on edge",
            "Not being able to stop or control worrying",
            "Worrying too much about different things",
            "Trouble relaxing",
            "Being so restless it's hard to sit still",
            "Becoming easily annoyed or irritable",
            "Feeling afraid as if something awful might happen",
        ],
        "ranges": [(0, 4, "Minimal"), (5, 9, "Mild"), (10, 14, "Moderate"), (15, 21, "Severe")],
    },
    "pss": {
        "name": "Perceived Stress Scale (PSS-10)", "scale": [0, 1, 2, 3, 4],
        "scale_labels": ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"],
        "questions": [
            "Been upset because of something unexpected",
            "Felt unable to control important things",
            "Felt nervous and stressed",
            "Felt confident handling personal problems (reverse)",
            "Felt things were going your way (reverse)",
            "Could not cope with all you had to do",
            "Been able to control irritations (reverse)",
            "Felt on top of things (reverse)",
            "Angered by things outside your control",
            "Felt difficulties piling up",
        ],
        "ranges": [(0, 13, "Low stress"), (14, 26, "Moderate"), (27, 40, "High stress")],
    },
    "psqi": {
        "name": "Sleep Quality (PSQI-lite)", "scale": [0, 1, 2, 3],
        "scale_labels": ["Very good", "Fairly good", "Fairly bad", "Very bad"],
        "questions": [
            "Overall sleep quality this past week",
            "Difficulty falling asleep within 30 minutes",
            "Waking up in the middle of the night",
            "Feeling unrested upon waking",
            "Trouble staying awake during the day",
        ],
        "ranges": [(0, 5, "Good"), (6, 10, "Fair"), (11, 15, "Poor")],
    },
    "wellbeing": {
        "name": "Wellbeing Wheel", "scale": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "scale_labels": ["1 low", "", "", "", "", "", "", "", "", "10 high"],
        "questions": ["Physical", "Emotional", "Social", "Occupational", "Spiritual", "Financial", "Intellectual", "Environmental"],
        "ranges": [(0, 40, "Needs attention"), (41, 60, "Developing"), (61, 80, "Healthy")],
    },
}


@api.get("/assessments/defs")
async def assessment_defs(user=Depends(current_user)):
    return ASSESSMENT_DEFS


@api.post("/assessments")
async def submit_assessment(req: AssessmentSubmit, user=Depends(current_user)):
    if req.type not in ASSESSMENT_DEFS:
        raise HTTPException(400, "Unknown assessment")
    score = sum(req.answers)
    band = "n/a"
    for lo, hi, label in ASSESSMENT_DEFS[req.type]["ranges"]:
        if lo <= score <= hi:
            band = label
            break
    # AI interpretation
    name = ASSESSMENT_DEFS[req.type]["name"]
    interp = await llm_chat(
        "You are a clinical-style interpreter. Be warm, careful, and concise (under 90 words). "
        "Always recommend a professional if severity is high. Use second person.",
        f"Assessment: {name}. Score: {score}. Band: {band}. Provide a brief interpretation and 2 next-step suggestions.",
        session_id=f"assess-{user['id']}",
    )
    doc = {
        "id": new_id(), "user_id": user["id"], "type": req.type, "name": name,
        "answers": req.answers, "score": score, "band": band, "interpretation": interp,
        "created_at": now_iso(),
    }
    await db.assessments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/assessments")
async def list_assessments(user=Depends(current_user)):
    return await db.assessments.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


# ============================================================
# APPOINTMENTS
# ============================================================
@api.post("/appointments")
async def create_appt(req: AppointmentCreate, user=Depends(current_user)):
    # Generate talking points
    journals = await db.journal.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    summary = "; ".join([f"{j.get('emotion')}: {j.get('content','')[:80]}" for j in journals]) or "no recent entries"
    talking = await llm_chat(
        "You generate 3 short bullet talking points (under 12 words each) for a therapy session. Return as a plain numbered list 1. 2. 3.",
        f"Based on user's recent journal: {summary}. Appointment type: {req.provider_type}.",
        session_id=f"appt-{user['id']}",
    )
    doc = {
        "id": new_id(), "user_id": user["id"], "provider_type": req.provider_type,
        "format": req.format, "date": req.date, "notes": req.notes,
        "talking_points": talking, "session_notes": "", "created_at": now_iso(),
    }
    await db.appointments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/appointments")
async def list_appts(user=Depends(current_user)):
    return await db.appointments.find({"user_id": user["id"]}, {"_id": 0}).sort("date", 1).to_list(200)


@api.patch("/appointments/{appt_id}")
async def update_appt(appt_id: str, data: Dict[str, Any], user=Depends(current_user)):
    await db.appointments.update_one({"id": appt_id, "user_id": user["id"]}, {"$set": data})
    return {"ok": True}


@api.delete("/appointments/{appt_id}")
async def del_appt(appt_id: str, user=Depends(current_user)):
    await db.appointments.delete_one({"id": appt_id, "user_id": user["id"]})
    return {"ok": True}


# ============================================================
# SLEEP
# ============================================================
@api.post("/sleep")
async def log_sleep(req: SleepCreate, user=Depends(current_user)):
    doc = {
        "id": new_id(), "user_id": user["id"], "bedtime": req.bedtime, "wake_time": req.wake_time,
        "quality": req.quality, "dream": req.dream, "morning_mood": req.morning_mood,
        "created_at": now_iso(),
    }
    await db.sleep.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/sleep")
async def list_sleep(user=Depends(current_user)):
    return await db.sleep.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.get("/sleep/coach")
async def sleep_coach(user=Depends(current_user)):
    sleeps = await db.sleep.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    onb = user.get("onboarding", {})
    summary = "; ".join([f"q{s.get('quality')} bed {s.get('bedtime')}" for s in sleeps]) or "no logs"
    tip = await llm_chat(
        "You are a sleep coach. Return 3 numbered concrete bedtime-routine steps (under 18 words each), warm tone.",
        f"User wake: {onb.get('wake_time')}, sleep: {onb.get('sleep_time')}. Recent logs: {summary}.",
        session_id=f"sleep-{user['id']}",
    )
    return {"tip": tip}


# ============================================================
# ANALYTICS / DISTURBANCE
# ============================================================
@api.get("/analytics/summary")
async def analytics_summary(user=Depends(current_user)):
    moods = await db.mood.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(365).to_list(365)
    journals = await db.journal.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(120).to_list(120)
    sleeps = await db.sleep.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(60).to_list(60)
    # word freq
    from collections import Counter
    words = Counter()
    stop = set("the and to of a in is i it that for on with you my me but at this so was are be have not as".split())
    for j in journals:
        for w in (j.get("content") or "").lower().split():
            w = "".join(c for c in w if c.isalpha())
            if w and w not in stop and len(w) > 3:
                words[w] += 1
    word_cloud = [{"text": w, "value": c} for w, c in words.most_common(40)]
    # avg
    avg_mood = round(sum(m.get("intensity", 5) for m in moods) / max(1, len(moods)), 1) if moods else 0
    score = min(100, int(avg_mood * 10) + min(20, len(journals) * 2))
    return {
        "avg_mood": avg_mood,
        "wellness_score": score,
        "total_journals": len(journals),
        "total_moods": len(moods),
        "total_sleeps": len(sleeps),
        "word_cloud": word_cloud,
        "moods": moods,
        "journals": journals[:30],
        "sleeps": sleeps,
    }


@api.get("/analytics/narrative")
async def analytics_narrative(user=Depends(current_user)):
    s = await analytics_summary(user)
    summary = await llm_chat(
        "You write a 3-paragraph warm, supportive monthly wellness narrative for the user, second-person. ~180 words total.",
        f"avg_mood {s['avg_mood']}/10 over {s['total_moods']} logs, {s['total_journals']} journals, {s['total_sleeps']} sleep logs. "
        f"Top words: {[w['text'] for w in s['word_cloud'][:8]]}.",
        session_id=f"narrative-{user['id']}",
    )
    return {"narrative": summary}


@api.get("/disturbance/scan")
async def disturbance_scan(user=Depends(current_user)):
    journals = await db.journal.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(120).to_list(120)
    moods = await db.mood.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(120).to_list(120)
    from collections import Counter
    topics = Counter()
    first_seen = {}
    for j in journals:
        for t in j.get("topics", []):
            topics[t] += 1
            first_seen.setdefault(t, j.get("created_at"))
    items = []
    for t, c in topics.most_common(8):
        items.append({
            "topic": t, "count": c, "first_seen": first_seen.get(t),
            "trend": "increasing" if c >= 3 else "stable",
            "recommendation": f"Try a 4-7-8 breathing session and journal one sentence about {t} tonight.",
        })
    return {"items": items, "scanned_journals": len(journals), "scanned_moods": len(moods)}


@api.post("/disturbance/vision")
async def disturbance_vision(req: VisionAnalyzeReq, user=Depends(current_user)):
    b64 = req.image_base64
    if "," in b64 and b64.startswith("data:"):
        b64 = b64.split(",", 1)[1]
    system = (
        "You are a compassionate wellness observer. Given an image of a user's "
        f"{req.kind}, write 2 short paragraphs (under 90 words total): "
        "1) gentle observation, 2) one concrete 5-minute action to feel better. "
        "NEVER diagnose; be supportive."
    )
    reply = await llm_chat(system, f"Analyze this {req.kind} image.", session_id=f"vision-{user['id']}", images=[b64])
    return {"analysis": reply}


# ============================================================
# DASHBOARD
# ============================================================
@api.get("/dashboard")
async def dashboard(user=Depends(current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    name = user.get("name", "friend").split(" ")[0]
    # affirmation
    aff_doc = await db.affirmations.find_one({"user_id": user["id"], "date": today}, {"_id": 0})
    if not aff_doc:
        aff = await llm_chat(
            "Write one short (max 18 words), poetic daily affirmation for a wellness app user, second person. No quotes.",
            f"User name {name}.",
            session_id=f"aff-{user['id']}-{today}",
        )
        await db.affirmations.insert_one({"id": new_id(), "user_id": user["id"], "date": today, "text": aff})
        aff_doc = {"date": today, "text": aff}
    # latest mood
    latest_mood = await db.mood.find_one({"user_id": user["id"]}, {"_id": 0}, sort=[("created_at", -1)])
    # streak
    journals = await db.journal.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(60).to_list(60)
    days_set = set([j["created_at"][:10] for j in journals])
    streak = 0
    cursor = datetime.now(timezone.utc).date()
    while cursor.isoformat() in days_set:
        streak += 1
        cursor = cursor - timedelta(days=1)
    # mood 7d
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    week_moods = await db.mood.find({"user_id": user["id"], "created_at": {"$gte": cutoff}}, {"_id": 0}).sort("created_at", 1).to_list(500)
    # sleep last night
    last_sleep = await db.sleep.find_one({"user_id": user["id"]}, {"_id": 0}, sort=[("created_at", -1)])
    # appt next
    next_appt = await db.appointments.find_one({"user_id": user["id"], "date": {"$gte": now_iso()}}, {"_id": 0}, sort=[("date", 1)])
    # hydration today
    hyd = await db.hydration.find_one({"user_id": user["id"], "date": today}, {"_id": 0})
    # wellness score
    avg = 0
    if week_moods:
        avg = sum(m.get("intensity", 5) for m in week_moods) / len(week_moods)
    score = min(100, int(avg * 10) + min(20, len(journals) * 2))
    # insight
    insight_doc = await db.insights.find_one({"user_id": user["id"], "date": today}, {"_id": 0})
    if not insight_doc:
        snippet = "; ".join([f"({j.get('emotion')}) {j.get('content','')[:60]}" for j in journals[:3]]) or "no entries yet"
        insight_text = await llm_chat(
            "Write one personal mental wellness tip (max 24 words) for the user based on their recent journal, second person.",
            f"Recent journal: {snippet}.",
            session_id=f"insight-{user['id']}-{today}",
        )
        await db.insights.insert_one({"id": new_id(), "user_id": user["id"], "date": today, "text": insight_text})
        insight_doc = {"date": today, "text": insight_text}
    # stress heatmap (30d)
    heat = []
    for i in range(30):
        d = (datetime.now(timezone.utc) - timedelta(days=29 - i)).strftime("%Y-%m-%d")
        day_moods = [m for m in (await db.mood.find({"user_id": user["id"], "created_at": {"$regex": f"^{d}"}}, {"_id": 0}).to_list(50))]
        if day_moods:
            avg_d = sum(m.get("intensity", 5) for m in day_moods) / len(day_moods)
        else:
            avg_d = 0
        heat.append({"date": d, "value": round(avg_d, 1)})
    # top disturbance
    dist = await disturbance_scan(user)
    top_dist = dist["items"][0] if dist["items"] else None
    return {
        "name": name,
        "affirmation": aff_doc["text"],
        "latest_mood": latest_mood,
        "wellness_score": score,
        "streak": streak,
        "week_moods": week_moods,
        "last_sleep": last_sleep,
        "next_appt": next_appt,
        "hydration": hyd or {"glasses": 0},
        "insight": insight_doc["text"],
        "heatmap": heat,
        "top_disturbance": top_dist,
    }


# ============================================================
# QUICK LOGS
# ============================================================
@api.post("/checkin/energy")
async def energy(req: EnergyCheck, user=Depends(current_user)):
    doc = {"id": new_id(), "user_id": user["id"], "level": req.level, "created_at": now_iso()}
    await db.energy.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/checkin/gratitude")
async def gratitude(req: GratitudeReq, user=Depends(current_user)):
    doc = {"id": new_id(), "user_id": user["id"], "text": req.text, "created_at": now_iso()}
    await db.gratitude.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/breathing/log")
async def breathing_log(req: BreathingLog, user=Depends(current_user)):
    doc = {"id": new_id(), "user_id": user["id"], "technique": req.technique,
           "duration_sec": req.duration_sec, "created_at": now_iso()}
    await db.breathing.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ============================================================
# MEDITATION / RESOURCES (static)
# ============================================================
MEDITATIONS = [
    {"id": "m1", "title": "Calm Anxious Mind", "category": "anxiety", "duration": 6, "color": "teal",
     "body": "Sit comfortably. Soften your gaze. Breathe in slowly through your nose for four counts. "
             "Hold for two. Exhale through your mouth for six. Repeat eight times. With each exhale, "
             "imagine the worry leaving your body as a soft mist. You are safe in this moment."},
    {"id": "m2", "title": "Sleep Prep Body Scan", "category": "sleep", "duration": 12, "color": "purple",
     "body": "Lying down, close your eyes. Bring attention to your toes. Notice any tension and let it melt. "
             "Move slowly upward — feet, calves, knees, thighs, hips, belly, chest, arms, hands, neck, jaw, "
             "forehead. Take your time. Each part softens as awareness passes through it."},
    {"id": "m3", "title": "Morning Activation", "category": "morning", "duration": 5, "color": "orange",
     "body": "Stand tall. Take three deep breaths, feeling your feet on the floor. Set one intention for today "
             "in a single word. Now stretch your arms wide and smile — even if it feels silly. Movement creates emotion."},
    {"id": "m4", "title": "Loving Kindness", "category": "gratitude", "duration": 10, "color": "pink",
     "body": "Picture someone you love. Silently say: 'May you be happy. May you be safe. May you be peaceful.' "
             "Now picture yourself. Say the same words to yourself. Now extend to a stranger. Now to someone difficult."},
    {"id": "m5", "title": "5-4-3-2-1 Grounding", "category": "anxiety", "duration": 4, "color": "teal",
     "body": "Look around and name 5 things you can see. 4 things you can touch. 3 things you can hear. "
             "2 things you can smell. 1 thing you can taste. You are here. You are now."},
    {"id": "m6", "title": "Letting Go", "category": "gratitude", "duration": 8, "color": "purple",
     "body": "Bring to mind a thought that has been heavy lately. Imagine placing it in a small boat. Watch the boat "
             "drift gently down a river, growing smaller. You don't have to chase it. You can let it go."},
    {"id": "m7", "title": "Confidence Builder", "category": "morning", "duration": 6, "color": "orange",
     "body": "Recall a moment you felt proud — even a small one. Place a hand on your heart. Feel that confidence "
             "in your body. Now say: 'I have done hard things before. I will do them again.'"},
    {"id": "m8", "title": "Compassion Break", "category": "anxiety", "duration": 5, "color": "teal",
     "body": "Place both hands on your chest. Take a breath. Say: 'This is a moment of suffering. Suffering is part "
             "of life. May I be kind to myself.' Hold that warmth for a few breaths."},
    {"id": "m9", "title": "Dream Journey", "category": "sleep", "duration": 15, "color": "purple",
     "body": "Imagine a place where you feel completely safe. Build it in detail — sounds, colors, scents. Spend time "
             "there in your mind. This is your inner refuge. You can visit anytime."},
    {"id": "m10", "title": "Gratitude Three", "category": "gratitude", "duration": 4, "color": "pink",
     "body": "Bring to mind three small things from today that worked: a moment of warmth, a task completed, a tiny win. "
             "Linger on each for fifteen seconds. Let the warmth fill you."},
]

RESOURCES = [
    {"id": "r1", "type": "article", "title": "Understanding the anxious brain", "time": "6 min read",
     "category": "anxiety", "summary": "How the amygdala fires & what calms it down — written for non-experts.",
     "url": "#"},
    {"id": "r2", "type": "video", "title": "The neuroscience of sleep", "time": "12 min watch",
     "category": "sleep", "summary": "Deep dive into REM, slow-wave sleep, and what to do for both.",
     "url": "#"},
    {"id": "r3", "type": "exercise", "title": "Box breathing walkthrough", "time": "5 min practice",
     "category": "breathing", "summary": "Used by Navy SEALs — and now by you. A practical anxiety reset.",
     "url": "#"},
    {"id": "r4", "type": "technique", "title": "Cognitive reframing 101", "time": "8 min read",
     "category": "cbt", "summary": "CBT's most powerful tool for turning thought spirals around.",
     "url": "#"},
    {"id": "r5", "type": "article", "title": "Movement as medicine", "time": "5 min read",
     "category": "exercise", "summary": "Why a 10-minute walk often beats a 60-minute brood.",
     "url": "#"},
    {"id": "r6", "type": "crisis", "title": "988 Suicide & Crisis Lifeline", "time": "24/7",
     "category": "crisis", "summary": "Free, confidential support. Call or text 988 (US).", "url": "tel:988"},
    {"id": "r7", "type": "crisis", "title": "Crisis Text Line", "time": "24/7",
     "category": "crisis", "summary": "Text HOME to 741741 in the US for free crisis counseling.", "url": "sms:741741"},
    {"id": "r8", "type": "video", "title": "Guided morning meditation", "time": "10 min",
     "category": "meditation", "summary": "Start the day calm, focused, and intentional.", "url": "#"},
    {"id": "r9", "type": "article", "title": "Food and mood: the gut-brain axis", "time": "7 min read",
     "category": "diet", "summary": "How fermented foods, omega-3s, and fiber shape your mental state.", "url": "#"},
    {"id": "r10", "type": "technique", "title": "Progressive muscle relaxation", "time": "12 min practice",
     "category": "relaxation", "summary": "Release tension you didn't know you were holding.", "url": "#"},
]


# ============================================================
# RELIGION / DAILY VERSE
# ============================================================
RELIGIONS = {
    "hindu": {"name": "Hindu", "source": "Bhagavad Gita & Upanishads"},
    "christian": {"name": "Christian", "source": "the Bible"},
    "muslim": {"name": "Muslim", "source": "the Qur'an & Hadith"},
    "buddhist": {"name": "Buddhist", "source": "the Dhammapada & sutras"},
    "jewish": {"name": "Jewish", "source": "the Tanakh & Talmud"},
    "sikh": {"name": "Sikh", "source": "Guru Granth Sahib"},
    "spiritual": {"name": "Spiritual / Secular", "source": "perennial wisdom traditions"},
    "none": {"name": "Prefer not to say", "source": "universal wisdom"},
}


@api.get("/verses/today")
async def verse_today(user=Depends(current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    religion = (user.get("onboarding", {}) or {}).get("religion", "spiritual")
    cached = await db.verses.find_one({"user_id": user["id"], "date": today}, {"_id": 0})
    if cached:
        return cached
    rel = RELIGIONS.get(religion, RELIGIONS["spiritual"])
    system = (
        f"You are a sensitive interfaith scholar. Return STRICT JSON: "
        f"{{ \"verse\": \"the verse text in English\", \"reference\": \"e.g. Bhagavad Gita 2.47\", "
        f"\"reflection\": \"one-sentence modern reflection for someone struggling\" }}. "
        f"Tradition: {rel['name']} ({rel['source']}). Avoid violent/exclusive passages. "
        f"Choose a verse about peace, compassion, perseverance, or self-acceptance."
    )
    raw = await llm_chat(system, f"Give a verse for today {today} that brings comfort.", session_id=f"verse-{user['id']}-{today}")
    raw = raw.strip().strip("`")
    if raw.startswith("json"):
        raw = raw[4:].strip()
    try:
        data = json.loads(raw)
    except Exception:
        data = {"verse": "Peace begins inside you.", "reference": "Universal", "reflection": "Begin with one slow breath."}
    doc = {"id": new_id(), "user_id": user["id"], "date": today, "religion": religion,
           "verse": data.get("verse"), "reference": data.get("reference"),
           "reflection": data.get("reflection"), "tradition": rel["name"]}
    await db.verses.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/religions")
async def list_religions():
    return RELIGIONS


# ============================================================
# MENTAL HEALTH REPORT (comprehensive AI synthesis)
# ============================================================
@api.get("/mental-health/report")
async def mental_health_report(user=Depends(current_user), days: int = 14):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    journals = await db.journal.find({"user_id": user["id"], "created_at": {"$gte": cutoff}}, {"_id": 0}).sort("created_at", -1).to_list(200)
    moods = await db.mood.find({"user_id": user["id"], "created_at": {"$gte": cutoff}}, {"_id": 0}).sort("created_at", -1).to_list(500)
    sleeps = await db.sleep.find({"user_id": user["id"], "created_at": {"$gte": cutoff}}, {"_id": 0}).sort("created_at", -1).to_list(200)
    assess = await db.assessments.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    onb = user.get("onboarding", {})

    j_brief = "\n".join([f"- ({j.get('emotion')}/{j.get('intensity')}) {j.get('content','')[:140]}" for j in journals[:12]]) or "(no entries)"
    m_brief = ", ".join([f"{m.get('emotion')}({m.get('intensity')})" for m in moods[:20]]) or "(none)"
    s_brief = "; ".join([f"q{s.get('quality')} morning_mood{s.get('morning_mood')}" for s in sleeps[:7]]) or "(none)"
    a_brief = "; ".join([f"{a.get('name')}: {a.get('score')} ({a.get('band')})" for a in assess]) or "(none)"

    system = (
        "You are a clinical-style mental wellness analyst. Return STRICT JSON with these keys: "
        "current_state (3-sentence honest read), severity (one of: thriving, steady, struggling, distressed), "
        "trend (one of: improving, stable, declining), "
        "key_patterns (array of 3 short bullet strings), "
        "triggers (array of 3 short triggers), "
        "strengths (array of 3 short strengths), "
        "today_actions (array of 5 concrete actions for the next 24h, each <14 words, second person), "
        "diet_focus (array of 4 food/nutrient recommendations with one-line WHY), "
        "exercise_focus (array of 3 specific exercises with one-line WHY), "
        "weekly_forecast (3-sentence outlook for next 7 days), "
        "warning_signs (array of 2-3 things to watch for that warrant professional help). "
        "Be warm, non-pathologizing, second person. NEVER diagnose. If signs of crisis, gently urge professional support."
    )
    prompt = (
        f"User onboarding: goal={onb.get('primary_goal')}, sleep_hrs={onb.get('sleep_hours')}, "
        f"diet={onb.get('diet_type')}, allergies={onb.get('allergies')}, "
        f"exercise={onb.get('exercise_freq')}, positive_triggers={onb.get('positive_triggers')}, "
        f"negative_triggers={onb.get('negative_triggers')}, energy={onb.get('energy_level')}.\n"
        f"Last {days} days journal entries:\n{j_brief}\n"
        f"Mood log: {m_brief}\n"
        f"Sleep: {s_brief}\n"
        f"Recent assessments: {a_brief}"
    )
    raw = await llm_chat(system, prompt, session_id=f"mh-{user['id']}")
    raw = raw.strip().strip("`")
    if raw.startswith("json"):
        raw = raw[4:].strip()
    try:
        data = json.loads(raw)
    except Exception:
        data = {
            "current_state": "We don't have enough recent data to read your state. Log a few moods and write a journal entry.",
            "severity": "steady", "trend": "stable",
            "key_patterns": ["—"], "triggers": ["—"], "strengths": ["—"],
            "today_actions": ["Take a 10-min walk", "Drink a glass of water", "Write 3 sentences in your journal"],
            "diet_focus": [{"item": "Leafy greens", "why": "Folate supports mood"}],
            "exercise_focus": [{"item": "Walking", "why": "Lifts low energy"}],
            "weekly_forecast": "Keep showing up. The data will reveal more.",
            "warning_signs": ["—"],
        }
    # Numeric snapshot
    avg_mood = round(sum(m.get("intensity", 5) for m in moods) / max(1, len(moods)), 1) if moods else 0
    avg_sleep_q = round(sum(s.get("quality", 0) for s in sleeps) / max(1, len(sleeps)), 1) if sleeps else 0
    data["snapshot"] = {
        "days_covered": days, "journals": len(journals), "mood_logs": len(moods),
        "sleep_logs": len(sleeps), "avg_mood": avg_mood, "avg_sleep_quality": avg_sleep_q,
    }
    data["generated_at"] = now_iso()
    return data


# ============================================================
# BODY SCAN per-part recommendations
# ============================================================
BODY_PROTOCOLS = {
    "head": {
        "name": "Head / forehead", "breath": "Soft Belly Breath",
        "breath_steps": ["Inhale slowly through nose 4s, expand belly", "Exhale through mouth 6s", "Repeat 8 cycles"],
        "yoga": [{"pose": "Neck rolls", "duration": "1 min"}, {"pose": "Forward fold", "duration": "1 min"}, {"pose": "Child's pose", "duration": "2 min"}],
        "why": "Tension headaches often release with longer exhales and gentle forward folding.",
    },
    "neck": {
        "name": "Neck & shoulders", "breath": "Ujjayi (ocean breath)",
        "breath_steps": ["Slight throat constriction, audible inhale 4s", "Exhale 6s with the same gentle hiss", "Repeat 10 cycles, rolling shoulders"],
        "yoga": [{"pose": "Shoulder rolls (forward + back)", "duration": "1 min each"}, {"pose": "Thread the needle", "duration": "1 min each side"}, {"pose": "Cat-cow", "duration": "2 min"}],
        "why": "Neck holds stress. Ujjayi calms vagal tone; thread-the-needle opens the upper back.",
    },
    "chest": {
        "name": "Chest / heart", "breath": "Coherent 5-5",
        "breath_steps": ["Inhale 5s through nose", "Exhale 5s through nose", "10 minutes — heart rate variability rises"],
        "yoga": [{"pose": "Heart opener (Cobra)", "duration": "1 min × 3"}, {"pose": "Bridge pose", "duration": "1 min × 3"}, {"pose": "Reclined butterfly", "duration": "3 min"}],
        "why": "Chest tightness is often grief or anxiety stored. Heart-openers + 5-5 breath restore balance.",
    },
    "stomach": {
        "name": "Belly / digestion", "breath": "Diaphragmatic Breath",
        "breath_steps": ["Hand on belly", "Inhale 4s — belly rises", "Exhale 6s — belly falls", "10 minutes"],
        "yoga": [{"pose": "Knees-to-chest", "duration": "2 min"}, {"pose": "Supine twist", "duration": "2 min each side"}, {"pose": "Wind-relieving pose", "duration": "1 min"}],
        "why": "Belly tension correlates with worry. Slow diaphragmatic breath signals safety to the vagus nerve.",
    },
    "arms": {
        "name": "Arms / hands", "breath": "Box Breathing",
        "breath_steps": ["Inhale 4s", "Hold 4s", "Exhale 4s", "Hold 4s — 10 cycles"],
        "yoga": [{"pose": "Wrist circles", "duration": "30s each direction"}, {"pose": "Eagle arms", "duration": "1 min each side"}, {"pose": "Downward dog", "duration": "1 min × 3"}],
        "why": "Arms carry braced posture from screens. Box breathing steadies attention while stretching wrists.",
    },
    "legs": {
        "name": "Legs / feet", "breath": "Long Exhale Breath",
        "breath_steps": ["Inhale 4s", "Exhale 8s — twice as long", "Repeat 12 cycles"],
        "yoga": [{"pose": "Standing forward fold", "duration": "2 min"}, {"pose": "Pigeon pose", "duration": "2 min each side"}, {"pose": "Legs-up-the-wall", "duration": "5 min"}],
        "why": "Restless legs and tight hips store frustration. Legs-up-the-wall is the most calming pose in yoga.",
    },
}


@api.post("/bodyscan/recommend")
async def bodyscan_recommend(payload: Dict[str, Any], user=Depends(current_user)):
    part = payload.get("part")
    pain = int(payload.get("pain", 5))
    duration = payload.get("duration", "today")
    notes = payload.get("notes", "")
    if part not in BODY_PROTOCOLS:
        raise HTTPException(400, "unknown part")
    proto = BODY_PROTOCOLS[part]
    # Add AI-personalized note
    ai_note = await llm_chat(
        "You are a body-mind therapist. Write ONE warm paragraph (under 60 words) acknowledging the user's tension and inviting them to begin gently.",
        f"Tension in {proto['name']} at pain {pain}/10 for {duration}. Note: {notes}.",
        session_id=f"body-{user['id']}-{part}",
    )
    return {"part": part, **proto, "ai_note": ai_note, "logged_at": now_iso()}


# ============================================================
# MUSIC recommendations
# ============================================================
MUSIC_BY_MOOD = {
    "anxious": [
        {"title": "Weightless", "artist": "Marconi Union", "why": "Scientifically engineered to lower anxiety 65%."},
        {"title": "Clair de Lune", "artist": "Debussy", "why": "Soft tempo lowers cortisol."},
        {"title": "Saturn", "artist": "Sleeping at Last", "why": "Slow, reverent, grounding."},
    ],
    "sad": [
        {"title": "The Night We Met", "artist": "Lord Huron", "why": "Holding sadness — not fixing it."},
        {"title": "River", "artist": "Joni Mitchell", "why": "Permission to feel."},
        {"title": "Liability", "artist": "Lorde", "why": "Soft self-compassion."},
    ],
    "angry": [
        {"title": "Breathe Me", "artist": "Sia", "why": "Lets anger move through, not over you."},
        {"title": "Bloodstream", "artist": "Stateless", "why": "Big release without aggression."},
        {"title": "Heavy", "artist": "Birdy", "why": "Names the heaviness, soothes it."},
    ],
    "happy": [
        {"title": "Walking on a Dream", "artist": "Empire of the Sun", "why": "Sustain the lift."},
        {"title": "Sunflower", "artist": "Rex Orange County", "why": "Warm dopamine."},
        {"title": "Best Day of My Life", "artist": "American Authors", "why": "Soundtrack the moment."},
    ],
    "tired": [
        {"title": "Holocene", "artist": "Bon Iver", "why": "Lets you rest into the day."},
        {"title": "Sunrise", "artist": "Norah Jones", "why": "Gentle activation, no pressure."},
        {"title": "Run", "artist": "Snow Patrol (acoustic)", "why": "Tender momentum."},
    ],
    "calm": [
        {"title": "Spiegel im Spiegel", "artist": "Arvo Pärt", "why": "Holds the calm steady."},
        {"title": "Gymnopédie No. 1", "artist": "Erik Satie", "why": "Time slows down."},
        {"title": "Avril 14th", "artist": "Aphex Twin", "why": "Quiet beauty."},
    ],
    "grateful": [
        {"title": "Such Great Heights", "artist": "Iron & Wine", "why": "Deepens warmth."},
        {"title": "Banana Pancakes", "artist": "Jack Johnson", "why": "A slow Sunday in song form."},
        {"title": "Vienna", "artist": "Billy Joel", "why": "Reminds you that you have time."},
    ],
}


@api.get("/music/recommendations")
async def music_recs(user=Depends(current_user)):
    latest = await db.mood.find_one({"user_id": user["id"]}, {"_id": 0}, sort=[("created_at", -1)])
    emo = (latest or {}).get("emotion", "calm")
    # also check top disturbance
    dist = await disturbance_scan(user)
    top = dist["items"][0]["topic"] if dist["items"] else None
    tracks = MUSIC_BY_MOOD.get(emo, MUSIC_BY_MOOD["calm"])
    enriched = []
    for t in tracks:
        q = f"{t['title']} {t['artist']}".replace(" ", "+")
        enriched.append({
            **t,
            "youtube": f"https://www.youtube.com/results?search_query={q}",
            "spotify": f"https://open.spotify.com/search/{q.replace('+', '%20')}",
        })
    return {"current_mood": emo, "top_disturbance": top, "tracks": enriched}


# ============================================================
# VOICE TTS / opener (no realtime API; uses LLM for warmth + browser playback on client)
# ============================================================
@api.get("/voice/opener")
async def voice_opener(user=Depends(current_user)):
    journals = await db.journal.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(3).to_list(3)
    name = user.get("name", "friend").split(" ")[0]
    snippet = "; ".join([f"{j.get('emotion')}: {j.get('content','')[:60]}" for j in journals]) or "no recent entries"
    text = await llm_chat(
        "You are Lyra, a warm voice companion. Open with 2 short sentences (~20 words total), reference one specific thing from the user's recent journal. Use natural fillers like 'so' or 'okay' — keep it conversational.",
        f"User: {name}. Recent: {snippet}.",
        session_id=f"opener-{user['id']}",
    )
    return {"text": text}


# ============================================================
# AI GUIDANCE (per-feature what-to-do tips)
# ============================================================
@api.get("/guidance/{feature}")
async def guidance(feature: str, user=Depends(current_user)):
    onb = user.get("onboarding", {})
    moods = await db.mood.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(7).to_list(7)
    m_brief = ", ".join([f"{m.get('emotion')}({m.get('intensity')})" for m in moods]) or "none"
    feature_prompts = {
        "journal": "Suggest 3 short journaling prompts (under 12 words each) tailored to the user's recent mood.",
        "mood":    "In 3 short bullets (<14 words), suggest what to do based on recent mood patterns.",
        "diet":    "Suggest 3 quick food/nutrition tips (<14 words each) for THIS user's mood + diet type.",
        "exercise":"Suggest 3 short exercise tips (<14 words each) matched to current energy & mood.",
        "sleep":   "Suggest 3 bedtime tips (<14 words each) given the user's wake/sleep schedule.",
        "appointments": "Give 3 short prep tips (<14 words each) for the user's next therapy session.",
        "assessments":  "Suggest which assessment to take next & why (<24 words).",
        "analytics":    "Surface 3 patterns from the data the user should notice (<16 words each).",
        "disturbance":  "Give 3 micro-actions (<14 words each) to address recent disturbances.",
        "meditation":   "Suggest 3 meditation/breath techniques (<14 words each) for current state.",
        "resources":    "Suggest 3 reading/listening topics most relevant for the user this week.",
        "lyra":         "Suggest 3 conversation openers (<14 words each) for the user to ask Lyra today.",
    }
    fp = feature_prompts.get(feature, "Suggest 3 actionable tips for the user today.")
    system = "You are a warm wellness coach. Return STRICT JSON: {\"tips\": [\"...\", \"...\", \"...\"]}. Second person, concrete, no preamble."
    raw = await llm_chat(system, f"{fp}\nUser onboarding: goal={onb.get('primary_goal')}, energy={onb.get('energy_level')}. Recent moods: {m_brief}.",
                         session_id=f"guide-{feature}-{user['id']}")
    raw = raw.strip().strip("`")
    if raw.startswith("json"): raw = raw[4:].strip()
    try: data = json.loads(raw)
    except Exception: data = {"tips": ["Take a 10-minute walk", "Drink a glass of water", "Write 3 sentences in your journal"]}
    return data


@api.get("/meditations")
async def meditations(user=Depends(current_user)):
    return MEDITATIONS


# ============================================================
# GEMINI LIVE — Realtime voice WebSocket relay
# ============================================================
# Gemini Live client is instantiated per-WS connection (see voice_websocket below)


async def build_voice_system_prompt(user_id: str) -> str:
    """Build a per-user Lyra system prompt with full mental wellness context."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        return "You are Lyra, a warm mental wellness companion. Be calm, helpful, and concise."
    name = user.get("name", "friend").split(" ")[0]
    onb = user.get("onboarding", {})
    style = user.get("preferences", {}).get("style", "warm")
    lyra_name = user.get("preferences", {}).get("lyra_name", "Lyra")
    journals = await db.journal.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    moods = await db.mood.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(7).to_list(7)
    j_brief = "; ".join([f"({j.get('emotion')}) {j.get('content','')[:100]}" for j in journals]) or "no entries yet"
    m_brief = ", ".join([f"{m.get('emotion')}({m.get('intensity')})" for m in moods]) or "none"
    return (
        f"You are {lyra_name}, a warm, evidence-based mental wellness companion having a real-time voice conversation with {name}. "
        f"Style: {style}. Speak naturally — like a calm, technical-but-friendly friend who is reassuring. "
        f"Use micro-pauses, vary pacing for warmth, and respond conversationally. "
        f"Keep replies under 3 sentences unless asked. Use evidence-based CBT and mindfulness. "
        f"NEVER replace professional care — gently suggest a clinician if you detect crisis signals. "
        f"You can recognize voice commands: 'done', 'next', 'repeat', 'show again', 'i'm stuck', 'zoom in', 'explain slower' — respond appropriately. "
        f"User context: goal={onb.get('primary_goal')}, energy={onb.get('energy_level')}/10, "
        f"sleep_hours={onb.get('sleep_hours')}, religion={onb.get('religion','spiritual')}. "
        f"Recent journal entries: {j_brief}. Recent moods: {m_brief}. "
        f"Open the conversation by gently referencing one specific recent journal theme. Keep the opener under 25 words."
    )


def _user_from_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return payload.get("sub")
    except Exception:
        return None


@app.websocket("/api/voice/ws")
async def voice_websocket(websocket: WebSocket, token: str = Query(...)):
    """
    Gemini Live API relay — uses Fix-It Gemini's proven implementation pattern,
    with MindSphere's mental wellness system prompt.

    Client → Server messages (JSON):
      {"type":"audio_in","chunk": base64 PCM16 LE @ 16kHz mono}
      {"type":"text","text": "..."}                — send text input turn
      {"type":"stop"}                              — end session
      {"type":"ping"}                              — keepalive

    Server → Client messages (JSON):
      {"type":"audio_out","chunk": base64 PCM16 LE @ 24kHz mono}
      {"type":"transcript","text": "...", "role":"model"|"user"}
      {"type":"status","text":"connecting"|"connected"}
      {"type":"interrupted"}
      {"type":"turn_complete"}
      {"type":"error","text":"..."}
    """
    await websocket.accept()
    user_id = _user_from_token(token)
    if not user_id:
        await websocket.send_text(json.dumps({"type": "error", "text": "auth missing"}))
        await websocket.close()
        return
    if not GEMINI_API_KEY:
        await websocket.send_text(json.dumps({"type": "error", "text": "GEMINI_API_KEY missing"}))
        await websocket.close()
        return

    try:
        from google import genai as _genai
        from google.genai import types as gt
    except Exception as e:
        await websocket.send_text(json.dumps({"type": "error", "text": f"google-genai missing: {e}"}))
        await websocket.close()
        return

    system_prompt = await build_voice_system_prompt(user_id)
    client_live = _genai.Client(api_key=GEMINI_API_KEY, http_options={"api_version": "v1beta"})
    config = {
        "response_modalities": ["AUDIO"],
        "system_instruction": system_prompt,
    }

    await websocket.send_text(json.dumps({"type": "status", "text": "connecting"}))
    log.info("voice ws: user=%s starting Gemini Live (model=%s)", user_id, GEMINI_LIVE_MODEL)

    try:
        async with client_live.aio.live.connect(model=GEMINI_LIVE_MODEL, config=config) as session:
            await websocket.send_text(json.dumps({"type": "status", "text": "connected"}))

            stop_event = asyncio.Event()

            async def browser_to_gemini():
                try:
                    while not stop_event.is_set():
                        raw = await websocket.receive_text()
                        try:
                            msg = json.loads(raw)
                        except Exception:
                            continue
                        t = msg.get("type")
                        if t == "audio_in":
                            try:
                                audio_bytes = base64.b64decode(msg.get("chunk", ""))
                                if audio_bytes:
                                    await session.send_realtime_input(
                                        audio=gt.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
                                    )
                            except Exception as e:
                                log.debug("audio_in dropped: %s", e)
                        elif t == "text":
                            try:
                                await session.send_client_content(
                                    turns=gt.Content(role="user", parts=[gt.Part(text=msg.get("text", ""))]),
                                    turn_complete=True,
                                )
                            except Exception as e:
                                log.warning("text send failed: %s", e)
                        elif t == "ping":
                            try:
                                await websocket.send_text(json.dumps({"type": "pong"}))
                            except Exception:
                                pass
                        elif t == "stop":
                            stop_event.set()
                            break
                except WebSocketDisconnect:
                    log.info("voice ws: browser disconnected user=%s", user_id)
                    stop_event.set()
                except Exception as e:
                    log.warning("browser_to_gemini error: %s", e)
                    stop_event.set()

            async def gemini_to_browser():
                try:
                    while not stop_event.is_set():
                        async for response in session.receive():
                            if stop_event.is_set():
                                return
                            if getattr(response, "data", None):
                                audio_b64 = base64.b64encode(response.data).decode("ascii")
                                try:
                                    await websocket.send_text(json.dumps({"type": "audio_out", "chunk": audio_b64}))
                                except Exception:
                                    stop_event.set(); return
                            if getattr(response, "text", None):
                                try:
                                    await websocket.send_text(json.dumps({"type": "transcript", "text": response.text, "role": "model"}))
                                except Exception:
                                    stop_event.set(); return
                            sc = getattr(response, "server_content", None)
                            if sc is not None:
                                if getattr(sc, "interrupted", False):
                                    try: await websocket.send_text(json.dumps({"type": "interrupted"}))
                                    except Exception: pass
                                if getattr(sc, "turn_complete", False):
                                    try: await websocket.send_text(json.dumps({"type": "turn_complete"}))
                                    except Exception: pass
                        await asyncio.sleep(0.05)
                except Exception as e:
                    log.warning("gemini_to_browser ended: %s", e)
                    stop_event.set()

            # Kick off the conversation so Gemini greets the user first.
            try:
                await session.send_client_content(
                    turns=gt.Content(role="user", parts=[gt.Part(text="(Begin our voice session. Greet me warmly by name and gently reference one specific recent journal theme.)")]),
                    turn_complete=True,
                )
            except Exception:
                pass

            t_in = asyncio.create_task(browser_to_gemini())
            t_out = asyncio.create_task(gemini_to_browser())
            done, pending = await asyncio.wait({t_in, t_out}, return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
                try: await task
                except Exception: pass
    except WebSocketDisconnect:
        log.info("voice ws: client disconnected user=%s", user_id)
    except Exception as e:
        log.exception("voice ws Live session failed")
        try: await websocket.send_text(json.dumps({"type": "error", "text": str(e)[:200]}))
        except Exception: pass
    finally:
        try: await websocket.close()
        except Exception: pass


@api.get("/voice/config")
async def voice_config(user=Depends(current_user)):
    """Return non-secret config for the voice client."""
    return {
        "model": GEMINI_LIVE_MODEL,
        "input_sample_rate": 16000,
        "output_sample_rate": 24000,
        "available": bool(GEMINI_API_KEY),
    }


@api.get("/resources")
async def resources(user=Depends(current_user)):
    return RESOURCES


# ============================================================
# BILLING — Stripe Subscriptions
# ============================================================

PRICE_MAP = {
    "monthly": (STRIPE_PRICE_MONTHLY, "monthly"),
    "annual": (STRIPE_PRICE_ANNUAL, "annual"),
}


def _public_origin(request: Request) -> str:
    """Resolve the canonical app origin from the request (works behind ingress)."""
    fwd_proto = request.headers.get("x-forwarded-proto", "https")
    fwd_host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
    if fwd_host:
        return f"{fwd_proto}://{fwd_host}"
    return str(request.base_url).rstrip("/")


@api.get("/billing/status")
async def billing_status(user=Depends(current_user)):
    """Return current plan + trial/subscription metadata."""
    plan = user.get("plan", "trial")
    trial_end = _parse_iso(user.get("trial_end"))
    trial_days_remaining: Optional[int] = None
    if trial_end:
        delta = (trial_end - datetime.now(timezone.utc)).total_seconds() / 86400.0
        trial_days_remaining = max(0, int(delta + 0.5))  # round to whole days
    return {
        "plan": plan,
        "trial_days_remaining": trial_days_remaining if plan == "trial" else None,
        "trial_end": user.get("trial_end") if plan == "trial" else None,
        "subscription_status": user.get("subscription_status"),
        "billing_cycle": user.get("billing_cycle"),
        "next_billing_date": user.get("next_billing_date"),
        "active_since": user.get("subscription_active_since"),
    }


@api.post("/billing/create-checkout-session")
async def create_checkout_session(payload: Dict[str, Any], request: Request, user=Depends(current_user)):
    """Create a Stripe Checkout Session for monthly or annual Pro subscription."""
    if not stripe.api_key:
        raise HTTPException(500, "Stripe not configured")
    plan = payload.get("plan", "monthly")
    if plan not in PRICE_MAP:
        raise HTTPException(400, "Invalid plan")
    price_id, cycle = PRICE_MAP[plan]
    if not price_id:
        raise HTTPException(500, f"Price ID for {plan} not configured")

    # Resolve or create Stripe Customer
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        try:
            cust = stripe.Customer.create(
                email=user["email"],
                name=user.get("name") or "MindSphere User",
                metadata={"user_id": user["id"]},
            )
            customer_id = cust.id
            await db.users.update_one({"id": user["id"]}, {"$set": {"stripe_customer_id": customer_id}})
        except Exception as e:
            log.exception("stripe customer create failed")
            raise HTTPException(502, f"Stripe customer error: {str(e)[:120]}")

    origin = _public_origin(request)
    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{origin}/app/dashboard?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin}/pricing",
            allow_promotion_codes=True,
            metadata={"user_id": user["id"], "billing_cycle": cycle, "kind": "subscription"},
            subscription_data={"metadata": {"user_id": user["id"], "billing_cycle": cycle}},
        )
        await db.payment_transactions.insert_one({
            "id": new_id(),
            "user_id": user["id"],
            "session_id": session.id,
            "kind": "subscription",
            "billing_cycle": cycle,
            "status": "initiated",
            "created_at": now_iso(),
        })
        return {"url": session.url, "session_id": session.id}
    except Exception as e:
        log.exception("stripe checkout create failed")
        raise HTTPException(502, f"Stripe checkout error: {str(e)[:120]}")


@api.post("/billing/create-portal-session")
async def create_portal_session(request: Request, user=Depends(current_user)):
    """Create Stripe Customer Portal session for managing subscription."""
    if not stripe.api_key:
        raise HTTPException(500, "Stripe not configured")
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(400, "No Stripe customer on file")
    origin = _public_origin(request)
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{origin}/app/settings?tab=subscription",
        )
        return {"url": session.url}
    except Exception as e:
        log.exception("stripe portal create failed")
        raise HTTPException(502, f"Stripe portal error: {str(e)[:120]}")


@app.post("/api/billing/webhook")
async def billing_webhook(request: Request):
    """UNAUTHENTICATED Stripe webhook receiver. Verifies signature, processes events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    if not STRIPE_WEBHOOK_SECRET:
        log.error("STRIPE_WEBHOOK_SECRET not configured")
        return Response(status_code=400)
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        log.warning("webhook signature verification failed: %s", str(e)[:120])
        return Response(status_code=400)

    etype = event["type"]
    obj = event["data"]["object"]
    log.info("stripe webhook: %s", etype)

    try:
        if etype == "checkout.session.completed":
            user_id = (obj.get("metadata") or {}).get("user_id")
            cycle = (obj.get("metadata") or {}).get("billing_cycle") or "monthly"
            sub_id = obj.get("subscription")
            cust_id = obj.get("customer")
            if user_id:
                update: Dict[str, Any] = {
                    "plan": "pro",
                    "stripe_subscription_id": sub_id,
                    "stripe_customer_id": cust_id,
                    "subscription_status": "active",
                    "billing_cycle": cycle,
                    "subscription_active_since": now_iso(),
                }
                # Pull next billing date from subscription
                if sub_id:
                    try:
                        sub = stripe.Subscription.retrieve(sub_id)
                        if sub.get("current_period_end"):
                            update["next_billing_date"] = datetime.fromtimestamp(sub["current_period_end"], tz=timezone.utc).isoformat()
                    except Exception:
                        pass
                await db.users.update_one({"id": user_id}, {"$set": update})
                await db.payment_transactions.update_one(
                    {"session_id": obj.get("id")},
                    {"$set": {"status": "completed", "completed_at": now_iso()}},
                )
                user = await db.users.find_one({"id": user_id}, {"_id": 0})
                if user:
                    asyncio.create_task(send_email(
                        to=user["email"],
                        subject="You're now on MindSphere Pro 🎉",
                        html=_subscription_confirmed_email_html(user.get("name", "there"), cycle),
                    ))

        elif etype == "customer.subscription.updated":
            sub_id = obj.get("id")
            status_ = obj.get("status")
            cycle = (obj.get("metadata") or {}).get("billing_cycle")
            next_bd = None
            if obj.get("current_period_end"):
                next_bd = datetime.fromtimestamp(obj["current_period_end"], tz=timezone.utc).isoformat()
            update = {"subscription_status": status_}
            if cycle:
                update["billing_cycle"] = cycle
            if next_bd:
                update["next_billing_date"] = next_bd
            await db.users.update_one({"stripe_subscription_id": sub_id}, {"$set": update})

        elif etype == "customer.subscription.deleted":
            sub_id = obj.get("id")
            await db.users.update_one(
                {"stripe_subscription_id": sub_id},
                {"$set": {"plan": "free", "subscription_status": "canceled",
                          "stripe_subscription_id": None}},
            )

        elif etype == "invoice.payment_failed":
            cust_id = obj.get("customer")
            await db.users.update_one(
                {"stripe_customer_id": cust_id},
                {"$set": {"subscription_status": "past_due"}},
            )
            user = await db.users.find_one({"stripe_customer_id": cust_id}, {"_id": 0})
            if user:
                await db.notifications.insert_one({
                    "id": new_id(),
                    "user_id": user["id"],
                    "kind": "payment_failed",
                    "title": "Payment failed",
                    "body": "Update your payment method to keep your Pro features.",
                    "created_at": now_iso(),
                    "read": False,
                })
                asyncio.create_task(send_email(
                    to=user["email"],
                    subject="Action needed: MindSphere payment failed",
                    html=_payment_failed_email_html(user.get("name", "there")),
                ))
    except Exception as e:
        log.exception("webhook processing error")
        # Still return 200 so Stripe doesn't retry endlessly for non-recoverable errors
        return JSONResponse({"received": True, "warning": str(e)[:120]}, status_code=200)

    return {"received": True}


# ============================================================
# USERS — Export / Delete account
# ============================================================
@api.get("/users/export")
async def export_user_data(user=Depends(current_user)):
    """Aggregate all user data into a single JSON download."""
    uid = user["id"]
    collections = [
        ("user", db.users, {"id": uid}, {"password": 0}),
        ("journal", db.journal, {"user_id": uid}, {}),
        ("mood", db.mood, {"user_id": uid}, {}),
        ("sleep", db.sleep, {"user_id": uid}, {}),
        ("assessments", db.assessments, {"user_id": uid}, {}),
        ("appointments", db.appointments, {"user_id": uid}, {}),
        ("disturbances", db.disturbance, {"user_id": uid}, {}),
        ("breathing", db.breathing, {"user_id": uid}, {}),
        ("gratitude", db.gratitude, {"user_id": uid}, {}),
        ("hydration", db.hydration, {"user_id": uid}, {}),
        ("exercise_log", db.exercise_log, {"user_id": uid}, {}),
        ("diet", db.diet, {"user_id": uid}, {}),
        ("recipes", db.recipes, {"user_id": uid}, {}),
        ("chat", db.chat, {"user_id": uid}, {}),
    ]
    out: Dict[str, Any] = {"exported_at": now_iso(), "data": {}}
    for name, coll, q, proj in collections:
        try:
            proj_full = {"_id": 0, **proj}
            if name == "user":
                doc = await coll.find_one(q, proj_full)
                out["data"][name] = doc
            else:
                items = await coll.find(q, proj_full).to_list(length=10000)
                out["data"][name] = items
        except Exception as e:
            log.warning("export coll %s failed: %s", name, e)
            out["data"][name] = []
    body = json.dumps(out, default=str, indent=2)
    fname = f"mindsphere_data_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.json"
    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@api.delete("/users/me")
async def delete_my_account(user=Depends(current_user)):
    """Permanently delete a user and all related data. Cancels Stripe subscription if active."""
    uid = user["id"]
    if user["email"] == "demo@mindsphere.app":
        raise HTTPException(400, "The demo account cannot be deleted.")
    sub_id = user.get("stripe_subscription_id")
    if sub_id and stripe.api_key:
        try:
            stripe.Subscription.modify(sub_id, cancel_at_period_end=True)
        except Exception as e:
            log.warning("cancel sub on delete failed: %s", str(e)[:120])

    collections = [
        db.users, db.journal, db.mood, db.sleep, db.assessments,
        db.appointments, db.disturbance, db.breathing, db.gratitude,
        db.hydration, db.exercise_log, db.diet, db.recipes, db.chat,
        db.community_posts, db.usage, db.streaks, db.notifications,
        db.payment_transactions,
    ]
    for coll in collections:
        try:
            await coll.delete_many({"user_id": uid})
        except Exception:
            pass
    await db.users.delete_one({"id": uid})
    return {"success": True}


# ============================================================
# EMAIL HELPERS (Resend)
# ============================================================
async def send_email(to: str, subject: str, html: str) -> None:
    """Best-effort transactional email. Never raises."""
    if not resend.api_key:
        log.warning("Resend not configured; skipping email to %s", to)
        return
    try:
        # resend SDK is synchronous; offload
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: resend.Emails.send({
                "from": RESEND_FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "html": html,
            }),
        )
    except Exception as e:
        log.error("Failed to send email to %s: %s", to, str(e)[:200])


def _email_shell(content_html: str) -> str:
    return f"""
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0a0a14;color:#e7e7ea;padding:32px 0;">
      <div style="max-width:560px;margin:0 auto;padding:32px;background:#0f0f1a;border-radius:20px;border:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:18px;font-weight:600;letter-spacing:0.3px;color:#c084fc;margin-bottom:24px;">MindSphere</div>
        {content_html}
        <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);color:#7a7a85;font-size:12px;">
          MindSphere · Your mind, understood.<br/>
          Not a substitute for professional mental health care.
        </div>
      </div>
    </div>
    """


def _welcome_email_html(name: str) -> str:
    return _email_shell(f"""
      <h2 style="margin:0 0 12px 0;font-size:24px;">Welcome, {name} 💜</h2>
      <p style="line-height:1.6;color:#b8b8c0;">You're in. MindSphere is here to help you understand your inner weather — through gentle journaling, mood tracking, and real conversations with Lyra, your AI companion.</p>
      <p style="line-height:1.6;color:#b8b8c0;"><b>Your 7-day free trial is active.</b> You have full access to everything — journal, voice, meal plans, assessments. No credit card required.</p>
      <p style="margin-top:24px;"><a href="https://mindsphere.fit/app/dashboard" style="display:inline-block;background:#c084fc;color:#0a0a14;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;">Open your dashboard →</a></p>
    """)


def _subscription_confirmed_email_html(name: str, cycle: str) -> str:
    cycle_display = "Monthly ($14.99/mo)" if cycle == "monthly" else "Annual ($149.99/yr)"
    return _email_shell(f"""
      <h2 style="margin:0 0 12px 0;font-size:24px;">You're on MindSphere Pro 🎉</h2>
      <p style="line-height:1.6;color:#b8b8c0;">Hi {name}, your <b>{cycle_display}</b> plan is active. Lyra Voice, AI meal plans, full assessments, and disturbance detection are all unlocked.</p>
      <p style="margin-top:24px;"><a href="https://mindsphere.fit/app/dashboard" style="display:inline-block;background:#c084fc;color:#0a0a14;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;">Open dashboard →</a></p>
    """)


def _payment_failed_email_html(name: str) -> str:
    return _email_shell(f"""
      <h2 style="margin:0 0 12px 0;font-size:24px;color:#f59e0b;">Action needed: payment failed</h2>
      <p style="line-height:1.6;color:#b8b8c0;">Hi {name}, we couldn't process your last MindSphere payment. Your Pro features will remain active for 3 more days.</p>
      <p style="line-height:1.6;color:#b8b8c0;">Update your payment method to avoid any interruption.</p>
      <p style="margin-top:24px;"><a href="https://mindsphere.fit/app/settings?tab=subscription" style="display:inline-block;background:#f59e0b;color:#0a0a14;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;">Update payment →</a></p>
    """)


# ============================================================
# Seed demo user
# ============================================================
@app.on_event("startup")
async def seed_demo():
    existing = await db.users.find_one({"email": "demo@mindsphere.app"})
    trial_start = datetime.now(timezone.utc)
    trial_end = trial_start + timedelta(days=TRIAL_DAYS)
    if existing:
        # Ensure demo user always has trial fields current (idempotent)
        await db.users.update_one(
            {"id": existing["id"]},
            {"$set": {
                "plan": "trial",
                "trial_start": trial_start.isoformat(),
                "trial_end": trial_end.isoformat(),
                "subscription_status": None,
            }, "$setOnInsert": {}},
        )
        return
    uid = "demo-user-id-001"
    user = {
        "id": uid, "name": "Aria Demo", "email": "demo@mindsphere.app",
        "password": hash_pw("demo1234"), "avatar": None, "onboarded": True,
        "tutorial_completed": True,
        "plan": "trial",
        "trial_start": trial_start.isoformat(),
        "trial_end": trial_end.isoformat(),
        "stripe_customer_id": None, "stripe_subscription_id": None,
        "subscription_status": None, "billing_cycle": None, "next_billing_date": None,
        "notification_prefs": {
            "daily_journal": True, "journal_time": "20:00",
            "mood_checkin": False, "mood_time": "19:00",
            "weekly_digest": False, "appointment_reminders": True,
            "trial_warnings": True, "promotional": False,
        },
        "onboarding": {
            "primary_goal": "Improve mood", "current_state": 6,
            "stressors": ["Work", "Finances"], "sleep_hours": 7, "exercise_freq": "1-2x week",
            "diet_type": "non-vegetarian", "allergies": "none", "water_glasses": 6,
            "sees_therapist": "No", "journal_freq": "Sometimes",
            "wake_time": "7:00 AM", "sleep_time": "11:00 PM",
            "positive_triggers": ["Music", "Friends", "Sunshine"],
            "negative_triggers": ["Deadlines", "Conflict", "Noise"],
            "energy_level": 6, "perfect_day": "A morning walk, deep work, dinner with a friend.",
        },
        "preferences": {"lyra_name": "Lyra", "voice": "alloy", "style": "warm", "accent": "purple", "theme": "midnight"},
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    # sample journal + moods
    samples = [
        ("Work piled up today and I felt overwhelmed. Took a walk and came back better.", "anxious", 7, ["work", "walk"]),
        ("Had coffee with an old friend. Heart felt full.", "happy", 8, ["friends"]),
        ("Couldn't sleep again. Mind racing about the project deadline.", "anxious", 8, ["sleep", "deadline"]),
        ("Cooked a real dinner tonight. Small win.", "grateful", 7, ["cooking"]),
        ("Tough conversation with mom. Left me drained.", "sad", 6, ["family"]),
    ]
    for i, (text, emo, inten, topics) in enumerate(samples):
        ts = (datetime.now(timezone.utc) - timedelta(days=i)).isoformat()
        await db.journal.insert_one({
            "id": new_id(), "user_id": uid, "content": text, "voice": False,
            "emotion": emo, "intensity": inten, "color": EMOTION_COLOR.get(emo, "#c084fc"),
            "summary": "Thank you for sharing this with me.", "topics": topics, "created_at": ts,
        })
        await db.mood.insert_one({
            "id": new_id(), "user_id": uid, "emotion": emo, "intensity": inten,
            "color": EMOTION_COLOR.get(emo, "#c084fc"), "note": "", "source": "journal", "created_at": ts,
        })
    log.info("Demo user seeded.")


# ---------- mount ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
