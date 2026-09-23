"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MousePointer2, Hand, X, Orbit } from "lucide-react";

interface Skill {
  name: string;
  category: "Core" | "Visual" | "Mind" | "Tools";
  level: number;
  blurb: string;
  detail: string;
  ring: 0 | 1 | 2;
  angle: number;
  featured?: boolean; // the skill that IS this website
}

const CATEGORY_COLOR: Record<Skill["category"], string> = {
  Core: "#ff8b3d",
  Visual: "#ffc966",
  Mind: "#ff5e2b",
  Tools: "#e8d5c0",
};

const SKILLS: Skill[] = [
  { name: "JavaScript", category: "Core", level: 95, featured: true, blurb: "No framework. No game engine. No template. The rocket that just ignited behind this panel is plain JavaScript — you are not reading my portfolio, you are flying it.", detail: "Flight log: scroll and the strongback swings clear at T-0, the plume flashes shock diamonds, the pad falls away into a persistent exhaust pillar — then Earth's limb, a space station, satellites, VERMILION → AURELIA → GLACIUS. 60fps. On your phone. Right now. That is the demo.", ring: 0, angle: 0.3 },
  { name: "React", category: "Core", level: 88, blurb: "A precision instrument for managing complexity at scale — correct boundaries, deliberate data flow, predictable renders.", detail: "Flight log: used for adaptive timers, dashboard UIs and this portfolio. I care about where state lives, when a component re-renders, and keeping the tree calm instead of churning.", ring: 0, angle: 2.6 },
  { name: "Canvas API", category: "Visual", level: 93, blurb: "Real-time annotation systems, particle physics and custom rendering pipelines — 60fps, zero dependencies.", detail: "Flight log: my home turf. Laser-pointer trails with verlet physics, freehand ink smoothing, layer compositing and hit-testing — all hand-rolled on a single 2D context.", ring: 0, angle: 4.6 },
  { name: "HTML / CSS", category: "Visual", level: 92, blurb: "Interfaces that respond gracefully on every viewport, with animation systems that feel physically accurate.", detail: "Flight log: fluid type scales, backdrop glass, scroll choreography and layouts that survive a 320px phone without a single horizontal jiggle. The boring layer, done obsessively.", ring: 1, angle: 1.2 },
  { name: "Three.js / WebGL", category: "Visual", level: 80, blurb: "Immersive 3D scenes — orbital mechanics, terrain meshes and shader experiments with an engineer's rigour.", detail: "Flight log: built the live launch sequence behind this page — procedural vehicles, particle exhaust, shader atmosphere rims and post-processing bloom, tuned to hold 60fps.", ring: 1, angle: 2.9 },
  { name: "UI / UX Design", category: "Visual", level: 82, blurb: "Visual hierarchy and spatial rhythm — interfaces that feel intuitive on first contact and disappear into the task.", detail: "Flight log: I sketch motion before pixels — timing curves, easing, where attention lands first. Good UX is the tool the user never notices using.", ring: 1, angle: 4.4 },
  { name: "Physics", category: "Mind", level: 90, blurb: "Not a subject — a lens. Mechanics, electromagnetism and waves, translated directly into computational models.", detail: "Flight log: projectile arcs in a laser game, elastic collisions in ink, gravity in scroll scenes. Every simulation on this site is grounded in real equations, not faked easing.", ring: 1, angle: 5.7 },
  { name: "Mathematics", category: "Mind", level: 88, blurb: "Linear algebra to differential equations — fluency that makes code correct by construction, not by trial.", detail: "Flight log: rotation matrices for pseudo-3D orbit rings, numeric integration for particle systems, easing derivations. Math first means less debugging later.", ring: 2, angle: 0.8 },
  { name: "Physics Simulation", category: "Mind", level: 86, blurb: "Real-time orbital mechanics, fluid approximations and elastic collisions, grounded in actual physical law.", detail: "Flight log: semi-implicit Euler at it again — smoke that billows because buoyancy says so, sparks with real drag. Plausible motion is the cheapest special effect there is.", ring: 2, angle: 2.0 },
  { name: "Problem Solving", category: "Mind", level: 93, blurb: "Decomposing the impossible into the merely difficult — then shipping the answer.", detail: "Flight log: the launch sequence behind you needed 40 small inventions before it ran at 60fps on a phone. I don't skip hard problems — I slice them.", ring: 2, angle: 3.4 },
  { name: "Git & GitHub", category: "Tools", level: 85, blurb: "Disciplined version control — atomic commits and history that reads like documentation.", detail: "Flight log: feature branches, meaningful messages, and a history you can bisect. My repos read like mission logs, not a graveyard of 'final_v2_REAL'.", ring: 2, angle: 4.5 },
  { name: "Python", category: "Tools", level: 75, blurb: "Scripting, tooling and gluing systems together when the browser isn't the whole story.", detail: "Flight log: texture generators, data wrangling, small automations that pre-compute what the browser would choke on. The quiet support crew of every launch.", ring: 2, angle: 5.6 },
];

