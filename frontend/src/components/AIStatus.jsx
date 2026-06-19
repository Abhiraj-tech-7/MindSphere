import React, { createContext, useContext, useState, useCallback } from "react";

const AIStatusCtx = createContext({ status: "ok", record: () => {} });

export const useAIStatus = () => useContext(AIStatusCtx);

export const AIStatusProvider = ({ children }) => {
  const [status, setStatus] = useState("ok");

  /**
   * Wrap an async AI call to track status:
   *   await record(() => http.post("/chat", ...))
   * - <5s → ok, 5-15s → slow, error/timeout → error
   */
  const record = useCallback(async (fn) => {
    const t0 = Date.now();
    try {
      const out = await fn();
      const dt = Date.now() - t0;
      setStatus(dt < 5000 ? "ok" : "slow");
      // auto-clear "slow" back to "ok" after 30s
      if (dt >= 5000) setTimeout(() => setStatus("ok"), 30000);
      return out;
    } catch (e) {
      setStatus("error");
      // auto-clear "error" back to "ok" after 60s
      setTimeout(() => setStatus("ok"), 60000);
      throw e;
    }
  }, []);

  return (
    <AIStatusCtx.Provider value={{ status, setStatus, record }}>
      {children}
    </AIStatusCtx.Provider>
  );
};

export const AIStatusDot = () => {
  const { status } = useAIStatus();
  const color = status === "ok" ? "#10B981" : status === "slow" ? "#F59E0B" : "#EF4444";
  const label = status === "ok" ? "AI is responding normally" : status === "slow" ? "AI is responding slowly" : "AI is unavailable — retrying";
  return (
    <div
      title={label}
      aria-label={label}
      data-testid="ai-status-dot"
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: color, boxShadow: `0 0 10px ${color}80` }}
    />
  );
};
