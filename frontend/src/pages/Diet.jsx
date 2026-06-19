import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCcw, Droplets, BookOpen, Plus, ChefHat, Trash2, ShoppingCart, Copy, X } from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import GuidanceCard from "../components/GuidanceCard";
import RecipeModal from "../components/RecipeModal";
import CustomRecipeWizard from "../components/CustomRecipeWizard";
import { http } from "../lib/api";
import { toast } from "sonner";

const Diet = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [hyd, setHyd] = useState({ glasses: 0 });

  // Recipe state
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState(null);

  // Custom recipe wizard
  const [wizardOpen, setWizardOpen] = useState(false);

  // Cookbook
  const [cookbookOpen, setCookbookOpen] = useState(false);
  const [cookbook, setCookbook] = useState([]);

  // Shopping list
  const [shopOpen, setShopOpen] = useState(false);
  const [shopData, setShopData] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([http.get("/diet/plan"), http.get("/hydration/today")]);
      setPlan(p.data);
      setHyd(h.data);
    } catch {
      toast.error("Could not load diet plan");
    }
    setLoading(false);
  };

  const loadCookbook = async () => {
    try {
      const { data } = await http.get("/diet/recipes");
      setCookbook(data.items || []);
    } catch {
      toast.error("Could not load cookbook");
    }
  };

  useEffect(() => { load(); }, []);

  const regen = async (reason = "Regenerate full plan") => {
    setRegenerating(true);
    try {
      const { data } = await http.post("/diet/regenerate", { reason });
      setPlan(data);
      toast.success("Plan refreshed.");
    } catch {
      toast.error("Could not regenerate");
    }
    setRegenerating(false);
  };

  const regenMeal = async (day, mealName) => {
    const reason = window.prompt(`Why swap "${mealName}"?`, "I don't like this");
    if (reason === null) return;
    setRegenerating(true);
    try {
      const { data } = await http.post("/diet/regenerate", { reason, day, meal: mealName });
      setPlan(data);
      toast.success("Swapped.");
    } catch {
      toast.error("Failed");
    }
    setRegenerating(false);
  };

  const drink = async () => {
    await http.post("/hydration", { glasses: 1 });
    const { data } = await http.get("/hydration/today");
    setHyd(data);
  };

  const openRecipe = async (meal) => {
    setRecipeOpen(true);
    setRecipeLoading(true);
    setActiveRecipe(null);
    try {
      const { data } = await http.post("/diet/recipe/detail", {
        meal_name: meal.name,
        ingredients: meal.ingredients || [],
        benefit: meal.benefit || "",
        calories: meal.calories,
        macros: meal.macros,
      });
      setActiveRecipe(data);
    } catch {
      toast.error("Could not fetch recipe");
      setRecipeOpen(false);
    }
    setRecipeLoading(false);
  };

  const saveCurrentRecipe = async () => {
    if (!activeRecipe?.id) return;
    try {
      const { data } = await http.post(`/diet/recipes/${activeRecipe.id}/save`);
      setActiveRecipe(data);
      toast.success("Saved to your cookbook.");
    } catch {
      toast.error("Could not save");
    }
  };

  const handleCustomRecipe = async (answers) => {
    setRecipeOpen(true);
    setRecipeLoading(true);
    setActiveRecipe(null);
    setWizardOpen(false);
    try {
      const { data } = await http.post("/diet/recipe/custom", answers);
      setActiveRecipe(data);
      toast.success("Custom recipe ready & saved.");
    } catch {
      toast.error("Could not build recipe");
      setRecipeOpen(false);
    }
    setRecipeLoading(false);
  };

  const viewSaved = (r) => {
    setActiveRecipe(r);
    setRecipeOpen(true);
    setRecipeLoading(false);
  };

  const deleteSaved = async () => {
    if (!activeRecipe?.id) return;
    if (!window.confirm("Delete this recipe from your cookbook?")) return;
    try {
      await http.delete(`/diet/recipes/${activeRecipe.id}`);
      toast.success("Removed.");
      setRecipeOpen(false);
      setActiveRecipe(null);
      await loadCookbook();
    } catch {
      toast.error("Could not delete");
    }
  };

  const openCookbook = async () => {
    setCookbookOpen(true);
    await loadCookbook();
  };

  const openShop = async () => {
    setShopOpen(true);
    if (!shopData) {
      try {
        const { data } = await http.get("/diet/shopping-list");
        setShopData(data.categories || {});
      } catch {
        toast.error("Could not load shopping list");
        setShopData({});
      }
    }
  };

  if (loading) return <AppShell><div className="p-10 text-white/40">Cooking up your plan…</div></AppShell>;

  return (
    <AppShell>
      <PageHeader
        eyebrow="diet & nutrition"
        title="Eat your way calmer."
        subtitle="A 7-day plan tuned to your body, allergies, and the moods you'd like to feel."
        accent="#14b8a6"
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={openShop}
              data-testid="open-shopping-btn"
              className="px-4 py-2.5 rounded-full border border-teal-400/40 hover:bg-teal-500/10 flex items-center gap-2 text-sm"
            >
              <ShoppingCart size={14} /> shopping list
            </button>
            <button
              onClick={openCookbook}
              data-testid="open-cookbook-btn"
              className="px-4 py-2.5 rounded-full border border-teal-400/40 hover:bg-teal-500/10 flex items-center gap-2 text-sm"
            >
              <BookOpen size={14} /> cookbook
            </button>
            <button
              onClick={() => setWizardOpen(true)}
              data-testid="open-custom-recipe-btn"
              className="px-4 py-2.5 rounded-full bg-teal-400 text-black hover:scale-[1.03] transition flex items-center gap-2 text-sm font-medium"
            >
              <Plus size={14} /> build recipe
            </button>
            <button
              onClick={() => regen()}
              disabled={regenerating}
              data-testid="diet-regen"
              className="px-4 py-2.5 rounded-full border border-teal-400/40 hover:bg-teal-500/10 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <RefreshCcw size={14} /> {regenerating ? "..." : "regenerate"}
            </button>
          </div>
        }
      />

      {/* Hydration */}
      <Card accent="#14b8a6" className="mb-5">
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-28">
            <div className="absolute inset-0 rounded-2xl border-2 border-teal-400/40" />
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-b-2xl bg-gradient-to-t from-teal-400 to-cyan-400"
              animate={{ height: `${Math.min(100, (hyd.glasses / 8) * 100)}%` }}
              transition={{ duration: 0.7 }}
            />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-teal-300">hydration</div>
            <div className="font-display text-3xl">
              {hyd.glasses || 0}
              <span className="text-base text-white/40"> / 8 glasses</span>
            </div>
          </div>
          <button
            onClick={drink}
            data-testid="diet-water"
            className="px-5 py-2.5 rounded-full bg-white text-black flex items-center gap-2 hover:scale-[1.03] transition"
          >
            <Droplets size={14} /> +1 glass
          </button>
        </div>
      </Card>

      <div className="mb-5">
        <GuidanceCard feature="diet" accent="#14b8a6" title="3 tips for your nutrition today" />
      </div>

      {/* Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {(plan?.days || []).map((d, i) => (
          <motion.div
            key={d.day}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass p-6"
          >
            <div className="font-display text-2xl mb-4">{d.day}</div>
            <div className="space-y-3">
              {d.meals.map((m) => (
                <div
                  key={m.name}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-teal-400/30 transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{m.emoji}</span>
                        <div>
                          <div className="text-[11px] uppercase tracking-widest text-teal-300">{m.time}</div>
                          <div className="text-base font-medium">{m.name}</div>
                        </div>
                      </div>
                      <div className="text-xs text-white/55 mt-2">{(m.ingredients || []).join(" · ")}</div>
                      <div className="text-xs text-teal-300 mt-1 italic">{m.benefit}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg">
                        {m.calories}
                        <span className="text-xs text-white/40"> cal</span>
                      </div>
                      <div className="text-[10px] text-white/40">
                        P{m.macros?.protein} · C{m.macros?.carbs} · F{m.macros?.fat}
                      </div>
                      <div className="mt-2 flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => openRecipe(m)}
                          data-testid={`view-recipe-${d.day}-${m.name}`}
                          className="text-[10px] text-teal-300 flex items-center gap-1 hover:underline"
                        >
                          <ChefHat size={10} /> recipe
                        </button>
                        <button
                          onClick={() => regenMeal(d.day, m.name)}
                          data-testid={`swap-${d.day}-${m.name}`}
                          className="text-[10px] text-white/50 hover:text-white/80"
                        >
                          swap
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recipe Modal */}
      {recipeOpen && (
        <RecipeModal
          recipe={activeRecipe}
          loading={recipeLoading}
          onClose={() => setRecipeOpen(false)}
          onSave={
            !recipeLoading && activeRecipe && activeRecipe.source === "ai_plan" && !activeRecipe.saved
              ? saveCurrentRecipe
              : undefined
          }
          onDelete={
            !recipeLoading && activeRecipe && activeRecipe.saved && activeRecipe.source !== "ai_plan"
              ? deleteSaved
              : undefined
          }
          accent="#14b8a6"
        />
      )}

      {/* Wizard */}
      <CustomRecipeWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleCustomRecipe}
        accent="#14b8a6"
      />

      {/* Cookbook Drawer */}
      {cookbookOpen && (
        <CookbookDrawer
          items={cookbook}
          onClose={() => setCookbookOpen(false)}
          onView={(r) => { setCookbookOpen(false); viewSaved(r); }}
          onRefresh={loadCookbook}
        />
      )}

      {/* Shopping List Drawer */}
      {shopOpen && (
        <ShoppingDrawer
          categories={shopData}
          onClose={() => setShopOpen(false)}
        />
      )}
    </AppShell>
  );
};

