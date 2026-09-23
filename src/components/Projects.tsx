"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Lock, ShieldAlert, Mail, Check, Copy, X, Timer, Activity, Tv } from "lucide-react";
import SystemScan from "@/components/SystemScan";
import RetroTV from "@/components/RetroTV";

interface Mission {
  num: string;
  name: string;
  status: string;
  teaser: string;
  tags: string[];
}

const EMAIL = "contractmeskat@gmail.com";

const MISSIONS: Mission[] = [
  {
    num: "01",
    name: "Nano Bleam",
    status: "Completed · 2025",
    teaser: "A browser-native PDF annotation layer — highlights, freehand drawing and a laser pointer mode. Zero installs, runs entirely in-tab.",
    tags: ["Canvas API", "JS", "PDF"],
  },
  {
    num: "02",
    name: "Annotation Bookmarklet",
    status: "Completed · 2025",
    teaser: "Injects a full annotation layer into any webpage via bookmarklet — physics laser trails, freehand ink and a focus timer, no extension required.",
    tags: ["Bookmarklet", "Canvas", "Physics"],
  },
  {
    num: "03",
    name: "Pomodoro Flow",
    status: "In orbit · 2026",
    teaser: "An adaptive focus timer designed for neurodivergent minds — flexible intervals, visual progress cues and a distraction-free interface.",
    tags: ["React", "Timer", "UX"],
  },
];

/* redacted dossier lines shown on the locked cards */
const REDACT_WIDTHS = ["86%", "64%", "73%"];

function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current!;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.transform = `perspective(900px) rotateY(${(px - 0.5) * 7}deg) rotateX(${(0.5 - py) * 7}deg) translateY(-4px)`;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current!;
    el.style.transform = "perspective(900px) rotateY(0) rotateX(0) translateY(0)";
  };

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="tilt-card h-full">
      {children}
    </div>
  );
}

