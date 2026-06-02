import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, Camera, AlertTriangle, TrendingUp } from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/Shared";
import GuidanceCard from "../components/GuidanceCard";
import { http } from "../lib/api";
import { toast } from "sonner";

const Disturbance = () => {
  const [data, setData] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [kind, setKind] = useState("environment");
  const fileRef = useRef(null);

  useEffect(() => { (async () => setData((await http.get("/disturbance/scan")).data))(); }, []);

  const uploadPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAnalyzing(true);
    setAnalysis("");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const { data } = await http.post("/disturbance/vision", { image_base64: reader.result, kind });
        setAnalysis(data.analysis);
      } catch { toast.error("Could not analyze image"); }
      setAnalyzing(false);
    };
    reader.readAsDataURL(f);
  };

  if (!data) return <AppShell><div className="p-10 text-white/40">Scanning…</div></AppShell>;

  return (
    <AppShell>
      <PageHeader eyebrow="disturbance detector" title="What's stirring underneath?"
        subtitle="An AI pattern scan across your journals, moods, and (optionally) photos."
        accent="#ef4444" />

      <div className="mb-5"><GuidanceCard feature="disturbance" accent="#ef4444" title="3 micro-actions to ease this" /></div>

      <Card accent="#ef4444" className="mb-5">
        <div className="text-xs uppercase tracking-widest text-red-300 mb-3 flex items-center gap-2"><AlertTriangle size={14}/> detected disturbances</div>
        <div className="space-y-3">
          {data.items.map((it, i) => (
            <motion.div key={it.topic} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="p-4 rounded-2xl border border-white/5 bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-xl capitalize">#{i + 1} · {it.topic}</div>
                  <div className="text-xs text-white/40">first seen {new Date(it.first_seen).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl text-red-300">{it.count}<span className="text-xs text-white/40"> mentions</span></div>
                  <div className="text-[11px] text-white/50 flex items-center gap-1"><TrendingUp size={10}/> {it.trend}</div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 mt-3 overflow-hidden">
                <motion.div className="h-full bg-red-400" animate={{ width: `${Math.min(100, it.count * 12)}%` }} />
              </div>
              <div className="text-xs text-white/70 mt-3 italic">→ {it.recommendation}</div>
            </motion.div>
          ))}
        </div>
        <div className="text-[11px] text-white/40 mt-4">scanned {data.scanned_journals} journals · {data.scanned_moods} moods</div>
      </Card>

      <Card accent="#a78bfa">
        <div className="text-xs uppercase tracking-widest text-purple-300 mb-3 flex items-center gap-2"><Camera size={14}/> vision check-in</div>
        <div className="text-sm text-white/65 mb-3">Upload a selfie or a photo of your space — Lyra observes gently and offers one micro-action.</div>
        <div className="flex gap-2 mb-3">
          {["environment", "face"].map(k => (
            <button key={k} onClick={() => setKind(k)} data-testid={`vision-${k}`}
              className={`px-4 py-2 rounded-full text-xs capitalize border ${kind === k ? "border-purple-400/60 bg-purple-500/15" : "border-white/10"}`}>{k}</button>
          ))}
        </div>
        <input ref={fileRef} onChange={uploadPhoto} type="file" accept="image/*" capture="environment" className="hidden" data-testid="vision-upload" />
        <button onClick={() => fileRef.current?.click()} disabled={analyzing}
          className="px-5 py-2.5 rounded-full bg-white text-black flex items-center gap-2 hover:scale-[1.03] transition disabled:opacity-50">
          <Upload size={14} /> {analyzing ? "analyzing…" : "upload image"}
        </button>
        {analysis && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-4 rounded-2xl bg-purple-500/5 border border-purple-400/20 text-sm whitespace-pre-wrap" data-testid="vision-analysis">
            {analysis}
          </motion.div>
        )}
      </Card>
    </AppShell>
  );
};

export default Disturbance;
