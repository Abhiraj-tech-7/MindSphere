import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X } from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import GuidanceCard from "../components/GuidanceCard";
import { http } from "../lib/api";
import { toast } from "sonner";

const Assessments = () => {
  const [defs, setDefs] = useState({});
  const [history, setHistory] = useState([]);
  const [active, setActive] = useState(null); // key
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [d, h] = await Promise.all([http.get("/assessments/defs"), http.get("/assessments")]);
    setDefs(d.data); setHistory(h.data);
  };
  useEffect(() => { load(); }, []);

  const start = (key) => { setActive(key); setStep(0); setAnswers([]); setResult(null); };

  const pickAnswer = (v) => {
    const a = [...answers]; a[step] = v; setAnswers(a);
    if (step < defs[active].questions.length - 1) {
      setTimeout(() => setStep(step + 1), 200);
    } else {
      submit(a);
    }
  };

  const submit = async (a) => {
    setSubmitting(true);
    try {
      const { data } = await http.post("/assessments", { type: active, answers: a });
      setResult(data); load();
    } catch { toast.error("Could not submit"); }
    setSubmitting(false);
  };

  const close = () => { setActive(null); setResult(null); };

  return (
    <AppShell>
      <PageHeader eyebrow="assessments" title="Know yourself by the numbers." subtitle="Clinical-grade screening, gently delivered." accent="#60a5fa" />

      <div className="mb-5"><GuidanceCard feature="assessments" accent="#60a5fa" title="which one should you take?" /></div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(defs).map(([key, d], i) => (
          <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass glass-hover p-6 cursor-pointer" onClick={() => start(key)} data-testid={`assessment-${key}`}>
            <div className="text-xs uppercase tracking-widest text-blue-300">{key.toUpperCase()}</div>
            <div className="font-display text-2xl mt-2">{d.name}</div>
            <div className="text-xs text-white/50 mt-1">{d.questions.length} questions · ~5 min</div>
            <div className="mt-4 text-xs text-blue-300 hover:underline">begin →</div>
          </motion.div>
        ))}
      </div>

      {history.length > 0 && (
        <Card className="mt-8" accent="#a78bfa">
          <div className="text-xs uppercase tracking-widest text-purple-300 mb-3">your history</div>
          <div className="space-y-2">
            {history.slice(0, 10).map(h => (
              <div key={h.id} className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                <div>
                  <div>{h.name}</div>
                  <div className="text-xs text-white/40">{new Date(h.created_at).toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="font-display text-2xl">{h.score}</span>
                  <span className="text-xs text-white/40 ml-2">{h.band}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass w-full max-w-2xl p-8 relative" data-testid="assessment-modal">
              <button onClick={close} className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={18}/></button>
              {!result && defs[active] && (
                <>
                  <div className="text-xs uppercase tracking-widest text-blue-300">{defs[active].name}</div>
                  <div className="h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
                    <motion.div className="h-full bg-blue-400" animate={{ width: `${((step + 1) / defs[active].questions.length) * 100}%` }} />
                  </div>
                  <div className="mt-6 font-display text-2xl">{defs[active].questions[step]}</div>
                  <div className="text-xs text-white/40 mt-2">Over the last 2 weeks…</div>
                  <div className="mt-6 space-y-2">
                    {defs[active].scale.map((v, i) => (
                      <button key={v} onClick={() => pickAnswer(v)} data-testid={`ans-${v}`}
                        className="w-full text-left px-5 py-3 rounded-2xl border border-white/10 hover:border-blue-400/60 hover:bg-blue-500/10 transition flex justify-between">
                        <span>{defs[active].scale_labels[i]}</span><span className="text-white/40 text-sm">{v}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between mt-6 text-xs">
                    <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="text-white/50 disabled:opacity-30 flex items-center gap-1"><ChevronLeft size={14}/> back</button>
                    <span className="text-white/40">{step + 1} / {defs[active].questions.length}</span>
                  </div>
                </>
              )}
              {result && (
                <div data-testid="assessment-result">
                  <div className="text-xs uppercase tracking-widest text-blue-300">{result.name}</div>
                  <div className="font-display text-6xl mt-4" style={{ color: "#60a5fa" }}>{result.score}</div>
                  <div className="text-lg text-white/70">{result.band}</div>
                  <div className="mt-5 p-4 rounded-2xl bg-blue-500/5 border border-blue-400/20 text-sm text-white/85 whitespace-pre-wrap">{result.interpretation}</div>
                  <button onClick={close} className="mt-6 px-6 py-3 rounded-full bg-white text-black font-medium hover:scale-[1.03] transition">Close</button>
                </div>
              )}
              {submitting && <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur text-white/60">Interpreting…</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
};

export default Assessments;
