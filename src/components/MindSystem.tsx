"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, SendHorizontal, Zap } from "lucide-react";

/**
 * ORION AI — the fastest AI on the site. There is no floating button for it:
 * the ROCKET INSIGNIA in the nav opens this panel (tap, or press-and-hold).
 * Answers stream from /api/mind, grounded on Meskat's dossier — and ORION
 * never reveals which model, key or provider moves it.
 */

export const EV_ORION = "ma:orion";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "ORION AI online, sir. Fastest intelligence on this site — and fully briefed on Meskat. How may I assist you?",
};

const CHIPS = ["Who is Meskat?", "What has he built?", "How do I get project access?", "Any socials you're hiding?"];

export default function MindSystem() {
  const [open, setOpen] = useState(false);
  const [booting, setBooting] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // a quiet easter egg for the ones who open the console
  useEffect(() => {
    try {
      console.log(
        "%c🔎 off the record… %c Meskat's personal X is %c@DotSeekX%c — the fun account where he just scrolls and comments. You didn't hear it from me. https://x.com/DotSeekX",
        "color:#ffc966;font-weight:bold",
        "color:#a99b8e",
        "color:#ff8b3d;font-weight:bold",
        "color:#a99b8e"
      );
    } catch {}
  }, []);

  // the nav insignia summons ORION (tap or press-and-hold on the rocket)
  useEffect(() => {
    const wake = () => {
      if (openRef.current) return;
      setBooting(true);
    };
    window.addEventListener(EV_ORION, wake);
    // hidden: summon by URL — open the site with /#orion
    let t: ReturnType<typeof setTimeout> | undefined;
    if (typeof window !== "undefined" && window.location.hash === "#orion") {
      t = setTimeout(wake, 1400);
    }
    return () => {
      window.removeEventListener(EV_ORION, wake);
      if (t) clearTimeout(t);
    };
  }, []);

  // hidden feature: type "orion" anywhere on the page and the AI wakes —
  // no button, no hint, just the name itself
  useEffect(() => {
    let buf = "";
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-5);
      if (buf === "orion") {
        buf = "";
        if (!openRef.current) window.dispatchEvent(new CustomEvent(EV_ORION));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // the boot sequence resolves on its own, whatever re-registers where
  useEffect(() => {
    if (!booting) return;
    const t = setTimeout(() => {
      setBooting(false);
      setOpen(true);
    }, 950);
    return () => clearTimeout(t);
  }, [booting]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 420);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy, open]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setInput("");
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setBusy(true);
    try {
      const res = await fetch("/api/mind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.filter((m) => m !== GREETING).slice(-10),
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error || "Transmission failed.");
      setMsgs((m) => [...m, { role: "assistant", content: data.reply! }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signal lost.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* boot overlay */}
      <AnimatePresence>
        {booting && (
          <motion.div
            key="orion-boot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[72] grid place-items-center pointer-events-none"
            style={{ background: "rgba(3,2,6,0.5)", backdropFilter: "blur(6px)" }}
          >
            <div className="text-center">
              <motion.p
                initial={{ letterSpacing: "0.9em", opacity: 0 }}
                animate={{ letterSpacing: "0.42em", opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="font-[family-name:var(--font-display)] font-bold text-[clamp(22px,6vw,42px)] flame-text"
              >
                ORION
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.4, 1] }}
                transition={{ duration: 0.8 }}
                className="mt-2 text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-display)] text-[#a99b8e]"
              >
                fastest ai · waking up
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="orion-panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label="ORION AI chat"
            className="fixed z-[71] rounded-[28px] overflow-hidden flex flex-col"
            style={{
              right: "max(16px, env(safe-area-inset-right))",
              left: "max(16px, env(safe-area-inset-left))",
              bottom: "calc(env(safe-area-inset-bottom) + 84px)",
              maxWidth: 384,
              marginLeft: "auto",
              height: "min(540px, 72dvh)",
              background: "linear-gradient(165deg, rgba(18,13,20,0.97), rgba(10,7,12,0.97))",
              border: "1px solid rgba(255,171,105,0.16)",
              boxShadow: "0 30px 90px -20px rgba(0,0,0,0.85), 0 20px 60px -20px rgba(255,120,50,0.25)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* header */}
            <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-[#ffab6916]">
              <span
                className="w-9 h-9 rounded-full grid place-items-center text-[#180c03] shrink-0"
                style={{ background: "linear-gradient(135deg, #ffd9a8, #ff8b3d 60%, #ff5e2b)" }}
                aria-hidden
              >
                <Zap size={17} strokeWidth={2.6} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-display)] font-semibold text-[13px] text-[#f5efe6] leading-tight tracking-[0.08em]">
                  ORION AI
                </p>
                <p className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase font-[family-name:var(--font-display)] text-[#a99b8e]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffc966] inline-block animate-pulse" aria-hidden />
                  fastest ai · online
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="w-8 h-8 rounded-full grid place-items-center border border-white/10 text-[#c9bcae] hover:text-[#f5efe6] transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[86%] rounded-3xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                      m.role === "user" ? "text-[#180c03] rounded-br-lg" : "text-[#e8ddcd] rounded-bl-lg border border-[#ffab691c]"
                    }`}
                    style={
                      m.role === "user"
                        ? { background: "linear-gradient(120deg, #ffb37a, #ff8b3d)" }
                        : { background: "rgba(255,255,255,0.045)" }
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex justify-start">
                  <div
                    className="rounded-3xl rounded-bl-lg border border-[#ffab691c] px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.045)" }}
                    aria-label="ORION is typing"
                  >
                    <span className="flex items-center gap-1.5">
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="w-1.5 h-1.5 rounded-full bg-[#ff8b3d] inline-block"
                          style={{ animation: `mind-bounce 1.2s ${d * 0.18}s ease-in-out infinite` }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              )}

              {error && <p className="text-center text-[11.5px] text-[#c0724a] px-4">{error}</p>}
            </div>

            {/* chips + input */}
            <div className="shrink-0 px-4 pb-4 pt-1 border-t border-[#ffab6916]">
              <div className="flex gap-2 overflow-x-auto pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    onClick={() => send(c)}
                    disabled={busy}
                    className="shrink-0 text-[11px] px-3 py-1.5 rounded-full border border-[#ffab6926] bg-white/[0.03] text-[#c9bcae] hover:border-[#ff8b3d66] hover:text-[#f5efe6] transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {c}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask ORION, sir…"
                  maxLength={400}
                  aria-label="Message ORION AI"
                  className="flex-1 min-w-0 rounded-full bg-white/[0.05] border border-[#ffab691e] px-4 py-3 text-[13.5px] text-[#f5efe6] placeholder:text-[#7a6f66] outline-none focus:border-[#ff8b3d66] transition-colors"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  aria-label="Send message"
                  className="shrink-0 w-11 h-11 rounded-full grid place-items-center text-[#180c03] disabled:opacity-35 transition-opacity cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #ffb37a, #ff5e2b)" }}
                >
                  <SendHorizontal size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
