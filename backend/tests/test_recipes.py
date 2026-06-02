"""
MindSphere — recipe feature tests + targeted regressions for this iteration.
Covers:
  - POST /api/diet/recipe/detail (cook-along, caches per user+meal)
  - POST /api/diet/recipe/custom (wizard, auto-saves source='custom')
  - GET  /api/diet/recipes      (cookbook: only saved=True, newest first)
  - POST /api/diet/recipes/{id}/save (mark ai_plan recipe as saved)
  - DELETE /api/diet/recipes/{id} (404 for unknown id)
  - GET  /api/voice/config       (Gemini key loaded -> available=true)
  - GET  /api/diet/plan          (regression — untouched)
  - POST /api/auth/login         (regression — demo creds)
  - 401 auth-required on all recipe endpoints
"""
import os
import time
import uuid
from pathlib import Path

import pytest
import requests

# ---------- BASE URL (from frontend/.env per env rules) ----------
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    env_file = Path(__file__).parent.parent.parent / "frontend" / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break
assert BASE_URL, "REACT_APP_BACKEND_URL not configured"

API = f"{BASE_URL}/api"
DEMO_EMAIL = "demo@mindsphere.app"
DEMO_PASS = "demo1234"

LLM_TIMEOUT = 90   # LLM-backed endpoints can be slow
SHORT_TIMEOUT = 30


# ---------- shared session + fixtures ----------
@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def auth(s):
    r = s.post(f"{API}/auth/login",
               json={"email": DEMO_EMAIL, "password": DEMO_PASS},
               timeout=SHORT_TIMEOUT)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json()["token"]
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def state():
    return {}


