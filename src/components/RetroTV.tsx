"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Power } from "lucide-react";

/**
 * ROCKET·TV — a 1960s mission-control console that never sleeps. A green
 * phosphor CRT where the television hand-types the REAL software a rocket
 * needs to leave Earth: the full TLI burn listing for the Moon, then the
 * Jupiter-assist plot to Uranus, the Voyager-style gravity chain to
 * Neptune and a Hohmann sprint to Mars. Genuine constants, genuine delta-v,
 * genuine transfer times — typed line by line, live. Nothing to press.
 */

interface Program {
  short: string;
  lines: string[]; // typed live
  out: string[];   // printed after RUN
}

const PROGRAMS: Program[] = [
  {
    short: "TLI · EARTH → MOON",
    lines: [
      "// GUIDANCE 01 · TRANS-LUNAR INJECTION",
      "// VEHICLE MA-1 · TARGET: THE MOON",
      "const MU_E   = 398600.4418;  // km3/s2, Earth GM",
      "const R_E    = 6378.137;     // km, equatorial radius",
      "const R_LEO  = R_E + 185;    // parking orbit",
      "const R_MOON = 384400;       // km, lunar distance",
      "",
      "// 1 · state vector from the guidance platform",
      "const sv  = nav.stateVector();",
      "const alt = sv.r.length() - R_E;",
      "assert(alt > 160, 'NOT IN ORBIT');",
      "",
      "// 2 · circular parking speed (vis-viva)",
      "const vPark = Math.sqrt(MU_E / R_LEO);   // 7.79 km/s",
      "",
      "// 3 · transfer ellipse out to the Moon's orbit",
      "const aT = (R_LEO + R_MOON) / 2;",
      "const vT = Math.sqrt(MU_E * (2/R_LEO - 1/aT));",
      "//                                   ≈ 10.92 km/s",
      "",
      "// 4 · the burn the engines must deliver",
      "const dV = vT - vPark;                   // 3.12 km/s",
      "guide.arm({ plan: 'TLI', dV, tol: 0.02 });",
      "",
      "// 5 · wait for the node, then fly it straight",
      "while (!guide.atNode('PROGRADE')) hold();",
      "engine.throttle(100);           // full send",
      "do {",
      "  gimbal.trim(guide.steer('PROGRADE'));",
      "} while (!guide.cutoff(dV));    // MECO ≈ 162 s",
      "",
      "// 6 · coast, midcourse, then get caught",
      "coast(72, 'HOURS');             // free-return",
      "tcm(1, { bPlane: 0.31 });       // aim at the gate",
      "engine.burn('LOI', { dV: 0.82 });",
      "orbit({ body: 'MOON', alt: 92, shape: 'CIRC' });",
      "deploy('CubeSat');              // science first",
    ],
    out: [
      "[OK] TLI BURN · dV 3.12 KM/S · MECO 162 S",
      "[OK] FREE-RETURN ARMED · COAST 72 H",
      "[OK] LOI COMPLETE · 92 KM CIRCULAR",
    ],
  },
  {
    short: "OUA · EARTH → URANUS",
    lines: [
      "// GUIDANCE 02 · OUTER SYSTEM PLOT",
      "// TARGET: URANUS · 19.2 AU · DIRECT = TOO SLOW",
      "const MU_S = 1.32712e11;   // km3/s2, Sun GM",
      "const AU   = 149.6e6;      // km",
      "const R_U  = 19.2 * AU;",
      "",
      "// 1 · the direct shot: a 16-year museum piece",
      "const aDir  = ((1 + 19.2) * AU) / 2;",
      "const T_dir = Math.PI * Math.sqrt(aDir**3 / MU_S);",
      "reject(T_dir > 15 * YEAR); // too slow. next idea.",
      "",
      "// 2 · buy the speed from Jupiter instead",
      "const win = windows.next('E->JUP', { by: '2027-06' });",
      "launch({ window: win, c3: 87.0 }); // km2/s2",
      "",
      "// 3 · thread 570,000 km over the cloud tops",
      "const GA = {",
      "  body: 'JUPITER',",
      "  alt:  570e3,   // km — inside the radiation, worth it",
      "  vInf: 11.2,    // km/s hyperbolic excess",
      "  bend: 96.8,    // deg of free steering",
      "};",
      "tcm(2, target(GA));   // miss < 40 km",
      "flyby(GA);            // +16.0 km/s. gravity pays.",
      "",
      "// 4 · ten quiet years, then arrive",
      "sleep(9.5, 'YEARS');  // science mode: ON",
      "magnetometer(ON);",
      "arrive('URANUS', { year: 2041 });",
      "engine.burn('OI', { dV: 11.7 });",
      "scan({ rings: true, moons: 28 });",
    ],
    out: [
      "[OK] JUPITER ASSIST · +16.0 KM/S FREE",
      "[OK] CRUISE SCIENCE · MAGNETOMETER ON",
      "[OK] URANUS CAPTURE · YEAR 2041",
    ],
  },
  {
    short: "NEP · EARTH → NEPTUNE",
    lines: [
      "// GUIDANCE 03 · BLUE HORIZON",
      "// TARGET: NEPTUNE · 30.1 AU · VOYAGER-2, ON PURPOSE",
      "const MU_S = 1.32712e11;",
      "",
      "// 1 · the alignment that works once per 175 years",
      "const win = windows.next('JJ-SN', { era: '2029-33' });",
      "if (!win) abort('WAIT FOR 2157');   // seriously",
      "plot({ assists: ['JUPITER', 'SATURN'], vInf: 13.8 });",
      "",
      "// 2 · launch, then thread both giants",
      "launch({ year: 2029, c3: 102.9 });",
      "flyby('JUPITER', { alt: 490e3, year: 2030 });",
      "tcm(3, { bias: -0.4 });    // trim for Saturn",
      "flyby('SATURN', {",
      "  alt: 160e3,",
      "  ringSafe: true,          // do not hit the rings",
      "  year: 2031,",
      "});",
      "",
      "// 3 · eight years alone at 17 km/s",
      "cruise({ speed: 17.3, science: 'FULL' });",
      "listen('neptuneRadio', { decrypt: true });",
      "",
      "// 4 · the blue one",
      "arrive('NEPTUNE', { year: 2041, T: 12 });",
      "flyby('TRITON', { alt: 40e3 });  // backwards moon",
      "look('back', { at: 'EARTH', note: 'pale blue dot' });",
    ],
    out: [
      "[OK] JJ CHAIN VERIFIED · MISS < 40 KM",
      "[OK] TRITON FLYBY · CRYO GEYSERS SEEN",
      "[OK] NEPTUNE · 12 YEARS · ONE SHOT",
    ],
  },
  {
    short: "TMI · EARTH → MARS",
    lines: [
      "// GUIDANCE 04 · TRANSMARS INJECTION",
      "// TARGET: MARS · 0.52 AU · WINDOW EVERY 25.6 MO",
      "const MU_S = 1.32712e11;",
      "const R1 = 149.6e6, R2 = 227.9e6;",
      "",
      "// 1 · the Hohmann minimum-energy ellipse",
      "const A = (R1 + R2) / 2;",
      "const T = Math.PI * Math.sqrt(A**3 / MU_S);",
      "//                                    259 days",
      "",
      "// 2 · phasing: Mars must be 44° ahead at T-0",
      "const phase = 180 * (1 - (T/365.25 + 1) ** -1.5);",
      "wait(until('phaseAngle', phase));",
      "",
      "// 3 · escape Earth and go",
      "escape({ c3: 16.4, incl: 23.5 });",
      "engine.burn('TMI', { dV: 3.61, hold: 214 });",
      "",
      "// 4 · 259 quiet days, then seven minutes of fire",
      "coast(259, 'DAYS');",
      "const vEntry = 5.6;   // km/s at the top of the sky",
      "heatshield.face(vEntry);",
      "chute.deploy({ supersonic: true });",
      "retro.burn({ dV: 0.9, touchdown: 'soft' });",
      "home({ msg: 'we made it' });",
    ],
    out: [
      "[OK] TMI · dV 3.61 KM/S · WINDOW NOV 2026",
      "[OK] COAST 259 DAYS · HOHMANN MINIMUM",
      "[OK] TOUCHDOWN · SOFT · MISSION DONE",
    ],
  },
];

