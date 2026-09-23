"use client";

import { useEffect, useRef } from "react";
import { altitudeKm, computeJourney, formatAltitude, STAGE_NAMES, layerFor } from "@/lib/journey";

export default function AltitudeMeter() {
  const kmRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLSpanElement>(null);
  const layerRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const { j, segment } = computeJourney();
      const km = altitudeKm(j);
      const pct = Math.round(j * 100);
      if (kmRef.current) kmRef.current.textContent = formatAltitude(km);
      if (fillRef.current) fillRef.current.style.height = `${pct}%`;
      if (stageRef.current) stageRef.current.textContent = STAGE_NAMES[segment] ?? "";
      if (layerRef.current) layerRef.current.textContent = layerFor(km).name;
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {/* desktop vertical gauge */}
      <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-4 pointer-events-none select-none">
        <span
          className="text-[10px] tracking-[0.3em] text-[#a99b8e] font-[family-name:var(--font-display)] whitespace-nowrap tabular-nums"
          style={{ writingMode: "vertical-rl" }}
        >
          ALT <span ref={kmRef}>000</span> KM
        </span>
        <div className="relative w-[3px] h-44 rounded-full bg-white/10 overflow-hidden">
          <div
            ref={fillRef}
            className="absolute bottom-0 left-0 w-full rounded-full"
            style={{
              height: "0%",
              background: "linear-gradient(0deg, #ff5e2b, #ffc966)",
              boxShadow: "0 0 12px rgba(255,120,50,0.7)",
            }}
          />
        </div>
        <span
          ref={stageRef}
          className="text-[9px] tracking-[0.25em] text-[#ff8b3d] font-[family-name:var(--font-display)] whitespace-nowrap"
        >
          LAUNCH PAD
        </span>
        <span
          ref={layerRef}
          className="text-[8.5px] tracking-[0.22em] text-[#8a7d72] font-[family-name:var(--font-display)] whitespace-nowrap"
          style={{ writingMode: "vertical-rl" }}
        >
          TROPOSPHERE
        </span>
      </div>
    </>
  );
}
