"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, Sparkles } from "lucide-react";

const ROLES = ["Vibe Coder", "Physics Nerd", "Interface Craftsman", "Pixel Physicist"];

function useScrambleRole() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(ROLES[0]);

  useEffect(() => {
    let frame = 0;
    let scrambleRaf = 0;
    const GLYPHS = "!<>-_\\/[]{}—=+*^?#________";
    const next = ROLES[(index + 1) % ROLES.length];

    const hold = setTimeout(() => {
      const total = 26;
      const animate = () => {
        frame++;
        const reveal = Math.floor((frame / total) * next.length);
        let out = next.slice(0, reveal);
        for (let i = reveal; i < next.length; i++) {
          out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        setText(out);
        if (frame < total) {
          scrambleRaf = requestAnimationFrame(animate);
        } else {
          setText(next);
          setIndex((v) => (v + 1) % ROLES.length);
        }
      };
      animate();
    }, 2400);

    return () => {
      clearTimeout(hold);
      cancelAnimationFrame(scrambleRaf);
    };
  }, [index]);

  return text;
}

export default function Hero({ started }: { started: boolean }) {
  const role = useScrambleRole();

  return (
    <section
      id="home"
      className="relative min-h-[100svh] flex flex-col items-center justify-center text-center px-5 pt-24 pb-20"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={started ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="stage-chip"
      >
        <span className="chip-dot" />
        Available for opportunities
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 34 }}
        animate={started ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="mt-7 font-[family-name:var(--font-display)] font-bold leading-[0.95] tracking-[-0.02em] text-[clamp(56px,12vw,140px)]"
      >
        Meskat
        <span className="flame-text"> Alam</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={started ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.24, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 flex items-center gap-2.5 text-[clamp(15px,2.4vw,19px)] text-[#c9bcae] font-[family-name:var(--font-display)] tracking-wide"
      >
        <Sparkles size={16} className="text-[#ffc966]" aria-hidden />
        <span className="tabular-nums min-w-[9ch]" aria-live="polite">
          {role}
        </span>
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={started ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.34, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 max-w-md text-[15px] leading-relaxed text-[#a99b8e]"
      >
        I build browser-native experiences that feel alive — no installs, no friction, just craft.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={started ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.46, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 flex flex-wrap items-center justify-center gap-4"
      >
        <a href="#projects" className="btn-flame">
          View missions
          <span aria-hidden>→</span>
        </a>
        <a href="mailto:contractmeskat@gmail.com?subject=Hello%20Meskat" className="btn-ghost">
          Say hello
        </a>
      </motion.div>

      {/* scroll to ignite */}
      <motion.a
        href="#about"
        initial={{ opacity: 0 }}
        animate={started ? { opacity: 1 } : {}}
        transition={{ delay: 1.1, duration: 1 }}
        className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#a99b8e] hover:text-[#ff8b3d] transition-colors"
        aria-label="Scroll down to ignite the rocket"
      >
        <span className="text-[10px] tracking-[0.42em] uppercase font-[family-name:var(--font-display)]">
          Scroll to ignite
        </span>
        <motion.span
          animate={{ y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <ArrowDown size={16} />
        </motion.span>
      </motion.a>
    </section>
  );
}
