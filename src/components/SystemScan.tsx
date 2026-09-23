"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Cpu, MemoryStick, HardDrive, BatteryCharging, Gpu,
  Wifi, MonitorSmartphone, Fingerprint, ShieldAlert, Activity, Radio,
} from "lucide-react";

/**
 * SYS·SCAN — a live telemetry deck that reads the VISITOR'S device in
 * real time: CPU cores + frame rate, memory pressure, storage quota,
 * battery, GPU, network and display signals. 100% on-device: nothing
 * is uploaded, nothing persists. Readings the browser seals are shown
 * as RESTRICTED tiles instead of being faked.
 */

/* minimal shapes for the experimental browser APIs we probe */
interface PerfMemory {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
}
interface BatteryLike extends EventTarget {
  level: number;
  charging: boolean;
  dischargingTime: number;
}
interface ConnLike {
  effectiveType: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

const FLAME = "#ff8b3d";
const GOLD = "#ffc966";
const EMBER = "#ff5e2b";

function fmtBytes(b: number): string {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(0)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}

/* live sparkline drawn on a tiny canvas */
function Sparkline({ dataRef, color, canvasRef }: {
  dataRef: React.MutableRefObject<number[]>;
  color: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  return (
    <canvas
      ref={canvasRef}
      width={440}
      height={88}
      className="w-full h-[44px] block"
      aria-hidden
    />
  );
}
// draw is driven by the sampling loop below (keeps React out of the hot path)
function drawSpark(canvas: HTMLCanvasElement | null, data: number[], max: number, color: string) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (data.length < 2) return;
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - Math.min(1, v / max) * (h - 8) - 4;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `${color}44`);
  g.addColorStop(1, `${color}00`);
  ctx.fillStyle = g;
  ctx.fill();
}

