"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Github, ArrowUpRight } from "lucide-react";

/* brand marks lucide doesn't ship */
function DiscordIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
    </svg>
  );
}

function XIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

const CARD =
  "group rounded-[28px] glass p-6 sm:p-7 flex items-center gap-4 sm:gap-5 transition-all duration-500 hover:border-[#ff8b3d55] hover:-translate-y-1 min-w-0 max-w-full";
const ICON_FLAME =
  "w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full grid place-items-center bg-gradient-to-br from-[#ffb37a] to-[#ff5e2b] text-[#180c03] transition-transform duration-500 group-hover:scale-110";
const ICON_GHOST =
  "w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full grid place-items-center border border-[#ffab6930] text-[#ffc966] transition-all duration-500 group-hover:bg-[#ffc96614] group-hover:scale-110";
const LABEL =
  "block text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-[#a99b8e] font-[family-name:var(--font-display)]";
const VALUE =
  "block mt-1.5 font-[family-name:var(--font-display)] font-semibold text-[14px] sm:text-[16px] text-[#f5efe6] truncate";

export default function Contact() {
  // easter egg: long-press the tiny footer dot and @DotSeekX introduces itself
  const [dotChip, setDotChip] = useState(false);
  const dotTimer = useRef(0);
  const dotFired = useRef(false);

  // easter egg: tap "Meskat" in the footer 3× fast → the mission credits roll
  const [credits, setCredits] = useState(false);
  const tapRef = useRef<number[]>([]);
  const creditsTap = () => {
    const now = Date.now();
    tapRef.current = [...tapRef.current.filter((t) => now - t < 1600), now];
    if (tapRef.current.length >= 3) {
      tapRef.current = [];
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate?.(25);
        } catch {}
      }
      setCredits(true);
      window.setTimeout(() => setCredits(false), 5200);
    }
  };

  // easter egg: the dot confesses by URL too — open the site with /#dotseekx
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#dotseekx") {
      const t1 = window.setTimeout(() => setDotChip(true), 1200);
      const t2 = window.setTimeout(() => setDotChip(false), 6400);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
  }, []);

  const dotDown = () => {
    dotFired.current = false;
    window.clearTimeout(dotTimer.current);
    dotTimer.current = window.setTimeout(() => {
      dotFired.current = true;
      setDotChip(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate?.(30);
        } catch {}
      }
      window.setTimeout(() => setDotChip(false), 4600);
    }, 850);
  };
  const dotUp = () => window.clearTimeout(dotTimer.current);

  return (
    <section id="contact" className="relative px-5 sm:px-8 pt-28 sm:pt-36 pb-10">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <span className="stage-chip">
            <span className="chip-dot" />
            Stage 04 · Deep space
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 font-[family-name:var(--font-display)] font-bold leading-[1.02] tracking-[-0.01em] text-[clamp(38px,7.5vw,84px)] text-center"
        >
          Let&apos;s build something
          <br />
          <span className="flame-text">real.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: 0.12, duration: 0.8 }}
          className="mt-6 text-center text-[15px] leading-relaxed text-[#a99b8e] max-w-lg mx-auto"
        >
          Have a project in mind, or just want to talk technology, ideas and future
          innovations? Every channel below is open — pick a frequency.
        </motion.p>

        <div className="mt-12 grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {/* email — the primary channel, full width */}
          <motion.a
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.1, duration: 0.8 }}
            href="mailto:contractmeskat@gmail.com?subject=Hello%20Meskat"
            className={`${CARD} sm:col-span-2`}
            aria-label="Email contractmeskat@gmail.com"
          >
            {/* same transparent ghost treatment as every other channel */}
            <span className={ICON_GHOST}>
              <Mail size={22} />
            </span>
            <span className="min-w-0">
              <span className={LABEL}>Email — fastest reply</span>
              <span className={VALUE}>contractmeskat@gmail.com</span>
            </span>
            <ArrowUpRight
              size={18}
              className="ml-auto shrink-0 text-[#a99b8e] group-hover:text-[#ff8b3d] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
            />
          </motion.a>

          <motion.a
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.16, duration: 0.8 }}
            href="https://github.com/axiomdeploy"
            target="_blank"
            rel="noopener noreferrer"
            className={CARD}
            aria-label="GitHub — axiomdeploy"
          >
            <span className={ICON_GHOST}>
              <Github size={22} />
            </span>
            <span className="min-w-0">
              <span className={LABEL}>GitHub</span>
              <span className={VALUE}>@axiomdeploy</span>
            </span>
            <ArrowUpRight
              size={18}
              className="ml-auto shrink-0 text-[#a99b8e] group-hover:text-[#ff8b3d] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
            />
          </motion.a>

          <motion.a
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.22, duration: 0.8 }}
            href="https://discord.com/users/1496966372524167441"
            target="_blank"
            rel="noopener noreferrer"
            className={CARD}
            aria-label="Discord — 1496966372524167441"
          >
            <span className={ICON_GHOST}>
              <DiscordIcon size={22} />
            </span>
            <span className="min-w-0">
              <span className={LABEL}>Discord</span>
              <span className={VALUE}>1496966372524167441</span>
            </span>
            <ArrowUpRight
              size={18}
              className="ml-auto shrink-0 text-[#a99b8e] group-hover:text-[#ff8b3d] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
            />
          </motion.a>

          <motion.a
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.28, duration: 0.8 }}
            href="https://x.com/axiomdeploy"
            target="_blank"
            rel="noopener noreferrer"
            className={CARD}
            aria-label="X — axiomdeploy, handled by the team"
          >
            <span className={ICON_GHOST}>
              <XIcon size={18} />
            </span>
            <span className="min-w-0">
              <span className={LABEL}>X · for projects</span>
              <span className={VALUE}>@axiomdeploy · team</span>
            </span>
            <ArrowUpRight
              size={18}
              className="ml-auto shrink-0 text-[#a99b8e] group-hover:text-[#ff8b3d] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
            />
          </motion.a>

        </div>
        {/* @DotSeekX is intentionally NOT listed — it's the fun account where
            Meskat just scrolls and comments. It's discoverable: the MIND orb
            knows it, the console whispers it, and one tiny dot below leaks it. */}

        {/* footer */}
        <footer className="mt-28 sm:mt-36 border-t border-[#ffab6914]">
          {/* marquee */}
          <div className="py-6 overflow-hidden border-b border-[#ffab6914]" aria-hidden>
            <div className="marquee-track">
              {Array.from({ length: 2 }).map((_, half) => (
                <div key={half} className="flex items-center shrink-0">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-6 px-6 font-[family-name:var(--font-display)] text-[13px] tracking-[0.34em] uppercase text-[#8a7d72]"
                    >
                      Available for opportunities
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff8b3d] inline-block" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] italic text-[#8a7d72]">
              &ldquo;I was going to show you the stars, but you kinda outshine them.&rdquo; — Meskat
            </p>
            {/* the very last thing on the page */}
            <p className="text-[12px] text-[#6f6459] tracking-wide flex items-center gap-2">
              made by{" "}
              <span
                onClick={creditsTap}
                className="cursor-default select-none transition-colors duration-300 hover:text-[#ffc966]"
              >
                Meskat
              </span>{" "}
              · © 2026
              {/* a near-invisible dot for the curious — the personal X.
                  quick tap opens the profile · long-press makes it say hi */}
              <a
                href="https://x.com/DotSeekX"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="You found it — @DotSeekX"
                title="you actually found it · @DotSeekX"
                onClick={(e) => {
                  if (dotFired.current) e.preventDefault();
                }}
                onPointerDown={dotDown}
                onPointerUp={dotUp}
                onPointerLeave={dotUp}
                onPointerCancel={dotUp}
                onContextMenu={(e) => e.preventDefault()}
                className="inline-block w-[5px] h-[5px] rounded-full bg-[#6f6459] opacity-25 hover:opacity-100 hover:bg-[#ffc966] transition-all"
              />
            </p>
          </div>
        </footer>

        {/* easter-egg chip — the dot confesses what it really is */}
        <AnimatePresence>
          {dotChip && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[64] max-w-[92vw] rounded-full border border-[#ffc96644] bg-[#0a0710e6] backdrop-blur-md px-5 py-2.5 text-[11px] tracking-wide font-[family-name:var(--font-display)] text-[#ffc966] whitespace-nowrap"
              style={{ textShadow: "0 0 14px rgba(255,201,102,0.45)" }}
            >
              🛰 you found @DotSeekX — Meskat&apos;s personal account. The fun one.
            </motion.div>
          )}
          {credits && (
            <motion.div
              key="mission-credits"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[64] max-w-[92vw] rounded-2xl border border-[#ffc96644] bg-[#0a0710f2] backdrop-blur-md px-5 py-3 text-center font-[family-name:var(--font-display)]"
              style={{ textShadow: "0 0 14px rgba(255,201,102,0.4)" }}
            >
              <p className="text-[10px] tracking-[0.34em] uppercase text-[#ffc966]">mission credits</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#e9dcc8]">
                hand-coded by Meskat Alam — no templates, no game engines,
                <br className="hidden sm:block" /> every frame on this flight is code.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
