"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Rocket } from "lucide-react";
import { EV_ORION } from "@/components/MindSystem";

const LINKS = [
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "Contact", href: "#contact" },
];

const HOLD_MS = 2200; // hold the insignia this long to force a clearance decrypt

export const EV_MISSION_CONTROL = "ma:mission-control";
export const EV_PERSONNEL = "ma:personnel";

export default function Nav() {
  const [open, setOpen] = useState(false);
  // once the visitor scrolls, the wordmark collapses — the name is a hero
  // moment, not a sticky billboard
  const [scrolled, setScrolled] = useState(false);

  // hold-to-decrypt state (the classified personnel file easter egg)
  const holdRaf = useRef(0);
  const holdStart = useRef(0);
  const holdingRef = useRef(false);
  const firedRef = useRef(false);
  const ringRef = useRef<SVGCircleElement>(null);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(holdRaf.current);
    },
    []
  );

  const tickHold = () => {
    if (!holdingRef.current) return;
    const p = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS);
    if (ringRef.current) {
      ringRef.current.style.strokeDashoffset = String(126 * (1 - p));
      ringRef.current.style.opacity = p > 0.03 ? "1" : "0";
    }
    if (p >= 1 && !firedRef.current) {
      firedRef.current = true;
      holdingRef.current = false;
      setHolding(false);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate?.(60);
        } catch {}
      }
      window.dispatchEvent(new CustomEvent(EV_PERSONNEL));
      return;
    }
    holdRaf.current = requestAnimationFrame(tickHold);
  };

  const startHold = (e: React.PointerEvent) => {
    // right-click / multi-touch should never start a decrypt
    if (e.button === 2) return;
    holdingRef.current = true;
    firedRef.current = false;
    holdStart.current = performance.now();
    setHolding(true);
    cancelAnimationFrame(holdRaf.current);
    holdRaf.current = requestAnimationFrame(tickHold);
  };

  const cancelHold = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    cancelAnimationFrame(holdRaf.current);
    if (ringRef.current) ringRef.current.style.opacity = "0";
  };

  const onClick = () => {
    if (firedRef.current) {
      // the press just finished a long-hold decrypt — swallow the click
      firedRef.current = false;
      return;
    }
    // the rocket button wakes ORION AI — nothing else is needed
    window.dispatchEvent(new CustomEvent(EV_ORION));
  };

  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-5 sm:px-8 pt-4"
    >
      <nav
        className="mx-auto max-w-5xl flex items-center justify-between rounded-full pl-6 pr-2.5 py-2.5 bg-transparent"
        aria-label="Primary"
      >
        <button
          type="button"
          onClick={onClick}
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onContextMenu={(e) => e.preventDefault()}
          className="flex items-center gap-2.5 group cursor-pointer select-none touch-none"
          aria-label="ORION AI — tap the rocket to wake the fastest AI on this site · hold 2s to decrypt a classified personnel file"
          title="ORION AI — tap to talk · hold 2s to decrypt"
        >
          <span className="relative w-8 h-8 rounded-full grid place-items-center bg-gradient-to-br from-[#ffb37a] to-[#ff5e2b] text-[#180c03] transition-transform duration-500 group-hover:rotate-[20deg] group-active:scale-95">
            <Rocket size={15} strokeWidth={2.4} />
            {/* clearance charge ring — fills while the visitor holds */}
            <svg
              aria-hidden
              className="pointer-events-none absolute -inset-[5px] -rotate-90"
              viewBox="0 0 48 48"
            >
              <circle
                ref={ringRef}
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="#ffc966"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="126"
                strokeDashoffset="126"
                style={{ opacity: 0, filter: "drop-shadow(0 0 6px rgba(255,201,102,0.9))", transition: "opacity 200ms" }}
              />
            </svg>
          </span>
          <span
            aria-hidden={scrolled}
            className="font-[family-name:var(--font-display)] font-semibold tracking-[0.18em] text-[13px] text-[#f5efe6] transition-all duration-500 ease-out overflow-hidden whitespace-nowrap"
            style={{
              textShadow: "0 1px 14px rgba(0,0,0,0.75)",
              opacity: scrolled ? 0 : 1,
              maxWidth: scrolled ? 0 : 160,
              transform: scrolled ? "translateX(-6px)" : "translateX(0)",
            }}
          >
            MESKAT <span className="text-[#ff8b3d]">ALAM</span>
          </span>
        </button>

        {/* desktop links */}
        <div
          className="hidden md:flex items-center gap-1 rounded-full px-1 py-1"
          style={{ textShadow: "0 1px 12px rgba(0,0,0,0.7)" }}
        >
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-4 py-2 rounded-full text-[13px] font-[family-name:var(--font-display)] tracking-wide text-[#c9bcae] hover:text-[#f5efe6] hover:bg-white/5 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="mailto:contractmeskat@gmail.com?subject=Hello%20Meskat"
            className="ml-3 px-5 py-2 rounded-full text-[13px] font-semibold font-[family-name:var(--font-display)] text-[#180c03] bg-gradient-to-r from-[#ffb37a] to-[#ff7a2e] hover:shadow-[0_6px_24px_-6px_rgba(255,110,40,0.7)] transition-shadow"
          >
            Hire me
          </a>
        </div>

        {/* mobile burger */}
        <button
          className="md:hidden w-10 h-10 rounded-full grid place-items-center border border-white/15 text-[#f5efe6]"
          style={{ textShadow: "none", background: "rgba(8,6,10,0.35)" }}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={17} /> : <Menu size={17} />}
        </button>
      </nav>

      {/* mobile dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="md:hidden mx-auto max-w-5xl mt-2 rounded-3xl glass overflow-hidden"
          >
            <div className="flex flex-col p-3">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="px-5 py-3.5 rounded-2xl text-[15px] font-[family-name:var(--font-display)] text-[#e8ddcd] hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="mailto:contractmeskat@gmail.com?subject=Hello%20Meskat"
                className="mt-2 px-5 py-3.5 rounded-2xl text-center text-[15px] font-semibold font-[family-name:var(--font-display)] text-[#180c03] bg-gradient-to-r from-[#ffb37a] to-[#ff7a2e]"
              >
                Hire me
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* subtle hint while a hold is in progress */}
      <AnimatePresence>
        {holding && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="pointer-events-none fixed left-1/2 -translate-x-1/2 top-[72px] z-50 rounded-full px-4 py-1.5 text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-display)] text-[#ffc966] border border-[#ffc96644] bg-[#0a0710cc] backdrop-blur-md"
            style={{ textShadow: "0 0 12px rgba(255,201,102,0.5)" }}
          >
            decrypting clearance…
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
