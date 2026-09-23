"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gauge, Lock, ShieldCheck, Radio } from "lucide-react";
import {
  altitudeKm,
  computeJourney,
  formatAltitude,
  STAGE_NAMES,
  ATMOS_LAYERS,
  layerFor,
} from "@/lib/journey";
import { EV_MISSION_CONTROL, EV_PERSONNEL } from "./Nav";

/**
 * MISSION CONTROL — the panel that lives inside the nav insignia.
 * Tap it: live flight telemetry for the journey you are scrolling through
 * (measured physics — velocity and g-force are derived per-frame from the
 * altitude the rocket is actually at). Hold it: LEVEL-5 clearance decrypts
 * the classified personnel file.
 */

const FLIGHT_PLAN = [
  { at: 0, label: "Pad · strongback locked" },
  { at: 1, label: "Ignition · tower clear" },
  { at: 2, label: "Ascent · through the layers" },
  { at: 3, label: "Orbit · station rendezvous" },
  { at: 4, label: "Deep space · planet hopper" },
];

const VEHICLE = [
  ["VEHICLE", "MA-1 · VERMILION CLASS"],
  ["STACK HEIGHT", "70 M"],
  ["ENGINES", "9 × MERLIN-CLASS"],
  ["LIFTOFF THRUST", "7,607 kN"],
  ["PROPELLANT", "LOX / RP-1"],
  ["PAYLOAD", "THIS PORTFOLIO"],
] as const;

function fmtVelocity(kms: number): string {
  const abs = Math.abs(kms);
  if (abs < 1) return `${(abs * 1000).toFixed(0)} m/s`;
  if (abs < 1000) return `${abs.toFixed(1)} km/s`;
  return `${Math.round(abs).toLocaleString("en-US")} km/s`;
}