function Tile({
  icon, label, children, sealed,
}: {
  icon: React.ReactNode; label: string; children: React.ReactNode; sealed?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-[#ffab691e] bg-white/[0.025] p-5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[10px] tracking-[0.26em] uppercase font-[family-name:var(--font-display)] text-[#a99b8e]">
          <span className="text-[#ff8b3d]">{icon}</span>
          {label}
        </span>
        {sealed && (
          <span className="flex items-center gap-1 text-[8.5px] tracking-[0.18em] uppercase font-[family-name:var(--font-display)] text-[#c0724a]">
            <ShieldAlert size={10} aria-hidden /> sealed
          </span>
        )}
      </div>
      <div className="mt-3 min-w-0">{children}</div>
    </div>
  );
}

const big = "font-[family-name:var(--font-display)] font-bold text-[#f5efe6] tabular-nums";
const small = "text-[12px] text-[#a99b8e] leading-relaxed tabular-nums";

export default function SystemScan({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fpsRef = useRef<HTMLCanvasElement>(null);
  const heapRef = useRef<HTMLCanvasElement>(null);
  const fpsData = useRef<number[]>([]);
  const heapData = useRef<number[]>([]);
  const [cores, setCores] = useState(0);
  const [fps, setFps] = useState(0);
  const [frameMs, setFrameMs] = useState(0);
  const [bench, setBench] = useState(0);
  const [uptime, setUptime] = useState(0);
  const [mem, setMem] = useState<{ used: number; limit: number; approxGB: number | null; sealed: boolean }>({ used: 0, limit: 0, approxGB: null, sealed: true });
  const [storage, setStorage] = useState<{ usage: number; quota: number; persisted: boolean; sealed: boolean }>({ usage: 0, quota: 0, persisted: false, sealed: true });
  const [battery, setBattery] = useState<{ level: number; charging: boolean; hours: number | null; sealed: boolean }>({ level: 0, charging: false, hours: null, sealed: true });
  const [gpu, setGpu] = useState<{ renderer: string; vendor: string }>({ renderer: "", vendor: "" });
  const [net, setNet] = useState<{ type: string; downlink: string; rtt: string; online: boolean }>({ type: "—", downlink: "—", rtt: "—", online: true });
  const [display, setDisplay] = useState({ viewport: "", screen: "", dpr: 1, depth: 0 });
  const [ident, setIdent] = useState({ platform: "", lang: "", tz: "", touch: 0 });

  /* one-shot probes */
  useEffect(() => {
    if (!open) return;
    setCores(navigator.hardwareConcurrency || 4);

    // memory
    const pm = (performance as unknown as { memory?: PerfMemory }).memory;
    const dm = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    setMem({
      used: pm?.usedJSHeapSize ?? 0,
      limit: pm?.jsHeapSizeLimit ?? 0,
      approxGB: typeof dm === "number" ? dm : null,
      sealed: !pm,
    });

    // storage
    (async () => {
      try {
        const est = await navigator.storage?.estimate?.();
        if (est) setStorage({ usage: est.usage ?? 0, quota: est.quota ?? 0, persisted: (await navigator.storage?.persisted?.()) ?? false, sealed: false });
      } catch { setStorage((s) => ({ ...s, sealed: true })); }
    })();

    // battery
    (async () => {
      const getB = (navigator as unknown as { getBattery?: () => Promise<BatteryLike> }).getBattery;
      if (!getB) { setBattery((b) => ({ ...b, sealed: true })); return; }
      try {
        const b = await getB();
        const sync = () => setBattery({ level: b.level, charging: b.charging, hours: Number.isFinite(b.dischargingTime) && b.dischargingTime > 0 ? b.dischargingTime / 3600 : null, sealed: false });
        sync();
        b.addEventListener("levelchange", sync);
        b.addEventListener("chargingchange", sync);
      } catch { setBattery((s) => ({ ...s, sealed: true })); }
    })();

    // GPU string
    try {
      const cv = document.createElement("canvas");
      const gl = cv.getContext("webgl") as WebGLRenderingContext | null;
      const ext = gl?.getExtension("WEBGL_debug_renderer_info");
      setGpu({
        renderer: (ext && gl ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) : gl?.getParameter(gl.VERSION) as string) || "generic adapter",
        vendor: (ext && gl ? (gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string) : "") || "",
      });
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { setGpu({ renderer: "generic adapter", vendor: "" }); }

    // network
    const conn = (navigator as unknown as { connection?: ConnLike }).connection;
    const syncNet = () => setNet({
      type: conn?.effectiveType?.toUpperCase() ?? "—",
      downlink: conn?.downlink != null ? `${conn.downlink} Mb/s` : "—",
      rtt: conn?.rtt != null ? `${conn.rtt} ms` : "—",
      online: navigator.onLine,
    });
    syncNet();
    const onOnline = () => syncNet();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOnline);

    // display + identity
    setDisplay({
      viewport: `${window.innerWidth} × ${window.innerHeight}`,
      screen: `${screen.width} × ${screen.height}`,
      dpr: window.devicePixelRatio,
      depth: screen.colorDepth,
    });
    setIdent({
      platform: (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || "unknown",
      lang: navigator.language,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      touch: navigator.maxTouchPoints || 0,
    });

    const onResize = () => setDisplay((d) => ({ ...d, viewport: `${window.innerWidth} × ${window.innerHeight}` }));
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOnline);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  /* realtime loops: fps + heap sampling, cpu bench, uptime */
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const started = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = reduced ? 1000 : 500;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      frames++;
      const now = performance.now();
      if (now - last >= step) {
        const fpsNow = Math.round((frames * 1000) / (now - last));
        frames = 0;
        last = now;
        setFps(fpsNow);
        setFrameMs(Math.round(1000 / Math.max(1, fpsNow)));
        fpsData.current = [...fpsData.current.slice(-47), fpsNow];
        drawSpark(fpsRef.current, fpsData.current, 72, GOLD);

        const pm = (performance as unknown as { memory?: PerfMemory }).memory;
        if (pm) {
          setMem((m) => ({ ...m, used: pm.usedJSHeapSize, limit: pm.jsHeapSizeLimit, sealed: false }));
          heapData.current = [...heapData.current.slice(-47), pm.usedJSHeapSize / 1048576];
          drawSpark(heapRef.current, heapData.current, pm.jsHeapSizeLimit / 1048576, FLAME);
        }
      }
    };
    raf = requestAnimationFrame(tick);

    // CPU micro-benchmark: numeric throughput in a 6 ms budget
    const benchId = setInterval(() => {
      if (document.hidden) return;
      const t0 = performance.now();
      let ops = 0;
      let x = 1.0001;
      while (performance.now() - t0 < 6) {
        for (let i = 0; i < 2000; i++) x = (x * x + 1.5) % 97;
        ops += 2000;
      }
      if (x === -1) setBench(0); // keep x alive
      setBench(Math.round(ops / 6)); // ops per ms
    }, 2600);

    const upId = setInterval(() => setUptime(Math.floor((performance.now() - started) / 1000)), 1000);
    const storeId = setInterval(async () => {
      try {
        const est = await navigator.storage?.estimate?.();
        if (est) setStorage((s) => (s.sealed ? s : { ...s, usage: est.usage ?? 0, quota: est.quota ?? 0 }));
      } catch { /* ignore */ }
    }, 5000);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(benchId);
      clearInterval(upId);
      clearInterval(storeId);
    };
  }, [open]);

  /* scroll lock + ESC */
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("locked");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("locked");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const loadWord = fps >= 50 ? "NOMINAL" : fps >= 30 ? "ELEVATED" : fps > 0 ? "STRAINED" : "—";
  const loadColor = fps >= 50 ? GOLD : fps >= 30 ? FLAME : EMBER;
  const memPct = mem.limit > 0 ? Math.min(100, (mem.used / mem.limit) * 100) : 0;
  const storePct = storage.quota > 0 ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scan-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[86] flex items-center justify-center"
          style={{ background: "rgba(4,2,7,0.68)", backdropFilter: "blur(16px)", padding: "clamp(12px, 4vw, 32px)" }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="SYS·SCAN live device telemetry"
        >
          <motion.div
            key="scan-card"
            initial={{ opacity: 0, scale: 0.92, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 18 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full rounded-[32px] glass overflow-hidden"
            style={{
              maxWidth: "min(760px, 100%)",
              padding: "clamp(20px, 4vw, 34px)",
              maxHeight: "88dvh",
              overflowY: "auto",
              boxShadow: "0 40px 120px -30px rgba(255,139,61,0.4)",
            }}
          >
            {/* header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-display)] text-[#ffc966] flex items-center gap-2">
                    <Radio size={12} className="animate-pulse text-[#ff8b3d]" aria-hidden />
                    SYS·SCAN · realtime telemetry
                  </span>
                  <span className="text-[9px] tracking-[0.2em] uppercase font-[family-name:var(--font-display)] px-2.5 py-1 rounded-full border border-[#ffc96640] text-[#ffc966]">
                    sampling {uptime}s
                  </span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[#a99b8e]">
                  This deck reads <span className="text-[#f5efe6]">your</span> device — live, on-device,
                  nothing stored, nothing transmitted. Sealed readings stay sealed.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close telemetry deck"
                className="shrink-0 w-10 h-10 rounded-full grid place-items-center border border-white/15 text-[#c9bcae] hover:text-[#f5efe6] hover:border-[#ff8b3d66] transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            {/* tiles */}
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {/* CPU */}
              <Tile icon={<Cpu size={13} />} label="Processor">
                <div className="flex items-end justify-between gap-3">
                  <p className={`${big} text-[30px] leading-none`}>{cores}<span className="text-[13px] text-[#a99b8e] font-medium"> threads</span></p>
                  <p className="text-[10px] tracking-[0.2em] uppercase font-[family-name:var(--font-display)]" style={{ color: loadColor }}>{loadWord}</p>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#a99b8e] tabular-nums">
                  <span>{fps} fps</span>
                  <span>{frameMs} ms/frame</span>
                  <span>{bench} kops/ms</span>
                </div>
                <div className="mt-2"><Sparkline dataRef={fpsData} color={GOLD} canvasRef={fpsRef} /></div>
              </Tile>

              {/* MEMORY */}
              <Tile icon={<MemoryStick size={13} />} label="Memory" sealed={mem.sealed}>
                {mem.sealed ? (
                  <div className="rounded-2xl border border-[#ffab691a] bg-white/[0.02] p-3.5 space-y-2" aria-hidden>
                    {[ "72%", "48%" ].map((w, i) => (
                      <div key={i} className="rounded-full bg-white/[0.07] blur-[3px]" style={{ height: 8, width: w }} />
                    ))}
                    <p className="!mt-3 text-[11.5px] text-[#a99b8e] leading-relaxed">
                      {mem.approxGB != null ? <>~{mem.approxGB} GB class device — heap readings are sealed by your browser&apos;s engine.</> : <>Heap readings are sealed by your browser&apos;s engine.</>}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className={`${big} text-[30px] leading-none`}>{fmtBytes(mem.used)}</p>
                    <div className="mt-2.5 h-2 rounded-full bg-white/8 overflow-hidden">
                      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${memPct}%`, background: `linear-gradient(90deg, ${FLAME}66, ${FLAME})` }} />
                    </div>
                    <p className={`${small} mt-2`}>{fmtBytes(mem.limit)} engine budget · {memPct.toFixed(1)}% in use</p>
                    <div className="mt-2"><Sparkline dataRef={heapData} color={FLAME} canvasRef={heapRef} /></div>
                  </>
                )}
              </Tile>

              {/* STORAGE */}
              <Tile icon={<HardDrive size={13} />} label="Storage" sealed={storage.sealed}>
                {storage.sealed ? (
                  <p className={`${small}`}>Site storage API is sealed on this browser.</p>
                ) : (
                  <>
                    <p className={`${big} text-[30px] leading-none`}>{fmtBytes(storage.usage)}</p>
                    <div className="mt-2.5 h-2 rounded-full bg-white/8 overflow-hidden">
                      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${storePct}%`, background: `linear-gradient(90deg, ${GOLD}55, ${GOLD})` }} />
                    </div>
                    <p className={`${small} mt-2`}>of {fmtBytes(storage.quota)} granted to this origin · {storage.persisted ? "persistent" : "best-effort"}</p>
                  </>
                )}
              </Tile>

              {/* POWER */}
              <Tile icon={<BatteryCharging size={13} />} label="Power" sealed={battery.sealed}>
                {battery.sealed ? (
                  <p className={`${small}`}>Battery level is sealed by this browser (privacy).</p>
                ) : (
                  <>
                    <p className={`${big} text-[30px] leading-none`}>{Math.round(battery.level * 100)}<span className="text-[13px] text-[#a99b8e] font-medium"> %</span></p>
                    <p className={`${small} mt-2`}>
                      {battery.charging ? "Charging on external power" : "On internal cell"}
                      {battery.hours != null && !battery.charging ? ` · ~${battery.hours.toFixed(1)} h remaining` : ""}
                    </p>
                  </>
                )}
              </Tile>

              {/* GPU */}
              <Tile icon={<Gpu size={13} />} label="Graphics">
                <p className="text-[13px] leading-snug text-[#f5efe6] font-[family-name:var(--font-display)] break-words min-w-0">{gpu.renderer || "—"}</p>
                {gpu.vendor && <p className={`${small} mt-1.5 break-words min-w-0`}>{gpu.vendor}</p>}
              </Tile>

              {/* NETWORK */}
              <Tile icon={<Wifi size={13} />} label="Uplink">
                <p className={`${big} text-[22px] leading-none`}>{net.online ? "LINK UP" : "OFFLINE"}</p>
                <p className={`${small} mt-2`}>{net.type} · {net.downlink} · {net.rtt} rtt</p>
              </Tile>

              {/* DISPLAY */}
              <Tile icon={<MonitorSmartphone size={13} />} label="Viewport">
                <p className={`${big} text-[22px] leading-none`}>{display.viewport}</p>
                <p className={`${small} mt-2`}>{display.screen} panel · {display.dpr}× density · {display.depth}-bit</p>
              </Tile>

              {/* IDENTITY */}
              <Tile icon={<Fingerprint size={13} />} label="Signature">
                <p className={`${small} break-words min-w-0`}>
                  {ident.platform} · {ident.lang}<br />
                  {ident.tz} · {ident.touch}-point touch
                </p>
              </Tile>
            </div>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-[10.5px] tracking-[0.18em] uppercase font-[family-name:var(--font-display)] text-[#7a6f66] text-center">
              <Activity size={11} aria-hidden />
              telemetry stays on your device — always
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
