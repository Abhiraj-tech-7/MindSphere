import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Users, Flame, ChefHat, Sparkles, Bookmark, Trash2 } from "lucide-react";

/**
 * Reusable full-screen recipe viewer modal.
 * Props:
 *  - recipe: object (full recipe schema returned by /diet/recipe/*)
 *  - loading: bool
 *  - onClose: fn
 *  - onSave?: fn (shown only if recipe.source === 'ai_plan' and !recipe.saved)
 *  - onDelete?: fn (shown for saved cookbook items)
 *  - accent: hex color
 */
const RecipeModal = ({ recipe, loading, onClose, onSave, onDelete, accent = "#14b8a6" }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-2 sm:p-6 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        data-testid="recipe-modal-backdrop"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0b0b15] border border-white/10 shadow-2xl"
          data-testid="recipe-modal"
        >
          {/* Header strip */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-[#0b0b15] to-[#0b0b15]/80 backdrop-blur border-b border-white/5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{recipe?.emoji || "🍽️"}</span>
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: accent }}>
                  {recipe?.cuisine || "recipe"}
                </div>
                <div className="font-display text-xl sm:text-2xl text-white leading-tight">
                  {loading ? "Cooking up your recipe…" : recipe?.name}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!loading && recipe && onSave && (
                <button
                  onClick={onSave}
                  data-testid="recipe-save-btn"
                  className="px-3 py-1.5 rounded-full text-xs flex items-center gap-1 border border-teal-400/40 hover:bg-teal-500/10 transition"
                >
                  <Bookmark size={12} /> save
                </button>
              )}
              {!loading && recipe && onDelete && (
                <button
                  onClick={onDelete}
                  data-testid="recipe-delete-btn"
                  className="px-3 py-1.5 rounded-full text-xs flex items-center gap-1 border border-red-400/40 text-red-300 hover:bg-red-500/10 transition"
                >
                  <Trash2 size={12} /> delete
                </button>
              )}
              <button
                onClick={onClose}
                data-testid="recipe-close-btn"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-white/50">
              <ChefHat className="mx-auto mb-3 animate-pulse" size={28} />
              Putting your recipe together…
            </div>
          ) : recipe ? (
            <div className="p-6 space-y-6">
              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="recipe-stats">
                <Stat icon={<Clock size={14} />} label="total" value={`${recipe.total_time_min ?? recipe.prep_time_min ?? "—"} min`} accent={accent} />
                <Stat icon={<Users size={14} />} label="serves" value={recipe.servings ?? 1} accent={accent} />
                <Stat icon={<Flame size={14} />} label="calories" value={recipe.nutrition?.calories ?? "—"} accent={accent} />
                <Stat icon={<ChefHat size={14} />} label="level" value={recipe.difficulty || "easy"} accent={accent} />
              </div>

              {/* Benefit */}
              {recipe.mental_health_benefit && (
                <div
                  className="p-4 rounded-2xl border bg-white/[0.03] flex gap-3"
                  style={{ borderColor: `${accent}40` }}
                  data-testid="recipe-benefit"
                >
                  <Sparkles size={16} style={{ color: accent }} className="mt-0.5 shrink-0" />
                  <div className="text-sm text-white/80 italic">{recipe.mental_health_benefit}</div>
                </div>
              )}

              {/* Ingredients */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] mb-3" style={{ color: accent }}>
                  ingredients
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="recipe-ingredients">
                  {(recipe.ingredients || []).map((ing, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between gap-3">
                      <span className="text-sm text-white/85">{ing.item}</span>
                      <span className="text-xs text-white/50 shrink-0">{ing.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              {recipe.equipment?.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] mb-2 text-white/40">equipment</div>
                  <div className="flex flex-wrap gap-2">
                    {recipe.equipment.map((e, i) => (
                      <span key={i} className="text-xs px-3 py-1 rounded-full bg-white/[0.04] border border-white/5 text-white/70">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] mb-3" style={{ color: accent }}>
                  steps
                </div>
                <div className="space-y-3" data-testid="recipe-steps">
                  {(recipe.steps || []).map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex gap-4"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm shrink-0"
                        style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}
                      >
                        {s.step ?? i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-white/90">{s.title}</div>
                          {s.duration_min && (
                            <div className="text-[10px] text-white/40 flex items-center gap-1">
                              <Clock size={10} /> {s.duration_min}m
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-white/70 mt-1">{s.instruction}</div>
                        {s.tip && (
                          <div className="text-xs mt-2 px-2 py-1 rounded-md inline-block" style={{ background: `${accent}15`, color: accent }}>
                            💡 {s.tip}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Nutrition */}
              {recipe.nutrition && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] mb-3" style={{ color: accent }}>
                    nutrition (per serving)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="recipe-nutrition">
                    {Object.entries(recipe.nutrition).map(([k, v]) => (
                      <div key={k} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                        <div className="text-[10px] uppercase tracking-widest text-white/40">{k}</div>
                        <div className="font-display text-lg text-white">
                          {v}
                          {k !== "calories" && <span className="text-xs text-white/40">g</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags + chef notes */}
              {recipe.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((t, i) => (
                    <span key={i} className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: `${accent}15`, color: accent }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {recipe.chef_notes && (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] uppercase tracking-widest mb-1 text-white/40">chef notes</div>
                  <div className="text-sm text-white/70 italic">{recipe.chef_notes}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center text-white/40">Recipe not available.</div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Stat = ({ icon, label, value, accent }) => (
  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/40">
      <span style={{ color: accent }}>{icon}</span> {label}
    </div>
    <div className="font-display text-lg text-white mt-0.5">{value}</div>
  </div>
);

export default RecipeModal;
