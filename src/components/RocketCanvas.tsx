"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { computeJourney } from "@/lib/journey";

/**
 * The live cinematic background — a full launch complex at dusk, a rocket that
 * vents, ignites and lifts off the way a real Falcon 9 does: slow tower-clear,
 * water-deluge steam carpet racing outward, blinding engine core, then a
 * persistent exhaust pillar ("dragon tail") hanging from the pad to the
 * vehicle as it climbs through streaming wind and cloud. Up higher: the curved
 * limb of Earth, an orbital space station, a lunar flyby and a three-planet
 * hop out in deep space. Every scroll section = a new location. Scroll-driven.
 */

function makeRadialTexture(
  stops: Array<[number, string]>,
  size = 128
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* Shock-diamond plume texture: bright horizontal bands fading down the cone */
function makeDiamondTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "rgba(255,236,200,0.95)");
  grad.addColorStop(0.55, "rgba(255,160,70,0.5)");
  grad.addColorStop(1, "rgba(255,90,30,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);
  // diamonds: widest at nozzle, shrinking downstream
  const diamonds = [26, 58, 92, 126, 158, 188, 214];
  diamonds.forEach((y, i) => {
    const w = 54 - i * 6;
    const h = 13 - i;
    const g = ctx.createRadialGradient(64, y, 0, 64, y, w);
    g.addColorStop(0, `rgba(255,248,228,${0.85 - i * 0.1})`);
    g.addColorStop(0.5, `rgba(255,190,110,${0.4 - i * 0.05})`);
    g.addColorStop(1, "rgba(255,120,50,0)");
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(64, y);
    ctx.scale(1, h / w);
    ctx.translate(-64, -y);
    ctx.beginPath();
    ctx.arc(64, y, w, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* Procedural cloud layer for Earth (white blobs on transparent) */
function makeCloudLayerTexture(size = 1024): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size / 2;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);
  for (let i = 0; i < 190; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const r = 14 + Math.random() * 64;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.05 + Math.random() * 0.16;
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // streaky extension
    if (Math.random() > 0.5) {
      ctx.fillStyle = `rgba(255,255,255,${a * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(x + r * 0.9, y, r * 1.3, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/* Dark launch-site ground with subtle speckle */
function makeGroundTexture(size = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#15111a";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const v = 16 + Math.random() * 26;
    ctx.fillStyle = `rgba(${v},${v - 3},${v + 4},${0.14 + Math.random() * 0.2})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  // faint tire / service roads
  ctx.strokeStyle = "rgba(70,62,60,0.12)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.6);
  ctx.bezierCurveTo(size * 0.4, size * 0.5, size * 0.6, size * 0.75, size, size * 0.62);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  tex.needsUpdate = true;
  return tex;
}

/* Solar-panel cell grid */
function makeSolarTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#101c33";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "rgba(140,170,220,0.35)";
  ctx.lineWidth = 1.4;
  for (let x = 0; x <= 256; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 128);
    ctx.stroke();
  }
  for (let y = 0; y <= 128; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(90,130,190,0.10)";
  for (let i = 0; i < 40; i++) {
    ctx.fillRect(Math.floor(Math.random() * 16) * 16, Math.floor(Math.random() * 8) * 16, 16, 16);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* Radial halo ring for the Earth's atmosphere (sprite-based, can't blow out) */
function makeAtmoRingTexture(size = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(120,170,255,0)");
  g.addColorStop(0.6, "rgba(120,170,255,0)");
  g.addColorStop(0.68, "rgba(160,200,255,0.28)");
  g.addColorStop(0.76, "rgba(190,215,255,0.16)");
  g.addColorStop(0.88, "rgba(150,185,255,0.05)");
  g.addColorStop(1, "rgba(120,170,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* HUD-style atmosphere layer marker — title + telemetry subline in a
   bracket frame, drawn once and flown past like range signage */
function makeLayerLabelTexture(title: string, sub: string, fam: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 200;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);

  ctx.strokeStyle = "rgba(255,201,102,0.9)";
  ctx.lineWidth = 3;
  const bx = 14, by = 14, bw = c.width - 28, bh = c.height - 28, L = 34;
  ctx.beginPath();
  ctx.moveTo(bx, by + L); ctx.lineTo(bx, by); ctx.lineTo(bx + L, by);
  ctx.moveTo(bx + bw - L, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + L);
  ctx.moveTo(bx + bw, by + bh - L); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - L, by + bh);
  ctx.moveTo(bx + L, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - L);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#ffe9d0";
  ctx.font = `700 56px ${fam || "system-ui"}, sans-serif`;
  ctx.fillText(title, c.width / 2, 94);
  ctx.fillStyle = "rgba(255,201,102,0.95)";
  ctx.font = `500 29px ${fam || "system-ui"}, sans-serif`;
  ctx.fillText(sub, c.width / 2, 152);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ── value noise + fbm ───────────────────────────────────────
   Fast integer-hash value noise. Every planetary surface below is
   generated from this, so the worlds read as TERRAIN with real
   elevation, seas and ice — not flat cartoon colors. */
function hash2i(x: number, y: number): number {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967295;
}
function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2i(xi, yi);
  const b = hash2i(xi + 1, yi);
  const c = hash2i(xi, yi + 1);
  const d = hash2i(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number, oct: number): number {
  let f = 0;
  let amp = 0.5;
  let tot = 0;
  for (let i = 0; i < oct; i++) {
    f += amp * vnoise(x, y);
    tot += amp;
    x *= 2.03;
    y *= 2.03;
    amp *= 0.5;
  }
  return f / tot;
}
/* horizontally-seamless fbm for equirect maps (edge crossfade wrap) */
function fbmWrap(u: number, v: number, freq: number, oct: number): number {
  const x = u * freq;
  const y = v * freq * 0.5;
  const n0 = fbm(x, y, oct);
  const n1 = fbm(x - freq, y, oct);
  return n0 * (1 - u) + n1 * u;
}

/* ── EARTH: domain-warped fbm elevation mapped through
   abyss → shelf → beach → vegetation → highland → snow, plus polar ice.
   This is what makes the orbital leg read as home. ── */
function makeEarthSurfaceTexture(size = 1024): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size / 2;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(c.width, c.height);
  const W = c.width;
  const H = c.height;
  for (let y = 0; y < H; y++) {
    const v = y / H;
    const lat = Math.abs(v - 0.5) * 2; // 0 equator → 1 pole
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const warp = fbmWrap(u, v, 5, 4) * 0.5;
      const e = fbmWrap(u + warp * 0.35, v + warp * 0.22, 7, 6);
      let r: number, g: number, b: number;
      if (e < 0.5) {
        const d = Math.min(1, (0.5 - e) / 0.34); // shore → abyss
        r = 50 - 20 * d;
        g = 140 - 46 * d;
        b = 220 - 72 * d; // vivid teal oceans — reads alive from orbit
      } else {
        const h = (e - 0.5) / 0.5;
        if (h < 0.06) {
          r = 150; g = 200; b = 120; // coastal shelf — greener fringe
        } else if (h < 0.5) {
          const k = (h - 0.06) / 0.44;
          r = 72 + k * 30; g = 175 + k * 40; b = 60 + k * 20; // lush vegetation
        } else if (h < 0.78) {
          const k = (h - 0.5) / 0.28;
          r = 116 + k * 30; g = 148 + k * 32; b = 82 + k * 20; // green highland
        } else {
          const k = (h - 0.78) / 0.22;
          r = 168 + k * 76; g = 166 + k * 78; b = 158 + k * 92; // rock → snow
        }
      }
      const ice = lat + fbmWrap(u, v, 12, 3) * 0.14 - 0.86 + (e - 0.5) * 0.1;
      if (ice > 0) {
        const k = Math.min(1, ice / 0.12);
        r += (240 - r) * k;
        g += (246 - g) * k;
        b += (250 - b) * k;
      }
      const i = (y * W + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  // ── hero equatorial sea ─────────────────────────────────────
  // The departure camera always hovers over ONE patch of the globe
  // (the sphere's top point, parked on the equator by the 66° tilt).
  // Wherever the noise lands there, this hand-tuned pass guarantees a
  // vivid blue ocean with green islands — Earth must read ALIVE.
  {
    // tropical belt overwrite — the departure camera hovers at this latitude
    // band, so the WHOLE belt (every longitude) becomes vivid blue sea with
    // green islands. No dependence on noise luck or texture-u calculations.
    const yTop = H * 0.14;
    const yBot = H * 0.64;
    for (let y = Math.floor(yTop); y < Math.ceil(yBot); y++) {
      const ty = (y - yTop) / (yBot - yTop);
      const edge = Math.min(1, Math.min(ty, 1 - ty) * 4.5); // 0 inside → 1 at rim
      const mix = edge * edge * (3 - 2 * edge); // keep-original weight
      if (mix >= 1) continue;
      for (let x = 0; x < W; x++) {
        const isl = fbmWrap(x / W, y / H, 9, 4);
        const land = isl > 0.68; // green islands scattered through the blue
        const i = (y * W + x) * 4;
        const tr = land ? (70 + (isl - 0.6) * 300) : 30;
        const tg = land ? 174 : 134;
        const tb = land ? 62 : 218;
        img.data[i] = Math.round(img.data[i] * mix + tr * (1 - mix));
        img.data[i + 1] = Math.round(img.data[i + 1] * mix + tg * (1 - mix));
        img.data[i + 2] = Math.round(img.data[i + 2] * mix + tb * (1 - mix));
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  // tile 4× around the equator — the departure camera sits close to the
  // surface, and tiling is what keeps the ground from turning to mush
  tex.repeat.set(4, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* ── MOON: fbm regolith, dark maria seas, ~80 rim-lit craters ── */
function makeMoonSurfaceTexture(size = 1024): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size / 2;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(c.width, c.height);
  const W = c.width;
  const H = c.height;
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const base = 148 + fbmWrap(u, v, 9, 5) * 60;
      const maria = fbmWrap(u, v, 3, 3);
      const m = maria > 0.56 ? (maria - 0.56) / 0.44 : 0;
      const g = base * (1 - m * 0.42);
      const i = (y * W + x) * 4;
      img.data[i] = g * 1.02;
      img.data[i + 1] = g * 0.99;
      img.data[i + 2] = g * 0.92;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 84; i++) {
    const x = Math.random() * W;
    const y = H * 0.08 + Math.random() * H * 0.84;
    const r = 2 + Math.random() * Math.random() * 26;
    if (x < r + 2 || x > W - r - 2) continue; // keep the wrap seam clean
    const fg = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
    fg.addColorStop(0, "rgba(52,48,44,0.5)");
    fg.addColorStop(0.72, "rgba(96,90,84,0.28)");
    fg.addColorStop(0.86, "rgba(232,226,214,0.5)");
    fg.addColorStop(1, "rgba(232,226,214,0)");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* VERMILION — rust world: fbm terrain, albedo provinces, craters, caps */
function makeRockyPlanetTexture(size = 1024): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size / 2;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(c.width, c.height);
  const W = c.width;
  const H = c.height;
  for (let y = 0; y < H; y++) {
    const v = y / H;
    const lat = Math.abs(v - 0.5) * 2;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const warp = fbmWrap(u, v, 4, 3) * 0.4;
      const e = fbmWrap(u + warp * 0.3, v + warp * 0.2, 6, 5);
      const prov = fbmWrap(u, v, 2.4, 3);
      const dk = prov > 0.58 ? (prov - 0.58) / 0.42 : 0;
      let r = 150 + e * 84;
      let g = 86 + e * 52;
      let b = 48 + e * 30;
      r *= 1 - dk * 0.38;
      g *= 1 - dk * 0.42;
      b *= 1 - dk * 0.4;
      const cap = lat + (e - 0.5) * 0.14 - 0.88;
      if (cap > 0) {
        const k = Math.min(1, cap / 0.1);
        r += (242 - r) * k;
        g += (240 - g) * k;
        b += (236 - b) * k;
      }
      const i = (y * W + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * W;
    const y = H * 0.1 + Math.random() * H * 0.8;
    const r = 2 + Math.random() * Math.random() * 16;
    if (x < r + 2 || x > W - r - 2) continue;
    const cg = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    cg.addColorStop(0, "rgba(40,16,8,0.42)");
    cg.addColorStop(0.7, "rgba(70,32,16,0.2)");
    cg.addColorStop(0.85, "rgba(235,180,140,0.34)");
    cg.addColorStop(1, "rgba(235,180,140,0)");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* AURELIA — ringed giant: thin noise-wobbled belts + a swirling storm */
function makeGasGiantTexture(size = 1024): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size / 2;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(c.width, c.height);
  const W = c.width;
  const H = c.height;
  const belts: Array<[number, number, number]> = [
    [232, 207, 168], [217, 168, 106], [192, 123, 66], [226, 189, 141],
    [176, 106, 56], [238, 217, 180], [201, 138, 78], [169, 92, 46],
    [224, 185, 132], [212, 154, 94], [186, 118, 62], [230, 198, 152],
  ];
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const wob = (fbmWrap(u, v, 6, 4) - 0.5) * 0.09 + (fbmWrap(u, v, 18, 3) - 0.5) * 0.028;
      const bv = v * 11 + wob * 11;
      const bi = Math.floor(((bv % 12) + 12) % 12);
      const bf = ((bv % 1) + 1) % 1;
      const b0 = belts[bi];
      const b1 = belts[(bi + 1) % 12];
      const s = bf * bf * (3 - 2 * bf);
      const shade = 0.92 + fbmWrap(u, v, 24, 2) * 0.16;
      const i = (y * W + x) * 4;
      img.data[i] = Math.min(255, (b0[0] + (b1[0] - b0[0]) * s) * shade);
      img.data[i + 1] = Math.min(255, (b0[1] + (b1[1] - b0[1]) * s) * shade);
      img.data[i + 2] = Math.min(255, (b0[2] + (b1[2] - b0[2]) * s) * shade);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const sx = W * 0.66;
  const sy = H * 0.6;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(1.7, 1);
  for (const [rr, col] of [
    [54, "rgba(224,168,120,0.5)"],
    [40, "rgba(196,88,44,0.65)"],
    [24, "rgba(240,196,150,0.7)"],
    [10, "rgba(252,226,196,0.8)"],
  ] as const) {
    const g = ctx.createRadialGradient(0, 0, rr * 0.2, 0, 0, rr);
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(180,80,40,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* Ice giant: smooth teal → deep blue, faint wisps, bright polar haze */
function makeIceGiantTexture(size = 1024): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size / 2;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(c.width, c.height);
  const W = c.width;
  const H = c.height;
  const bands: Array<[number, number, number]> = [
    [128, 196, 208], [86, 158, 178], [58, 122, 152], [44, 96, 134],
    [70, 140, 164], [98, 172, 190], [52, 108, 142], [120, 184, 200],
  ];
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const wob = (fbmWrap(u, v, 5, 4) - 0.5) * 0.12;
      const bv = v * 8 + wob * 8;
      const bi = Math.floor(((bv % 8) + 8) % 8);
      const bf = ((bv % 1) + 1) % 1;
      const b0 = bands[bi];
      const b1 = bands[(bi + 1) % 8];
      const s = bf * bf * (3 - 2 * bf);
      const wisp = fbmWrap(u, v, 16, 3);
      const bright = wisp > 0.62 ? (wisp - 0.62) / 0.38 : 0;
      const i = (y * W + x) * 4;
      img.data[i] = Math.min(255, (b0[0] + (b1[0] - b0[0]) * s) * 0.94 + bright * 90);
      img.data[i + 1] = Math.min(255, (b0[1] + (b1[1] - b0[1]) * s) * 0.96 + bright * 92);
      img.data[i + 2] = Math.min(255, (b0[2] + (b1[2] - b0[2]) * s) * 0.98 + bright * 86);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (const py of [0.05, 0.95]) {
    const g = ctx.createRadialGradient(W * 0.5, H * py, 0, W * 0.5, H * py, H * 0.3);
    g.addColorStop(0, "rgba(235,250,255,0.55)");
    g.addColorStop(1, "rgba(235,250,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* Spiral galaxy — warm core, two soft blue arms (for deep-space depth) */
function makeGalaxyTexture(size = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.18);
  core.addColorStop(0, "rgba(255,238,214,0.95)");
  core.addColorStop(0.5, "rgba(255,214,170,0.4)");
  core.addColorStop(1, "rgba(255,200,150,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(cx, cy);
  for (const rot of [0, Math.PI / 2]) {
    ctx.save();
    ctx.rotate(rot);
    const ag = ctx.createRadialGradient(0, 0, size * 0.05, 0, 0, size * 0.48);
    ag.addColorStop(0, "rgba(190,205,255,0.34)");
    ag.addColorStop(0.6, "rgba(150,170,255,0.12)");
    ag.addColorStop(1, "rgba(140,160,255,0)");
    ctx.fillStyle = ag;
    ctx.scale(1, 0.32);
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* Ring belt for the gas giant — radial density strips with gaps */
function makeRingTexture(w = 1024, h = 64): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  for (let x = 0; x < w; x++) {
    const t = x / w;
    let a = 0.16 + (0.5 * (Math.abs(Math.sin(t * 40) + Math.sin(t * 13) * 0.5))) / 1.5;
    if (t > 0.42 && t < 0.5) a *= 0.12;
    if (t > 0.78 && t < 0.81) a *= 0.25;
    if (t < 0.06) a *= t / 0.06;
    if (t > 0.97) a *= (1 - t) / 0.03;
    const warm = 200 + Math.floor(Math.sin(t * 90) * 24 + Math.random() * 18);
    ctx.fillStyle = `rgba(${warm},${Math.max(90, warm - 42)},${Math.max(60, warm - 82)},${Math.min(0.85, Math.max(0, a))})`;
    ctx.fillRect(x, 0, 1, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface Puff {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  lifespan: number;
  baseScale: number;
  grow: number;
  baseOpacity: number;
  active: boolean;
}

export default function RocketCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // a quiet line for the ones who open devtools — with a working hint
    try {
      console.log(
        "%c /\\\n/  \\\n| ■  |  MESKAT ALAM · VIBE CODER — this whole flight is hand-coded, sir.\n|    |  curiosity logged · clearance +1\n/| /\\ |\\\nGODMODE: ↑ ↑ ↓ ↓ ← → ← → B A   ·   or type \"warp\"   ·   or shake your phone\nmore secrets: /#godmode · /#orion · /#dotseekx · tap the footer name ×3 · double-click the TV tube",
        "color:#ff8b3d;font-weight:bold;font-family:monospace;font-size:12px;line-height:1.35"
      );
    } catch {}

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 768px)").matches || "ontouchstart" in window;

    // ── renderer / scene / camera ─────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.6 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 8000);
    camera.position.set(0, 6.2, 26);

    // ── post-processing: cinematic bloom ──────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth / (isMobile ? 2 : 1), window.innerHeight / (isMobile ? 2 : 1)),
      isMobile ? 0.42 : 0.5,
      0.45,
      0.8
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // ── lights ────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x4a3c44, 0.75));
    const key = new THREE.DirectionalLight(0xffd2a0, 1.35);
    key.position.set(-30, 24, -60);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7a5e72, 0.65);
    rim.position.set(20, 12, 24);
    scene.add(rim);
    const flameLight = new THREE.PointLight(0xff7a2a, 0, 90, 1.5);
    scene.add(flameLight);

    // xenon spotlights on the pad (aimed at the rocket)
    const spotA = new THREE.SpotLight(0xfff0dc, 0, 80, 0.55, 0.65, 1.4);
    spotA.position.set(-7, 3.4, 7);
    scene.add(spotA, spotA.target);
    const spotB = new THREE.SpotLight(0xfff0dc, 0, 80, 0.55, 0.65, 1.4);
    spotB.position.set(8, 3.4, -6);
    scene.add(spotB, spotB.target);

    // deep-space sun: only wakes up on the planet-hopper leg so the worlds
    // get a hard, believable day side (like a distant K-class star)
    const deepSun = new THREE.DirectionalLight(0xfff1dc, 0);
    deepSun.position.set(140, 70, 260);
    scene.add(deepSun, deepSun.target);

    // orbital-corridor fill lights — the station, the wheel and every world
    // must never sink into a black silhouette against the void
    const stationLight = new THREE.DirectionalLight(0xfff2df, 0);
    scene.add(stationLight, stationLight.target);
    const stationGlowLight = new THREE.PointLight(0xffd9a8, 0, 70, 1.6);
    scene.add(stationGlowLight);
    const wheelLight = new THREE.DirectionalLight(0xfff2df, 0);
    scene.add(wheelLight, wheelLight.target);

    // ── textures ──────────────────────────────────────────────
    const smokeTex = makeRadialTexture([
      [0, "rgba(216,208,212,0.85)"],
      [0.4, "rgba(170,162,168,0.4)"],
      [1, "rgba(135,127,135,0)"],
    ]);
    // bluish-white water-deluge steam — the T-0 carpet is bright white
    const steamTex = makeRadialTexture([
      [0, "rgba(245,244,246,0.9)"],
      [0.4, "rgba(214,214,222,0.42)"],
      [1, "rgba(190,190,200,0)"],
    ]);
    const fireTex = makeRadialTexture([
      [0, "rgba(255,228,175,1)"],
      [0.3, "rgba(255,150,60,0.85)"],
      [0.65, "rgba(255,90,30,0.35)"],
      [1, "rgba(255,60,20,0)"],
    ]);
    const sparkTex = makeRadialTexture([
      [0, "rgba(255,246,220,1)"],
      [0.35, "rgba(255,180,80,0.8)"],
      [1, "rgba(255,120,40,0)"],
    ], 32);
    const cloudTex = makeRadialTexture(
      [
        [0, "rgba(238,228,228,0.55)"],
        [0.5, "rgba(205,195,200,0.2)"],
        [1, "rgba(185,175,185,0)"],
      ],
      256
    );
    const glowTex = makeRadialTexture([
      [0, "rgba(255,180,110,0.9)"],
      [0.4, "rgba(255,120,50,0.35)"],
      [1, "rgba(255,90,30,0)"],
    ]);
    const sunTex = makeRadialTexture([
      [0, "rgba(255,244,224,1)"],
      [0.18, "rgba(255,214,150,0.95)"],
      [0.42, "rgba(255,150,80,0.4)"],
      [1, "rgba(255,120,60,0)"],
    ]);
    const starTex = makeRadialTexture(
      [
        [0, "rgba(255,255,255,1)"],
        [0.45, "rgba(255,240,225,0.55)"],
        [1, "rgba(255,240,225,0)"],
      ],
      32
    );
    const diamondTex = makeDiamondTexture();
    const earthCloudsTex = makeCloudLayerTexture(isMobile ? 512 : 1024);
    const earthSurfTex = makeEarthSurfaceTexture(isMobile ? 512 : 1024);
    const moonTex = makeMoonSurfaceTexture(isMobile ? 512 : 1024);
    const galaxyTex = makeGalaxyTexture();
    const groundTex = makeGroundTexture();
    const solarTex = makeSolarTexture();
    const atmoRingTex = makeAtmoRingTexture();
    const rockyTex = makeRockyPlanetTexture(isMobile ? 512 : 1024);
    const gasTex = makeGasGiantTexture(isMobile ? 512 : 1024);
    const iceTex = makeIceGiantTexture(isMobile ? 512 : 1024);
    const ringTex = makeRingTexture();
    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    [rockyTex, gasTex, iceTex, ringTex, earthCloudsTex, earthSurfTex, moonTex].forEach((t) => (t.anisotropy = maxAniso));

    // ── rocket (detailed vehicle) ─────────────────────────────
    const seg = isMobile ? 20 : 32;
    const rocket = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf1e9d7, roughness: 0.32, metalness: 0.55 });
    const sootMat = new THREE.MeshStandardMaterial({ color: 0xc9bda6, roughness: 0.55, metalness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x18131a, roughness: 0.45, metalness: 0.72 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xff8b3d, roughness: 0.34, metalness: 0.42 });
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x2c2428, roughness: 0.3, metalness: 0.9 });

    // stack: engine skirt → sooty base → main body → taper → nose
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.76, 1.0, seg), sootMat);
    skirt.position.y = 0.68;
    rocket.add(skirt);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 4.2, seg), bodyMat);
    body.position.y = 3.05;
    rocket.add(body);
    const topSection = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.72, seg), bodyMat);
    topSection.position.y = 5.5;
    rocket.add(topSection);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, seg), accentMat);
    nose.position.y = 6.6;
    rocket.add(nose);
    const interstage = new THREE.Mesh(new THREE.CylinderGeometry(0.624, 0.624, 0.26, seg), darkMat);
    interstage.position.y = 4.62;
    rocket.add(interstage);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.628, 0.628, 0.16, seg), accentMat);
    stripe.position.y = 3.9;
    rocket.add(stripe);

    // porthole
    const porthole = new THREE.Mesh(
      new THREE.CircleGeometry(0.19, 24),
      new THREE.MeshStandardMaterial({ color: 0x0e0a12, roughness: 0.15, metalness: 0.85 })
    );
    porthole.position.set(0, 3.5, 0.622);
    rocket.add(porthole);
    const portholeRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 10, 28), accentMat);
    portholeRing.position.set(0, 3.5, 0.615);
    rocket.add(portholeRing);

    // grid fins ×4 (titanium dark)
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.36, 0.05), darkMat);
      const a = (i / 4) * Math.PI * 2;
      fin.position.set(Math.sin(a) * 0.66, 5.16, Math.cos(a) * 0.66);
      fin.rotation.y = a;
      rocket.add(fin);
    }
    // landing legs ×4, folded against the base
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.24), darkMat);
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      leg.position.set(Math.sin(a) * 0.72, 1.35, Math.cos(a) * 0.72);
      leg.rotation.y = a;
      leg.rotation.x = 0.1;
      rocket.add(leg);
    }
    // engine bay + bells
    const engineBay = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.34, seg), darkMat);
    engineBay.position.y = 0.05;
    rocket.add(engineBay);
    const bellCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.32, 0.46, 16, 1, true), engineMat);
    bellCenter.position.y = -0.34;
    rocket.add(bellCenter);
    for (let i = 0; i < 4; i++) {
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 0.32, 12, 1, true), engineMat);
      const a = (i / 4) * Math.PI * 2;
      bell.position.set(Math.sin(a) * 0.34, -0.26, Math.cos(a) * 0.34);
      rocket.add(bell);
    }

    // ── plume (shock diamonds + vacuum expansion) ─────────────
    const plumeGroup = new THREE.Group();
    plumeGroup.position.y = -0.5;
    rocket.add(plumeGroup);

    const plumeOuterMat = new THREE.MeshBasicMaterial({
      map: diamondTex,
      color: 0xffa14d,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const plumeOuter = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.4, seg, 1, true), plumeOuterMat);
    plumeOuter.rotation.x = Math.PI;
    plumeOuter.position.y = -1.7;
    plumeGroup.add(plumeOuter);

    const plumeInnerMat = new THREE.MeshBasicMaterial({
      color: 0xffe7c0,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const plumeInner = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.9, 16, 1, true), plumeInnerMat);
    plumeInner.rotation.x = Math.PI;
    plumeInner.position.y = -0.95;
    plumeGroup.add(plumeInner);

    const flameGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTex, color: 0xffa050, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    flameGlow.scale.setScalar(6);
    flameGlow.position.y = -1.1;
    plumeGroup.add(flameGlow);
    plumeGroup.visible = false;

    rocket.scale.setScalar(isMobile ? 0.74 : 1);
    scene.add(rocket);

    // ── launch complex (LC at dusk) ───────────────────────────
    const pad = new THREE.Group();

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(800, 64),
      new THREE.MeshStandardMaterial({ map: groundTex, color: 0x9a939e, roughness: 0.96, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    pad.add(ground);

    const concrete = new THREE.Mesh(
      new THREE.CylinderGeometry(9.5, 11, 0.55, 48),
      new THREE.MeshStandardMaterial({ color: 0x3c3a40, roughness: 0.9, metalness: 0.08 })
    );
    concrete.position.y = 0.27;
    pad.add(concrete);

    // flame trench: dark slot under the vehicle + deflect ramps
    const trenchSlot = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.1, 7.6),
      new THREE.MeshStandardMaterial({ color: 0x070509, roughness: 1 })
    );
    trenchSlot.position.y = 0.56;
    pad.add(trenchSlot);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x2e2c33, roughness: 0.85 });
    [1, -1].forEach((s) => {
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.18, 3.4), rampMat);
      ramp.position.set(0, 0.9, s * 4.4);
      ramp.rotation.x = s * -0.42;
      pad.add(ramp);
    });

    // strongback tower: lattice truss with retracting service arm
    const tower = new THREE.Group();
    tower.position.set(-3.6, 0, -0.4);
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x232028, roughness: 0.55, metalness: 0.68 });
    for (const [cx, cz] of [[-0.72, -0.72], [0.72, -0.72], [-0.72, 0.72], [0.72, 0.72]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 12.2, 8), steelMat);
      col.position.set(cx, 6.1, cz);
      tower.add(col);
    }
    for (let h = 1.1; h <= 11.5; h += 1.05) {
      const rungX = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.055, 0.055), steelMat);
      rungX.position.set(0, h, 0.72);
      tower.add(rungX);
      const rungX2 = rungX.clone();
      rungX2.position.z = -0.72;
      tower.add(rungX2);
      const rungZ = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 1.44), steelMat);
      rungZ.position.set(0.72, h, 0);
      tower.add(rungZ);
      const rungZ2 = rungZ.clone();
      rungZ2.position.x = -0.72;
      tower.add(rungZ2);
      if (Math.round(h * 100) % 210 < 60) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.9), steelMat);
        brace.position.set(0.72, h + 0.5, 0);
        brace.rotation.x = 0.75;
        tower.add(brace);
        const brace2 = brace.clone();
        brace2.position.x = -0.72;
        tower.add(brace2);
      }
    }
    // crane arm at the top
    const crane = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), steelMat);
    crane.position.set(0.5, 13.2, 0);
    crane.rotation.z = 0.5;
    tower.add(crane);
    pad.add(tower);

    // service arm on a pivot — retracts before liftoff
    const armPivot = new THREE.Group();
    armPivot.position.set(-2.6, 4.7, -0.4);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.55), steelMat);
    arm.position.x = 1.1;
    armPivot.add(arm);
    const armTruss = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.4), steelMat);
    armTruss.position.set(1.1, 0.3, 0);
    armPivot.add(armTruss);
    pad.add(armPivot);

    // lightning masts ×3 with beacon tips
    const beaconTexMat = () =>
      new THREE.SpriteMaterial({ map: glowTex, color: 0xff4444, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    const masts: THREE.Sprite[] = [];
    const mastSpots: Array<[number, number]> = [[16, -13], [-26, 30], [-4, -19]];
    mastSpots.forEach(([mx, mz]) => {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 16, 8), steelMat);
      mast.position.set(mx, 8, mz);
      pad.add(mast);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 8), steelMat);
      tip.position.set(mx, 16.3, mz);
      pad.add(tip);
      const beacon = new THREE.Sprite(beaconTexMat());
      beacon.scale.setScalar(1.4);
      beacon.position.set(mx, 16.8, mz);
      masts.push(beacon);
      pad.add(beacon);
    });

    // water tower
    const waterTank = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 20, 14),
      new THREE.MeshStandardMaterial({ color: 0x8d8880, roughness: 0.5, metalness: 0.55 })
    );
    waterTank.position.set(9.5, 5.4, 7);
    pad.add(waterTank);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 4.8, 6), steelMat);
      leg.position.set(9.5 + Math.sin(a) * 0.7, 2.4, 7 + Math.cos(a) * 0.7);
      leg.rotation.z = Math.sin(a) * 0.12;
      leg.rotation.x = -Math.cos(a) * 0.12;
      pad.add(leg);
    }

    // xenon spotlight glow sprites on poles
    const xenoMat = new THREE.SpriteMaterial({ map: sunTex, color: 0xfff4e2, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const xenos: Array<[number, number]> = [[-7, 7], [8, -6], [-8.5, -5], [7.5, 7.5]];
    xenos.forEach(([xx, xz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.2, 6), steelMat);
      pole.position.set(xx, 1.6, xz);
      pad.add(pole);
      const glow = new THREE.Sprite(xenoMat.clone());
      glow.scale.setScalar(2.1);
      glow.position.set(xx, 3.35, xz);
      pad.add(glow);
    });

    // perimeter lights
    const periMat = new THREE.MeshBasicMaterial({ color: 0xffc966 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), periMat);
      dot.position.set(Math.sin(a) * 18.5, 0.55, Math.cos(a) * 18.5);
      pad.add(dot);
    }

    // ── the wider spaceport: assembly building, hangars, tank farm, a
    //    second mount, a lit service road — real surroundings that keep
    //    the world readable while the vehicle climbs away ──
    const bldMat = new THREE.MeshStandardMaterial({ color: 0x241f2b, roughness: 0.88, metalness: 0.12 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    const vab = new THREE.Mesh(new THREE.BoxGeometry(17, 13, 10), bldMat);
    vab.position.set(-62, 6.5, -44);
    pad.add(vab);
    const vabDoor = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 11),
      new THREE.MeshStandardMaterial({ color: 0x191521, roughness: 0.9 })
    );
    vabDoor.position.set(-62, 5.6, -38.94);
    pad.add(vabDoor);
    const vabWin = new THREE.Mesh(new THREE.PlaneGeometry(15.6, 0.4), winMat);
    vabWin.position.set(-62, 10.4, -38.9);
    pad.add(vabWin);
    // quonset hangars
    [[-36, -10, 0.35], [-44, 10, -0.25]].forEach(([hx, hz, hr]) => {
      const hg = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 10, 18, 1, false, 0, Math.PI), bldMat);
      hg.rotation.z = Math.PI / 2;
      hg.rotation.y = hr;
      hg.position.set(hx, 0.15, hz);
      pad.add(hg);
    });
    // cryo tank farm
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xd8d3ca, roughness: 0.42, metalness: 0.5 });
    [[26, -6], [31, -12]].forEach(([tx, tz]) => {
      const tank = new THREE.Mesh(new THREE.SphereGeometry(1.7, 18, 14), tankMat);
      tank.position.set(tx, 1.8, tz);
      pad.add(tank);
    });
    [[22, -13], [35, -4]].forEach(([tx, tz]) => {
      const hTank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 5.2, 16), tankMat);
      hTank.rotation.x = Math.PI / 2;
      hTank.position.set(tx, 1.3, tz);
      pad.add(hTank);
    });
    // a second launch mount in the distance
    const mount2 = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 4, 0.5, 24),
      new THREE.MeshStandardMaterial({ color: 0x37343c, roughness: 0.9 })
    );
    mount2.position.set(48, 0.25, -64);
    pad.add(mount2);
    for (let i = 0; i < 3; i++) {
      const mm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 12, 6), steelMat);
      mm.position.set(48 + Math.sin(i * 2.1) * 2.6, 6, -64 + Math.cos(i * 2.1) * 2.6);
      pad.add(mm);
    }
    const mount2Beacon = new THREE.Sprite(beaconTexMat());
    mount2Beacon.scale.setScalar(1.2);
    mount2Beacon.position.set(48, 12.6, -64);
    masts.push(mount2Beacon); // blinks with the lightning masts
    pad.add(mount2Beacon);
    // service road + edge dots
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 60),
      new THREE.MeshStandardMaterial({ color: 0x191622, roughness: 0.95 })
    );
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = 0.5;
    road.position.set(-26, 0.06, -20);
    pad.add(road);
    for (let i = 0; i < 10; i++) {
      const rr = 6 + i * 5.4;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), periMat);
      dot.position.set(-26 + Math.sin(0.5) * rr, 0.35, -20 + Math.cos(0.5) * rr);
      pad.add(dot);
    }
    // a glittering city far beyond the fence — the reason the dusk horizon
    // stays recognizable while everything else falls away
    const cityLightMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffb877, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
    const cityLights: THREE.Sprite[] = [];
    for (let i = 0; i < (isMobile ? 22 : 46); i++) {
      const s = new THREE.Sprite(cityLightMat.clone());
      const a = Math.random() * Math.PI * 2;
      const r = 58 + Math.random() * 115;
      const sc = 1.0 + Math.random() * 2.0;
      s.scale.set(sc * 1.7, sc, 1);
      s.position.set(Math.sin(a) * r, 0.4 + Math.random() * 1.8, Math.cos(a) * r);
      s.userData.tw = Math.random() * Math.PI * 2;
      pad.add(s);
      cityLights.push(s);
    }

    // ── ground life around the pad: crawler, landing pads, a retired
    //    booster on display, dishes, guard booth, service vehicles —
    //    the pad must read as a WORKED place, not a stage set ──
    {
      // crawler-transporter parked on the crawlerway
      const crawler = new THREE.Group();
      crawler.position.set(16, 0, 15);
      crawler.rotation.y = -0.55;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 3.4), steelMat);
      deck.position.y = 1.45;
      crawler.add(deck);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 1.2), steelMat);
      cab.position.set(-2.3, 2.3, 1.05);
      crawler.add(cab);
      for (let i = 0; i < 4; i++) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.75, 12), darkMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(-1.8 + (i % 2) * 3.6, 0.55, i < 2 ? -1.25 : 1.25);
        crawler.add(w);
      }
      const crawlerBeacon = new THREE.Sprite(beaconTexMat());
      crawlerBeacon.scale.setScalar(0.9);
      crawlerBeacon.position.set(-2.3, 3.1, 1.05);
      masts.push(crawlerBeacon);
      crawler.add(crawlerBeacon);
      pad.add(crawler);

      // two flyback landing pads with crossed X markings + corner lights
      const lpMat = new THREE.MeshStandardMaterial({ color: 0x45424a, roughness: 0.92 });
      [[20, 6], [27, -4]].forEach(([lx, lz]) => {
        const lp = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.9, 0.24, 26), lpMat);
        lp.position.set(lx, 0.12, lz);
        pad.add(lp);
        [0.7, -0.7].forEach((rk) => {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.03, 0.5), periMat);
          bar.position.set(lx, 0.26, lz);
          bar.rotation.y = rk;
          pad.add(bar);
        });
        [[1.9, 1.9], [-1.9, 1.9], [1.9, -1.9], [-1.9, -1.9]].forEach(([dx, dz]) => {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), periMat);
          dot.position.set(lx + dx, 0.3, lz + dz);
          pad.add(dot);
        });
      });

      // the rocket garden — a retired booster standing on display
      const garden = new THREE.Group();
      garden.position.set(-17, 0, 11);
      garden.rotation.y = 0.4;
      const oldBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 6.2, 18), sootMat);
      oldBody.position.y = 3.1;
      garden.add(oldBody);
      const oldNose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 18), sootMat);
      oldNose.position.y = 6.6;
      garden.add(oldNose);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const ol = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.7, 0.22), darkMat);
        ol.position.set(Math.sin(a) * 0.75, 0.55, Math.cos(a) * 0.75);
        ol.rotation.z = Math.sin(a) * 0.5;
        ol.rotation.x = -Math.cos(a) * 0.5;
        garden.add(ol);
      }
      const gardenSpot = new THREE.Sprite(xenoMat.clone());
      gardenSpot.scale.setScalar(1.6);
      gardenSpot.position.set(0.9, 1.2, 0.9);
      garden.add(gardenSpot);
      pad.add(garden);

      // comms dish array on two mounds
      const moundMat = new THREE.MeshStandardMaterial({ color: 0x0c0910, roughness: 1 });
      [[-22, -16, 0.6], [30, -22, -0.4]].forEach(([dx, dz, dr]) => {
        const mound = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), moundMat);
        mound.position.set(dx, 0, dz);
        pad.add(mound);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.6, 8), steelMat);
        mast.position.set(dx, 1.6, dz);
        pad.add(mast);
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.18, 0.5, 16, 1, true), steelMat);
        dish.position.set(dx, 2.6, dz);
        dish.rotation.z = dr;
        pad.add(dish);
      });

      // security gate: fence posts, gate, guard booth with a warm window
      const fenceMat = new THREE.MeshStandardMaterial({ color: 0x1c1922, roughness: 0.85, metalness: 0.3 });
      for (let i = 0; i < 9; i++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.7, 0.09), fenceMat);
        post.position.set(6 + i * 3.1, 0.85, 24);
        pad.add(post);
      }
      const gateBar = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 0.12), fenceMat);
      gateBar.position.set(19, 1.1, 24);
      pad.add(gateBar);
      const booth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.35, 1.4), fenceMat);
      booth.position.set(21.6, 0.68, 23);
      pad.add(booth);
      const boothWin = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), winMat);
      boothWin.position.set(21.6, 0.95, 22.29);
      pad.add(boothWin);

      // two ground-support vehicles with amber beacons
      [[7, 12, 0.9], [-9, 13, -0.3]].forEach(([vx, vz, vr]) => {
        const truck = new THREE.Group();
        truck.position.set(vx, 0, vz);
        truck.rotation.y = vr;
        const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.8), steelMat);
        bed.position.y = 0.55;
        truck.add(bed);
        const cab2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.75), darkMat);
        cab2.position.set(0.9, 1.05, 0);
        truck.add(cab2);
        const tb = new THREE.Sprite(beaconTexMat());
        tb.scale.setScalar(0.55);
        tb.position.set(0.9, 1.5, 0);
        masts.push(tb);
        truck.add(tb);
        pad.add(truck);
      });

      // helium tank cluster + flag pole
      [[14, -9], [15.4, -10], [13.4, -10.6]].forEach(([hx, hz]) => {
        const ht = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.1, 14), tankMat);
        ht.position.set(hx, 1.15, hz);
        pad.add(ht);
      });
      const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.4, 8), steelMat);
      flagPole.position.set(5.5, 1.7, 10);
      pad.add(flagPole);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(1.05, 0.62),
        new THREE.MeshStandardMaterial({ color: 0xff6a2e, roughness: 0.8, side: THREE.DoubleSide })
      );
      flag.position.set(6.05, 2.95, 10);
      pad.add(flag);

      // a floodlight bank watching the deck
      const floodPole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.6, 8), steelMat);
      floodPole.position.set(-12, 2.3, -13);
      pad.add(floodPole);
      const floodGlow = new THREE.Sprite(xenoMat.clone());
      floodGlow.scale.setScalar(2.6);
      floodGlow.position.set(-12, 4.8, -13);
      pad.add(floodGlow);
    }

    // ground haze
    const hazeMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.16, depthWrite: false });
    for (let i = 0; i < (isMobile ? 4 : 7); i++) {
      const h = new THREE.Sprite(hazeMat.clone());
      const hs = 24 + Math.random() * 30;
      h.scale.set(hs, hs * 0.24, 1);
      h.position.set((Math.random() - 0.5) * 70, 1.6 + Math.random() * 2.2, (Math.random() - 0.5) * 50);
      pad.add(h);
    }

    // distant hills + far city glow
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x0c0910, roughness: 1 });
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + Math.random() * 0.4;
      const r = 135 + Math.random() * 105;
      const hill = new THREE.Mesh(new THREE.SphereGeometry(16 + Math.random() * 22, 12, 8), hillMat);
      hill.scale.y = 0.1 + Math.random() * 0.1;
      hill.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      pad.add(hill);
    }
    const cityGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a4a, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    cityGlow.scale.set(70, 9, 1);
    cityGlow.position.set(160, 3.5, -200);
    pad.add(cityGlow);

    const horizonGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a4a, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    horizonGlow.scale.set(100, 16, 1);
    horizonGlow.position.y = 2;
    pad.add(horizonGlow);
    scene.add(pad);

    // sun low on the horizon (dusk) — sinks away as we climb
    const sun = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: sunTex, color: 0xffe0b0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    sun.scale.setScalar(21);
    sun.position.set(-190, 13, -430);
    scene.add(sun);

    // ── Earth (curved limb + clouds + atmosphere rim) ─────────
    const earth = new THREE.Group();
    const EARTH_R = 1500;
    const earthBodyMat = new THREE.MeshStandardMaterial({
      map: earthSurfTex,
      emissiveMap: earthSurfTex, // the planet carries its own colors — warm pad
      emissive: 0xffffff, //      lights can never turn it beige or black
      emissiveIntensity: 0.72,
      color: 0xdcecdc, // green-tinted light — the planet must read ALIVE
      roughness: 0.66,
      metalness: 0.06,
      toneMapped: false, // skip ACES — tonemapping was graying the oceans out
      transparent: true,
      opacity: 0,
    });
    const earthBody = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, isMobile ? 64 : 96, isMobile ? 44 : 72), earthBodyMat);
    earth.add(earthBody);
    const earthCloudsMat = new THREE.MeshStandardMaterial({
      map: earthCloudsTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      roughness: 0.9,
      emissive: 0x2a3a4a,
      emissiveIntensity: 0.15,
    });
    const earthClouds = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.005, isMobile ? 48 : 72, isMobile ? 32 : 48), earthCloudsMat);
    earth.add(earthClouds);
    // atmosphere halo — a soft additive ring hugging the limb (sprite, depth-tested)
    const atmoSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: atmoRingTex, color: 0xbcd4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    atmoSprite.scale.set(4450, 4450, 1);
    earth.add(atmoSprite);
    earth.position.set(0, -EARTH_R - 4, 0);
    // CRITICAL: the departure camera hovers over the sphere's TOP point —
    // untilted, that is the polar ice cap, so Earth always read gray/white.
    // A 66° tilt parks the equator under the camera: oceans and continents.
    earth.rotation.x = 1.15;
    earth.visible = false;
    scene.add(earth);

    // soft "sunrise" fill so the camera-facing side reads as ocean, not void
    const earthSun = new THREE.DirectionalLight(0xd8ecdc, 0);
    earthSun.position.set(0, 0, 120);
    scene.add(earthSun, earthSun.target);
    // sky/ground hemisphere fill — the departing limb must never read as a
    // pitch-black disc against the void
    const earthFill = new THREE.HemisphereLight(0xa9d6c2, 0x2a1408, 0);
    scene.add(earthFill);

    // ── orbital space station ─────────────────────────────────
    const station = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xd9d5cc, roughness: 0.52, metalness: 0.26, emissive: 0x14121a, emissiveIntensity: 0.38, transparent: true, opacity: 0 });
    const panelMat = new THREE.MeshStandardMaterial({ map: solarTex, color: 0xcfd8e8, roughness: 0.3, metalness: 0.4, emissive: 0x1d3050, emissiveIntensity: 0.9, transparent: true, opacity: 0 });
    const stationGlowMats: THREE.Material[] = [hullMat, panelMat];

    const truss = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.2, 0.2), hullMat);
    station.add(truss);
    [-2.4, 2.4].forEach((mx) => {
      const mod = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 2.8, 16), hullMat);
      mod.rotation.z = Math.PI / 2;
      mod.position.x = mx;
      station.add(mod);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 12), hullMat);
      cap.position.x = mx + Math.sign(mx) * 1.4;
      station.add(cap);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 20), hullMat);
      ring.position.x = mx + Math.sign(mx) * 1.72;
      ring.rotation.y = Math.PI / 2;
      station.add(ring);
    });
    const habitat = new THREE.Mesh(new THREE.SphereGeometry(0.66, 20, 16), hullMat);
    habitat.position.y = 0.55;
    station.add(habitat);
    const dockTunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 12), hullMat);
    dockTunnel.position.y = 0.28;
    station.add(dockTunnel);
    [-3.9, -5.6, 3.9, 5.6].forEach((px) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.05, 1.0), panelMat);
      wing.position.set(px + Math.sign(px) * 0.6, 0, 0);
      wing.rotation.y = 0;
      station.add(wing);
      const spar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), hullMat);
      spar.position.set(px, 0, 0);
      station.add(spar);
    });
    [-1.2, 1.2].forEach((rx) => {
      const radiator = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.55), hullMat);
      radiator.position.set(rx, -0.55, 0.1);
      radiator.rotation.x = 0.2;
      station.add(radiator);
    });
    // second habitat sphere + node — a bigger, lived-in complex
    const habitat2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 14), hullMat);
    habitat2.position.set(-0.4, -0.62, 0.25);
    station.add(habitat2);
    const node = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 12), hullMat);
    node.rotation.x = Math.PI / 2;
    node.position.set(-0.4, -0.3, 0.25);
    station.add(node);
    // comms antenna mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8), hullMat);
    mast.position.set(0.4, 1.35, 0);
    station.add(mast);
    const antenna = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.2, 10, 1, true), hullMat);
    antenna.position.set(0.4, 1.95, 0);
    station.add(antenna);

    // lived-in hardware: lit window strips, a second truss with its own
    // solar wings, a docked crew capsule and a robotic arm — the outpost
    // reads as a WORKED place, not a silhouette in the dark
    const stationWinMats: THREE.MeshBasicMaterial[] = [];
    const addWin = (x: number, y: number, z: number, w = 0.3, h = 0.06) => {
      const wm = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0 });
      stationWinMats.push(wm);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wm);
      win.position.set(x, y, z);
      station.add(win);
    };
    [-3.3, -2.6, -1.9, 1.9, 2.6, 3.3].forEach((wx) => {
      addWin(wx, 0.05, 0.465);
      addWin(wx, 0.05, -0.465);
    });
    const truss2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.14), hullMat);
    truss2.position.set(0, -0.05, 0.55);
    station.add(truss2);
    [-0.9, 0.9].forEach((px) => {
      [-1, 1].forEach((sd) => {
        const w2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.78), panelMat);
        w2.position.set(px + sd * 0.8, -0.05, 0.55);
        station.add(w2);
      });
    });
    // docked crew capsule on the forward node
    const capsule = new THREE.Group();
    const capBody = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 0.4, 12), hullMat);
    capBody.rotation.x = Math.PI / 2;
    capsule.add(capBody);
    const capNose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.18, 12), hullMat);
    capNose.rotation.x = Math.PI / 2;
    capNose.position.z = 0.28;
    capsule.add(capNose);
    capsule.position.set(-0.4, -0.3, 0.72);
    station.add(capsule);
    // robotic arm reaching over the truss
    const armSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.72, 8), hullMat);
    armSeg1.position.set(0.85, 0.18, 0.3);
    armSeg1.rotation.z = 0.72;
    station.add(armSeg1);
    const armSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.5, 8), hullMat);
    armSeg2.position.set(1.2, 0.45, 0.3);
    armSeg2.rotation.z = -0.5;
    station.add(armSeg2);
    // arm wrist joint + claw so the arm doesn't end mid-air
    const armWrist = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), hullMat);
    armWrist.position.set(1.42, 0.56, 0.3);
    station.add(armWrist);
    const armClaw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), hullMat);
    armClaw.position.set(1.48, 0.58, 0.3);
    station.add(armClaw);

    // ── detail pass (user: "station aro details add koro") — every piece
    //    below uses hullMat/panelMat so the group fade still owns it ──
    // docked PROGRESS cargo craft on the second truss, nose-out for departure
    const cargo = new THREE.Group();
    const cargoBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 12), hullMat);
    cargoBody.rotation.x = Math.PI / 2;
    cargo.add(cargoBody);
    const cargoCollar = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 8, 16), hullMat);
    cargoCollar.position.z = -0.27;
    cargo.add(cargoCollar);
    [-1, 1].forEach((sd) => {
      const cwp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.42), panelMat);
      cwp.position.set(sd * 0.5, 0, 0.05);
      cargo.add(cwp);
    });
    cargo.position.set(0.9, -0.05, 0.55);
    station.add(cargo);
    // parabolic high-gain comms dish on the mast
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), hullMat);
    dish.position.set(0.4, 2.14, 0.08);
    dish.rotation.x = Math.PI * 0.86;
    station.add(dish);
    const dishFeed = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), hullMat);
    dishFeed.position.set(0.4, 2.2, 0.16);
    dishFeed.rotation.x = Math.PI * 0.82;
    station.add(dishFeed);
    // pressurized fuel tanks clustered by the second habitat
    [-0.86, -0.68].forEach((tx, i) => {
      const tank = new THREE.Mesh(new THREE.SphereGeometry(0.14 + i * 0.03, 12, 10), hullMat);
      tank.position.set(tx, -0.78 - i * 0.1, -0.2 + i * 0.34);
      station.add(tank);
    });
    // greebles: life-support boxes, batteries and EVA handrails along the spine
    const greebles: Array<[number, number, number, number]> = [
      [2.9, 0.18, 0.18, 0.12],
      [-1.7, 0.16, -0.18, 0.1],
      [1.3, -0.2, 0.2, 0.14],
      [-3.1, 0.2, 0.14, 0.09],
    ];
    greebles.forEach(([gx, gy, gz, gs]) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(gs, gs * 0.7, gs * 0.9), hullMat);
      box.position.set(gx, gy, gz);
      box.rotation.y = (gx > 0 ? 1 : -1) * 0.22;
      station.add(box);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, gs * 2.1, 6), hullMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(gx, gy - gs * 0.75, gz + gs * 0.7);
      station.add(rail);
    });
    // porthole cluster on the second habitat + a capsule window
    [-0.62, -0.4, -0.18].forEach((py) => {
      addWin(-0.4, py, 0.68, 0.08, 0.08);
      addWin(-0.4, py, -0.18, 0.08, 0.08);
    });
    addWin(-0.4, -0.3, 0.86, 0.09, 0.07); // crew capsule porthole

    // navigation strobes — port red / starboard green on the solar wings
    const stationNav: THREE.Sprite[] = [];
    const navPort = new THREE.Sprite(beaconTexMat());
    navPort.material.color.set(0xff5348);
    navPort.scale.setScalar(0.5);
    navPort.position.set(-7.3, 0, 0.3);
    station.add(navPort);
    stationNav.push(navPort);
    const navStar = new THREE.Sprite(beaconTexMat());
    navStar.material.color.set(0x51ff8e);
    navStar.scale.setScalar(0.5);
    navStar.position.set(7.3, 0, 0.3);
    station.add(navStar);
    stationNav.push(navStar);
    // belly strobe facing the corridor
    const navBelly = new THREE.Sprite(beaconTexMat());
    navBelly.material.color.set(0xffd9a8);
    navBelly.scale.setScalar(0.42);
    navBelly.position.set(0, -0.85, 0.42);
    station.add(navBelly);
    stationNav.push(navBelly);

    const stationBeacon = new THREE.Sprite(beaconTexMat());
    stationBeacon.scale.setScalar(1.1);
    stationBeacon.position.set(4.8, 0.4, 0);
    station.add(stationBeacon);
    station.position.set(-13, 116, -32);
    station.rotation.z = 0.16;
    station.scale.setScalar(1.7);
    station.visible = false;
    scene.add(station);

    // an unmanned supply craft loiters just off the corridor — orbit is busy
    const supply = new THREE.Group();
    const supHull = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.55, 10), hullMat);
    supHull.rotation.z = Math.PI / 2;
    supply.add(supHull);
    [-1, 1].forEach((sd) => {
      const wp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.5), panelMat);
      wp.position.x = sd * 0.55;
      supply.add(wp);
    });
    const supDock = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16), hullMat);
    supDock.rotation.y = Math.PI / 2;
    supDock.position.x = 0.34;
    supply.add(supDock);
    supply.visible = false;
    scene.add(supply);

    // ── SECOND station: a rotating centrifuge wheel further down the
    //    corridor — deep space is inhabited, not empty ──
    const wheelMats: THREE.Material[] = [];
    const wheelRimMat = new THREE.MeshStandardMaterial({ color: 0xd5cfc2, roughness: 0.52, metalness: 0.26, emissive: 0x14121a, emissiveIntensity: 0.4, transparent: true, opacity: 0 });
    const wheelPanelMat = new THREE.MeshStandardMaterial({ map: solarTex, color: 0xcfd8e8, roughness: 0.3, metalness: 0.4, emissive: 0x1d3050, emissiveIntensity: 0.95, transparent: true, opacity: 0 });
    wheelMats.push(wheelRimMat, wheelPanelMat);
    const wheel = new THREE.Group();
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.34, 12, 42), wheelRimMat);
    wheel.add(wheelRim);
    const rimInner = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.12, 8, 42), wheelRimMat);
    wheel.add(rimInner);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.3, 8), wheelRimMat);
      spoke.position.set(Math.cos(a) * 1.65, Math.sin(a) * 1.65, 0);
      spoke.rotation.z = a + Math.PI / 2;
      wheel.add(spoke);
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.55), wheelRimMat);
      pod.position.set(Math.cos(a) * 3.15, Math.sin(a) * 3.15, 0);
      pod.rotation.z = a;
      wheel.add(pod); // habitat pods hanging on the rim
    }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.85, 18, 14), wheelRimMat);
    wheel.add(hub);
    const dockTube = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.5, 10), wheelRimMat);
    dockTube.rotation.x = Math.PI / 2;
    dockTube.position.z = 1.2;
    wheel.add(dockTube);
    const dockPort = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 8, 18), wheelRimMat);
    dockPort.position.z = 1.95;
    wheel.add(dockPort);
    [-1, 1].forEach((sd) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.04, 0.95), wheelPanelMat);
      wing.position.x = sd * 1.85;
      wheel.add(wing);
      const spar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.06), wheelRimMat);
      spar.position.x = sd * 0.95;
      wheel.add(spar);
    });
    const wheelBeacons: THREE.Sprite[] = [];
    [[3.4, 0], [-3.4, 0], [0, 3.4]].forEach(([bx2, by2]) => {
      const b = new THREE.Sprite(beaconTexMat());
      b.scale.setScalar(1.1);
      b.position.set(bx2, by2, 0);
      wheel.add(b);
      wheelBeacons.push(b);
    });
    wheel.position.set(46, 120, -280);
    wheel.scale.setScalar(1.7);
    wheel.visible = false;
    scene.add(wheel);

    // ── moon (with crater mottling) ───────────────────────────
    const moon = new THREE.Group();
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      color: 0xd8cfc0,
      roughness: 0.94,
      metalness: 0,
      emissive: 0x6a5c48,
      emissiveIntensity: 0.28,
      transparent: true,
      opacity: 0,
    });
    const moonBody = new THREE.Mesh(new THREE.SphereGeometry(40, 36, 28), moonMat);
    moon.add(moonBody);
    const craterMat = new THREE.MeshStandardMaterial({ color: 0xb5a88f, roughness: 1, transparent: true, opacity: 0 });
    const craterSpots: Array<[number, number, number, number]> = [
      [12, 18, 20, 7], [-18, 8, 14, 9], [4, -20, 26, 6], [-8, 26, -6, 5], [22, -4, -12, 8], [-24, -16, -8, 7],
    ];
    craterSpots.forEach(([cx, cy, cz, cr]) => {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(cr, 12, 8), craterMat);
      spot.position.set(cx, cy, cz).normalize().multiplyScalar(39.2);
      spot.lookAt(0, 0, 0);
      spot.scale.set(1, 1, 0.25);
      moon.add(spot);
    });
    const moonHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTex, color: 0xe8d0a8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    moonHalo.scale.setScalar(190);
    moon.add(moonHalo);
    moon.visible = false;
    scene.add(moon);

    // ── the planet hopper leg: three worlds on the deep-space corridor ──
    interface PlanetSpec {
      j0: number;
      j1: number;
      radius: number;
      side: 1 | -1;
      spin: number;
      haloColor: number;
      haloScale: number;
      tiltZ: number;
      hold?: boolean; // destination world: approaches and parks in view at J=1
    }
    const planetSpecs: Array<PlanetSpec & { group: THREE.Group; mats: THREE.Material[] }> = [];
    const buildPlanet = (
      spec: PlanetSpec,
      mat: THREE.MeshStandardMaterial,
      ring?: { tex: THREE.Texture; inner: number; outer: number; opacity: number }
    ) => {
      const group = new THREE.Group();
      const segs = isMobile ? 40 : 64;
      const body = new THREE.Mesh(new THREE.SphereGeometry(spec.radius, segs, Math.round(segs * 0.7)), mat);
      group.add(body);
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: atmoRingTex,
          color: spec.haloColor,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      halo.scale.setScalar(spec.radius * spec.haloScale);
      group.add(halo);
      const mats: THREE.Material[] = [mat];
      if (ring) {
        const ringGeo = new THREE.RingGeometry(ring.inner, ring.outer, isMobile ? 72 : 128, 1);
        // remap the ring texture across the annulus
        const pos = ringGeo.attributes.position as THREE.BufferAttribute;
        const uv = ringGeo.attributes.uv as THREE.BufferAttribute;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i);
          const t = (v3.length() - ring.inner) / (ring.outer - ring.inner);
          uv.setXY(i, t, 0.5);
        }
        const ringMat = new THREE.MeshBasicMaterial({
          map: ring.tex,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.25;
        group.add(ringMesh);
        mats.push(ringMat);
        ringMesh.userData.isRing = true;
      }
      group.rotation.z = spec.tiltZ;
      group.visible = false;
      scene.add(group);
      planetSpecs.push({ ...spec, group, mats });
    };

    const rockyMat = new THREE.MeshStandardMaterial({
      map: rockyTex,
      roughness: 0.94,
      metalness: 0.01,
      emissive: 0x2a1105,
      emissiveIntensity: 0.22,
      transparent: true,
      opacity: 0,
    });
    buildPlanet(
      { j0: 0.72, j1: 0.86, radius: 60, side: -1, spin: 0.05, haloColor: 0xff9a5e, haloScale: 3.1, tiltZ: 0.08 },
      rockyMat
    );

    const gasMat = new THREE.MeshStandardMaterial({
      map: gasTex,
      roughness: 0.82,
      metalness: 0.01,
      emissive: 0x1d1004,
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0,
    });
    buildPlanet(
      { j0: 0.81, j1: 0.94, radius: 84, side: 1, spin: 0.075, haloColor: 0xffc890, haloScale: 2.9, tiltZ: 0.3 },
      gasMat,
      { tex: ringTex, inner: 84 * 1.38, outer: 84 * 2.35, opacity: 0.9 }
    );

    const iceMat = new THREE.MeshStandardMaterial({
      map: iceTex,
      roughness: 0.62,
      metalness: 0.04,
      emissive: 0x081824,
      emissiveIntensity: 0.24,
      transparent: true,
      opacity: 0,
    });
    buildPlanet(
      { j0: 0.9, j1: 1.0, radius: 70, side: -1, spin: 0.06, haloColor: 0x9fd8ff, haloScale: 3.0, tiltZ: -0.12, hold: true },
      iceMat
    );

    // destination moonlet — a small ice companion circling GLACIUS; part of
    // the finale so arriving somewhere actually LOOKS like arriving
    const moonletPivot = new THREE.Group();
    moonletPivot.rotation.x = 0.35;
    moonletPivot.visible = false;
    scene.add(moonletPivot);
    const moonletMat = new THREE.MeshStandardMaterial({ color: 0xdfeef4, roughness: 0.72, metalness: 0.05, transparent: true, opacity: 0 });
    const moonlet = new THREE.Mesh(new THREE.SphereGeometry(7.5, 20, 14), moonletMat);
    moonlet.position.set(112, 0, 0);
    moonletPivot.add(moonlet);

    // ── asteroid drift field on the deep corridor (parallax + tumble) ──
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x93816f, roughness: 0.96, metalness: 0.04, transparent: true, opacity: 0 });
    const rockGroup = new THREE.Group();
    rockGroup.position.set(0, 150, -750);
    scene.add(rockGroup);
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockCount = isMobile ? 20 : 42;
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    const rockM = new THREE.Matrix4();
    const rockQ = new THREE.Quaternion();
    const rockE = new THREE.Euler();
    const rockP = new THREE.Vector3();
    const rockS = new THREE.Vector3();
    for (let i = 0; i < rockCount; i++) {
      rockP.set((Math.random() - 0.5) * 1100, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 1000);
      rockE.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rockQ.setFromEuler(rockE);
      const s = 2.2 + Math.random() * 13;
      rockS.set(s, s * (0.7 + Math.random() * 0.5), s * (0.7 + Math.random() * 0.5));
      rockM.compose(rockP, rockQ, rockS);
      rocks.setMatrixAt(i, rockM);
    }
    rocks.instanceMatrix.needsUpdate = true;
    rockGroup.add(rocks);
    rockGroup.visible = false;

    // ── deep-space nebulae (faint, warm) ──────────────────────
    const nebulaDefs: Array<[number, number, number, number, number, number]> = [
      // x, y, z, scale, color, opacity
      [-620, 480, -1850, 620, 0x9a5570, 0.1],
      [760, 300, -1950, 760, 0x8a5a3a, 0.08],
      [260, 640, -2000, 540, 0x6a4a7a, 0.07],
    ];
    const nebulae = nebulaDefs.map(([nx, ny, nz, ns, nc, no]) => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: cloudTex, color: nc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      s.position.set(nx, ny, nz);
      s.scale.set(ns, ns * 0.72, 1);
      s.userData.baseOpacity = no;
      scene.add(s);
      return s;
    });

    // ── satellites sharing the corridor — you are NOT alone up here ──
    interface SatSpec {
      pos: [number, number, number];
      j0: number;
      j1: number;
      spin: number;
      scale: number;
    }
    const satSpecs: Array<{
      spec: SatSpec;
      group: THREE.Group;
      mats: THREE.Material[];
      beacon: THREE.Sprite;
    }> = [];
    const satHullMat = () =>
      new THREE.MeshStandardMaterial({ color: 0xcfa14e, roughness: 0.42, metalness: 0.75, transparent: true, opacity: 0 });
    const satPanelMat = () =>
      new THREE.MeshStandardMaterial({
        map: solarTex,
        color: 0xbcc8dd,
        roughness: 0.3,
        metalness: 0.6,
        emissive: 0x16263f,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0,
      });
    const satDefs: SatSpec[] = [
      { pos: [-30, 104, -118], j0: 0.5, j1: 0.72, spin: 0.4, scale: 1.2 },
      { pos: [48, 162, -300], j0: 0.56, j1: 0.8, spin: -0.3, scale: 1.6 },
      { pos: [-46, 218, -520], j0: 0.64, j1: 0.9, spin: 0.26, scale: 2.1 },
    ];
    satDefs.forEach((spec) => {
      const group = new THREE.Group();
      const hm = satHullMat();
      const pm = satPanelMat();
      const satBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.15), hm);
      group.add(satBody);
      [-1, 1].forEach((sd) => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 0.9), pm);
        wing.position.x = sd * 1.85;
        group.add(wing);
        const spar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.06), hm);
        spar.position.x = sd * 0.95;
        group.add(spar);
      });
      const dish = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.22, 12, 1, true), hm);
      dish.position.set(0, 0.62, 0);
      dish.rotation.x = Math.PI;
      group.add(dish);
      const beacon = new THREE.Sprite(beaconTexMat());
      beacon.scale.setScalar(1.6);
      beacon.position.set(0, 0.95, 0);
      group.add(beacon);
      group.position.set(...spec.pos);
      group.scale.setScalar(spec.scale);
      group.visible = false;
      scene.add(group);
      satSpecs.push({ spec, group, mats: [hm, pm], beacon });
    });

    // ── a comet crossing the deep corridor, tail streaming off the sun ──
    const comet = new THREE.Group();
    const cometNucleus = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: sunTex, color: 0xdff2ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    cometNucleus.scale.setScalar(9);
    comet.add(cometNucleus);
    const cometTailMat = new THREE.SpriteMaterial({ map: cloudTex, color: 0x9fd8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const cometTail = new THREE.Sprite(cometTailMat);
    cometTail.scale.set(88, 16, 1);
    cometTail.position.set(47, 5, 0);
    comet.add(cometTail);
    comet.visible = false;
    scene.add(comet);

    // ── orbital debris field near the station corridor (tiny metal shards) ──
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0xb9b3a9, roughness: 0.35, metalness: 0.85, transparent: true, opacity: 0 });
    const debrisGroup = new THREE.Group();
    debrisGroup.position.set(0, 150, -380);
    scene.add(debrisGroup);
    const debrisGeo = new THREE.TetrahedronGeometry(1, 0);
    const debrisCount = isMobile ? 12 : 26;
    const debrisMesh = new THREE.InstancedMesh(debrisGeo, debrisMat, debrisCount);
    {
      const dm = new THREE.Matrix4();
      const dq = new THREE.Quaternion();
      const de = new THREE.Euler();
      const dp = new THREE.Vector3();
      const ds = new THREE.Vector3();
      for (let i = 0; i < debrisCount; i++) {
        dp.set((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 170, (Math.random() - 0.5) * 520);
        de.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        dq.setFromEuler(de);
        const s = 0.6 + Math.random() * 2.4;
        ds.set(s, s, s);
        dm.compose(dp, dq, ds);
        debrisMesh.setMatrixAt(i, dm);
      }
      debrisMesh.instanceMatrix.needsUpdate = true;
    }
    debrisGroup.add(debrisMesh);
    debrisGroup.visible = false;

    // ── a far ringed giant, silent on the horizon of the corridor ──
    const farGiant = new THREE.Group();
    const farGiantMat = new THREE.MeshStandardMaterial({
      map: gasTex,
      color: 0x93a8c8,
      roughness: 0.82,
      metalness: 0.01,
      emissive: 0x0c1220,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0,
    });
    farGiant.add(new THREE.Mesh(new THREE.SphereGeometry(46, 32, 24), farGiantMat));
    const farRingGeo = new THREE.RingGeometry(60, 105, 96, 1);
    {
      // radial UV remap, same trick as buildPlanet's rings
      const fpos = farRingGeo.attributes.position as THREE.BufferAttribute;
      const fuv = farRingGeo.attributes.uv as THREE.BufferAttribute;
      const fv = new THREE.Vector3();
      for (let i = 0; i < fpos.count; i++) {
        fv.fromBufferAttribute(fpos, i);
        const tt = (fv.length() - 60) / (105 - 60);
        fuv.setXY(i, tt, 0.5);
      }
    }
    const farRingMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const farRing = new THREE.Mesh(farRingGeo, farRingMat);
    farRing.rotation.x = Math.PI / 2.4;
    farGiant.add(farRing);
    farGiant.position.set(-640, 340, -1750);
    farGiant.rotation.z = 0.1;
    farGiant.visible = false;
    scene.add(farGiant);

    // ── two faint spiral galaxies for impossible depth ─────────
    const galaxies: THREE.Sprite[] = [];
    [
      [-880, 520, -1850, 460, 0.16],
      [820, -40, -1650, 330, 0.12],
    ].forEach(([gx, gy, gz, gs, go]) => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: galaxyTex, color: 0xcdd6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      s.position.set(gx, gy, gz);
      s.scale.set(gs, gs, 1);
      s.userData.baseOpacity = go;
      scene.add(s);
      galaxies.push(s);
    });

    // ── stars on a sky shell ──────────────────────────────────
    const starMat = new THREE.PointsMaterial({
      color: 0xfff1dd,
      size: 5.5,
      map: starTex,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const brightMat = new THREE.PointsMaterial({
      color: 0xffd9a8,
      size: 13,
      map: starTex,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const makeStars = (count: number) => {
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        if (v.y < -0.35) v.y = -0.35 + Math.random() * 0.2; // fewer stars straight below
        v.multiplyScalar(1750 + Math.random() * 350);
        pos[i * 3] = v.x;
        pos[i * 3 + 1] = v.y;
        pos[i * 3 + 2] = v.z;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      return new THREE.Points(g, starMat);
    };
    const stars = makeStars(isMobile ? 700 : 1600);
    scene.add(stars);
    const brightStars = makeStars(isMobile ? 50 : 110);
    brightStars.material = brightMat;
    scene.add(brightStars);

    // ── clouds (flying past during ascent) ────────────────────
    const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.5, depthWrite: false });
    const clouds: THREE.Sprite[] = [];
    const cloudCount = isMobile ? 16 : 30;
    for (let i = 0; i < cloudCount; i++) {
      const s = new THREE.Sprite(cloudMat.clone());
      const sc = 20 + Math.random() * 34;
      s.scale.set(sc, sc * (0.4 + Math.random() * 0.28), 1);
      const bx = (Math.random() - 0.5) * 66;
      // spread through the whole climb corridor so something streams past
      // at every altitude during the ascent
      s.position.set(bx, 6 + Math.random() * 155, -14 + Math.random() * 26);
      s.material.opacity = 0.26 + Math.random() * 0.3;
      s.userData.baseX = bx; // drift oscillates around the corridor, never wanders
      clouds.push(s);
      scene.add(s);
    }

    // ── THE SKY HAS ADDRESSES — atmosphere layer markers the vehicle
    //    physically flies through: a HUD label + haze band at each
    //    boundary, plus the sky phenomena real to that layer ──
    const dispFam =
      getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "system-ui";
    const layerTexs: THREE.CanvasTexture[] = [];
    const layerDefs = [
      { y: 15, name: "TROPOSPHERE", sub: "0 – 12 KM · WEATHER LIVES HERE" },
      { y: 37, name: "STRATOSPHERE", sub: "12 – 50 KM · OZONE DECK" },
      { y: 59, name: "MESOSPHERE", sub: "50 – 85 KM · COLDEST SKY" },
      { y: 83, name: "THERMOSPHERE", sub: "85 – 600 KM · AURORA GATE" },
      { y: 113, name: "EXOSPHERE", sub: "600 KM + · THE EDGE OF THE SKY" },
    ];
    const layerMarkers = layerDefs.map((L) => {
      const tex = makeLayerLabelTexture(L.name, L.sub, dispFam);
      layerTexs.push(tex);
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false })
      );
      const sc = isMobile ? 21 : 27;
      s.scale.set(sc, sc * (200 / 640), 1);
      s.position.set(-20, L.y, -9);
      scene.add(s);
      return { ...L, sprite: s };
    });
    // faint haze band at each boundary — the edge you pass THROUGH
    const layerBands = layerDefs.map((L) => {
      const b = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: cloudTex, color: 0xcfd8ee, transparent: true, opacity: 0, depthWrite: false })
      );
      b.scale.set(340, 5.5, 1);
      b.position.set(0, L.y, -34);
      scene.add(b);
      return { y: L.y, sprite: b };
    });
    // layer phenomena: nacreous pearls (strato), electric noctilucent
    // wisps (meso), aurora ribbons (thermo) — each gated to its altitude
    interface WispGate { s: THREE.Sprite; mid: number; half: number; base: number }
    const wispGates: WispGate[] = [];
    const makeWisp = (color: number, w: number, h: number, x: number, y: number, z: number, rz: number, base: number, half: number) => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: cloudTex, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      s.scale.set(w, h, 1);
      s.position.set(x, y, z);
      s.rotation.z = rz;
      scene.add(s);
      wispGates.push({ s, mid: y, half, base });
      return s;
    };
    // stratosphere — pearl-smooth mother-of-pearl clouds
    makeWisp(0xffe4ee, 46, 2.6, -26, 32, -26, 0.05, 0.13, 9);
    makeWisp(0xffdce8, 62, 2.2, 22, 41, -34, -0.07, 0.11, 9);
    makeWisp(0xffe9f2, 38, 2.0, -14, 47, -22, 0.04, 0.12, 9);
    // mesosphere — noctilucent electric-blue filaments
    makeWisp(0x9fd8ff, 58, 1.9, -30, 54, -30, 0.1, 0.17, 8);
    makeWisp(0xb8e4ff, 44, 1.6, 26, 58, -36, -0.08, 0.15, 8);
    makeWisp(0x8fd0ff, 66, 2.1, 4, 62, -40, 0.06, 0.14, 8);
    // thermosphere — aurora curtains
    const auroras: THREE.Sprite[] = [];
    [
      [-44, 74, -60, 110, 13, 0.16],
      [52, 86, -74, 130, 15, 0.13],
      [-8, 96, -88, 150, 17, 0.1],
    ].forEach(([ax, ay, az, aw, ah, ao]) => {
      const s = makeWisp(0x39ffb0, aw, ah, ax, ay, az, 0.12, ao, 30);
      auroras.push(s);
    });

    // ── CELESTIAL SIGNAGE — every world and satellite announces itself,
    //    the way the atmosphere layers do: a HUD nameplate that slides
    //    past as the vehicle flies by. Depth-scaled so a far moon and a
    //    near station both read at the same visual size. ──
    const bodyTexs: THREE.CanvasTexture[] = [];
    const makeBodyLabel = (title: string, sub: string) => {
      const tex = makeLayerLabelTexture(title, sub, dispFam);
      bodyTexs.push(tex);
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false })
      );
      s.renderOrder = 30;
      s.visible = false;
      scene.add(s);
      return s;
    };
    const moonLabel = makeBodyLabel("LUNA", "EARTH'S MOON · 384,400 KM");
    const stationLabel = makeBodyLabel("HARMONY STATION", "CREWED OUTPOST · LOW ORBIT");
    const wheelLabel = makeBodyLabel("CENTRIFUGE WHEEL", "ROTATING HABITAT · 0.25 G");
    const satLabels = [
      makeBodyLabel("RELAY-1", "COMMS SATELLITE · LEO"),
      makeBodyLabel("RELAY-2", "WEATHER SATELLITE · POLAR"),
      makeBodyLabel("RELAY-3", "DEEP SPACE RELAY"),
    ];
    const planetLabels = [
      makeBodyLabel("VERMILION", "RUST WORLD · IRON DESERT"),
      makeBodyLabel("AURELIA", "GAS GIANT · RINGED"),
      makeBodyLabel("GLACIUS", "ICE WORLD · DESTINATION"),
    ];
    const moonletLabel = makeBodyLabel("GLACIUS I", "ICE COMPANION · CAPTURED MOON");
    const earthLabel = makeBodyLabel("EARTH", "HOME · 8 BILLION · YOU ARE LEAVING");
    const labelW = (z: number) => {
      const depth = Math.max(30, camera.position.z - z);
      return Math.min(95, Math.max(9, depth * 0.107));
    };
    const placeLabel = (s: THREE.Sprite, ax: number, ay: number, az: number, top: number, op: number) => {
      const w = labelW(az);
      s.visible = op > 0.015;
      if (!s.visible) {
        s.material.opacity = 0;
        return;
      }
      s.position.set(ax, ay + top + w * 0.36, az);
      s.scale.set(w, w * (200 / 640), 1);
      s.material.opacity = Math.min(0.95, op);
    };

    // ── particle pools ────────────────────────────────────────
    const makePool = (count: number, tex: THREE.Texture, blending: THREE.Blending): Puff[] => {
      const pool: Puff[] = [];
      for (let i = 0; i < count; i++) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, blending, depthWrite: false }));
        sprite.visible = false;
        scene.add(sprite);
        pool.push({ sprite, vel: new THREE.Vector3(), life: 0, lifespan: 1, baseScale: 1, grow: 0, baseOpacity: 1, active: false });
      }
      return pool;
    };
    const smokePool = makePool(isMobile ? 130 : 260, smokeTex, THREE.NormalBlending);
    const steamPool = makePool(isMobile ? 70 : 130, steamTex, THREE.NormalBlending);
    const firePool = makePool(isMobile ? 46 : 90, fireTex, THREE.AdditiveBlending);
    const sparkPool = makePool(isMobile ? 24 : 44, sparkTex, THREE.AdditiveBlending);
    // wind streaks — elongated sprites that scream past the camera during the
    // climb so the ascent reads as SPEED, not a floating toy
    const streakTex = makeRadialTexture(
      [
        [0, "rgba(235,228,238,0.5)"],
        [0.5, "rgba(235,228,238,0.18)"],
        [1, "rgba(235,228,238,0)"],
      ],
      64
    );
    const streakPool = makePool(isMobile ? 14 : 30, streakTex, THREE.AdditiveBlending);
    let smokeIdx = 0;
    let steamIdx = 0;
    let fireIdx = 0;
    let sparkIdx = 0;
    let streakIdx = 0;

    const spawn = (
      pool: Puff[],
      idxRef: { i: number },
      origin: THREE.Vector3,
      spread: number,
      vel: THREE.Vector3,
      lifespan: number,
      baseScale: number,
      grow: number,
      baseOpacity: number
    ) => {
      const p = pool[idxRef.i % pool.length];
      idxRef.i++;
      p.sprite.visible = true;
      p.active = true;
      p.life = 1;
      p.lifespan = lifespan * (0.7 + Math.random() * 0.6);
      p.baseScale = baseScale * (0.75 + Math.random() * 0.5);
      p.grow = grow;
      p.baseOpacity = baseOpacity;
      p.sprite.position.set(
        origin.x + (Math.random() - 0.5) * spread,
        origin.y + (Math.random() - 0.5) * 0.3,
        origin.z + (Math.random() - 0.5) * spread
      );
      p.vel.copy(vel).add(new THREE.Vector3((Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 2.2));
    };

    // ── state ─────────────────────────────────────────────────
    let smoothJ = 0;
    let mouseX = 0;
    let mouseY = 0;
    let running = true;
    let tilt = 0;
    let hyperT = 0; // GODMODE hyperdrive countdown (konami code)
    const padY = 0.85;
    // deeper void per user note — dusk keeps its warmth, orbit goes near-black
    const skyColors = [new THREE.Color(0x1b0d11), new THREE.Color(0x08060c), new THREE.Color(0x010103)];
    let lastTime = performance.now();
    let elapsed = 0;
    const nozzleWorld = new THREE.Vector3();
    const tmpOrb = new THREE.Vector3();
    const trenchExitA = new THREE.Vector3(-0.6, 1.1, 6.0);
    const trenchExitB = new THREE.Vector3(0.6, 1.1, -6.0);
    let trailAccum = 0; // sub-frame accumulator for the exhaust pillar

    const onMouse = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!isMobile) window.addEventListener("mousemove", onMouse, { passive: true });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    const baseTitle = document.title;
    const onVis = () => {
      running = !document.hidden;
      lastTime = performance.now();
      // hidden touch — leave the tab and ORION politely holds the frequency
      document.title = document.hidden ? "📡 ORION is standing by, sir…" : baseTitle;
    };
    document.addEventListener("visibilitychange", onVis);

    // ── GODMODE — konami code / type "warp" / shake the phone / open /#godmode ──
    const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"];
    let konamiIdx = 0;
    let wordBuf = "";
    let lastWarp = 0;
    const engageHyperdrive = () => {
      const now = Date.now();
      if (now - lastWarp < 2800) return; // already warping — never stack
      lastWarp = now;
      hyperT = 3.4;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate?.([40, 60, 140]);
        } catch {}
      }
      console.log("%cGODMODE", "color:#ffc966;font-weight:bold", "hyperdrive engaged, sir.");
      const chip = document.createElement("div");
      chip.textContent = "GODMODE · HYPERDRIVE ENGAGED";
      chip.style.cssText =
        "position:fixed;left:50%;top:88px;transform:translateX(-50%);z-index:60;pointer-events:none;font-family:var(--font-display),sans-serif;font-size:10px;letter-spacing:0.34em;text-transform:uppercase;color:#ffc966;border:1px solid rgba(255,201,102,0.35);background:rgba(10,7,12,0.72);backdrop-filter:blur(10px);padding:7px 16px;border-radius:999px;text-shadow:0 0 14px rgba(255,201,102,0.6);opacity:0;transition:opacity 300ms";
      document.body.appendChild(chip);
      requestAnimationFrame(() => {
        chip.style.opacity = "1";
      });
      setTimeout(() => {
        chip.style.opacity = "0";
        setTimeout(() => chip.remove(), 400);
      }, 3400);
    };
    const onKonami = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      // layout-proof matching — e.code is the PHYSICAL key, so the sequence
      // works on any keyboard layout (Bengali included); e.key covers engines
      // that don't implement code. The old build compared e.key and failed on
      // non-QWERTY layouts and some soft keyboards.
      const k = e.code || (e.key.length === 1 ? `Key${e.key.toUpperCase()}` : e.key);
      if (k === KONAMI[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) {
          konamiIdx = 0;
          engageHyperdrive();
        }
      } else {
        konamiIdx = k === KONAMI[0] ? 1 : 0;
      }
      // the lazy pilot's konami — just type the word
      if (e.key.length === 1) {
        wordBuf = (wordBuf + e.key.toLowerCase()).slice(-4);
        if (wordBuf === "warp") {
          wordBuf = "";
          engageHyperdrive();
        }
      }
    };
    window.addEventListener("keydown", onKonami);
    // phone edition — shake the device to warp (flows wherever motion events do)
    let lastShake = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      if (Math.abs(a.x) + Math.abs(a.y) + Math.abs(a.z) > 36) {
        const now = Date.now();
        if (now - lastShake > 4000) {
          lastShake = now;
          engageHyperdrive();
        }
      }
    };
    window.addEventListener("devicemotion", onMotion);
    // url edition — open the site with /#godmode and hold on
    let hashTimer: ReturnType<typeof setTimeout> | undefined;
    if (window.location.hash === "#godmode") {
      hashTimer = setTimeout(engageHyperdrive, 1600);
    }

    // ── helpers ───────────────────────────────────────────────
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
    const remap = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
    const ease = (t: number) => t * t * (3 - 2 * t);

    // ── main loop ─────────────────────────────────────────────
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!running) return;
      const dt = Math.min((performance.now() - lastTime) / 1000, 0.05);
      lastTime = performance.now();
      elapsed += dt;
      const t = elapsed;

      const { j } = computeJourney();
      smoothJ += (j - smoothJ) * Math.min(1, dt * 4.5);
      const J = smoothJ;

      // composition + viewport helpers (single definitions, reused below)
      const composeX = window.innerWidth > 900 ? 9.5 : 0;
      const narrow = window.innerWidth < 760 ? 0.5 : 1;

      // MAX-Q — dynamic pressure peaks around 12 km; real vehicles throttle
      // down through it and the ride shakes hardest right there
      const maxQ = Math.exp(-Math.pow((J - 0.3) / 0.045, 2) / 2);

      // throttle: ignition window J 0.10 → 0.22, dipping to 78% through MAX-Q
      const throttle =
        remap(J, 0.1, 0.22) * (1 - 0.25 * remap(J, 0.6, 1)) * (1 - 0.22 * maxQ);
      const ignited = throttle > 0.02;

      // FINALE precompute — when the scroll runs out the ship does NOT park:
      // it settles into a slow, perpetual orbit around GLACIUS, engines
      // spooling down to a gentle insertion burn. Always moving. Never stuck.
      const orbitAmt = ease(remap(J, 0.95, 1));
      const plumeCut = 1 - orbitAmt * 0.72;

      // rocket path — modelled on a real Falcon 9: after ignition the
      // vehicle CLIMBS OFF THE MAST SLOWLY (a few seconds to clear the
      // tower), then the acceleration builds hard into the gravity turn.
      const clearTower = ease(remap(J, 0.12, 0.2)) * 2.6;
      const ascent = clearTower + Math.pow(remap(J, 0.2, 1), 1.9) * 172;
      const rocketY = padY + ascent;
      // a near-vertical gravity ride — the track stays essentially straight
      // up, exactly like the user demanded ("akdom soja bhabe")
      const drift = Math.pow(remap(J, 0.3, 1), 1.4) * 5;
      const recede = Math.pow(remap(J, 0.72, 1), 1.6) * 55;
      rocket.position.set(drift, rocketY, -recede);

      // DEAD-STRAIGHT gravity ride: the stack holds perfectly vertical the
      // whole way up — no banking, no wobble. Planet flybys tug the CAMERA
      // (pull), never the vehicle's attitude. Only a microscopic
      // engine-gimbal vibration remains, as on a real vehicle.
      let pull = 0;
      for (const ps of planetSpecs) {
        const pp = remap(J, ps.j0, ps.j1);
        if (pp > 0 && pp < 1) {
          pull += ps.side * 5.5 * Math.sin(pp * Math.PI);
        }
      }
      tilt += (0 - tilt) * Math.min(1, dt * 4);
      rocket.rotation.z = tilt + (ignited ? Math.sin(t * 34) * 0.0016 * throttle : 0);

      // service arm retracts at ignition
      armPivot.rotation.y = -2.0 * ease(remap(J, 0.1, 0.2));

      // ── plume ────────────────────────────────────────────────
      const flicker = 0.84 + Math.sin(t * 31) * 0.1 + Math.sin(t * 57) * 0.06;
      plumeGroup.visible = ignited;
      const vac = ease(remap(J, 0.5, 0.78)); // plume widens in vacuum
      if (ignited) {
        const px = (0.9 + throttle * 0.3) * (1 + vac * 1.7);
        plumeOuter.scale.set(px, throttle * flicker * 1.08, px);
        plumeInner.scale.set(throttle * flicker * 1.05, throttle * flicker * 1.18, throttle * flicker * 1.05);
        plumeOuterMat.opacity = (0.62 + 0.28 * throttle) * (1 - vac * 0.45);
        flameGlow.material.opacity = 0.55 * throttle;
        flameGlow.scale.setScalar(5 + throttle * 4.5 * flicker);
      } else {
        flameGlow.material.opacity = 0;
      }
      rocket.getWorldPosition(nozzleWorld);
      flameLight.position.copy(nozzleWorld).y -= 1.6;
      flameLight.intensity = ignited ? throttle * 55 * flicker : 0;
      // engines spool down as the ship circles into its parking orbit
      if (plumeCut < 1) {
        plumeOuterMat.opacity *= plumeCut;
        plumeInnerMat.opacity = 0.9 * plumeCut;
        flameGlow.material.opacity *= plumeCut;
        flameLight.intensity *= plumeCut;
      }

      // ── particles ────────────────────────────────────────────
      // Modelled on real Falcon 9 launches: (1) at T-0 the water-deluge
      // steam carpet races OUTWARD along the pad and rolls up the flanks,
      // (2) the engines maintain a bright blinding core under the nozzle,
      // (3) the vehicle leaves a PERSISTENT miles-high exhaust pillar that
      // stays connected all the way back to the pad, (4) wind streaks
      // rush past the camera so the climb reads as violent speed.
      if (ignited && !reduced) {
        // (1a) deluge steam roaring out of the flame trench exits
        if (rocketY < 30) {
          const billow = Math.ceil(throttle * (isMobile ? 4 : 7));
          for (let i = 0; i < billow; i++) {
            const exit = Math.random() > 0.5 ? trenchExitA : trenchExitB;
            const side = exit.z > 0 ? 1 : -1;
            spawn(
              steamPool,
              { i: steamIdx++ },
              exit,
              2.2,
              new THREE.Vector3((Math.random() - 0.5) * 6, 0.8 + Math.random() * 2.2, side * (9 + Math.random() * 8)),
              4.4,
              3.4,
              11,
              0.55 * Math.min(1, throttle * 2)
            );
            if (Math.random() > 0.45) {
              spawn(
                firePool,
                { i: fireIdx++ },
                exit,
                1.0,
                new THREE.Vector3((Math.random() - 0.5) * 8, 0.4, side * (9 + Math.random() * 5)),
                0.55,
                1.5,
                2.2,
                0.75
              );
            }
          }
          // (1b) the iconic T-0 steam carpet — a skirt of white racing
          // outward in a ring around the base of the vehicle
          const carpet = Math.ceil(throttle * (isMobile ? 3 : 6));
          for (let i = 0; i < carpet; i++) {
            const a = Math.random() * Math.PI * 2;
            const rr = 2.5 + Math.random() * 5.5;
            spawn(
              steamPool,
              { i: steamIdx++ },
              new THREE.Vector3(Math.sin(a) * rr, 0.7, Math.cos(a) * rr),
              1.2,
              new THREE.Vector3(Math.sin(a) * (10 + Math.random() * 9), 0.5 + Math.random() * 1.2, Math.cos(a) * (10 + Math.random() * 9)),
              4.8,
              2.8,
              12,
              0.5 * Math.min(1, throttle * 2)
            );
          }
        }
        // (2) direct engine blast under the nozzle while it is near the pad
        if (rocketY < 22) {
          const emit = Math.ceil(throttle * (isMobile ? 3 : 5));
          for (let i = 0; i < emit; i++) {
            spawn(
              smokePool,
              { i: smokeIdx++ },
              nozzleWorld,
              0.8,
              new THREE.Vector3(0, -16 - Math.random() * 10, 0),
              1.15,
              1.6,
              5.2,
              0.32 * Math.min(1, throttle * 2)
            );
            spawn(
              firePool,
              { i: fireIdx++ },
              nozzleWorld,
              0.3,
              new THREE.Vector3(0, -22 - Math.random() * 10, 0),
              0.38,
              1.2,
              0.7,
              0.85
            );
          }
        }
        // (3) THE EXHAUST PILLAR — the "dragon tail". Every frame the
        // engines deposit slow, long-lived smoke exactly at the nozzle's
        // world position, so a continuous column hangs in the sky behind
        // the vehicle from pad to current altitude. This is what was
        // missing: without it the rocket climbed into empty nothing.
        if (rocketY > 1.5 && plumeCut > 0.3) {
          trailAccum += throttle * (isMobile ? 26 : 46) * dt * 60 * 0.016;
          const drops = Math.floor(trailAccum);
          trailAccum -= drops;
          for (let i = 0; i < Math.min(drops, 6); i++) {
            const fresh = i === 0;
            spawn(
              smokePool,
              { i: smokeIdx++ },
              nozzleWorld,
              fresh ? 0.5 : 1.4,
              fresh
                ? new THREE.Vector3(0, -2.5, 0)
                : new THREE.Vector3((Math.random() - 0.5) * 3, -1.5 - Math.random() * 2.5, (Math.random() - 0.5) * 3),
              5.5,
              fresh ? 1.1 : 1.9,
              4.6,
              fresh ? 0.42 : 0.3
            );
            // the column glows near the nozzle — hot core lit by the engines
            if (rocketY < 80 && Math.random() > 0.55) {
              spawn(
                firePool,
                { i: fireIdx++ },
                nozzleWorld,
                0.7,
                new THREE.Vector3(0, -3 - Math.random() * 3, 0),
                0.9,
                1.4,
                1.4,
                0.4
              );
            }
          }
        }
        // (4) wind streaks — elongated sprites rushing downward past the
        // vehicle during the atmospheric leg (pure speed cue)
        if (J > 0.14 && J < 0.55 && rocketY > 4) {
          const streaks = Math.ceil((isMobile ? 1 : 2) * Math.min(1, throttle * 1.6));
          for (let i = 0; i < streaks; i++) {
            const p = streakPool[streakIdx % streakPool.length];
            streakIdx++;
            p.sprite.visible = true;
            p.active = true;
            p.life = 1;
            p.lifespan = 0.55 + Math.random() * 0.35;
            p.baseScale = 0.4;
            p.grow = 0;
            p.baseOpacity = 0.09 + Math.random() * 0.1;
            p.sprite.position.set(
              drift + (Math.random() - 0.5) * 30,
              rocketY + 16 + Math.random() * 26,
              (Math.random() - 0.5) * 24
            );
            p.vel.set(0, -(34 + Math.random() * 26), 0);
            p.sprite.scale.set(p.baseScale, 4.5 + Math.random() * 5, 1);
          }
        }
        // ignition spark shower (start transient only, on the pad)
        if (throttle < 0.55 && rocketY < 12) {
          const sparks = Math.ceil((0.55 - throttle) * (isMobile ? 4 : 7));
          for (let i = 0; i < sparks; i++) {
            const a = Math.random() * Math.PI * 2;
            spawn(
              sparkPool,
              { i: sparkIdx++ },
              new THREE.Vector3(nozzleWorld.x, 1.4, nozzleWorld.z),
              0.6,
              new THREE.Vector3(Math.sin(a) * (9 + Math.random() * 8), 3 + Math.random() * 6, Math.cos(a) * (9 + Math.random() * 8)),
              0.8,
              0.35,
              0.2,
              0.95
            );
          }
        }
        // cryo venting before ignition (quiet white puffs at the top)
        if (!ignited && J < 0.1 && Math.random() > 0.82) {
          spawn(
            smokePool,
            { i: smokeIdx++ },
            new THREE.Vector3(drift + 0.5, rocketY + 5.1, 0.2),
            0.25,
            new THREE.Vector3(1.6 + Math.random(), 0.25, 0.4),
            1.9,
            0.5,
            3.2,
            0.22
          );
        }
      }

      // pool physics
      const step = (pool: Puff[], dtv: number, grav: number) => {
        for (const p of pool) {
          if (!p.active) continue;
          p.life -= dtv / p.lifespan;
          if (p.life <= 0) {
            p.active = false;
            p.sprite.visible = false;
            p.sprite.material.opacity = 0;
            continue;
          }
          p.sprite.position.addScaledVector(p.vel, dtv);
          p.vel.multiplyScalar(1 - dtv * 1.05);
          p.vel.y -= grav * dtv;
          const s = p.baseScale * (1 + p.grow * (1 - p.life));
          p.sprite.scale.set(s, s, 1);
          p.sprite.material.opacity = p.baseOpacity * p.life * (p.life < 0.25 ? p.life / 0.25 : 1);
        }
      };
      step(smokePool, dt, -0.6); // smoke rises (buoyant)
      step(steamPool, dt, -0.35); // deluge steam — bright, lazy, white
      step(firePool, dt, 1.2);
      step(sparkPool, dt, 9);
      // streaks keep their elongated shape — fade out only
      for (const p of streakPool) {
        if (!p.active) continue;
        p.life -= dt / p.lifespan;
        if (p.life <= 0) {
          p.active = false;
          p.sprite.visible = false;
          p.sprite.material.opacity = 0;
          continue;
        }
        p.sprite.position.addScaledVector(p.vel, dt);
        p.sprite.material.opacity = p.baseOpacity * Math.min(1, p.life * 2.4);
      }

      // ── pad fades with altitude — keyed to JOURNEY progress, not raw
      // height: the ground disc (radius 800) sits ABOVE Earth's limb and
      // used to hide the planet for the whole departure leg (the "black /
      // beige Earth" illusion). The pad owns the frame through the ascent,
      // then dissolves into the haze exactly as Earth lights up below. ──
      const padFade = 1 - remap(J, 0.3, 0.52);
      pad.visible = padFade > 0.01;
      if (pad.visible) {
        horizonGlow.material.opacity = 0.26 * padFade;
        cityGlow.material.opacity = 0.2 * padFade;
        const blink = Math.sin(t * 2.6) > 0.55 ? 0.9 : 0.1;
        masts.forEach((b) => (b.material.opacity = blink * padFade));
        spotA.intensity = spotB.intensity = padFade * (10 + throttle * 22) * (0.9 + Math.sin(t * 17) * 0.06);
        spotA.target.position.set(drift, rocketY + 2, 0);
        spotB.target.position.set(drift, rocketY + 2, 0);
        // the city beyond the fence keeps glittering through the climb
        cityLights.forEach((l) => {
          l.material.opacity =
            (0.22 + 0.3 * Math.abs(Math.sin(t * 0.8 + (l.userData.tw as number)))) * padFade;
        });
      } else {
        spotA.intensity = spotB.intensity = 0;
      }

      // ── sun sinks as we leave the ground ─────────────────────
      const sunFade = 1 - remap(J, 0.2, 0.48);
      sun.visible = sunFade > 0.01;
      sun.material.opacity = 0.75 * sunFade;
      sun.position.y = 13 - remap(J, 0, 0.5) * 220;

      // ── clouds fly past ──────────────────────────────────────
      const cloudFade = 1 - remap(J, 0.5, 0.75);
      clouds.forEach((c, i) => {
        c.visible = cloudFade > 0.02;
        c.material.opacity = (0.2 + (i % 3) * 0.1) * cloudFade;
        c.position.x = (c.userData.baseX as number) + Math.sin(t * 0.12 + i) * 3;
      });

      // ── atmosphere layer markers — the sky's addresses slide past ──
      const camMid = rocketY + 2;
      const markerGate = remap(J, 0.14, 0.2); // signage only exists mid-flight
      layerMarkers.forEach((L, i) => {
        const d = Math.abs(camMid - L.y);
        const vis = (d < 13 ? Math.pow(1 - d / 13, 1.2) : 0) * markerGate;
        L.sprite.material.opacity = vis * 0.95;
        L.sprite.position.x = drift - (narrow < 1 ? 14 : 20);
        // markers sink away below once passed, like range signage
        L.sprite.position.y = L.y - remap(camMid - L.y, 0, 13) * 6;
        layerBands[i].sprite.material.opacity = vis * 0.1;
      });
      // layer phenomena gated to their altitudes
      for (let i = 0; i < wispGates.length; i++) {
        const w = wispGates[i];
        const gate = Math.max(0, 1 - Math.abs(camMid - w.mid) / w.half);
        w.s.material.opacity = w.base * gate;
        if (i >= wispGates.length - auroras.length) {
          w.s.rotation.z = 0.12 + Math.sin(t * 0.3 + i) * 0.05; // aurora breathes
        }
      }

      // ── Earth appears with altitude, then sinks away for the lunar flyby ──
      const earthAmt = ease(remap(J, 0.34, 0.58));
      const sinkT = ease(remap(J, 0.55, 0.9));
      const earthSink = sinkT * 950;
      earth.position.y = -EARTH_R - 4 - earthSink;
      earth.visible = earthAmt > 0.01;
      if (earth.visible) {
        const earthVis = earthAmt * (1 - sinkT);
        earthBodyMat.opacity = earthVis;
        earthBodyMat.emissiveIntensity = 0.72 + sinkT * 0.5; // never a black disc
        earthCloudsMat.opacity = earthVis * 0.3; // thin weather veil — the green world must show through
        // atmosphere ring hugs the limb in wide shots, but on the close
        // departure leg the camera sits INSIDE it — fade it before it
        // milks the whole planet out
        atmoSprite.material.opacity = earthVis * 0.75 * (1 - remap(J, 0.44, 0.52) * 0.74);
        earthBody.rotation.y += dt * 0.004;
        earthClouds.rotation.y += dt * 0.0055;
        earthSun.intensity = earthVis * 3.8;
        earthSun.position.set(drift * 0.4, rocketY + 110, 190);
        earthSun.target.position.set(0, earth.position.y, 0);
        earthFill.intensity = earthVis * 1.15;
      } else {
        earthSun.intensity = 0;
        earthFill.intensity = 0;
      }

      // EARTH names itself as you climb away — the first plate after the
      // thermosphere sign, so the departure reads as LEAVING A PLACE
      const earthLabelAmt = earthAmt * (1 - sinkT) * remap(J, 0.42, 0.5);
      placeLabel(earthLabel, drift - 10 * narrow, rocketY - 46, -130, 0, earthLabelAmt);

      // ── space station rendezvous ─────────────────────────────
      const stationAmt = ease(remap(J, 0.5, 0.64));
      station.visible = stationAmt > 0.01;
      if (station.visible) {
        // narrow viewports pull the complex into the corridor so phones
        // get the same rendezvous as desktop
        station.position.set(-13 * narrow + drift * 0.6, 116, -32);
        stationGlowMats.forEach((m) => ((m as THREE.MeshStandardMaterial).opacity = stationAmt));
        stationWinMats.forEach((m) => (m.opacity = stationAmt * 0.95));
        station.rotation.y += dt * 0.06;
        stationBeacon.material.opacity = Math.sin(t * 3.2) > 0.5 ? 0.9 * stationAmt : 0.08 * stationAmt;
        // nav strobes blink in an alternating aviation pattern
        stationNav.forEach((b, i) => {
          b.material.opacity = (i === 2 ? 0.75 : 0.95) * stationAmt * (Math.sin(t * 3.2 + i * Math.PI) > 0.15 ? 1 : 0.06);
        });
        // dedicated corridor lighting — bright hull, warm interior glow
        stationLight.intensity = stationAmt * 2.6;
        stationLight.position.set(station.position.x + 16, station.position.y + 24, station.position.z + 46);
        stationLight.target.position.copy(station.position);
        stationGlowLight.intensity = stationAmt * 30;
        stationGlowLight.position.copy(station.position);
        // the supply craft loiters nearby — orbit is worked, not empty
        supply.visible = stationAmt > 0.01;
        if (supply.visible) {
          supply.position.set(station.position.x + 7.5, station.position.y - 4.5 + Math.sin(t * 0.5) * 0.7, station.position.z + 7);
          supply.rotation.y = t * 0.32;
          supply.rotation.z = 0.18;
        }
        placeLabel(stationLabel, station.position.x, station.position.y, station.position.z, 11, stationAmt * (1 - remap(J, 0.7, 0.8)));
      } else {
        stationLight.intensity = 0;
        stationGlowLight.intensity = 0;
        supply.visible = false;
        stationLabel.visible = false;
        stationLabel.material.opacity = 0;
      }

      // ── second station: the centrifuge wheel ──────────────────
      const wheelAmt = Math.min(remap(J, 0.55, 0.63), 1 - remap(J, 0.76, 0.83));
      wheel.visible = wheelAmt > 0.01;
      if (wheel.visible) {
        wheel.position.set(34 * narrow + drift * 0.8, 92, -225);
        wheel.rotation.z = t * 0.22; // the wheel genuinely spins
        wheelMats.forEach((m) => ((m as THREE.MeshStandardMaterial).opacity = wheelAmt));
        wheelBeacons.forEach((b) => (b.material.opacity = (Math.sin(t * 3.4) > 0.6 ? 0.95 : 0.1) * wheelAmt));
        wheelLight.intensity = wheelAmt * 2.3;
        wheelLight.position.set(wheel.position.x - 14, wheel.position.y + 18, wheel.position.z + 40);
        wheelLight.target.position.copy(wheel.position);
        placeLabel(wheelLabel, wheel.position.x, wheel.position.y, wheel.position.z, 9, wheelAmt);
      } else {
        wheelLight.intensity = 0;
        wheelLabel.visible = false;
        wheelLabel.material.opacity = 0;
      }

      // ── moon approach (early deep-space leg, before the planet hop) ──
      const moonAmt = ease(remap(J, 0.6, 0.72));
      moon.visible = moonAmt > 0.01;
      if (moon.visible) {
        moonMat.opacity = moonAmt;
        craterMat.opacity = moonAmt * 0.8;
        moonHalo.material.opacity = 0.3 * moonAmt;
        moonMat.emissiveIntensity = 0.35 + moonAmt * 0.4;
        moon.position.set(drift + 165, rocketY + 82, -640);
        moon.rotation.y = t * 0.012;
        // the moon names itself as it slides past
        placeLabel(
          moonLabel,
          moon.position.x,
          moon.position.y,
          moon.position.z,
          40,
          moonAmt * remap(J, 0.612, 0.648) * (1 - remap(J, 0.88, 0.96))
        );
      } else {
        moonLabel.visible = false;
        moonLabel.material.opacity = 0;
      }

      // ── planet hopper: approach → abeam flyby → recede, per world ──
      const rockAmt = remap(J, 0.62, 0.74);
      rockGroup.visible = rockAmt > 0.01;
      if (rockGroup.visible) {
        rockMat.opacity = rockAmt * 0.95;
        rockGroup.rotation.y = t * 0.008;
        rockGroup.position.y = 150 + Math.sin(t * 0.05) * 14;
      }
      planetSpecs.forEach((ps, pi) => {
        const p = remap(J, ps.j0, ps.j1);
        ps.group.visible = p > 0.001;
        if (!ps.group.visible) {
          // despawn the nameplate with its world — never leave stale signage
          planetLabels[pi].visible = false;
          planetLabels[pi].material.opacity = 0;
          return;
        }
        const amt = Math.min(1, ease(Math.min(1, p * 6)) + 0.0001);
        // narrow viewports pull the whole sweep closer to the corridor so
        // phones get the same cinematic pass as desktop
        const narrow = window.innerWidth < 760 ? 0.5 : 1;
        if (ps.hold) {
          // destination approach: eases in from deep ahead and PARKS in view,
          // so the journey ends settled alongside an ice world
          const q = ease(p);
          const dist = 1400 - q * 760; // 1400 → 640
          ps.group.position.set(
            drift + ps.side * (dist * 0.34 + 66) * narrow,
            rocketY + 92 - q * 24,
            -dist - recede
          );
        } else {
          const ang = p * Math.PI;
          const close = Math.sin(ang); // 0 → 1 → 0
          // approach → abeam → recede: lateral grows with proximity but stays
          // inside the frustum so the world dominates the frame at closest pass
          const lateral = ((1350 - close * 1100) * 0.28 + 110) * narrow;
          ps.group.position.set(
            drift + ps.side * lateral,
            rocketY + 50 + (1 - close) * 110,
            -Math.cos(ang) * 260 - 260 - recede
          );
        }
        ps.group.rotation.y += dt * ps.spin;
        for (const m of ps.mats) {
          if (m instanceof THREE.MeshBasicMaterial) {
            m.opacity = amt * 0.9;
          } else if (m instanceof THREE.MeshStandardMaterial) {
            m.opacity = amt;
          }
        }
        const haloSprite = ps.group.children.find((ch) => ch instanceof THREE.Sprite) as THREE.Sprite | undefined;
        if (haloSprite) haloSprite.material.opacity = 0.34 * amt;
        // the world names itself on approach — the destination plate stays
        placeLabel(
          planetLabels[pi],
          ps.group.position.x,
          ps.group.position.y,
          ps.group.position.z,
          ps.radius,
          ps.hold
            ? amt * remap(p, 0.05, 0.15)
            : amt * (remap(p, 0.06, 0.2) * (1 - remap(p, 0.82, 0.97)))
        );
      });
      deepSun.intensity = remap(J, 0.56, 0.7) * 1.9;

      // ── FINALE — the scroll ended, the flight didn't. The ship blends
      //    into a slow perpetual orbit around GLACIUS; the moonlet keeps
      //    circling; the camera frames the whole rendezvous. ──
      const gc = planetSpecs[2].group.position;
      if (orbitAmt > 0.001) {
        const oa = t * 0.28 + 2.4;
        tmpOrb.set(
          gc.x + Math.cos(oa) * 78,
          gc.y + Math.sin(oa * 0.8) * 11 + 6,
          gc.z + Math.sin(oa) * 52
        );
        rocket.position.lerp(tmpOrb, orbitAmt);
        rocket.rotation.y = Math.atan2(-Math.sin(oa) * 78, Math.cos(oa) * 52) * orbitAmt;
        moonletPivot.position.copy(gc);
        moonletPivot.visible = planetSpecs[2].group.visible;
        moonletPivot.rotation.y = t * 0.42;
        moonletMat.opacity = orbitAmt;
        moonlet.getWorldPosition(tmpOrb);
        placeLabel(moonletLabel, tmpOrb.x, tmpOrb.y, tmpOrb.z, 9, orbitAmt * 0.92);
      } else {
        moonletLabel.visible = false;
        moonletLabel.material.opacity = 0;
        moonletPivot.visible = false;
      }

      // ── nebulae in deep space ────────────────────────────────
      const nebAmt = ease(remap(J, 0.6, 0.78));
      nebulae.forEach((n) => {
        n.material.opacity = (n.userData.baseOpacity as number) * nebAmt;
      });

      // ── satellites riding the same corridor ──────────────────
      satSpecs.forEach((sat, si) => {
        const fadeIn = remap(J, sat.spec.j0, sat.spec.j1);
        const fadeOut = 1 - remap(J, sat.spec.j1, sat.spec.j1 + 0.07);
        const sAmt = Math.min(fadeIn, fadeOut);
        sat.group.visible = sAmt > 0.01;
        if (!sat.group.visible) {
          satLabels[si].visible = false;
          satLabels[si].material.opacity = 0;
          return;
        }
        sat.mats.forEach((m) => ((m as THREE.MeshStandardMaterial).opacity = sAmt));
        sat.beacon.material.opacity = (Math.sin(t * 2.8) > 0.6 ? 0.95 : 0.12) * sAmt;
        sat.group.rotation.y += dt * sat.spec.spin;
        placeLabel(
          satLabels[si],
          sat.spec.pos[0],
          sat.spec.pos[1],
          sat.spec.pos[2],
          2.4 * sat.spec.scale,
          sAmt * remap(fadeIn, 0.1, 0.38)
        );
      });

      // ── comet crossing the deep corridor ─────────────────────
      const cometP = remap(J, 0.78, 0.94);
      comet.visible = cometP > 0.001 && cometP < 0.999;
      if (comet.visible) {
        const cc = Math.sin(cometP * Math.PI);
        comet.position.set(340 - cometP * 760, 300 - cometP * 170, -720 + cometP * 430);
        cometNucleus.material.opacity = 0.95 * cc;
        cometTailMat.opacity = 0.32 * cc;
      }

      // ── orbital debris field ─────────────────────────────────
      const debrisAmt = remap(J, 0.52, 0.7);
      debrisGroup.visible = debrisAmt > 0.01;
      if (debrisGroup.visible) {
        debrisMat.opacity = debrisAmt * 0.9;
        debrisGroup.rotation.y = t * 0.02;
      }

      // ── far ringed giant + spiral galaxies ───────────────────
      const farAmt = remap(J, 0.64, 0.78);
      farGiant.visible = farAmt > 0.01;
      if (farGiant.visible) {
        farGiantMat.opacity = farAmt * 0.85;
        farRingMat.opacity = farAmt * 0.7;
        farGiant.rotation.y = t * 0.012;
      }
      const galAmt = ease(remap(J, 0.66, 0.82));
      galaxies.forEach((g) => {
        g.material.opacity = (g.userData.baseOpacity as number) * galAmt;
      });

      // ── stars fade in as the sky darkens, shell drifts for parallax ──
      const starAmt = remap(J, 0.26, 0.58);
      starMat.opacity = starAmt * (0.85 + Math.sin(t * 0.7) * 0.08);
      brightMat.opacity = starAmt;
      stars.rotation.y += dt * 0.0022;
      brightStars.rotation.y += dt * 0.0036;

      // ── sky color: dusk holds through the ascent (ground context stays
      // readable), then the void wins in orbit ──────────────
      const sky = new THREE.Color();
      if (J < 0.55) sky.copy(skyColors[0]).lerp(skyColors[1], ease(remap(J, 0.2, 0.55)));
      else sky.copy(skyColors[1]).lerp(skyColors[2], ease(remap(J, 0.55, 0.85)));
      renderer.setClearColor(sky, 1);

      // ── camera: follows the rocket, keeps it right-of-center on
      // desktop so it never sits behind the copy ────────────────
      const shake =
        ignited && !reduced
          ? (Math.sin(t * 41) * 0.085 + Math.sin(t * 27) * 0.05) * throttle * (1 - remap(J, 0.55, 0.78) * 0.65) +
            maxQ * (Math.sin(t * 52) * 0.07 + Math.sin(t * 33) * 0.05)
          : 0;
      const targetY = rocketY + 4.4;
      const targetX = drift * 0.85 + mouseX * 1.5;
      const baseZ = 26 + ease(remap(J, 0.14, 0.5)) * 7 + mouseY * 1.1 + Math.sin(t * 0.1) * 0.5;
      if (orbitAmt > 0.001) {
        // FINALE — the spring drive is replaced by an absolute glide into a
        // wide two-shot: the ship circling in the foreground, the destination
        // world filling the background. (An incremental nudge can never win
        // against the per-frame spring, so the drive is swapped out.)
        const k = Math.min(1, dt * 1.3) * orbitAmt;
        camera.position.x += (gc.x * 0.72 + 30 + mouseX * 6 - camera.position.x) * k;
        camera.position.y += (gc.y + 34 - camera.position.y) * k;
        camera.position.z = baseZ + (gc.z + 215 - baseZ) * orbitAmt;
      } else {
        camera.position.x += (targetX - camera.position.x) * Math.min(1, dt * 3);
        camera.position.y += (targetY + shake - camera.position.y) * Math.min(1, dt * 3.2);
        camera.position.z = baseZ;
      }
      let lookX = drift * 0.92 - composeX + pull;
      let lookY = rocketY + 1.9;
      let lookZ = 0;
      if (orbitAmt > 0.001) {
        lookX += (gc.x - lookX) * orbitAmt * 0.72;
        lookY += (gc.y - lookY) * orbitAmt * 0.72;
        lookZ += (gc.z - lookZ) * orbitAmt * 0.72;
      }
      camera.lookAt(lookX, lookY, lookZ);

      // ── GODMODE hyperdrive — warp punch on the stars, then settle ──
      if (hyperT > 0) {
        hyperT -= dt;
        const f = Math.sin(Math.min(1, (3.4 - Math.max(0, hyperT)) / 3.4) * Math.PI);
        camera.fov = 55 + f * 17;
        camera.updateProjectionMatrix();
        starMat.size = 5.5 * (1 + f * 1.7);
        brightMat.size = 13 * (1 + f * 1.5);
        renderer.toneMappingExposure = 0.88 + f * 0.55;
        if (hyperT <= 0) {
          camera.fov = 55;
          camera.updateProjectionMatrix();
          starMat.size = 5.5;
          brightMat.size = 13;
          renderer.toneMappingExposure = 0.88;
        }
      }

      composer.render();
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKonami);
      window.removeEventListener("devicemotion", onMotion);
      if (hashTimer) clearTimeout(hashTimer);
      document.removeEventListener("visibilitychange", onVis);
      document.title = baseTitle;
      composer.dispose();
      bloom.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
        if (obj instanceof THREE.Sprite) obj.material.dispose();
      });
      smokeTex.dispose();
      steamTex.dispose();
      fireTex.dispose();
      sparkTex.dispose();
      streakTex.dispose();
      cloudTex.dispose();
      glowTex.dispose();
      sunTex.dispose();
      starTex.dispose();
      diamondTex.dispose();
      earthCloudsTex.dispose();
      groundTex.dispose();
      solarTex.dispose();
      atmoRingTex.dispose();
      rockyTex.dispose();
      gasTex.dispose();
      iceTex.dispose();
      ringTex.dispose();
      earthSurfTex.dispose();
      moonTex.dispose();
      galaxyTex.dispose();
      layerTexs.forEach((tex) => tex.dispose());
      bodyTexs.forEach((tex) => tex.dispose());
      debrisGeo.dispose();
      rockGeo.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="canvas-reveal fixed inset-0 z-0 pointer-events-none"
      style={{ contain: "strict" }}
    />
  );
}