# ---------- A. auth & regression sanity ----------
class TestAuthRegression:
    def test_login_demo_works(self, s):
        r = s.post(f"{API}/auth/login",
                   json={"email": DEMO_EMAIL, "password": DEMO_PASS},
                   timeout=SHORT_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert isinstance(body.get("token"), str) and len(body["token"]) > 20
        assert body["user"]["email"] == DEMO_EMAIL

    def test_voice_config_gemini_loaded(self, s, auth):
        r = s.get(f"{API}/voice/config", headers=auth, timeout=SHORT_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "model" in body and body["model"], "voice/config missing model"
        assert body.get("available") is True, f"Gemini key NOT loaded -> available={body.get('available')}"

    def test_diet_plan_regression(self, s, auth, state):
        r = s.get(f"{API}/diet/plan", headers=auth, timeout=LLM_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        days = body.get("days") or body
        assert isinstance(days, list) and len(days) >= 7, "Diet plan should have >=7 days"
        meals = days[0].get("meals") or []
        assert len(meals) >= 3, "Day should have at least 3 meals"
        m0 = meals[0]
        for k in ("name", "ingredients", "benefit", "calories", "macros"):
            assert k in m0, f"meal missing key {k}"
        # stash one meal name for recipe-detail test
        state["meal_name"] = m0["name"]
        state["meal_ings"] = m0.get("ingredients") or []
        state["meal_benefit"] = m0.get("benefit") or ""
        state["meal_cal"] = m0.get("calories")
        state["meal_macros"] = m0.get("macros") or {}


# ---------- B. auth-required (401 without token) ----------
class TestRecipeAuthRequired:
    @pytest.mark.parametrize("method,path,body", [
        ("post",   "/diet/recipe/detail", {"meal_name": "Oatmeal"}),
        ("post",   "/diet/recipe/custom", {"cuisine": "indian"}),
        ("get",    "/diet/recipes", None),
        ("post",   "/diet/recipes/does-not-exist/save", None),
        ("delete", "/diet/recipes/does-not-exist", None),
    ])
    def test_requires_auth(self, s, method, path, body):
        url = f"{API}{path}"
        if method == "get":
            r = s.get(url, timeout=SHORT_TIMEOUT)
        elif method == "delete":
            r = s.delete(url, timeout=SHORT_TIMEOUT)
        else:
            r = s.post(url, json=body or {}, timeout=SHORT_TIMEOUT)
        assert r.status_code in (401, 403), f"{method} {path} expected 401/403, got {r.status_code}"


# ---------- C. recipe/detail ----------
def _assert_recipe_shape(doc, *, must_have_meal_name=None):
    """Validate full cook-along recipe shape."""
    for k in ("name", "ingredients", "steps", "nutrition", "mental_health_benefit"):
        assert k in doc, f"recipe missing key: {k}"
    assert isinstance(doc["ingredients"], list) and len(doc["ingredients"]) >= 1
    assert isinstance(doc["steps"], list) and len(doc["steps"]) >= 1
    nut = doc["nutrition"]
    assert isinstance(nut, dict)
    for k in ("calories", "protein", "carbs", "fat"):
        assert k in nut, f"nutrition missing {k}"
    if must_have_meal_name:
        assert isinstance(doc["name"], str) and len(doc["name"]) > 0
    # ensure _id (mongo) not leaked
    assert "_id" not in doc


class TestRecipeDetail:
    def test_create_detail_for_ai_meal(self, s, auth, state):
        meal_name = state.get("meal_name") or "Avocado Toast with Egg"
        payload = {
            "meal_name": meal_name,
            "ingredients": state.get("meal_ings") or ["whole grain bread", "avocado", "egg"],
            "benefit": state.get("meal_benefit") or "steady mood",
            "calories": state.get("meal_cal") or 420,
            "macros": state.get("meal_macros") or {"protein": 20, "carbs": 40, "fat": 18},
        }
        r = s.post(f"{API}/diet/recipe/detail", headers=auth, json=payload, timeout=LLM_TIMEOUT)
        assert r.status_code == 200, r.text
        doc = r.json()
        _assert_recipe_shape(doc, must_have_meal_name=meal_name)
        # doc may or may not return id depending on cache path; first call should return one
        state["detail_first_payload"] = payload
        state["detail_first_doc"] = doc

    def test_detail_is_cached_per_user_and_meal(self, s, auth, state):
        """Second call with same meal_name should return SAME persisted doc (cached)."""
        payload = state.get("detail_first_payload")
        if not payload:
            pytest.skip("first detail call didn't run")
        r = s.post(f"{API}/diet/recipe/detail", headers=auth, json=payload, timeout=LLM_TIMEOUT)
        assert r.status_code == 200, r.text
        doc2 = r.json()
        doc1 = state["detail_first_doc"]
        # If first call returned an id, the cached call should return same id.
        if doc1.get("id"):
            assert doc2.get("id") == doc1.get("id"), "recipe/detail not cached: id differs on 2nd call"
        # name parity
        assert doc2.get("name") == doc1.get("name")
        # source should be ai_plan
        assert doc2.get("source", "ai_plan") in ("ai_plan", None)


# ---------- D. recipe/custom (wizard) ----------
class TestRecipeCustom:
    def test_custom_wizard_creates_and_autosaves(self, s, auth, state):
        wizard = {
            "cuisine": "mediterranean",
            "dietary": "vegetarian",
            "available_ingredients": "chickpeas, spinach, lemon, olive oil, garlic",
            "prep_time": "20 min",
            "calorie_target": "500 kcal",
            "mood_goal": "calm focus",
            "notes": "easy weeknight"
        }
        r = s.post(f"{API}/diet/recipe/custom", headers=auth, json=wizard, timeout=LLM_TIMEOUT)
        assert r.status_code == 200, r.text
        doc = r.json()
        _assert_recipe_shape(doc)
        # Critical contract: custom recipes are auto-saved with source='custom'
        assert doc.get("source") == "custom", f"expected source=custom, got {doc.get('source')}"
        assert doc.get("saved") is True, f"custom recipe should be auto-saved, got saved={doc.get('saved')}"
        assert isinstance(doc.get("id"), str) and len(doc["id"]) > 5
        # inputs echoed
        ins = doc.get("inputs") or {}
        assert ins.get("cuisine") == "mediterranean"
        assert ins.get("dietary") == "vegetarian"
        state["custom_recipe_id"] = doc["id"]


# ---------- E. cookbook listing ----------
class TestCookbookList:
    def test_list_returns_only_saved(self, s, auth, state):
        r = s.get(f"{API}/diet/recipes", headers=auth, timeout=SHORT_TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        items = body.get("items") if isinstance(body, dict) else body
        assert isinstance(items, list)
        # The custom recipe just created MUST be in this list.
        cid = state.get("custom_recipe_id")
        if cid:
            assert any(it.get("id") == cid for it in items), \
                "auto-saved custom recipe missing from /diet/recipes"
        # Every returned item must be saved=True
        for it in items:
            assert it.get("saved") is True, f"non-saved recipe leaked: {it.get('id')} saved={it.get('saved')}"
            assert "_id" not in it, "mongo _id leaked"
        # newest-first ordering check
        ts = [it.get("created_at") for it in items if it.get("created_at")]
        assert ts == sorted(ts, reverse=True), "items not sorted newest-first by created_at"


# ---------- F. save endpoint (ai_plan -> saved) ----------
class TestSaveRecipe:
    def test_save_existing_ai_plan_recipe(self, s, auth, state):
        # Create a fresh ai_plan recipe (separate meal name so we can verify save flag)
        meal = f"Test Mood Bowl {uuid.uuid4().hex[:6]}"
        det = s.post(f"{API}/diet/recipe/detail", headers=auth,
                     json={"meal_name": meal,
                           "ingredients": ["quinoa", "kale", "tahini"],
                           "benefit": "balanced mood",
                           "calories": 450,
                           "macros": {"protein": 18, "carbs": 55, "fat": 16}},
                     timeout=LLM_TIMEOUT)
        assert det.status_code == 200, det.text
        rid = det.json().get("id")
        assert rid, "detail did not return id"
        # Before save: should NOT be in cookbook
        pre = s.get(f"{API}/diet/recipes", headers=auth, timeout=SHORT_TIMEOUT).json()
        pre_items = pre.get("items") if isinstance(pre, dict) else pre
        assert not any(it.get("id") == rid for it in pre_items), \
            "ai_plan recipe should not appear in cookbook before save"
        # Save it
        sv = s.post(f"{API}/diet/recipes/{rid}/save", headers=auth, timeout=SHORT_TIMEOUT)
        assert sv.status_code == 200, sv.text
        saved_doc = sv.json()
        assert saved_doc.get("saved") is True
        assert saved_doc.get("id") == rid
        # Now must show in cookbook
        post = s.get(f"{API}/diet/recipes", headers=auth, timeout=SHORT_TIMEOUT).json()
        post_items = post.get("items") if isinstance(post, dict) else post
        assert any(it.get("id") == rid for it in post_items), \
            "ai_plan recipe missing from cookbook after save"
        state["saved_ai_recipe_id"] = rid

    def test_save_unknown_recipe_returns_404(self, s, auth):
        bogus = f"nope-{uuid.uuid4().hex}"
        r = s.post(f"{API}/diet/recipes/{bogus}/save", headers=auth, timeout=SHORT_TIMEOUT)
        assert r.status_code == 404, f"expected 404, got {r.status_code} {r.text}"


# ---------- G. delete endpoint ----------
class TestDeleteRecipe:
    def test_delete_existing(self, s, auth, state):
        rid = state.get("custom_recipe_id") or state.get("saved_ai_recipe_id")
        if not rid:
            pytest.skip("no recipe id available to delete")
        r = s.delete(f"{API}/diet/recipes/{rid}", headers=auth, timeout=SHORT_TIMEOUT)
        assert r.status_code in (200, 204), r.text
        if r.status_code == 200:
            assert r.json().get("deleted") is True
        # Confirm removed from cookbook
        lst = s.get(f"{API}/diet/recipes", headers=auth, timeout=SHORT_TIMEOUT).json()
        items = lst.get("items") if isinstance(lst, dict) else lst
        assert not any(it.get("id") == rid for it in items), "deleted recipe still appears in cookbook"

    def test_delete_unknown_returns_404(self, s, auth):
        r = s.delete(f"{API}/diet/recipes/does-not-exist-{uuid.uuid4().hex}",
                     headers=auth, timeout=SHORT_TIMEOUT)
        assert r.status_code == 404, f"expected 404, got {r.status_code} {r.text}"
