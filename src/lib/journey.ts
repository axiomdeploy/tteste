// Maps window scroll to the rocket "journey" progress (0 → 1),
// using the real section boundaries so each scroll section = one flight stage.

export const SECTION_IDS = ["home", "about", "skills", "projects", "contact"] as const;

export function computeJourney(): { j: number; segment: number; local: number } {
  if (typeof window === "undefined") return { j: 0, segment: 0, local: 0 };
  const vh = window.innerHeight;
  const docEnd = Math.max(1, document.documentElement.scrollHeight - vh);
  const y = Math.min(Math.max(window.scrollY, 0), docEnd);

  const tops = SECTION_IDS.map((id) => {
    const el = document.getElementById(id);
    return el ? el.offsetTop : 0;
  });

  // Stage i begins once section i is 35% into the viewport.
  // Windows: [0..1]=pad, [1..2]=ignition, [2..3]=ascent, [3..4]=space, [4..end]=deep space.
  const B: number[] = [0];
  for (let i = 1; i < tops.length; i++) {
    B.push(Math.max(tops[i] - vh * 0.35, B[i - 1] + 1));
  }
  // The final section may be shorter than the viewport, pushing its boundary
  // past max scroll — reserve the last 40% of the remaining scroll for it so
  // the final stage is always properly reachable.
  const prev = B[B.length - 2];
  const last = B[B.length - 1];
  B[B.length - 1] = Math.min(last, prev + (docEnd - prev) * 0.6);
  B.push(docEnd);

  let k = 0;
  for (let i = 0; i < B.length - 1; i++) {
    if (y >= B[i]) k = i;
  }
  const span = Math.max(1, B[k + 1] - B[k]);
  const local = Math.min(1, Math.max(0, (y - B[k]) / span));

  const windows = B.length - 2; // 4 progress windows, 5 named stages
  const j = k >= windows ? 1 : Math.min(1, (k + local) / windows);
  return { j, segment: Math.min(k, windows), local };
}

export function altitudeKm(j: number): number {
  // 0 km on the pad → 408 km (ISS orbit altitude) at orbit insertion,
  // then the planet-hopper leg climbs into the millions — toward Mars.
  const jj = Math.max(0, Math.min(1, j));
  if (jj <= 0.62) return Math.round(Math.pow(jj / 0.62, 1.6) * 408);
  const deep = (jj - 0.62) / 0.38;
  return Math.round(408 + Math.pow(deep, 2.1) * 225_000_000);
}

export function formatAltitude(km: number): string {
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(1)}M`;
  if (km >= 10_000) return Math.round(km).toLocaleString("en-US");
  return String(km).padStart(3, "0");
}

/* Real Earth atmosphere stack — shared by the HUD, the 3D layer markers
   and the Mission Control drawer so every readout agrees with every other. */
export interface AtmosLayer {
  name: string;
  range: string;
  note: string;
  fromKm: number; // lower bound (0 for the troposphere)
}

export const ATMOS_LAYERS: AtmosLayer[] = [
  { name: "TROPOSPHERE", range: "0 – 12 KM", note: "weather · clouds · us", fromKm: 0 },
  { name: "STRATOSPHERE", range: "12 – 50 KM", note: "ozone · nacreous clouds", fromKm: 12 },
  { name: "MESOSPHERE", range: "50 – 85 KM", note: "coldest layer · meteors burn", fromKm: 50 },
  { name: "THERMOSPHERE", range: "85 – 600 KM", note: "aurora · ISS orbits here", fromKm: 85 },
  { name: "EXOSPHERE", range: "600 KM +", note: "the edge of the sky", fromKm: 600 },
];

export function layerFor(km: number): AtmosLayer {
  let found = ATMOS_LAYERS[0];
  for (const l of ATMOS_LAYERS) if (km >= l.fromKm) found = l;
  return found;
}

export const STAGE_NAMES = [
  "LC-39A · LAUNCH PAD",
  "IGNITION · LIFTOFF",
  "CLOUD LAYER · 12 KM",
  "ORBIT · STATION RENDEZVOUS",
  "DEEP SPACE · PLANET HOPPER",
] as const;
