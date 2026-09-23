"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Radio } from "lucide-react";

/**
 * THE PORTRAIT REEL — the photo lives pinned to the very left corner of the
 * screen. As you scroll into this section it expands until it owns the whole
 * viewport (the copy rides in beside it), and as you keep scrolling it shrinks
 * back to its corner. Scroll-linked, fully reversible, like a film frame.
 * On phones the corner card itself is deliberately huge.
 */

const STATS = [
  { value: "3+", label: "Private missions" },
  { value: "10+", label: "Technologies" },
  { value: "∞", label: "Curiosity" },
];

export default function About() {
  const wrapRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });

  const [dims, setDims] = useState({ vw: 1440, vh: 900, phone: false });
  useEffect(() => {
    const measure = () =>
      setDims({
        vw: window.innerWidth,
        vh: window.innerHeight,
        phone: window.innerWidth < 768,
      });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ── geometry: corner card ↔ full-bleed frame ──────────────
  const phone = dims.phone;
  const smallW = Math.min(dims.vw * (phone ? 0.84 : 0.3), phone ? 480 : 430);
  const smallH = smallW;
  const fullW = dims.vw - (phone ? 16 : 28);
  const fullH = dims.vh - (phone ? 16 : 28);
  const smallX = phone ? 8 : Math.max(18, dims.vw * 0.045); // akdom left corner
  const smallY = phone ? 72 : 92;
  const fullX = phone ? 8 : 14;
  const fullY = phone ? 8 : 14;

  // expand → hold full → shrink → hold corner
  const K = [0, 0.3, 0.62, 0.88, 1];
  const width = useTransform(scrollYProgress, K, [smallW, fullW, fullW, smallW, smallW]);
  const height = useTransform(scrollYProgress, K, [smallH, fullH, fullH, smallH, smallH]);
  const x = useTransform(scrollYProgress, K, [smallX, fullX, fullX, smallX, smallX]);
  const y = useTransform(scrollYProgress, K, [smallY, fullY, fullY, smallY, smallY]);
  const radius = useTransform(
    scrollYProgress,
    K,
    [phone ? 30 : 36, phone ? 24 : 30, phone ? 24 : 30, phone ? 30 : 36, phone ? 30 : 36]
  );

  // caption layers
  const cornerCapOpacity = useTransform(
    scrollYProgress,
    [0, 0.08, 0.2, 0.72, 0.84, 1],
    [1, 1, 0, 0, 1, 1]
  );
  const fullCapOpacity = useTransform(
    scrollYProgress,
    [0.18, 0.3, 0.56, 0.66],
    [0, 1, 1, 0]
  );
  const copyOpacity = useTransform(
    scrollYProgress,
    [0.3, 0.42, 0.56, 0.68],
    [0, 1, 1, 0]
  );
  const copyY = useTransform(scrollYProgress, [0.3, 0.42, 0.68], [26, 0, -18]);
  const chipOpacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.22, 0.8, 0.9, 1],
    [1, 1, 0, 0, 1, 1]
  );
  // slow Ken-Burns settle inside the frame while it expands
  const imgScale = useTransform(scrollYProgress, [0, 0.3, 0.62, 0.88, 1], [1.14, 1.02, 1, 1.06, 1.14]);

  return (
    <section id="about" ref={wrapRef} className="relative h-[360vh]">
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        {/* stage chip — rides above the corner frame, ducks during full-bleed */}
        <motion.div
          style={{ opacity: chipOpacity }}
          className="absolute top-5 left-5 sm:left-8 z-20 pointer-events-none"
        >
          <span className="stage-chip">
            <span className="chip-dot" />
            Stage 01 · Ignition
          </span>
        </motion.div>

        {/* THE FRAME — corner card on both ends of the section, full screen in between */}
        <motion.div
          style={{ width, height, x, y, borderRadius: radius }}
          className="absolute left-0 top-0 z-10 overflow-hidden border border-[#ffab6924] shadow-[0_40px_110px_-24px_rgba(0,0,0,0.9)] will-change-transform"
          data-hover
        >
          <motion.div style={{ scale: imgScale }} className="absolute inset-0 will-change-transform">
            <Image
              src="/meskat.png"
              alt="Portrait of Meskat Alam"
              width={768}
              height={768}
              priority
              className="w-full h-full object-cover"
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#08060a] via-transparent to-transparent opacity-70" />

          {/* corner caption — the card's own little HUD */}
          <motion.div
            style={{ opacity: cornerCapOpacity }}
            className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl glass px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] font-semibold text-[14px] text-[#f5efe6]">
                Meskat Alam
              </p>
              <p className="text-[11px] text-[#a99b8e] tracking-wide truncate">
                offline. — as pictured
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase font-[family-name:var(--font-display)] text-[#ffc966]">
              <Radio size={12} className="animate-pulse" aria-hidden />
              now online
            </span>
          </motion.div>

          {/* full-bleed caption — poster typography (desktop only, the copy
              panel carries the name on phones) */}
          <motion.div
            style={{ opacity: fullCapOpacity }}
            className="hidden md:block absolute bottom-8 left-9 right-9 pointer-events-none"
          >
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#ffc966] font-[family-name:var(--font-display)]">
              the human behind the machines
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] font-bold text-[clamp(34px,5.4vw,74px)] leading-none text-[#f5efe6]">
              Meskat Alam
            </p>
          </motion.div>
        </motion.div>

        {/* copy panel — rides in while the frame owns the screen */}
        <motion.div
          style={{ opacity: copyOpacity, y: copyY }}
          className="absolute z-20 inset-x-4 bottom-6 md:inset-x-auto md:right-[6%] md:top-1/2 md:bottom-auto md:-translate-y-1/2 md:max-w-[430px] pointer-events-none"
        >
          <div className="rounded-[28px] glass p-5 sm:p-7" style={{ background: "rgba(12,8,14,0.6)" }}>
            <div className="hidden md:flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-display)] text-[#ffc966]">
              <Radio size={12} className="animate-pulse" aria-hidden />
              now online
            </div>
            <h2 className="mt-1 font-[family-name:var(--font-display)] font-bold leading-[1.06] tracking-[-0.01em] text-[clamp(24px,4.4vw,40px)] text-[#f5efe6]">
              Driven by curiosity.
              <br />
              <span className="flame-text">Built on precision.</span>
            </h2>
            <p className="mt-4 text-[14.5px] leading-relaxed text-[#c9bcae]">
              I&apos;m Meskat — a developer who bends physics, math and code into interfaces that
              feel alive. I build tools that run entirely in your browser: zero installs, zero
              friction, all craft.
            </p>
            <p className="mt-3 pl-4 border-l-2 border-[#ff8b3d66] text-[13px] italic leading-relaxed text-[#a99b8e]">
              &ldquo;The most powerful technology is the kind that disappears — and leaves only the
              human capability it unlocked.&rdquo;
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-[#ffab6918] bg-white/[0.03] px-3 py-3.5 text-center"
                >
                  <p className="font-[family-name:var(--font-display)] font-bold text-[20px] flame-text leading-none">
                    {s.value}
                  </p>
                  <p className="mt-1.5 text-[10px] tracking-wide text-[#a99b8e]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
