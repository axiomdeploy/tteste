"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Preloader from "@/components/Preloader";
import AltitudeMeter from "@/components/AltitudeMeter";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import SkillOrbit from "@/components/SkillOrbit";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";

const RocketCanvas = dynamic(() => import("@/components/RocketCanvas"), { ssr: false });
const MindSystem = dynamic(() => import("@/components/MindSystem"), { ssr: false });
const MissionControl = dynamic(() => import("@/components/MissionControl"), { ssr: false });

export default function Home() {
  const [launched, setLaunched] = useState(false);

  return (
    <div className="grain relative min-h-screen">
      <Preloader onDone={() => setLaunched(true)} />
      <RocketCanvas />
      <AltitudeMeter />
      <Nav />

      {/* readability vignette over the 3D scene */}
      <div
        aria-hidden
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 50% 50%, transparent 40%, rgba(4,2,6,0.5) 100%)",
        }}
      />

      <main className="relative z-10">
        <Hero started={launched} />
        <About />
        <SkillOrbit />
        <Projects />
        <Contact />
      </main>

      <MindSystem />
      <MissionControl />
    </div>
  );
}