const ShoppingDrawer = ({ categories, onClose }) => {
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ms_shopping_checked") || "{}"); } catch { return {}; }
  });
  const toggle = (name) => {
    const next = { ...checked, [name]: !checked[name] };
    setChecked(next);
    localStorage.setItem("ms_shopping_checked", JSON.stringify(next));
  };
  const clearChecked = () => {
    setChecked({});
    localStorage.setItem("ms_shopping_checked", JSON.stringify({}));
    toast.success("Cleared checked items");
  };
  const copyList = () => {
    if (!categories) return;
    const lines = [];
    Object.entries(categories).forEach(([cat, items]) => {
      const unchecked = items.filter((i) => !checked[i.name]);
      if (unchecked.length) {
        lines.push(`# ${cat}`);
        unchecked.forEach((i) => lines.push(`- ${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`));
        lines.push("");
      }
    });
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("List copied to clipboard");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[55] flex justify-end bg-black/60 backdrop-blur-md"
      onClick={onClose}
      data-testid="shopping-drawer"
    >
      <motion.div
        initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md h-full bg-[#0b0b15] border-l border-white/10 overflow-y-auto"
      >
        <div className="sticky top-0 z-10 px-6 py-4 bg-[#0b0b15]/95 backdrop-blur border-b border-white/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-teal-300">your week</div>
            <div className="font-display text-xl flex items-center gap-2"><ShoppingCart size={18} /> Shopping list</div>
          </div>
          <button onClick={onClose} data-testid="shop-close" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
        <div className="px-5 pt-3 pb-1 flex gap-2">
          <button onClick={copyList} data-testid="shop-copy" className="px-3 py-1.5 rounded-full text-xs border border-teal-400/40 hover:bg-teal-500/10 flex items-center gap-1.5">
            <Copy size={11} /> copy list
          </button>
          <button onClick={clearChecked} data-testid="shop-clear" className="px-3 py-1.5 rounded-full text-xs border border-white/10 hover:bg-white/5">
            clear checked
          </button>
        </div>
        <div className="p-5 space-y-5">
          {!categories ? (
            <div className="text-sm text-white/40">Loading…</div>
          ) : Object.keys(categories).length === 0 ? (
            <div className="text-sm text-white/40 text-center py-8">No meal plan yet. Generate one to populate your list.</div>
          ) : (
            Object.entries(categories).map(([cat, items]) => (
              <div key={cat}>
                <div className="text-[10px] uppercase tracking-[0.25em] text-teal-300 mb-2">{cat}</div>
                <div className="space-y-1">
                  {items.map((it) => (
                    <label key={it.name} data-testid={`shop-item-${it.name}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.03] cursor-pointer">
                      <input type="checkbox" checked={!!checked[it.name]} onChange={() => toggle(it.name)}
                        className="accent-teal-400" />
                      <span className="flex-1 text-sm" style={{ textDecoration: checked[it.name] ? "line-through" : "none", color: checked[it.name] ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.85)" }}>
                        {it.name}
                      </span>
                      {it.quantity > 1 && <span className="text-xs text-white/40">×{it.quantity}</span>}
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const CookbookDrawer = ({ items, onClose, onView }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[55] flex justify-end bg-black/60 backdrop-blur-md"
    onClick={onClose}
    data-testid="cookbook-drawer"
  >
    <motion.div
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 60, opacity: 0 }}
      onClick={(e) => e.stopPropagation()}
      className="w-full sm:max-w-md h-full bg-[#0b0b15] border-l border-white/10 overflow-y-auto"
    >
      <div className="sticky top-0 z-10 px-6 py-4 bg-[#0b0b15]/95 backdrop-blur border-b border-white/5 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-teal-300">your cookbook</div>
          <div className="font-display text-xl">Saved recipes</div>
        </div>
        <button
          onClick={onClose}
          data-testid="cookbook-close"
          className="px-3 py-1.5 rounded-full text-xs bg-white/5 hover:bg-white/10"
        >
          close
        </button>
      </div>
      <div className="p-5 space-y-3">
        {items.length === 0 && (
          <div className="text-center py-10 text-white/40 text-sm">
            <ChefHat className="mx-auto mb-3" size={24} />
            No saved recipes yet.
            <div className="text-xs mt-1">Tap "build recipe" to create your first.</div>
          </div>
        )}
        {items.map((r) => (
          <button
            key={r.id}
            onClick={() => onView(r)}
            data-testid={`cookbook-item-${r.id}`}
            className="w-full text-left p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-teal-400/40 transition"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{r.emoji || "🍽️"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-teal-300">
                  {r.cuisine || "custom"} · {r.total_time_min || "?"} min
                </div>
                <div className="font-medium text-white truncate">{r.name}</div>
                <div className="text-xs text-white/50 mt-1 line-clamp-2">{r.mental_health_benefit}</div>
              </div>
              <div className="text-right text-xs text-white/40 shrink-0">
                {r.nutrition?.calories} cal
              </div>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

export default Diet;
