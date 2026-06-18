/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Atom, 
  Orbit, 
  Globe, 
  Layers, 
  ChevronRight, 
  Info, 
  Terminal,
  BookOpen,
  SquareEqual
} from 'lucide-react';
import Phase1Circle from './components/Phase1Circle';
import Phase2Gravity from './components/Phase2Gravity';
import Phase3Sphere from './components/Phase3Sphere';
import Phase4Spacetime from './components/Phase4Spacetime';

export default function App() {
  const [activePhase, setActivePhase] = useState<1 | 2 | 3 | 4>(2); // Default to Newtonian orbits (very interactive)

  const phases = [
    {
      id: 1,
      title: "2D Triangle Fan Circle",
      icon: <Atom className="h-4.5 w-4.5" />,
      tagline: "Approximating curved geometry in OpenGL using discrete vertex lists",
      colorClass: "text-cyan-400 border-cyan-500/20",
      accentBg: "bg-cyan-500/10"
    },
    {
      id: 2,
      title: "Newtonian Orbits",
      icon: <Orbit className="h-4.5 w-4.5" />,
      tagline: "Pairwise gravitational integration vector kinematics",
      colorClass: "text-amber-400 border-amber-500/20",
      accentBg: "bg-amber-500/10"
    },
    {
      id: 3,
      title: "3D Projection Sphere",
      icon: <Globe className="h-4.5 w-4.5" />,
      tagline: "Latitude/Longitude mapping, perspective division, & diffuse light",
      colorClass: "text-emerald-400 border-emerald-500/20",
      accentBg: "bg-emerald-500/10"
    },
    {
      id: 4,
      title: "Spacetime Curvature",
      icon: <Layers className="h-4.5 w-4.5" />,
      tagline: "General relativity, Schwarzchild wells, and geodesic grids",
      colorClass: "text-purple-400 border-purple-500/20",
      accentBg: "bg-purple-500/10"
    }
  ];

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-white">
      {/* Premium Header Rail */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/10 flex items-center justify-center">
            <div className="h-full w-full rounded-[10px] bg-slate-950 flex items-center justify-center">
              <Atom className="h-6 w-6 text-cyan-400 animate-spin-slow" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Gravity & Rendering C++ Sandbox
            </h1>
            <p className="text-[11px] text-slate-400 font-medium font-mono">
              OpenGL/C++ Pipeline & Relativity Simulation
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 max-w-[1700px] w-full mx-auto gap-6">
        
        {/* Phase progress navigation tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {phases.map((p) => {
            const isActive = activePhase === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePhase(p.id as 1 | 2 | 3 | 4)}
                id={`tab-phase-${p.id}`}
                className={`relative flex flex-col items-start text-left p-4 rounded-xl border transition-all duration-200 active:scale-98 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900/95 border-cyan-500/60 shadow-lg shadow-cyan-500/[0.04]'
                    : 'bg-slate-950/45 border-slate-800/80 hover:bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                {/* Active side highlighter bar */}
                {isActive && (
                  <div className="absolute top-0 bottom-0 left-0 w-1 rounded-l-xl bg-cyan-400" />
                )}

                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`p-1.5 rounded-lg border ${
                    isActive ? p.colorClass + ' ' + p.accentBg : 'text-slate-500 border-slate-800/60 bg-slate-950'
                  }`}>
                    {p.icon}
                  </div>
                  <span className="text-[10px] font-bold tracking-widest font-mono text-slate-400 uppercase">
                    MAPPING PHASE {p.id}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-slate-200 mb-0.5">
                  {p.title}
                </h3>
                <p className="text-[10.5px] text-slate-400 leading-relaxed font-normal">
                  {p.tagline}
                </p>
              </button>
            );
          })}
        </div>

        {/* Dynamic Sandbox Display Panel */}
        <div className="flex-grow flex flex-col min-h-[500px]">
          
          {/* Active Sim Container */}
          <div className="flex-1 flex flex-col gap-4">
            
            {/* Header info badge explaining development phase theme */}
            <div className="bg-slate-900/65 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
              <div className="p-2 bg-cyan-950/40 text-cyan-400 rounded-lg shrink-0">
                <Info className="h-5 w-5" />
              </div>
              <div className="font-mono text-xs text-slate-400 leading-relaxed">
                {activePhase === 1 && (
                  <p>
                    <strong className="text-slate-200 font-sans">Triangulating the Circle:</strong> Since graphics cards deal fundamentally in triangles, circular shapes are drawn using trigonometry. This phase maps center points, radius vectors, and radial segments (N slices) to render high-contrast mesh circles.
                  </p>
                )}
                {activePhase === 2 && (
                  <p>
                    <strong className="text-slate-200 font-sans">N-Body Universal Orbit Integration:</strong> Demonstrating pairwise force gravity loops using Newton's classic formula: {"F = G * M1 * M2 / R²"}. Convert forces into acceleration components ({"A = F/M"}) during local frame loops.
                  </p>
                )}
                {activePhase === 3 && (
                  <p>
                    <strong className="text-slate-200 font-sans">3D Space coordinate projection matrices:</strong> Creating a textured 3D sphere from longitudinal & latitudinal angles (Theta and Phi). Features fully computed Lambertian cosine dot lighting, Euler cameras, and Painter's algorithm depth sorting.
                  </p>
                )}
                {activePhase === 4 && (
                  <p>
                    <strong className="text-slate-200 font-sans">General Relativity / Curving Spacetime:</strong> Einstein's perspective where space is bent by mass. Features an interactive 3D grid warped via Flamm's paraboloid formula, directing observers along relativistic geodesics.
                  </p>
                )}
              </div>
            </div>

            {/* Simulated Frame Viewport */}
            <div className="flex-1 relative">
              {activePhase === 1 && <Phase1Circle />}
              {activePhase === 2 && <Phase2Gravity />}
              {activePhase === 3 && <Phase3Sphere />}
              {activePhase === 4 && <Phase4Spacetime />}
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer Info */}
      <footer className="border-t border-slate-900/80 bg-slate-950 py-3 px-6 text-center text-[10px] font-mono text-slate-500">
        <p>
          Physics Rendering & Simulation • Built using High-fidelity React Matrix Pipelines.
        </p>
      </footer>
    </div>
  );
}
