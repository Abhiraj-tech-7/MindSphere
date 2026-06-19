import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Heart, Send, RefreshCcw, Globe } from "lucide-react";
import AppShell from "../components/AppShell";
import { PageHeader } from "../components/Shared";
import { http } from "../lib/api";
import { toast } from "sonner";
import useDocTitle from "../hooks/useDocTitle";
import Skeleton from "../components/Skeleton";

const relTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso); const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const Community = () => {
  useDocTitle("Community");
  const [posts, setPosts] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [content, setContent] = useState("");
  const [type, setType] = useState("gratitude");
  const [sharing, setSharing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = async (p = 1, append = false) => {
    try {
      const { data } = await http.get(`/community/feed?page=${p}&limit=20`);
      setPosts(append && posts ? [...posts, ...data.posts] : data.posts);
      setHasMore(data.has_more);
      setPage(p);
    } catch {
      toast.error("Could not load community");
      setPosts([]);
    }
  };
  useEffect(() => { load(1, false); }, []);

  const share = async () => {
    if (!confirming) { setConfirming(true); return; }
    setSharing(true);
    try {
      await http.post("/community/share", { content: content.trim(), type });
      toast.success("Thank you for sharing 💜");
      setContent(""); setConfirming(false);
      await load(1, false);
    } catch (e) {
      const msg = e?.response?.data?.detail?.message || e?.response?.data?.detail || "Could not share";
      toast.error(typeof msg === "string" ? msg : "Could not share");
    }
    setSharing(false);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="community"
        title="A quiet board of small good things."
        subtitle="Anonymous thoughts from MindSphere members around the world. No likes. No comments. Just reading."
        accent="#10b981"
        right={
          <button onClick={() => load(1, false)} data-testid="community-refresh"
            className="px-4 py-2.5 rounded-full border border-emerald-400/40 hover:bg-emerald-500/10 flex items-center gap-2 text-sm">
            <RefreshCcw size={14} /> refresh
          </button>
        }
      />

      {/* Share widget */}
      <div className="glass p-5 mb-5" data-testid="community-share-card">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-emerald-300 mb-3">
          <Globe size={12} /> share anonymously
        </div>
        <div className="flex gap-2 mb-3">
          {["gratitude", "affirmation"].map((t) => (
            <button key={t} onClick={() => setType(t)} data-testid={`share-type-${t}`}
              className="px-3 py-1.5 rounded-full text-xs transition border"
              style={{
                background: type === t ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)",
                borderColor: type === t ? "#10b981" : "rgba(255,255,255,0.08)",
                color: type === t ? "#34d399" : "rgba(255,255,255,0.7)",
              }}>
              {t === "gratitude" ? "🙏 gratitude" : "✨ affirmation"}
            </button>
          ))}
        </div>
        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setConfirming(false); }}
          rows={3} maxLength={500}
          placeholder="Share something quietly with the community. No names, no profiles."
          data-testid="share-content"
          className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-400/50 text-white placeholder:text-white/30 resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-white/40">{content.length}/500 · 100% anonymous</span>
          <button
            onClick={share}
            disabled={sharing || content.trim().length < 10}
            data-testid="share-btn"
            className="px-4 py-2 rounded-full text-sm font-medium text-black hover:scale-[1.02] transition disabled:opacity-40"
            style={{ background: confirming ? "#f59e0b" : "#10b981" }}
          >
            {sharing ? "Sharing…" : confirming ? "Confirm anonymous share?" : <span className="flex items-center gap-1.5"><Send size={12} /> Share</span>}
          </button>
        </div>
      </div>

      {/* Feed */}
      {posts === null ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="glass p-5"><Skeleton h={14} w="40%" /><div className="mt-3"><Skeleton h={12} w="90%" /><div className="mt-2"><Skeleton h={12} w="70%" /></div></div></div>)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-white/40 text-sm">No posts yet. Be the first.</div>
      ) : (
        <div className="space-y-3" data-testid="community-feed">
          {posts.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              data-testid={`community-post-${p.id}`}
              className="glass p-5 hover:border-emerald-400/30 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-emerald-300/80 flex items-center gap-1">
                  {p.type === "gratitude" ? <Heart size={10} /> : <Sparkles size={10} />} a MindSphere member shared
                </span>
                <span className="text-[10px] text-white/40">{relTime(p.created_at)}</span>
              </div>
              <p className="text-sm text-white/85 leading-relaxed italic">"{p.content}"</p>
            </motion.div>
          ))}
          {hasMore && (
            <div className="text-center pt-4">
              <button onClick={() => load(page + 1, true)} data-testid="community-loadmore"
                className="px-5 py-2 rounded-full border border-white/10 hover:bg-white/5 text-sm text-white/70">
                load more
              </button>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
};

export default Community;