export default function MissionControl() {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptPct, setDecryptPct] = useState(0);
  const [pendingDecrypt, setPendingDecrypt] = useState(false);
  const decryptRaf = useRef(0);
  const holdRaf = useRef(0);
  const holdStart = useRef(0);
  const holdingRef = useRef(false);
  const holdBarRef = useRef<HTMLDivElement>(null);

  // live telemetry — written straight to the DOM, no re-render storm
  const metRef = useRef<HTMLSpanElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const velRef = useRef<HTMLSpanElement>(null);
  const gRef = useRef<HTMLSpanElement>(null);
  const layerRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLSpanElement>(null);
  const layerRowRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const planRefs = useRef<Array<HTMLSpanElement | null>>([]);

  // physics accumulators (measured, not faked)
  const phys = useRef({ lastKm: 0, lastT: 0, v: 0, a: 0, metStart: -1 });

  useEffect(() => {
    try {
      if (sessionStorage.getItem("ma-clearance") === "1") setUnlocked(true);
    } catch {}

    const openIt = () => setOpen(true);
    const onPersonnel = () => {
      setOpen(true);
      // auto-start the decrypt for the one who earned it
      setPendingDecrypt(true);
    };
    window.addEventListener(EV_MISSION_CONTROL, openIt);
    window.addEventListener(EV_PERSONNEL, onPersonnel);
    return () => {
      window.removeEventListener(EV_MISSION_CONTROL, openIt);
      window.removeEventListener(EV_PERSONNEL, onPersonnel);
    };
  }, []);

  // lock page scroll + ESC while open
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("locked");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("locked");
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // telemetry loop
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now() / 1000;
      const { j, segment } = computeJourney();
      const km = altitudeKm(j);
      const p = phys.current;
      const dt = p.lastT ? Math.min(0.2, Math.max(0.001, now - p.lastT)) : 0.016;

      // measured velocity + acceleration (EMA-smoothed), then g-load
      const instV = (km - p.lastKm) / dt; // km/s
      p.v += (instV - p.v) * 0.12;
      const instA = ((instV - p.v) * 1000) / dt; // m/s²
      p.a += (instA - p.a) * 0.08;
      p.lastKm = km;
      p.lastT = now;

      if (j > 0.1 && p.metStart < 0) p.metStart = now;
      const met = p.metStart < 0 ? 0 : now - p.metStart;
      const mm = String(Math.floor(met / 60)).padStart(2, "0");
      const ss = String(Math.floor(met % 60)).padStart(2, "0");

      if (metRef.current)
        metRef.current.textContent = p.metStart < 0 ? "T–00:00 · HOLD" : `T+${mm}:${ss}`;
      if (pctRef.current) pctRef.current.textContent = `${String(Math.round(j * 100)).padStart(3, "0")}%`;
      if (altRef.current) altRef.current.textContent = formatAltitude(km);
      if (velRef.current) velRef.current.textContent = fmtVelocity(p.v);
      if (gRef.current)
        gRef.current.textContent = km < 600 ? `${(1 + Math.min(30, Math.max(0, p.a)) / 9.81).toFixed(2)} g` : "µG · free fall";
      const layer = layerFor(km);
      if (layerRef.current) layerRef.current.textContent = layer.name;
      if (stageRef.current) stageRef.current.textContent = STAGE_NAMES[segment] ?? "";

      layerRowRefs.current.forEach((el, i) => {
        if (!el) return;
        const active = ATMOS_LAYERS[i].name === layer.name;
        el.style.opacity = active ? "1" : "0.34";
        el.style.color = active ? "#ffc966" : "#8a7d72";
      });
      planRefs.current.forEach((el, i) => {
        if (!el) return;
        const done = i < segment;
        const active = i === segment;
        el.style.opacity = done || active ? "1" : "0.34";
        el.style.color = active ? "#ff8b3d" : done ? "#c9bcae" : "#8a7d72";
      });
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── the classified decrypt ───────────────────────────────────
  const runDecrypt = useCallback(() => {
    setDecrypting(true);
    setDecryptPct(0);
    const t0 = performance.now();
    const DURATION = 2600;
    const step = () => {
      const q = Math.min(1, (performance.now() - t0) / DURATION);
      setDecryptPct(q);
      if (q < 1) {
        decryptRaf.current = requestAnimationFrame(step);
      } else {
        setDecrypting(false);
        setUnlocked(true);
        try {
          sessionStorage.setItem("ma-clearance", "1");
        } catch {}
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate?.([30, 40, 60]);
          } catch {}
        }
      }
    };
    decryptRaf.current = requestAnimationFrame(step);
  }, []);

  // the long-hold trigger fires the same decrypt
  useEffect(() => {
    if (!pendingDecrypt || !open) return;
    setPendingDecrypt(false);
    if (unlocked || decrypting) return;
    runDecrypt();
  }, [pendingDecrypt, open, unlocked, decrypting, runDecrypt]);

  useEffect(() => () => cancelAnimationFrame(decryptRaf.current), []);

  const tickHold = () => {
    if (!holdingRef.current) return;
    const p = Math.min(1, (performance.now() - holdStart.current) / 2200);
    if (holdBarRef.current) holdBarRef.current.style.width = `${p * 100}%`;
    if (p >= 1) {
      holdingRef.current = false;
      runDecrypt();
      return;
    }
    holdRaf.current = requestAnimationFrame(tickHold);
  };
  const startHold = () => {
    if (unlocked || decrypting) return;
    holdingRef.current = true;
    holdStart.current = performance.now();
    cancelAnimationFrame(holdRaf.current);
    holdRaf.current = requestAnimationFrame(tickHold);
  };
  const endHold = () => {
    holdingRef.current = false;
    cancelAnimationFrame(holdRaf.current);
    if (holdBarRef.current) holdBarRef.current.style.width = "0%";
  };
  useEffect(() => () => cancelAnimationFrame(holdRaf.current), []);

  const backToPad = () => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mission-control"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-label="Mission Control — live flight telemetry"
          className="fixed z-[65] rounded-[28px] overflow-hidden flex flex-col mission-scroll"
          style={{
            // desktop: right rail · mobile: bottom sheet
            right: "max(12px, env(safe-area-inset-right))",
            left: "max(12px, env(safe-area-inset-left))",
            bottom: "calc(env(safe-area-inset-bottom) + 12px)",
            top: "auto",
            maxWidth: 420,
            marginLeft: "auto",
            height: "min(640px, 76dvh)",
            background: "linear-gradient(165deg, rgba(16,12,19,0.97), rgba(9,7,12,0.97))",
            border: "1px solid rgba(255,171,105,0.18)",
            boxShadow: "0 34px 100px -20px rgba(0,0,0,0.9), 0 18px 60px -20px rgba(255,120,50,0.28)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* header */}
          <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-[#ffab6916]">
            <span
              className="w-9 h-9 rounded-full grid place-items-center text-[#180c03] shrink-0"
              style={{ background: "linear-gradient(135deg, #ffb37a, #ff5e2b)" }}
              aria-hidden
            >
              <Gauge size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-display)] font-semibold text-[13px] text-[#f5efe6] leading-tight tracking-[0.14em]">
                MISSION CONTROL
              </p>
              <p className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase font-[family-name:var(--font-display)] text-[#a99b8e]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffc966] inline-block animate-pulse" aria-hidden />
                live telemetry · you are the launch author
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close Mission Control"
              className="w-8 h-8 rounded-full grid place-items-center border border-white/10 text-[#c9bcae] hover:text-[#f5efe6] transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
            style={{ scrollbarWidth: "none" }}
          >
            {/* live tiles */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "MET", ref: metRef, wide: false },
                { label: "JOURNEY", ref: pctRef, wide: false },
                { label: "ALTITUDE KM", ref: altRef, wide: false },
                { label: "VELOCITY", ref: velRef, wide: false },
                { label: "LOAD", ref: gRef, wide: false },
                { label: "LAYER", ref: layerRef, wide: false },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-2xl border border-[#ffab691c] bg-white/[0.03] px-2.5 py-2.5 min-w-0"
                >
                  <p className="text-[8.5px] tracking-[0.22em] uppercase text-[#8a7d72] font-[family-name:var(--font-display)] truncate">
                    {tile.label}
                  </p>
                  <span
                    ref={tile.ref}
                    className="block mt-1 text-[11.5px] font-semibold font-[family-name:var(--font-display)] text-[#f5efe6] tabular-nums truncate"
                  >
                    —
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-[#8a7d72] -mt-2">
              Stage · <span ref={stageRef} className="text-[#c9bcae]">LC-39A</span> — velocity and load
              are measured from the altitude curve in real time. Real math, live.
            </p>

            {/* flight plan */}
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#a99b8e] font-[family-name:var(--font-display)] mb-2.5">
                Flight plan
              </p>
              <div className="space-y-1.5">
                {FLIGHT_PLAN.map((s, i) => (
                  <div key={s.label} className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" style={{ color: "inherit" }} />
                    <span
                      ref={(el) => {
                        planRefs.current[i] = el;
                      }}
                      className="text-[12.5px] font-[family-name:var(--font-display)] transition-colors"
                      style={{ color: "#8a7d72", opacity: 0.34 }}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* atmosphere stack */}
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#a99b8e] font-[family-name:var(--font-display)] mb-2.5">
                Atmosphere stack · live
              </p>
              <div className="rounded-2xl border border-[#ffab691c] divide-y divide-[#ffab690f] overflow-hidden">
                {ATMOS_LAYERS.map((l, i) => (
                  <div key={l.name} className="flex items-center justify-between px-3.5 py-2 gap-3">
                    <span
                      ref={(el) => {
                        layerRowRefs.current[i] = el;
                      }}
                      className="text-[11.5px] tracking-[0.12em] font-[family-name:var(--font-display)] transition-colors"
                      style={{ color: "#8a7d72", opacity: 0.34 }}
                    >
                      {l.name}
                    </span>
                    <span className="text-[9.5px] text-[#8a7d72] text-right shrink-0">
                      {l.range} <span className="hidden sm:inline">· {l.note}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* vehicle sheet */}
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#a99b8e] font-[family-name:var(--font-display)] mb-2.5">
                Vehicle data sheet
              </p>
              <div className="rounded-2xl border border-[#ffab691c] overflow-hidden">
                {VEHICLE.map(([k, v], i) => (
                  <div
                    key={k}
                    className={`flex items-center justify-between px-3.5 py-2 gap-3 ${i > 0 ? "border-t border-[#ffab690f]" : ""}`}
                  >
                    <span className="text-[10px] tracking-[0.18em] text-[#8a7d72] font-[family-name:var(--font-display)]">
                      {k}
                    </span>
                    <span className="text-[11.5px] text-[#e8ddcd] font-[family-name:var(--font-display)] text-right">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[11px] italic leading-relaxed text-[#a99b8e]">
                Reminder: none of this is footage. The vehicle outside is hand-written
                JavaScript and Three.js — every flame, bolt and shock diamond.
              </p>
            </div>

            {/* classified personnel file */}
            <div className="rounded-2xl border border-[#ffc96630] bg-[#ffc96606] overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[#ffc96618]">
                <Lock size={12} className="text-[#ffc966] shrink-0" aria-hidden />
                <p className="text-[10px] tracking-[0.26em] uppercase font-[family-name:var(--font-display)] text-[#ffc966]">
                  Personnel file · level 5 clearance
                </p>
              </div>

              {!unlocked ? (
                <div className="px-3.5 py-3.5">
                  {decrypting ? (
                    <div>
                      <p className="text-[11px] tracking-[0.14em] text-[#c9bcae] font-[family-name:var(--font-display)] tabular-nums">
                        DECRYPTING PERSONNEL FILE… {Math.round(decryptPct * 100)}%
                      </p>
                      <div className="mt-2.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${decryptPct * 100}%`,
                            background: "linear-gradient(90deg, #ffb37a, #ffc966)",
                            boxShadow: "0 0 12px rgba(255,201,102,0.8)",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onPointerDown={startHold}
                      onPointerUp={endHold}
                      onPointerLeave={endHold}
                      onPointerCancel={endHold}
                      className="w-full text-left cursor-pointer touch-none group"
                    >
                      <p className="text-[11.5px] leading-relaxed text-[#a99b8e]">
                        Clearance is earned, not given. <span className="text-[#e8ddcd]">Press and hold</span> to
                        force the lock — exactly like a real client would have to.
                      </p>
                      <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          ref={holdBarRef}
                          className="h-full rounded-full w-0"
                          style={{
                            background: "linear-gradient(90deg, #ffb37a, #ffc966)",
                            boxShadow: "0 0 12px rgba(255,201,102,0.8)",
                          }}
                        />
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-[9.5px] tracking-[0.22em] uppercase text-[#8a7d72] font-[family-name:var(--font-display)]">
                        <ShieldCheck size={11} className="text-[#ffc966]" aria-hidden />
                        hold 2 seconds to decrypt
                      </p>
                    </button>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-3.5 py-3.5 space-y-2.5"
                >
                  <p className="flex items-center gap-1.5 text-[9.5px] tracking-[0.26em] uppercase text-[#ffc966] font-[family-name:var(--font-display)]">
                    <ShieldCheck size={12} aria-hidden />
                    clearance granted · welcome aboard
                  </p>
                  {[
                    ["CALLSIGN", "MESKAT ALAM"],
                    ["BORN", "26 MARCH 2007"],
                    ["SCHOOL", "Dhanmondi Govt. Boy's High School — one of the best government schools in Bangladesh"],
                    ["COLLEGE", "Govt. Laboratory High School & College"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-3 items-baseline">
                      <span className="text-[9px] tracking-[0.2em] text-[#8a7d72] font-[family-name:var(--font-display)] w-[62px] shrink-0 pt-0.5">
                        {k}
                      </span>
                      <span className="text-[12px] leading-relaxed text-[#e8ddcd] font-[family-name:var(--font-display)]">
                        {v}
                      </span>
                    </div>
                  ))}
                  <p className="text-[10px] italic text-[#8a7d72] pt-1">
                    Filed quietly. If a client asks, this file exists — and now you have read it.
                  </p>
                </motion.div>
              )}
            </div>

            {/* actions */}
            <div className="flex items-center gap-2.5 pb-1">
              <button
                type="button"
                onClick={backToPad}
                className="flex-1 rounded-full py-2.5 text-[12px] font-semibold font-[family-name:var(--font-display)] text-[#180c03]"
                style={{ background: "linear-gradient(120deg, #ffb37a, #ff8b3d)" }}
              >
                Return to pad
              </button>
              <a
                href="mailto:contractmeskat@gmail.com?subject=Mission%20inquiry"
                className="flex-1 rounded-full py-2.5 text-center text-[12px] font-medium font-[family-name:var(--font-display)] text-[#e8ddcd] border border-[#ffab6930] hover:border-[#ff8b3d66] transition-colors"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Radio size={12} aria-hidden />
                  Hire mission control
                </span>
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