const RING_RADIUS = [126, 196, 264];
const RING_SPEED = [0.34, 0.21, 0.13];

export default function SkillOrbit() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Skill>(SKILLS[0]);
  const [hovered, setHovered] = useState<Skill | null>(null);
  const [expanded, setExpanded] = useState<Skill | null>(null);
  const selectedRef = useRef<Skill>(SKILLS[0]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // lock scroll + ESC to close while the dossier is open
  useEffect(() => {
    if (!expanded) return;
    document.body.classList.add("locked");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("locked");
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dispFam =
      getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() ||
      "sans-serif";

    let cssW = wrap.clientWidth;
    let cssH = cssW;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      cssW = wrap.clientWidth;
      cssH = cssW;
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // world scale factor relative to design size 640
    const S = () => cssW / 640;

    // interaction state
    let hoverIdx = -1;
    let dragOffset = 0;
    let dragVel = 0;
    let dragging = false;
    let lastX = 0;
    let tiltX = 0; // extra tilt from pointer
    const starPositions = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.1,
      tw: Math.random() * Math.PI * 2,
    }));

    // ── realism kit: procedural planet surfaces, an asteroid belt, a
    //    passing comet and a ring system on the WebGL world ──
    const shadeHex = (hex: string, amt: number) => {
      const n = parseInt(hex.slice(1), 16);
      const ch = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
      const r = ch(((n >> 16) & 255) * (1 + amt));
      const g = ch(((n >> 8) & 255) * (1 + amt));
      const b = ch((n & 255) * (1 + amt));
      return `rgb(${r},${g},${b})`;
    };
    const planetTexCache = new Map<number, HTMLCanvasElement>();
    const planetTex = (i: number): HTMLCanvasElement => {
      const hit = planetTexCache.get(i);
      if (hit) return hit;
      const size = 96;
      const cv = document.createElement("canvas");
      cv.width = cv.height = size;
      const g = cv.getContext("2d")!;
      const base = CATEGORY_COLOR[SKILLS[i].category];
      g.fillStyle = base;
      g.fillRect(0, 0, size, size);
      let seed = i * 9973 + 17;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const shades = [shadeHex(base, -0.42), shadeHex(base, -0.2), shadeHex(base, 0.16), shadeHex(base, 0.32)];
      for (let k = 0; k < 46; k++) {
        const x = rnd() * size;
        const y = rnd() * size;
        const r = 3 + rnd() * 12;
        g.fillStyle = shades[Math.floor(rnd() * shades.length)];
        g.globalAlpha = 0.15 + rnd() * 0.22;
        g.beginPath();
        if (rnd() > 0.6) g.ellipse(x, y, r * (1 + rnd()), r * 0.55, rnd() * Math.PI, 0, Math.PI * 2);
        else g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      planetTexCache.set(i, cv);
      return cv;
    };
    const RINGED = new Set<number>([SKILLS.findIndex((s) => s.name.startsWith("Three"))]);
    // the top-tier worlds carry a small moon — hierarchy you can feel
    const MOONED = new Set<number>([
      SKILLS.findIndex((s) => s.name === "JavaScript"),
      SKILLS.findIndex((s) => s.name === "Canvas API"),
      SKILLS.findIndex((s) => s.name === "Problem Solving"),
    ]);
    const belt = Array.from({ length: 88 }, () => ({
      a0: Math.random() * Math.PI * 2,
      rr: 0.94 + Math.random() * 0.12,
      r: 0.5 + Math.random() * 1.1,
      speed: 0.05 + Math.random() * 0.05,
      c: Math.random() > 0.5 ? "#8a7d72" : "#6f6459",
    }));
    const comet = { active: false, t0: 0, next: 4, x0: 0, y0: 0, x1: 0, y1: 0 };

    const orbPos = (s: Skill, t: number) => {
      const a = s.angle + t * RING_SPEED[s.ring] + dragOffset;
      const r = RING_RADIUS[s.ring] * S();
      const z = Math.sin(a); // depth -1..1
      return {
        x: cssW / 2 + Math.cos(a) * r,
        y: cssH / 2 + z * r * 0.4 + tiltX * r * 0.08,
        depth: (z + 1) / 2, // 0 back → 1 front
      };
    };

    const pick = (mx: number, my: number, t: number): number => {
      let best = -1;
      let bestD = 26;
      SKILLS.forEach((s, i) => {
        const p = orbPos(s, t);
        const scale = 0.72 + p.depth * 0.55;
        const rr = (10 + (s.level / 100) * 9) * scale * S() + 12;
        const d = Math.hypot(mx - p.x, my - p.y);
        if (d < Math.max(rr, 24) && d < bestD + 12) {
          bestD = d;
          best = i;
        }
      });
      return best;
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const vs = rect.width / Math.max(1, cssW);
      const mx = (e.clientX - rect.left) / vs;
      const my = (e.clientY - rect.top) / vs;
      if (dragging) {
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        dragOffset += dx * 0.006;
        dragVel = dx * 0.006;
        return;
      }
      const t = performance.now() / 1000;
      hoverIdx = pick(mx, my, t);
      setHovered(hoverIdx >= 0 ? SKILLS[hoverIdx] : null);
      // gentle tilt toward pointer
      const ny = (my / cssH - 0.5) * 2;
      tiltX += ((-ny * 1.2) - tiltX) * 0.08;
    };

    const onDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const vs = rect.width / Math.max(1, cssW);
      const mx = (e.clientX - rect.left) / vs;
      const my = (e.clientY - rect.top) / vs;
      const t = performance.now() / 1000;
      const hit = pick(mx, my, t);
      if (hit >= 0) {
        setSelected(SKILLS[hit]);
        setExpanded(SKILLS[hit]); // open the full dossier
        return;
      }
      dragging = true;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    };

    const onUp = () => {
      dragging = false;
    };

    const onLeave = () => {
      hoverIdx = -1;
      setHovered(null);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.style.touchAction = "pan-y";

    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const t = performance.now() / 1000;
      if (!dragging) {
        dragOffset += dragVel;
        dragVel *= 0.94;
        if (!reduced) dragOffset += 0.0016; // slow auto-rotate
      }

      // ── scroll-driven fullscreen zoom: the closer the system's center
      //    drifts to the viewport's center, the harder it swells — until
      //    it fills the whole screen — then it docks back down as you
      //    scroll past. transform-only, so layout never jumps. ──
      const rect = canvas.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const dist = Math.hypot(
        rect.left + rect.width / 2 - vw / 2,
        rect.top + rect.height / 2 - vh / 2
      );
      let zoom = Math.max(0, 1 - dist / (vh * 0.74));
      zoom = zoom * zoom * (3 - 2 * zoom); // smoothstep
      const cover = Math.max(vw, vh) / Math.max(1, cssW);
      // cap: the zoomed square may never overflow the viewport WIDTH — on
      // tall phones cover is height-driven (≈2.4×) and clipped every edge
      // label; scaling to the width keeps the whole system readable
      const widthFit = vw / Math.max(1, cssW);
      const cap = Math.max(1, Math.min(2.7, cover, widthFit * 0.99));
      const zScale = 1 + zoom * (cap - 1);
      if (zoomRef.current) {
        zoomRef.current.style.transform = zScale > 1.0008 ? `scale(${zScale.toFixed(4)})` : "";
      }
      if (wrapRef.current) {
        wrapRef.current.style.zIndex = zoom > 0.42 ? "45" : "";
      }
      if (veilRef.current) {
        veilRef.current.style.opacity = (zoom * 0.94).toFixed(3);
      }
      const uiFade = Math.max(0, 1 - zoom * 1.9);
      if (headerRef.current) headerRef.current.style.opacity = uiFade.toFixed(3);
      if (panelRef.current) panelRef.current.style.opacity = uiFade.toFixed(3);
      if (hintRef.current) {
        hintRef.current.style.opacity = Math.min(1, Math.max(0, (zoom - 0.55) / 0.4)).toFixed(3);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const cx = cssW / 2;
      const cy = cssH / 2;
      const sc = S();

      // backdrop: two faint nebula washes, then the starfield
      const nebA = ctx.createRadialGradient(cssW * 0.18, cssH * 0.24, 0, cssW * 0.18, cssH * 0.24, cssW * 0.4);
      nebA.addColorStop(0, "rgba(255,120,60,0.05)");
      nebA.addColorStop(1, "rgba(255,120,60,0)");
      ctx.fillStyle = nebA;
      ctx.fillRect(0, 0, cssW, cssH);
      const nebB = ctx.createRadialGradient(cssW * 0.82, cssH * 0.78, 0, cssW * 0.82, cssH * 0.78, cssW * 0.42);
      nebB.addColorStop(0, "rgba(140,100,255,0.05)");
      nebB.addColorStop(1, "rgba(140,100,255,0)");
      ctx.fillStyle = nebB;
      ctx.fillRect(0, 0, cssW, cssH);

      for (const st of starPositions) {
        const tw = 0.35 + 0.3 * Math.sin(t * 1.4 + st.tw);
        ctx.globalAlpha = tw;
        ctx.fillStyle = "#e8d5c0";
        ctx.beginPath();
        ctx.arc(st.x * cssW, st.y * cssH, st.r * sc, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const pulse = 30 + Math.sin(t * 2.2) * 2.5;

      // asteroid belt between ring 0 and ring 1 — drawn in two halves so
      // the system reads as genuinely three-dimensional
      const beltR = ((RING_RADIUS[0] + RING_RADIUS[1]) / 2) * sc;
      const drawBelt = (front: boolean) => {
        for (const a of belt) {
          const ang = a.a0 + t * a.speed + dragOffset * 0.9;
          const z = Math.sin(ang);
          if (front !== z > 0) continue;
          const bx2 = cx + Math.cos(ang) * beltR * a.rr;
          const by2 = cy + z * beltR * a.rr * 0.4 + tiltX * beltR * a.rr * 0.08;
          const dep = (z + 1) / 2;
          ctx.globalAlpha = (front ? 0.5 : 0.2) * (0.35 + dep * 0.65);
          ctx.fillStyle = a.c;
          ctx.beginPath();
          ctx.arc(bx2, by2, a.r * sc * (0.6 + dep * 0.7), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      };

      // orbit rings, depth-aware: back halves now (dim), front after planets
      const drawRings = (front: boolean) => {
        RING_RADIUS.forEach((r, i) => {
          ctx.beginPath();
          ctx.ellipse(
            cx,
            cy + tiltX * r * sc * 0.08,
            r * sc,
            r * sc * 0.4,
            0,
            front ? 0 : Math.PI,
            front ? Math.PI : Math.PI * 2
          );
          ctx.strokeStyle = `rgba(255,171,105,${(front ? 0.22 : 0.1) + (hoverIdx >= 0 ? 0.04 : 0)})`;
          ctx.lineWidth = front ? 1.1 : 0.9;
          ctx.setLineDash(i === 2 && front ? [3, 7] : []);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      };

      // a comet grazes the system every so often — pure punctuation
      if (comet.active) {
        const q = (t - comet.t0) / 2.8;
        if (q >= 1) comet.active = false;
        else {
          const fx = comet.x0 + (comet.x1 - comet.x0) * q;
          const fy = comet.y0 + (comet.y1 - comet.y0) * q + Math.sin(q * Math.PI) * -24;
          const hx = comet.x0 + (comet.x1 - comet.x0) * Math.max(0, q - 0.3);
          const hy = comet.y0 + (comet.y1 - comet.y0) * Math.max(0, q - 0.3);
          const tail = ctx.createLinearGradient(fx, fy, hx, hy);
          tail.addColorStop(0, "rgba(255,230,200,0.8)");
          tail.addColorStop(1, "rgba(255,160,90,0)");
          ctx.strokeStyle = tail;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(hx, hy);
          ctx.stroke();
          const hg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 10 * sc);
          hg.addColorStop(0, "rgba(255,244,224,0.95)");
          hg.addColorStop(1, "rgba(255,180,90,0)");
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.arc(fx, fy, 10 * sc, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (t > comet.next) {
        comet.active = true;
        comet.t0 = t;
        comet.next = t + 9 + Math.random() * 7;
        const leftFirst = Math.random() > 0.5;
        comet.x0 = leftFirst ? -20 : cssW + 20;
        comet.y0 = cssH * (0.1 + Math.random() * 0.3);
        comet.x1 = leftFirst ? cssW + 20 : -20;
        comet.y1 = cssH * (0.35 + Math.random() * 0.4);
      }

      drawBelt(false);
      drawRings(false);

      // ── planet painter: textured body, terminator shading, rings —
      //    called per planet in two depth passes around the sun ──
      const order = SKILLS.map((s, i) => ({ s, i, p: orbPos(s, t) })).sort((a, b) => a.p.depth - b.p.depth);
      const labelJobs: Array<{ s: Skill; x: number; y: number; priority: number; active: boolean }> = [];
      const drawPlanet = ({ s, i, p }: (typeof order)[number]) => {
        const scale = 0.72 + p.depth * 0.55;
        const r = (10 + (s.level / 100) * 9) * scale * sc;
        const isActive = i === hoverIdx || s === selectedRef.current;
        const color = CATEGORY_COLOR[s.category];
        const alpha = 0.5 + p.depth * 0.5;
        const ang = s.angle + t * RING_SPEED[s.ring] + dragOffset;

        // motion trail — a fading arc streaming behind every planet
        const tr = RING_RADIUS[s.ring] * S();
        for (let k = 1; k <= 20; k++) {
          const aa = ang - k * 0.05;
          const z2 = Math.sin(aa);
          const tx = cx + Math.cos(aa) * tr;
          const ty = cy + z2 * tr * 0.4 + tiltX * tr * 0.08;
          const tScale = 0.72 + ((z2 + 1) / 2) * 0.55;
          ctx.globalAlpha = (1 - k / 21) * 0.13 * tScale * (isActive ? 2 : 1);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(tx, ty, r * 0.44 * tScale, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = alpha;

        // atmosphere glow
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.2);
        g.addColorStop(0, `${color}${isActive ? "88" : "44"}`);
        g.addColorStop(1, `${color}00`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3.2, 0, Math.PI * 2);
        ctx.fill();

        // procedural textured body (slow rotation, alternating direction)
        const tex = planetTex(i);
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(p.x, p.y);
        ctx.rotate(t * 0.14 * (i % 2 ? 1 : -1) + i);
        ctx.drawImage(tex, -r * 1.25, -r * 1.25, r * 2.5, r * 2.5);
        ctx.restore();

        // terminator shading + sunlit highlight — the 3D part
        const shade = ctx.createRadialGradient(p.x - r * 0.38, p.y - r * 0.4, r * 0.1, p.x, p.y, r * 1.15);
        shade.addColorStop(0, "rgba(255,246,234,0.3)");
        shade.addColorStop(0.42, "rgba(255,255,255,0)");
        shade.addColorStop(0.78, "rgba(12,6,4,0.42)");
        shade.addColorStop(1, "rgba(8,4,2,0.76)");
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = shade;
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        ctx.restore();

        // atmosphere rim
        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 1.2 * sc, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // ring system on the WebGL world
        if (RINGED.has(i)) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(0.5);
          ctx.scale(1, 0.36);
          ctx.globalAlpha = alpha * 0.8;
          ctx.strokeStyle = `${color}66`;
          ctx.lineWidth = r * 0.3;
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = alpha * 0.4;
          ctx.strokeStyle = `${color}33`;
          ctx.lineWidth = r * 0.14;
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.92, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          ctx.globalAlpha = 1;
        }

        // the featured world carries a tiny rocket in a low orbit
        if (s.featured) {
          const ra = t * 1.5;
          const ro = r + 10 * sc + Math.sin(t * 2.2) * 2;
          const rx = p.x + Math.cos(ra) * ro;
          const ry2 = p.y + Math.sin(ra) * ro * 0.55;
          ctx.globalAlpha = 0.16;
          ctx.strokeStyle = "#ffc966";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, ro, ro * 0.55, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = "#ffd9a8";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, ro, ro * 0.55, 0, ra - 0.9, ra);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.save();
          ctx.translate(rx, ry2);
          ctx.rotate(ra + Math.PI / 2);
          ctx.fillStyle = "#f5efe6";
          ctx.beginPath();
          ctx.moveTo(0, -4.4 * sc);
          ctx.lineTo(2.5 * sc, 3 * sc);
          ctx.lineTo(-2.5 * sc, 3 * sc);
          ctx.closePath();
          ctx.fill();
          const fl = 3 + Math.sin(t * 30) * 1.6;
          const fg2 = ctx.createLinearGradient(0, 3 * sc, 0, (3 + fl) * sc);
          fg2.addColorStop(0, "rgba(255,190,110,0.95)");
          fg2.addColorStop(1, "rgba(255,90,30,0)");
          ctx.fillStyle = fg2;
          ctx.beginPath();
          ctx.moveTo(-1.4 * sc, 3 * sc);
          ctx.lineTo(1.4 * sc, 3 * sc);
          ctx.lineTo(0, (3 + fl) * sc);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // capture ring for selected
        if (s === selectedRef.current) {
          ctx.strokeStyle = "rgba(255,190,120,0.9)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 5]);
          ctx.lineDashOffset = -t * 22;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 7 * sc, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // proficiency arc — the skill's level as a live gauge around the world
        if (isActive) {
          const a0 = -Math.PI / 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 4.2 * sc, a0, a0 + (s.level / 100) * Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.2;
          ctx.lineCap = "round";
          ctx.stroke();
          ctx.lineCap = "butt";
        }

        // small moons on the top-tier worlds — depth, life, hierarchy
        if (MOONED.has(i)) {
          const ma = t * (1.1 + (i % 3) * 0.35) + i * 2.1;
          const mo = r + 15 * sc + (i % 2) * 3 * sc;
          const mx = p.x + Math.cos(ma) * mo;
          const my2 = p.y + Math.sin(ma) * mo * 0.42;
          const mdep = (Math.sin(ma) + 1) / 2;
          ctx.globalAlpha = alpha * (0.35 + mdep * 0.65);
          const mg = ctx.createRadialGradient(mx - 1, my2 - 1, 0, mx, my2, 3.4 * sc);
          mg.addColorStop(0, "#efe8da");
          mg.addColorStop(1, "#8f867a");
          ctx.fillStyle = mg;
          ctx.beginPath();
          ctx.arc(mx, my2, 2.6 * sc, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // defer the label — placed after all planets so depth sort of the
        // drawing never hides an active label behind a planet body
        labelJobs.push({ s, x: p.x, y: p.y - r - 9 * sc, priority: (isActive ? 100 : 0) + p.depth, active: isActive });
      };

      // back planets first — they pass BEHIND the sun
      for (const o of order) if (o.p.depth < 0.5) drawPlanet(o);

      // ── the sun: MESKAT CORE, drawn as a living star ──
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.05);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const len = pulse * (2.1 + (i % 3) * 0.5 + Math.sin(t * 1.7 + i) * 0.24);
        ctx.save();
        ctx.rotate(a);
        const rg = ctx.createLinearGradient(0, 0, len, 0);
        rg.addColorStop(0, "rgba(255,160,70,0.2)");
        rg.addColorStop(1, "rgba(255,120,40,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(pulse * 0.7, -2.2);
        ctx.lineTo(len, 0);
        ctx.lineTo(pulse * 0.7, 2.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulse * 3.2);
      coreGlow.addColorStop(0, "rgba(255,150,70,0.5)");
      coreGlow.addColorStop(0.45, "rgba(255,110,45,0.14)");
      coreGlow.addColorStop(1, "rgba(255,90,30,0)");
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse * 3.2, 0, Math.PI * 2);
      ctx.fill();

      const coreBody = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, pulse);
      coreBody.addColorStop(0, "#fff3e2");
      coreBody.addColorStop(0.55, "#ff9d52");
      coreBody.addColorStop(1, "#c2481c");
      ctx.fillStyle = coreBody;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
      ctx.fill();

      // horizontal flare streak across the star
      const flare = ctx.createLinearGradient(cx - pulse * 3.4, cy, cx + pulse * 3.4, cy);
      flare.addColorStop(0, "rgba(255,180,110,0)");
      flare.addColorStop(0.5, "rgba(255,214,150,0.2)");
      flare.addColorStop(1, "rgba(255,180,110,0)");
      ctx.fillStyle = flare;
      ctx.fillRect(cx - pulse * 3.4, cy - 1.1, pulse * 6.8, 2.2);

      // rotating instrument halo around the core
      ctx.setLineDash([2, 6]);
      ctx.lineDashOffset = -t * 14;
      ctx.strokeStyle = "rgba(255,171,105,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse + 12 * sc, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // ── front planets, then the front halves of the rings & belt ──
      for (const o of order) if (o.p.depth >= 0.5) drawPlanet(o);
      drawRings(true);
      drawBelt(true);

      // ── collision-aware labels ─────────────────────────────
      // On small canvases 12 labels overlap into soup. Draw planets first,
      // then greedily place labels front-to-back; anything that would
      // intersect an already-placed label (or the core caption) is skipped.
      type Box = { x: number; y: number; w: number; h: number };
      const occupied: Box[] = [];
      const hits = (b: Box) =>
        occupied.some(
          (o) =>
            b.x - 4 < o.x + o.w && b.x + b.w + 4 > o.x && b.y - 3 < o.y + o.h && b.y + b.h + 3 > o.y
        );

      ctx.textAlign = "center";

      // MESKAT CORE — the caption is a designed plate now: flame-gradient
      // wordmark, breathing survey brackets and a live status subline
      const coreFs = Math.max(11, 13.5 * sc);
      const coreFont = `700 ${coreFs}px ${dispFam}`;
      ctx.font = coreFont;
      const spaced = "MESKAT CORE".split("").join("\u2009");
      const coreW = ctx.measureText(spaced).width;
      const coreY = cy + pulse + 24 * sc;
      occupied.push({
        x: cx - coreW / 2 - 14 * sc,
        y: coreY - coreFs - 3,
        w: coreW + 28 * sc,
        h: coreFs + 18 * sc,
      });
      const wordGrad = ctx.createLinearGradient(cx - coreW / 2, 0, cx + coreW / 2, 0);
      wordGrad.addColorStop(0, "#ffd9a8");
      wordGrad.addColorStop(0.5, "#ff8b3d");
      wordGrad.addColorStop(1, "#ff5e2b");
      ctx.save();
      ctx.font = coreFont;
      ctx.shadowColor = "rgba(255,139,61,0.55)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = wordGrad;
      ctx.fillText(spaced, cx, coreY);
      ctx.restore();

      // breathing survey brackets
      const bkw = coreW / 2 + 10 * sc;
      const breathe = Math.sin(t * 2) * 2.4 * sc;
      ctx.strokeStyle = "rgba(255,201,102,0.8)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx - bkw - 6 * sc - breathe, coreY - coreFs * 0.82);
      ctx.lineTo(cx - bkw - breathe, coreY - coreFs * 0.82);
      ctx.lineTo(cx - bkw - breathe, coreY + 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + bkw + 6 * sc + breathe, coreY - coreFs * 0.82);
      ctx.lineTo(cx + bkw + breathe, coreY - coreFs * 0.82);
      ctx.lineTo(cx + bkw + breathe, coreY + 4);
      ctx.stroke();

      // live status subline
      ctx.font = `500 ${Math.max(7.5, 8.4 * sc)}px ${dispFam}`;
      ctx.fillStyle = `rgba(201,188,174,${0.52 + 0.24 * Math.sin(t * 1.8)})`;
      ctx.fillText("SYSTEM ONLINE · 12 WORLDS · 60 FPS", cx, coreY + 14 * sc);

      // greedy label placement: highest priority (active/selected, then
      // nearest) claims its spot first; the rest yield when crowded
      labelJobs.sort((a, b) => b.priority - a.priority);
      ctx.textAlign = "center";
      for (const job of labelJobs) {
        const fs = Math.max(10, (11 + (job.active ? 1.5 : 0)) * sc);
        ctx.font = `${job.active ? 700 : 500} ${fs}px ${dispFam}`;
        const labelText = job.active ? `${job.s.name} · ${job.s.level}%` : job.s.name;
        const w = ctx.measureText(labelText).width;
        const box: Box = { x: job.x - w / 2, y: job.y - fs, w, h: fs * 1.25 };
        // labels never leave the canvas
        if (box.x < 2 || box.x + box.w > cssW - 2) continue;
        if (!job.active && hits(box)) continue;
        occupied.push(box);
        ctx.globalAlpha = job.active ? 1 : 0.4 + 0.6 * Math.min(1, job.priority);
        ctx.font = `${job.active ? 700 : 500} ${fs}px ${dispFam}`;
        ctx.shadowColor = "rgba(5,3,8,0.9)";
        ctx.shadowBlur = 6;
        ctx.fillStyle = job.active ? "#ffe9d0" : "#c9bcae";
        ctx.fillText(labelText, job.x, job.y);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const shown = hovered ?? selected;

  return (
    <section id="skills" className="relative px-5 sm:px-8 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <span className="stage-chip">
            <span className="chip-dot" />
            Stage 02 · Ascent
          </span>
        </motion.div>

        <div ref={headerRef} className="mt-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 will-change-[opacity]">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
            className="font-[family-name:var(--font-display)] font-bold leading-[1.05] text-[clamp(30px,5vw,52px)]"
          >
            The skill
            <span className="flame-text"> solar system.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.8 }}
            className="flex items-center gap-2 text-[13px] text-[#a99b8e] font-[family-name:var(--font-display)] tracking-wide"
          >
            <Hand size={14} className="hidden sm:block" aria-hidden />
            <MousePointer2 size={14} className="sm:hidden" aria-hidden />
            Drag to spin the system · tap a planet to open its file
          </motion.p>
        </div>

        <div className="mt-12 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-10 items-center">
          {/* the system — min-w-0: the canvas' intrinsic size must never be
              allowed to widen the grid track on small/desktop-mode screens */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            ref={wrapRef}
            className="relative mx-auto w-full min-w-0 max-w-[720px] aspect-square"
          >
            {/* zoom stage — the scroll-driven fullscreen swell scales this */}
            <div ref={zoomRef} className="absolute inset-0 will-change-transform">
              {/* soft space bubble so the 3D rocket behind never fights the system */}
              <div
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(8,6,10,0.9) 0%, rgba(8,6,10,0.74) 55%, rgba(8,6,10,0) 74%)",
                }}
              />
              <canvas
                ref={canvasRef}
                className="relative z-10 w-full h-full block"
                aria-label="Interactive solar system map of Meskat's skills"
                role="img"
              />
            </div>
          </motion.div>

          {/* info panel */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="rounded-[28px] glass p-6 sm:p-8 min-h-[240px] sm:min-h-[280px] w-full max-w-full min-w-0 flex flex-col overflow-hidden will-change-[opacity]"
            style={{ background: "rgba(12,8,14,0.55)" }}
            ref={panelRef}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-display)] px-3 py-1.5 rounded-full border"
                style={{ color: CATEGORY_COLOR[shown.category], borderColor: `${CATEGORY_COLOR[shown.category]}44` }}
              >
                {shown.category} system
              </span>
              <span className="text-[11px] text-[#a99b8e] tabular-nums tracking-widest">
                {String(SKILLS.indexOf(shown) + 1).padStart(2, "0")} / {SKILLS.length}
              </span>
            </div>

            {shown.featured && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#ffc9663c] bg-[#ffc9660d] px-3.5 py-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ffc966] opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ffc966]" />
                </span>
                <span className="text-[10px] tracking-[0.26em] uppercase font-[family-name:var(--font-display)] text-[#ffc966]">
                  This website · you are inside the demo
                </span>
              </div>
 )}

            <h3 className="mt-5 font-[family-name:var(--font-display)] font-bold text-[26px] text-[#f5efe6]">
              {shown.name}
            </h3>

            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-[#a99b8e] tracking-wider mb-2">
                <span>{shown.featured ? "RENDER STABILITY · 60 FPS" : "ORBIT STABILITY"}</span>
                <span className="tabular-nums">{shown.level}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <motion.div
                  key={shown.name}
                  initial={{ width: 0 }}
                  animate={{ width: `${shown.level}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${CATEGORY_COLOR[shown.category]}66, ${CATEGORY_COLOR[shown.category]})` }}
                />
              </div>
            </div>

            <p className="mt-5 text-[14px] leading-relaxed text-[#c9bcae] break-words">{shown.blurb}</p>

            {shown.featured && (
              <p className="mt-4 pl-4 border-l-2 border-[#ff8b3d66] text-[12.5px] italic leading-relaxed text-[#a99b8e]">
                {shown.detail}
              </p>
 )}
          </motion.div>
        </div>
      </div>

      {/* fullscreen veil — darkens the world while the system swallows the screen */}
      <div
        ref={veilRef}
        aria-hidden
        className="fixed inset-0 z-[44] pointer-events-none"
        style={{
          opacity: 0,
          background:
            "radial-gradient(120% 100% at 50% 46%, rgba(8,5,14,0.92) 0%, rgba(4,2,8,0.96) 58%, rgba(2,1,4,0.99) 100%)",
        }}
      />
      {/* hint while the system is fullscreen */}
      <div
        ref={hintRef}
        aria-hidden
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[46] pointer-events-none"
        style={{ opacity: 0 }}
      >
        <span className="flex items-center gap-2.5 rounded-full border border-[#ffc9663a] bg-[#120c14e8] px-4 py-2 text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-display)] text-[#ffc966] whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffc966] animate-pulse inline-block" />
          drag to spin · tap a world
        </span>
      </div>

      {/* expanded planet dossier — opens on planet click */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="dossier-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[85] flex items-center justify-center"
            style={{
              background: "rgba(4,2,7,0.62)",
              backdropFilter: "blur(14px)",
              padding: "clamp(16px, 5vw, 32px)",
            }}
            onClick={() => setExpanded(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${expanded.name} — skill dossier`}
          >
            <motion.div
              key="dossier-card"
              initial={{ opacity: 0, scale: 0.86, y: 26 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 18 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[520px] rounded-[32px] glass overflow-hidden"
              style={{
                boxShadow: `0 40px 120px -30px ${CATEGORY_COLOR[expanded.category]}55`,
                padding: "clamp(22px, 4.5vw, 36px)",
                maxHeight: "86dvh",
                overflowY: "auto",
              }}
            >
              {/* category glow wash */}
              <div
                aria-hidden
                className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${CATEGORY_COLOR[expanded.category]}2e, transparent 70%)` }}
              />

              <button
                onClick={() => setExpanded(null)}
                aria-label="Close dossier"
                className="absolute top-5 right-5 w-10 h-10 rounded-full grid place-items-center border border-white/15 text-[#c9bcae] hover:text-[#f5efe6] hover:border-[#ff8b3d66] transition-colors"
              >
                <X size={17} />
              </button>

              <div className="flex items-center gap-2.5 text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-display)] text-[#a99b8e]">
                <Orbit size={13} className="text-[#ff8b3d]" aria-hidden />
                Skill dossier · {String(SKILLS.indexOf(expanded) + 1).padStart(2, "0")} / {SKILLS.length}
              </div>

              <div className="mt-6 flex items-center gap-5">
                {/* the planet, pulled out of orbit */}
                <motion.span
                  initial={{ scale: 0.4, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  aria-hidden
                  className="shrink-0 w-16 h-16 rounded-full"
                  style={{
                    background: `radial-gradient(circle at 32% 30%, #fff6ea 0%, ${CATEGORY_COLOR[expanded.category]} 46%, #20140c 100%)`,
                    boxShadow: `0 0 34px ${CATEGORY_COLOR[expanded.category]}66, inset -6px -8px 16px rgba(0,0,0,0.55)`,
                  }}
                />
                <div>
                  {expanded.featured && (
                    <span className="mb-2 inline-flex items-center gap-1.5 text-[9.5px] tracking-[0.24em] uppercase font-[family-name:var(--font-display)] text-[#ffc966]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ffc966] animate-pulse inline-block" aria-hidden />
                      this website · live demo
                    </span>
                  )}
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-[clamp(24px,5vw,34px)] leading-tight text-[#f5efe6]">
                    {expanded.name}
                  </h3>
                  <span
                    className="mt-1.5 inline-block text-[10px] tracking-[0.28em] uppercase font-[family-name:var(--font-display)] px-3 py-1 rounded-full border"
                    style={{ color: CATEGORY_COLOR[expanded.category], borderColor: `${CATEGORY_COLOR[expanded.category]}44` }}
                  >
                    {expanded.category} system · ring {expanded.ring + 1}
                  </span>
                </div>
              </div>

              <p className="mt-6 text-[14.5px] leading-relaxed text-[#c9bcae]">{expanded.blurb}</p>

              <div className="mt-4 pl-5 border-l-2 text-[13.5px] italic leading-relaxed text-[#a99b8e]" style={{ borderColor: `${CATEGORY_COLOR[expanded.category]}66` }}>
                {expanded.detail}
              </div>

              <div className="mt-7">
                <div className="flex justify-between text-[11px] text-[#a99b8e] tracking-wider mb-2">
                  <span>ORBIT STABILITY</span>
                  <span className="tabular-nums">{expanded.level}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${expanded.level}%` }}
                    transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${CATEGORY_COLOR[expanded.category]}66, ${CATEGORY_COLOR[expanded.category]})` }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