export default function Projects() {
  const [requested, setRequested] = useState<Mission | null>(null);
  const [copied, setCopied] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [tvOpen, setTvOpen] = useState(false);

  // lock page scroll while the clearance modal is open
  useEffect(() => {
    if (!requested) return;
    document.body.classList.add("locked");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRequested(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("locked");
      window.removeEventListener("keydown", onKey);
    };
  }, [requested]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  };

  const accessMailto = (m: Mission) =>
    `mailto:${EMAIL}?subject=${encodeURIComponent(`Access Request — ${m.name}`)}&body=${encodeURIComponent(
      `Hi Meskat,\n\nI found "${m.name}" on your portfolio and I'd love to see it in action. Could you grant me access?\n\n— `
    )}`;

  return (
    <section id="projects" className="relative px-5 sm:px-8 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <span className="stage-chip">
            <span className="chip-dot" />
            Stage 03 · Orbit
          </span>
        </motion.div>

        <div className="mt-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
            className="font-[family-name:var(--font-display)] font-bold leading-[1.05] text-[clamp(30px,5vw,52px)]"
          >
            Missions
            <span className="flame-text"> flown.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.8 }}
            className="text-[13px] text-[#a99b8e] font-[family-name:var(--font-display)] tracking-wide"
          >
            Private repository · access on request
          </motion.p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-6 gap-5">
          {MISSIONS.map((m, i) => (
            <motion.article
              key={m.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="h-full lg:col-span-2"
            >
              <TiltCard>
                <button
                  type="button"
                  onClick={() => setRequested(m)}
                  aria-label={`${m.name} — private mission, request access`}
                  className="flex flex-col h-full w-full text-left rounded-[28px] glass p-6 group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-[family-name:var(--font-display)] text-[12px] tracking-[0.25em] text-[#a99b8e]">
                      {m.num}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full border border-[#ffab6924] bg-[#ff8b3d0a] px-2.5 py-1 text-[9px] tracking-[0.22em] uppercase font-[family-name:var(--font-display)] text-[#ffc966]">
                      <Lock size={10} aria-hidden />
                      Private
                    </span>
                  </div>
                  <h3 className="mt-5 font-[family-name:var(--font-display)] font-bold text-[20px] text-[#f5efe6] leading-snug">
                    {m.name}
                  </h3>
                  <p className="mt-1 text-[11px] tracking-[0.14em] uppercase text-[#ffc966] font-[family-name:var(--font-display)]">
                    {m.status}
                  </p>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-[#a99b8e]">{m.teaser}</p>

                  {/* redacted payload — the details stay sealed */}
                  <div className="mt-4 flex-1 rounded-2xl border border-[#ffab691a] bg-white/[0.02] p-4 space-y-2.5" aria-hidden>
                    {REDACT_WIDTHS.map((w, ri) => (
                      <div key={ri} className="relative overflow-hidden rounded-full bg-white/[0.07]" style={{ height: 9, width: w }}>
                        <motion.div
                          className="absolute inset-y-0 -left-1/2 w-1/2"
                          style={{
                            background:
                              "linear-gradient(90deg, transparent, rgba(255,171,105,0.16), transparent)",
                          }}
                          animate={{ x: ["0%", "320%"] }}
                          transition={{ duration: 2.6, delay: ri * 0.5, repeat: Infinity, ease: "linear" }}
                        />
                      </div>
                    ))}
                    <div className="pt-1 flex items-center gap-1.5 text-[9.5px] tracking-[0.24em] uppercase font-[family-name:var(--font-display)] text-[#7a6f66]">
                      <ShieldAlert size={11} className="text-[#ff8b3d99]" aria-hidden />
                      Payload sealed
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {m.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] px-3 py-1.5 rounded-full border border-[#ffab691e] bg-white/[0.03] text-[#c9bcae]"
                      >
                        {t}
                      </span>
                    ))}
                    <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-[family-name:var(--font-display)] text-[#ff8b3d] opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                      Unlock
                      <Lock size={11} />
                    </span>
                  </div>
                </button>
              </TiltCard>
            </motion.article>
          ))}

          {/* SYS·SCAN — the one live mission anyone can open right now */}
          <motion.article
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.24, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="h-full sm:col-span-2 lg:col-span-4"
          >
            <TiltCard>
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                aria-label="SYS·SCAN — open the live device telemetry deck"
                className="flex flex-col h-full w-full text-left rounded-[28px] glass p-6 group cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <span className="font-[family-name:var(--font-display)] text-[12px] tracking-[0.25em] text-[#a99b8e]">
                    04
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-[#ffc96650] bg-[#ffc9660f] px-2.5 py-1 text-[9px] tracking-[0.22em] uppercase font-[family-name:var(--font-display)] text-[#ffc966]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffc966] animate-pulse inline-block" aria-hidden />
                    Live · open now
                  </span>
                </div>
                <div className="mt-5 flex flex-col md:flex-row md:items-end gap-5 flex-1">
                  <div className="md:max-w-[46%]">
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-[22px] text-[#f5efe6] leading-snug">
                      SYS·SCAN
                    </h3>
                    <p className="mt-1 text-[11px] tracking-[0.14em] uppercase text-[#ffc966] font-[family-name:var(--font-display)]">
                      Live telemetry deck · 2026
                    </p>
                    <p className="mt-3 text-[13.5px] leading-relaxed text-[#a99b8e]">
                      The only mission with an open hatch — tap it and it reads YOUR device in real
                      time: CPU threads and frame pacing, memory pressure, storage quota, battery,
                      GPU silicon, uplink. Right here, right now, nothing leaves your machine.
                    </p>
                  </div>
                  {/* live readout preview strip */}
                  <div className="flex-1 rounded-2xl border border-[#ffab691e] bg-white/[0.02] p-4 grid grid-cols-3 gap-3 min-w-0" aria-hidden>
                    {[
                      ["CPU", "threads"],
                      ["RAM", "heap"],
                      ["GPU", "silicon"],
                    ].map(([k, v], i) => (
                      <div key={k} className="min-w-0">
                        <p className="font-[family-name:var(--font-display)] font-bold text-[18px] flame-text tabular-nums">
                          {i === 0 ? "8×" : i === 1 ? "2.1G" : "RT"}
                        </p>
                        <p className="text-[9.5px] tracking-[0.2em] uppercase text-[#7a6f66] font-[family-name:var(--font-display)]">{v}</p>
                      </div>
                    ))}
                    <div className="col-span-3 flex items-center gap-1.5 text-[9.5px] tracking-[0.24em] uppercase font-[family-name:var(--font-display)] text-[#ffc966]">
                      <Activity size={11} aria-hidden />
                      real readings load when you run the scan
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {["Realtime", "Web APIs", "Telemetry"].map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-[#ffab691e] bg-white/[0.03] text-[#c9bcae]"
                    >
                      {t}
                    </span>
                  ))}
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-[family-name:var(--font-display)] text-[#ff8b3d] opacity-100 md:opacity-0 md:-translate-x-1 transition-all duration-300 md:group-hover:opacity-100 md:group-hover:translate-x-0">
                    Run scan
                    <Activity size={12} />
                  </span>
                </div>
              </button>
            </TiltCard>
          </motion.article>

          {/* ROCKET·TV — the second open mission: a console that types real guidance code */}
          <motion.article
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="h-full sm:col-span-2 lg:col-span-2"
          >
            <TiltCard>
              <button
                type="button"
                onClick={() => setTvOpen(true)}
                aria-label="ROCKET·TV — open the live guidance code console"
                className="flex flex-col h-full w-full text-left rounded-[28px] glass p-6 group cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <span className="font-[family-name:var(--font-display)] text-[12px] tracking-[0.25em] text-[#a99b8e]">
                    05
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-[#7dffb040] bg-[#7dffb00d] px-2.5 py-1 text-[9px] tracking-[0.22em] uppercase font-[family-name:var(--font-display)] text-[#7dffb0]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7dffb0] animate-pulse inline-block" aria-hidden />
                    Live · open now
                  </span>
                </div>
                {/* mini CRT preview */}
                <div
                  className="mt-5 rounded-2xl p-3 h-[74px] overflow-hidden relative"
                  style={{
                    background: "radial-gradient(120% 130% at 50% 40%, #0d3520, #061e11 62%, #030d07)",
                    border: "1px solid rgba(125,255,176,0.16)",
                  }}
                  aria-hidden
                >
                  <p className="font-mono text-[10px] leading-relaxed" style={{ color: "#7dffb0", textShadow: "0 0 6px rgba(74,255,160,0.55)" }}>
                    {"> burn({ dV: 3.12, dir: PROGRADE })"}
                    <span className="inline-block w-[7px] h-[11px] align-middle ml-1" style={{ background: "#7dffb0", animation: "cursor-blink 1.05s steps(1) infinite" }} />
                  </p>
                  <p className="font-mono text-[9px] mt-1" style={{ color: "#49b57c" }}>{"// EARTH → MOON · 384,400 KM"}</p>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.24) 0 1px, transparent 1px 3px)" }}
                  />
                </div>
                <h3 className="mt-5 font-[family-name:var(--font-display)] font-bold text-[20px] text-[#f5efe6] leading-snug">
                  ROCKET·TV
                </h3>
                <p className="mt-1 text-[11px] tracking-[0.14em] uppercase text-[#ffc966] font-[family-name:var(--font-display)]">
                  Live mission console · 2026
                </p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-[#a99b8e] flex-1">
                  A green-phosphor television from the mission-control era that
                  hand-types real guidance code on loop — Earth → Moon tonight,
                  Mars, Uranus and Neptune next. Genuine delta-v, genuine
                  transfer times, typed live. Nothing to press. Just watch.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {["Live", "Guidance code", "Auto-typing"].map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-[#ffab691e] bg-white/[0.03] text-[#c9bcae]"
                    >
                      {t}
                    </span>
                  ))}
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-[family-name:var(--font-display)] text-[#7dffb0]">
                    Watch
                    <Tv size={12} />
                  </span>
                </div>
              </button>
            </TiltCard>
          </motion.article>

          {/* next mission CTA */}
          <motion.article
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.36, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="h-full sm:col-span-2 lg:col-span-6"
          >
            <TiltCard>
              <a
                href={`mailto:${EMAIL}?subject=${encodeURIComponent("Project Inquiry")}`}
                className="flex flex-col sm:flex-row sm:items-center rounded-[28px] p-6 group border border-dashed border-[#ff8b3d40] bg-gradient-to-b from-[#ff8b3d0d] to-transparent hover:border-[#ff8b3d80] transition-colors"
                aria-label="Start a new mission with Meskat"
              >
                <span className="font-[family-name:var(--font-display)] text-[12px] tracking-[0.25em] text-[#a99b8e] sm:mr-8">
                  06
                </span>
                <span className="mt-5 sm:mt-0 sm:mr-8 w-12 h-12 shrink-0 rounded-full grid place-items-center bg-gradient-to-br from-[#ffb37a] to-[#ff5e2b] text-[#180c03] transition-transform duration-500 group-hover:rotate-90 group-hover:scale-110">
                  <Plus size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-[20px] text-[#f5efe6] leading-snug">
                    Mission 06 — yours.
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[#a99b8e]">
                    Have something in mind? Let&apos;s plot the trajectory and build it together.
                  </p>
                </div>
                <span className="mt-5 sm:mt-0 inline-flex items-center gap-1.5 text-[13px] font-[family-name:var(--font-display)] text-[#ff8b3d] whitespace-nowrap">
                  Start transmission
                </span>
              </a>
            </TiltCard>
          </motion.article>
        </div>
      </div>

      {/* ROCKET·TV — live guidance code console */}
      <RetroTV open={tvOpen} onClose={() => setTvOpen(false)} />

      {/* SYS·SCAN telemetry deck */}
      <SystemScan open={scanOpen} onClose={() => setScanOpen(false)} />

      {/* clearance modal — the only way in is a mail to Meskat */}
      <AnimatePresence>
        {requested && (
          <motion.div
            key="clearance-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[85] flex items-center justify-center"
            style={{
              background: "rgba(4,2,7,0.66)",
              backdropFilter: "blur(14px)",
              padding: "clamp(16px, 5vw, 32px)",
            }}
            onClick={() => setRequested(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${requested.name} — clearance required`}
          >
            <motion.div
              key="clearance-card"
              initial={{ opacity: 0, scale: 0.88, y: 26 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 18 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[480px] rounded-[32px] glass overflow-hidden"
              style={{
                boxShadow: "0 40px 120px -30px rgba(255,139,61,0.35)",
                padding: "clamp(22px, 4.5vw, 36px)",
                maxHeight: "86dvh",
                overflowY: "auto",
              }}
            >
              <div
                aria-hidden
                className="absolute -top-24 -right-20 w-64 h-64 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(255,139,61,0.18), transparent 70%)" }}
              />

              <button
                onClick={() => setRequested(null)}
                aria-label="Close clearance dialog"
                className="absolute top-5 right-5 w-10 h-10 rounded-full grid place-items-center border border-white/15 text-[#c9bcae] hover:text-[#f5efe6] hover:border-[#ff8b3d66] transition-colors"
              >
                <X size={17} />
              </button>

              <div className="flex items-center gap-2.5">
                <span className="w-11 h-11 rounded-full grid place-items-center bg-gradient-to-br from-[#ffb37a] to-[#ff5e2b] text-[#180c03]">
                  <Lock size={17} strokeWidth={2.4} />
                </span>
                <span className="text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-display)] text-[#ffc966]">
                  Clearance required
                </span>
              </div>

              <h3 className="mt-6 font-[family-name:var(--font-display)] font-bold text-[clamp(24px,5vw,30px)] leading-tight text-[#f5efe6]">
                {requested.name} is a
                <br />
                <span className="flame-text">private mission.</span>
              </h3>

              <p className="mt-4 text-[14px] leading-relaxed text-[#c9bcae]">
                The source, the demo and the flight logs are sealed. There is no public link —
                the only way in is a direct transmission to Meskat. Ask, and he&apos;ll
                personally grant you access.
              </p>

              <div className="mt-6 rounded-2xl border border-[#ffab691e] bg-white/[0.02] p-4 space-y-2.5" aria-hidden>
                {["82%", "58%", "70%"].map((w, ri) => (
                  <div key={ri} className="rounded-full bg-white/[0.06] blur-[3px]" style={{ height: 8, width: w }} />
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-3">
                <a
                  href={accessMailto(requested)}
                  className="btn-flame justify-center"
                  aria-label={`Email ${EMAIL} to request access to ${requested.name}`}
                >
                  <Mail size={16} aria-hidden />
                  Request access by email
                </a>
                <button type="button" onClick={copyEmail} className="btn-ghost justify-center cursor-pointer">
                  {copied ? <Check size={16} className="text-[#ffc966]" aria-hidden /> : <Copy size={16} aria-hidden />}
                  {copied ? "Email copied" : `Copy ${EMAIL}`}
                </button>
              </div>

              <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] tracking-wide text-[#7a6f66]">
                <Timer size={12} aria-hidden />
                Usually replies within 24 hours
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