export default function RetroTV({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [channel, setChannel] = useState(`CH-01 · ${PROGRAMS[0].short}`);
  const [flash, setFlash] = useState(false);
  const [running, setRunning] = useState(false);
  // hidden channel: double-click/double-tap the tube and CH-00 bleeds through
  const [glitch, setGlitch] = useState(false);
  const lastGlitch = useRef(0);
  const screenTextRef = useRef<HTMLDivElement>(null);

  const tvGlitch = () => {
    const now = Date.now();
    if (now - lastGlitch.current < 3200) return;
    lastGlitch.current = now;
    setGlitch(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.(20);
      } catch {}
    }
    window.setTimeout(() => setGlitch(false), 2600);
  };

  // lock scroll + ESC while the TV is on
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("locked");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("locked");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // the phosphor screen always shows the newest line — long programs scroll
  useEffect(() => {
    const el = screenTextRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  // the typing engine — runs only while the TV is on, loops forever.
  // Driven by requestAnimationFrame (not setTimeout) so browser timer
  // throttling can never make the typing stutter.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let flashTimer: ReturnType<typeof setTimeout>;

    let pi = 0;
    let prog = PROGRAMS[0];
    const st = {
      li: 0,
      ci: 0,
      typed: [] as string[],
      phase: "type" as "type" | "out" | "hold",
      oi: 0,
      pause: 0.6,
      init: false,
    };

    const nextChannel = () => {
      pi = (pi + 1) % PROGRAMS.length;
      prog = PROGRAMS[pi];
      setChannel(`CH-0${pi + 1} · ${prog.short}`);
      setFlash(true);
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => alive && setFlash(false), 260);
      st.li = 0;
      st.ci = 0;
      st.typed.length = 0;
      st.phase = "type";
      st.oi = 0;
      st.pause = 0.55;
      setLines([]);
    };

    const step = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!st.init) {
        // first frame: reset the deck to channel 01 (setState inside the
        // rAF callback, never synchronously in the effect body)
        st.init = true;
        setChannel(`CH-01 · ${PROGRAMS[0].short}`);
        setLines([]);
        return;
      }
      if (st.pause > 0) {
        st.pause -= dt;
        return;
      }
      acc += dt;

      if (st.phase === "type") {
        const line = prog.lines[st.li] ?? "";
        const delay = line === "" ? 0.045 : 0.018 + Math.random() * 0.024;
        let guard = 0;
        while (acc > delay && st.phase === "type" && guard++ < 400) {
          acc -= delay;
          if (st.ci < line.length) {
            st.ci++;
            setLines([...st.typed, line.slice(0, st.ci)]);
          } else {
            st.typed.push(line);
            st.li++;
            st.ci = 0;
            setLines([...st.typed]);
            st.pause = line === "" ? 0.07 : 0.05 + Math.random() * 0.12;
            if (st.li >= prog.lines.length) {
              st.phase = "out";
              st.oi = 0;
              st.pause = 0.45;
              setRunning(true);
            }
            break;
          }
        }
      } else if (st.phase === "out") {
        if (acc > 0.5) {
          acc = 0;
          st.oi++;
          setLines([...prog.lines, "", ...prog.out.slice(0, st.oi)]);
          if (st.oi >= prog.out.length) st.phase = "hold";
        }
      } else if (acc > 3.8) {
        acc = 0;
        setRunning(false);
        nextChannel();
      }
    };

    raf = requestAnimationFrame(step);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(flashTimer);
    };
  }, [open]);

  // open only ever flips true from a client click, so document.body exists
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[92] flex items-center justify-center"
      style={{ background: "rgba(4,2,7,0.78)", backdropFilter: "blur(14px)", padding: "clamp(14px, 4vw, 32px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="ROCKET·TV — live guidance code console"
    >
      {/* close — pinned to the SCREEN corner, never scrolled away, never covered */}
      <button
        onClick={onClose}
        aria-label="Close ROCKET·TV"
        className="absolute top-3 right-3 z-30 w-11 h-11 rounded-full grid place-items-center border border-white/20 bg-[#181018f0] text-[#e8ddcd] hover:text-[#f5efe6] hover:border-[#ff8b3d88] active:scale-95 transition-all cursor-pointer"
        style={{ boxShadow: "0 8px 30px -8px rgba(0,0,0,0.8)" }}
      >
        <X size={18} />
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 26 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[640px]"
        style={{ maxHeight: "calc(100dvh - 88px)", overflowY: "auto", scrollbarWidth: "none" }}
      >
        {/* antenna */}
        <div aria-hidden className="relative mx-auto w-40 h-10 pointer-events-none">
          <span className="absolute left-1/2 bottom-0 w-[3px] h-9 -translate-x-1/2 rounded-full bg-gradient-to-b from-[#8a7466] to-[#5c4c42]" style={{ transform: "translateX(-50%) rotate(-24deg)", transformOrigin: "bottom center" }} />
          <span className="absolute left-1/2 bottom-0 w-[3px] h-9 rounded-full bg-gradient-to-b from-[#8a7466] to-[#5c4c42]" style={{ transform: "translateX(-50%) rotate(22deg)", transformOrigin: "bottom center" }} />
          <span className="absolute left-[8%] top-0 w-2 h-2 rounded-full bg-[#a89384]" />
          <span className="absolute right-[8%] top-0.5 w-2 h-2 rounded-full bg-[#a89384]" />
        </div>

        {/* wooden cabinet */}
        <div
          className="rounded-[34px] p-4 sm:p-6"
          style={{
            background: "linear-gradient(160deg, #6b4f3a 0%, #4e382a 45%, #3a2a20 100%)",
            boxShadow: "0 40px 110px -24px rgba(0,0,0,0.85), inset 0 2px 0 rgba(255,225,190,0.18), inset 0 -3px 8px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,214,170,0.14)",
          }}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* CRT */}
            <div className="relative flex-1 min-w-0">
              <div
                className="relative rounded-[22px] p-3 overflow-hidden"
                style={{
                  background: "linear-gradient(165deg, #241a16, #17100d)",
                  boxShadow: "inset 0 3px 10px rgba(0,0,0,0.8)",
                  border: "1px solid rgba(255,214,170,0.09)",
                }}
              >
                {/* the green screen */}
                <div
                  className="relative h-[300px] sm:h-[330px] rounded-[16px] overflow-hidden"
                  onDoubleClick={tvGlitch}
                  style={{
                    background: "radial-gradient(120% 120% at 50% 42%, #0d3520 0%, #061e11 58%, #030d07 100%)",
                    boxShadow: "inset 0 0 44px rgba(0,0,0,0.75), inset 0 0 12px rgba(64,255,150,0.08)",
                  }}
                >
                  {/* static flash between channels */}
                  <div
                    aria-hidden
                    className="absolute inset-0 z-20 transition-opacity duration-150 pointer-events-none"
                    style={{
                      opacity: flash ? 1 : 0,
                      background:
                        "repeating-linear-gradient(0deg, rgba(120,255,170,0.16) 0 2px, rgba(0,0,0,0.35) 2px 5px)",
                    }}
                  />
                  {/* CH-00 — the lost signal (double-click the tube) */}
                  {glitch && (
                    <div
                      aria-hidden
                      className="absolute inset-0 z-30 pointer-events-none animate-pulse"
                      style={{
                        background:
                          "repeating-linear-gradient(0deg, rgba(160,255,190,0.2) 0 2px, rgba(0,0,0,0.55) 2px 6px)",
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center px-4">
                        <span
                          className="font-mono text-[10px] sm:text-[11px] tracking-[0.28em] text-center"
                          style={{ color: "#d2ffe4", textShadow: "0 0 12px rgba(74,255,160,0.95)" }}
                        >
                          CH-00 · SIGNAL LOST — ORION WAS HERE, SIR
                        </span>
                      </div>
                    </div>
                  )}
                  {/* scanlines */}
                  <div
                    aria-hidden
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                      background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.26) 0 1px, transparent 1px 3px)",
                    }}
                  />
                  {/* rolling refresh band */}
                  <div
                    aria-hidden
                    className="absolute inset-x-0 h-16 pointer-events-none"
                    style={{
                      background: "linear-gradient(180deg, transparent, rgba(120,255,170,0.05), transparent)",
                      animation: "tv-roll 7.5s linear infinite",
                    }}
                  />
                  {/* phosphor text — scrolls so a full program is never cut off */}
                  <div
                    ref={screenTextRef}
                    className="relative z-[5] h-full overflow-y-auto px-3.5 pt-3 pb-2 font-mono [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    style={{ fontSize: "clamp(8.5px, 1.85vw, 11.5px)", lineHeight: 1.55 }}
                  >
                    <div style={{ color: "#aaffd4", textShadow: "0 0 7px rgba(74,255,160,0.6), 0 0 2px rgba(74,255,160,0.9)" }}>
                      {lines.map((l, i) => {
                        const isComment = l.startsWith("//");
                        const isOut = l.startsWith("[");
                        return (
                          <div
                            key={i}
                            style={{
                              color: isOut ? "#e8fff2" : isComment ? "#49b57c" : "#7dffb0",
                              textShadow: isOut
                                ? "0 0 9px rgba(180,255,215,0.75)"
                                : "0 0 7px rgba(74,255,160,0.55)",
                              whiteSpace: "pre",
                            }}
                          >
                            {l || "\u00A0"}
                          </div>
                        );
                      })}
                      {/* blinking block cursor */}
                      <span
                        className="inline-block w-[0.62em] h-[1.05em] align-[-0.18em] ml-0.5"
                        style={{ background: "#7dffb0", boxShadow: "0 0 8px rgba(74,255,160,0.8)", animation: running ? "none" : "cursor-blink 1.05s steps(1) infinite" }}
                      />
                    </div>
                  </div>
                  {/* channel chip + rec */}
                  <div className="absolute left-3 bottom-2.5 z-[6] px-2 py-0.5 rounded-full font-mono text-[9px] tracking-[0.14em] bg-[#03130a99]" style={{ color: "#aaffd4", border: "1px solid rgba(122,255,176,0.3)", textShadow: "0 0 6px rgba(74,255,160,0.6)" }}>
                    {channel}
                  </div>
                  <div className="absolute right-3 bottom-2.5 z-[6] flex items-center gap-1.5 font-mono text-[9px] tracking-[0.18em]" style={{ color: "#ff7d6b", textShadow: "0 0 6px rgba(255,110,90,0.6)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff7d6b] animate-pulse inline-block" />
                    LIVE
                  </div>
                  {/* glass curvature */}
                  <div
                    aria-hidden
                    className="absolute inset-0 z-[7] pointer-events-none rounded-[16px]"
                    style={{ background: "radial-gradient(140% 90% at 30% 12%, rgba(255,255,255,0.09), transparent 42%)" }}
                  />
                </div>
              </div>
            </div>

            {/* side console */}
            <div className="sm:w-[120px] shrink-0 flex sm:flex-col items-center sm:items-stretch justify-between gap-4 py-1">
              <div className="flex sm:justify-end">
                <span className="w-3 h-3 rounded-full" style={{ background: "#63ff9e", boxShadow: "0 0 10px rgba(90,255,150,0.9)", animation: "cursor-blink 2.2s steps(1) infinite" }} aria-hidden />
              </div>
              {/* knobs */}
              <div className="flex sm:flex-col gap-3 items-center">
                {["VOL", "TUN"].map((k) => (
                  <div key={k} className="flex flex-col items-center gap-1">
                    <span
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center"
                      aria-hidden
                      style={{
                        background: "radial-gradient(circle at 34% 30%, #96826f, #4e3d31 68%, #33261e)",
                        boxShadow: "0 3px 7px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,230,200,0.3)",
                        border: "1px solid rgba(255,214,170,0.16)",
                      }}
                    >
                      <span className="w-[2px] h-3 rounded-full bg-[#e8d5c0]" style={{ transform: "rotate(38deg) translateY(-7px)" }} />
                    </span>
                    <span className="text-[8px] tracking-[0.24em] font-mono text-[#c9b39c]">{k}</span>
                  </div>
                ))}
              </div>
              {/* speaker slats */}
              <div className="hidden sm:flex flex-col gap-1.5 flex-1 justify-center" aria-hidden>
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="h-[3px] rounded-full" style={{ background: "rgba(20,12,8,0.75)", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.8), 0 1px 0 rgba(255,220,180,0.08)" }} />
                ))}
              </div>
              {/* brand plate */}
              <div className="text-center">
                <p className="text-[9px] tracking-[0.3em] font-mono text-[#e8d5c0] whitespace-nowrap sm:whitespace-normal">MESKAT VISION</p>
                <p className="text-[7.5px] tracking-[0.2em] font-mono text-[#a8937c] mt-0.5">MODEL-7 · GUIDANCE</p>
              </div>
            </div>
          </div>
        </div>

        {/* feet */}
        <div aria-hidden className="flex justify-between px-10">
          <span className="w-10 h-2.5 rounded-b-xl" style={{ background: "linear-gradient(180deg, #3a2a20, #241811)" }} />
          <span className="w-10 h-2.5 rounded-b-xl" style={{ background: "linear-gradient(180deg, #3a2a20, #241811)" }} />
        </div>

        {/* caption */}
        <p className="mt-4 text-center text-[12px] leading-relaxed text-[#a99b8e] px-4">
          A mission console that never sleeps — it hand-types the code the ship
          actually needs: <span className="text-[#7dffb0] font-mono">Earth → Moon</span> tonight,{" "}
          <span className="text-[#7dffb0] font-mono">Uranus · Neptune · Mars</span> next. Real
          constants, real burns, real arrival years.
        </p>
        <p className="mt-2 mb-1 text-center flex items-center justify-center gap-1.5 text-[10px] tracking-[0.24em] uppercase font-[family-name:var(--font-display)] text-[#7a6f66]">
          <Power size={11} aria-hidden />
          never powered off · est. 1962
        </p>
      </motion.div>

      {/* exit hint */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-full border border-white/10 bg-[#0a0710cc] px-4 py-1.5 text-[9.5px] tracking-[0.26em] uppercase font-[family-name:var(--font-display)] text-[#8a7d72] pointer-events-none">
        tap outside or esc to leave
      </p>
    </div>,
    document.body
  );
}
