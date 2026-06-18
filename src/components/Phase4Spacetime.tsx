/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Sliders, Play, Pause, RefreshCw, Layers, Database, Compass, Orbit, Activity } from 'lucide-react';
import { Vector3D, Vector2D } from '../types';

interface CurvatureGridPoint {
  world: Vector3D;
  projected: Vector2D;
  depth: number;
  curvature: number;
}

interface SpacetimeParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: Vector2D[];
  color: string;
}

export default function Phase4Spacetime() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Curvature parameters
  const [mass, setMass] = useState<number>(45);
  const [gridResolution, setGridResolution] = useState<number>(24); // density
  const [wellSoftening, setWellSoftening] = useState<number>(1.2);    // epsilon to avoid division by zero
  const [meshVisualScale, setMeshVisualScale] = useState<number>(15);

  // Particles / Orbit states
  const [particles, setParticles] = useState<SpacetimeParticle[]>([
    {
      id: 'p-1',
      x: -50,
      y: 50,
      vx: 1.2,
      vy: 1.2,
      trail: [],
      color: '#38bdf8'
    },
    {
      id: 'p-2',
      x: 80,
      y: -20,
      vx: -1.0,
      vy: 2.2,
      trail: [],
      color: '#f43f5e'
    }
  ]);

  // View / Orbit controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [visualizationMode, setVisualizationMode] = useState<'well' | 'grid-shaded' | 'geodesics'>('well');
  
  // Camera angles
  const [pitch, setPitch] = useState<number>(0.65);
  const [yaw, setYaw] = useState<number>(0.78);
  const [cameraDistance, setCameraDistance] = useState<number>(350);

  // Rotation dragging
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.95 : 1.05; // scrolling up zooms in (decreases distance)
      setCameraDistance(d => Math.max(150, Math.min(1000, Math.round(d * zoomFactor))));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    setPitch(p => Math.max(0.05, Math.min(Math.PI / 2 - 0.05, p - dy * 0.005)));
    setYaw(y => y + dx * 0.005);

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Launch fresh particle running on local geodesic gradient
  const injectParticle = (preset: 'standard' | 'hyperbolic' | 'capture') => {
    const freshId = 'p-inj-' + Date.now();
    switch (preset) {
      case 'standard':
        setParticles(prev => [...prev, {
          id: freshId,
          x: -110,
          y: 0,
          vx: 0.1,
          vy: 2.7,
          trail: [],
          color: '#fbbf24'
        }]);
        break;
      case 'hyperbolic':
        setParticles(prev => [...prev, {
          id: freshId,
          x: -150,
          y: -100,
          vx: 4.8,
          vy: 1.5,
          trail: [],
          color: '#a78bfa'
        }]);
        break;
      case 'capture':
        setParticles(prev => [...prev, {
          id: freshId,
          x: 120,
          y: 80,
          vx: -1.8,
          vy: -0.6,
          trail: [],
          color: '#34d399'
        }]);
        break;
    }
  };

  const clearParticles = () => {
    setParticles([]);
  };

  const resetSimulation = () => {
    setParticles([
      {
        id: 'p-1',
        x: -50,
        y: 50,
        vx: 1.2,
        vy: 1.2,
        trail: [],
        color: '#38bdf8'
      },
      {
        id: 'p-2',
        x: 80,
        y: -10,
        vx: -1.0,
        vy: 2.3,
        trail: [],
        color: '#f43f5e'
      }
    ]);
    setPitch(0.65);
    setYaw(0.78);
    setMass(45);
  };

  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stepSimulation = () => {
      // 1. Move Particles (Geodesic Motion Integration on Curved Spacetime)
      if (isPlaying) {
        setParticles(prev => prev.map(p => {
          // Compute distance to center mass gravity-well
          const dx = -p.x;
          const dy = -p.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          // Schwarzschild orbital curvature equations
          let nextVx = p.vx;
          let nextVy = p.vy;

          if (dist > 5) {
            // Curvature-gradient force causing "downward coordinate drift"
            // F = k * M / (r^3) attracting particles toward center
            const force = (mass * 0.15) / (distSq * dist + wellSoftening);
            nextVx += dx * force;
            nextVy += dy * force;
          }

          // Kinematic state steps
          let nextX = p.x + nextVx * 0.8;
          let nextY = p.y + nextVy * 0.8;

          // Trail points creation
          const nextTrail = [...p.trail];
          nextTrail.push({ x: nextX, y: nextY });
          if (nextTrail.length > 80) {
            nextTrail.shift();
          }

          // Capture boundary checks: if crashed or escaped too far away
          if (dist < 8) {
            // Black hole singularity capture event: respawn outer
            const randAngle = Math.random() * 2 * Math.PI;
            return {
              ...p,
              x: 130 * Math.cos(randAngle),
              y: 130 * Math.sin(randAngle),
              vx: -1.2 * Math.sin(randAngle) + (Math.random() - 0.5) * 0.4,
              vy: 1.2 * Math.cos(randAngle) + (Math.random() - 0.5) * 0.4,
              trail: []
            };
          }

          if (Math.abs(nextX) > 280 || Math.abs(nextY) > 280) {
            // Escaped outer space boundaries, return inward
            const randAngle = Math.random() * 2 * Math.PI;
            return {
              ...p,
              x: 150 * Math.cos(randAngle),
              y: 150 * Math.sin(randAngle),
              vx: -1.5 * Math.cos(randAngle) + (Math.random() - 0.5) * 0.5,
              vy: -1.5 * Math.sin(randAngle) + (Math.random() - 0.5) * 0.5,
              trail: []
            };
          }

          return {
            ...p,
            x: nextX,
            y: nextY,
            vx: nextVx,
            vy: nextVy,
            trail: nextTrail
          };
        }));
      }

      // ----------------------------------------------------
      // DRAW CANVAS STAGES
      // ----------------------------------------------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep space space dark matte background
      ctx.fillStyle = 'rgba(7, 10, 19, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Generate 2D grid matrix spanning from -160 to 160 on world X & Y axis
      const worldGridMax = 160;
      const stepSize = worldGridMax * 2 / gridResolution;
      const gridPoints: CurvatureGridPoint[][] = [];

      for (let i = 0; i <= gridResolution; i++) {
        const worldX = -worldGridMax + i * stepSize;
        gridPoints[i] = [];

        for (let j = 0; j <= gridResolution; j++) {
          const worldY = -worldGridMax + j * stepSize;

          // Radial radius coordinate from central singularity mass
          const r = Math.sqrt(worldX * worldX + worldY * worldY);

          // Schwarzschild Flamm's paraboloid style spacetime depth curvature calculation
          // z = - (mass * C) / sqrt(r^2 + softening)
          const zDepth = - (mass * meshVisualScale) / Math.sqrt(r * r + wellSoftening * wellSoftening * 22);

          gridPoints[i][j] = {
            world: { x: worldX, y: worldY, z: zDepth },
            projected: { x: 0, y: 0 },
            depth: 0,
            curvature: Math.abs(zDepth)
          };
        }
      }

      // Camera transformation parameters
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      const rotateAndProject = (pt: Vector3D) => {
        // Horizontal yaw spinning on Y axis
        let rx = pt.x * cosY - pt.y * sinY;
        let ry = pt.x * sinY + pt.y * cosY;
        let rz = pt.z;

        // Pitched vertical camera tilting on X axis
        let finalY = ry * cosP - rz * sinP;
        let finalZ = ry * sinP + rz * cosP;
        let finalX = rx;

        const totalDepth = finalZ + cameraDistance;

        // Perspective visual allocation
        const perspectiveScale = 290;
        const screenX = canvas.width / 2 + (finalX * perspectiveScale) / (cameraDistance + finalZ);
        const screenY = canvas.height / 2 - (finalY * perspectiveScale) / (cameraDistance + finalZ);

        return {
          coords: { x: screenX, y: screenY },
          depth: totalDepth
        };
      };

      // Apply coordinates loop
      for (let i = 0; i <= gridResolution; i++) {
        for (let j = 0; j <= gridResolution; j++) {
          const pt = gridPoints[i][j];
          const trans = rotateAndProject(pt.world);
          pt.projected = trans.coords;
          pt.depth = trans.depth;
        }
      }

      // Render Spacetime mesh lines (isometric wireframe grids)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.16)';
      ctx.lineWidth = 1;

      for (let i = 0; i < gridResolution; i++) {
        for (let j = 0; j < gridResolution; j++) {
          const pTL = gridPoints[i][j];
          const pTR = gridPoints[i + 1][j];
          const pBL = gridPoints[i][j + 1];

          // Curvature determines line colors (cyan shift to violet under massive load)
          const avgCurvature = (pTL.curvature + pTR.curvature + pBL.curvature) / 3;
          let strokeCol = 'rgba(6, 182, 212, 0.14)';
          
          if (visualizationMode === 'well') {
            if (avgCurvature > 18) {
              strokeCol = `rgba(168, 85, 247, ${Math.min(0.65, 0.1 + avgCurvature * 0.015)})`;
            } else if (avgCurvature > 6) {
              strokeCol = `rgba(6, 182, 212, ${Math.min(0.5, 0.1 + avgCurvature * 0.02)})`;
            }
          } else if (visualizationMode === 'grid-shaded') {
            // solid block fills
            ctx.fillStyle = `rgba(13, 148, 136, ${Math.min(0.18, avgCurvature * 0.005)})`;
            ctx.beginPath();
            ctx.moveTo(pTL.projected.x, pTL.projected.y);
            ctx.lineTo(pTR.projected.x, pTR.projected.y);
            ctx.lineTo(gridPoints[i+1][j+1].projected.x, gridPoints[i+1][j+1].projected.y);
            ctx.lineTo(pBL.projected.x, pBL.projected.y);
            ctx.closePath();
            ctx.fill();
            strokeCol = 'rgba(34, 211, 238, 0.1)';
          }

          ctx.strokeStyle = strokeCol;

          // Draw grid quad meshes
          ctx.beginPath();
          ctx.moveTo(pTL.projected.x, pTL.projected.y);
          ctx.lineTo(pTR.projected.x, pTR.projected.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(pTL.projected.x, pTL.projected.y);
          ctx.lineTo(pBL.projected.x, pBL.projected.y);
          ctx.stroke();
        }
      }

      // Draw equatorial boundaries and longitudinal rings
      // Circular contour bands around central singularity
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.18)';
      ctx.lineWidth = 1.25;
      const contourRadii = [30, 65, 105, 150];
      
      contourRadii.forEach(cr => {
        ctx.beginPath();
        for (let a = 0; a <= 48; a++) {
          const theta = (2 * Math.PI * a) / 48;
          const wX = cr * Math.cos(theta);
          const wY = cr * Math.sin(theta);
          const wZ = - (mass * meshVisualScale) / Math.sqrt(cr * cr + wellSoftening * wellSoftening * 22);

          const proj = rotateAndProject({ x: wX, y: wY, z: wZ });
          if (a === 0) {
            ctx.moveTo(proj.coords.x, proj.coords.y);
          } else {
            ctx.lineTo(proj.coords.x, proj.coords.y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      });

      // Render Central Massive Singular Core (Black Hole visual warp)
      const blackHoleCenterProj = rotateAndProject({ x: 0, y: 0, z: - (mass * meshVisualScale) / (wellSoftening * 4.69) });
      const singularityGlowRadius = 8 + (mass * 0.15);

      // Radial black horizon shadow
      const gradH = ctx.createRadialGradient(
        blackHoleCenterProj.coords.x, blackHoleCenterProj.coords.y, 1,
        blackHoleCenterProj.coords.x, blackHoleCenterProj.coords.y, singularityGlowRadius * 2
      );
      gradH.addColorStop(0, '#090d16');
      gradH.addColorStop(0.35, '#020617');
      gradH.addColorStop(0.65, 'rgba(124, 58, 237, 0.2)');
      gradH.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradH;
      ctx.beginPath();
      ctx.arc(blackHoleCenterProj.coords.x, blackHoleCenterProj.coords.y, singularityGlowRadius * 2, 0, 2 * Math.PI);
      ctx.fill();

      // Sharp central singularity orb
      ctx.fillStyle = '#020617';
      ctx.shadowColor = '#d946ef';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(blackHoleCenterProj.coords.x, blackHoleCenterProj.coords.y, singularityGlowRadius * 0.85, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0; // reset shadow

      // Render particle orbits
      particles.forEach(p => {
        const pz = - (mass * meshVisualScale) / Math.sqrt((p.x * p.x + p.y * p.y) + wellSoftening * wellSoftening * 22);
        const trans = rotateAndProject({ x: p.x, y: p.y, z: pz });

        // Draw dynamic trail projected in 3D
        if (p.trail.length > 2) {
          ctx.beginPath();
          const startPt = p.trail[0];
          const startZ = - (mass * meshVisualScale) / Math.sqrt((startPt.x*startPt.x + startPt.y*startPt.y) + wellSoftening * wellSoftening * 22);
          const startTrans = rotateAndProject({ x: startPt.x, y: startPt.y, z: startZ });
          ctx.moveTo(startTrans.coords.x, startTrans.coords.y);

          for (let k = 1; k < p.trail.length; k++) {
            const pt = p.trail[k];
            const ptz = - (mass * meshVisualScale) / Math.sqrt((pt.x*pt.x + pt.y*pt.y) + wellSoftening * wellSoftening * 22);
            const pr = rotateAndProject({ x: pt.x, y: pt.y, z: ptz });
            ctx.lineTo(pr.coords.x, pr.coords.y);
          }
          ctx.strokeStyle = p.color + '44';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Draw particle body
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(trans.coords.x, trans.coords.y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Highlight ring glow
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(trans.coords.x, trans.coords.y, 5, 0, 2 * Math.PI);
        ctx.stroke();
      });

      if (isPlaying) {
        animationId = requestAnimationFrame(stepSimulation);
      }
    };

    if (isPlaying) {
      animationId = requestAnimationFrame(stepSimulation);
    } else {
      stepSimulation();
    }

    return () => cancelAnimationFrame(animationId);
  }, [particles, mass, gridResolution, isPlaying, pitch, yaw, cameraDistance, meshVisualScale, visualizationMode]);

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full font-sans">
      {/* Simulation display */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex-1 flex flex-col items-center justify-center relative overflow-hidden min-h-[340px]">
          
          <div className="absolute top-3 left-4 flex items-center gap-2 z-10 font-mono text-[11px] uppercase tracking-wider text-slate-400">
            <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span>Flamm's paraboloid Spacetime Grid scope</span>
          </div>

          <div className="absolute top-3 right-4 flex items-center gap-2.5 z-10 font-mono text-[10px] text-slate-500">
            <span className="text-[10px] text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">Scroll to zoom</span>
            <span>Tilt/Orbit pitch: {pitch.toFixed(1)} rad | Euler yaw: {yaw.toFixed(1)} rad</span>
          </div>

          <canvas
            ref={canvasRef}
            width={470}
            height={325}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="bg-slate-950/70 rounded-lg border border-slate-800/80 cursor-grab active:cursor-grabbing max-w-full"
            id="rendering-canvas-phase-4"
          />

          <div className="mt-3.5 flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              id="phase-4-play-simulation"
              className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-400 rounded-lg border border-slate-700 transition"
              title={isPlaying ? "Mute geodesic movement tick" : "Activate geodesic movement tick"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={resetSimulation}
              id="phase-4-reset"
              className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-1.5 text-xs font-mono font-medium"
              title="Reset spacetime geometry"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset
            </button>

            <button
              onClick={clearParticles}
              id="phase-4-clear-particles"
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-400 text-xs font-mono rounded transition"
            >
              Clear Observers
            </button>

            <div className="h-4 w-px bg-slate-800" />

            {/* Mesh styles toggles */}
            <div className="flex bg-slate-950/70 p-1 border border-slate-800 rounded-lg text-xs font-mono">
              <button
                onClick={() => setVisualizationMode('well')}
                id="mesh-well"
                className={`px-3 py-1 rounded-sm transition ${
                  visualizationMode === 'well'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Gravity Well
              </button>
              <button
                onClick={() => setVisualizationMode('grid-shaded')}
                id="mesh-shaded"
                className={`px-3 py-1 rounded-sm transition ${
                  visualizationMode === 'grid-shaded'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Shaded Quads
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spacetime configurations */}
      <div className="lg:w-[320px] flex flex-col gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shrink-0">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-1">
          <Database className="h-5 w-5 text-cyan-400" />
          <div>
            <h3 className="font-semibold text-slate-200 text-sm font-sans">Relativistic Mass</h3>
            <p className="text-[10px] text-slate-400 font-normal">Singularity curvature warping</p>
          </div>
        </div>

        {/* Singularity mass slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Schwarzschild Mass (M)</span>
            <span className="text-cyan-400 font-bold">{mass} solar units</span>
          </div>
          <input
            type="range"
            min={10}
            max={80}
            step={2}
            value={mass}
            onChange={(e) => setMass(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            id="singularity-mass-slider"
          />
        </div>

        {/* Mesh Resolution density */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Mesh Resolution</span>
            <span className="text-cyan-400 font-bold">{gridResolution} lines</span>
          </div>
          <input
            type="range"
            min={12}
            max={36}
            step={2}
            value={gridResolution}
            onChange={(e) => setGridResolution(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            id="mesh-resol-slider"
          />
        </div>

        {/* Well depth multiplier */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Warp Coefficient</span>
            <span className="text-cyan-400 font-bold">{meshVisualScale}x</span>
          </div>
          <input
            type="range"
            min={5}
            max={25}
            step={1}
            value={meshVisualScale}
            onChange={(e) => setMeshVisualScale(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            id="warp-coeff-slider"
          />
        </div>

        <div className="h-px bg-slate-800 my-1" />

        {/* Injected Observer bodies triggers */}
        <div className="flex flex-col gap-2 pt-1.5">
          <h4 className="text-xs font-bold text-slate-400 font-sans flex items-center gap-1">
            <Orbit className="h-3.5 w-3.5 text-cyan-400" />
            Launch Gravitational Observers
          </h4>
          <div className="flex flex-col gap-1.5 text-[11px] font-mono">
            <button
              onClick={() => injectParticle('standard')}
              id="inject-standard"
              className="py-1.5 px-3 bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 rounded transition text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <Orbit className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>Kepler Circular Orbit</span>
              </div>
              <span className="text-cyan-500 font-bold">Launch</span>
            </button>
            <button
              onClick={() => injectParticle('hyperbolic')}
              id="inject-hyperbolic"
              className="py-1.5 px-3 bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 rounded transition text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Hyperbolic Flyby</span>
              </div>
              <span className="text-amber-500 font-bold font-mono">Flyby</span>
            </button>
            <button
              onClick={() => injectParticle('capture')}
              id="inject-capture"
              className="py-1.5 px-3 bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 rounded transition text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span>Singularity Accretion</span>
              </div>
              <span className="text-rose-500 font-bold font-mono">Decay</span>
            </button>
          </div>
        </div>

        {/* Flamm's paraboloid equation panel */}
        <div className="mt-auto bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono text-[9px] leading-relaxed text-slate-400 flex flex-col gap-1.5">
          <div className="flex items-center gap-1 text-cyan-400 font-semibold text-[10px]">
            <Compass className="h-3.5 w-3.5" />
            <span>Spacetime Warp Equation</span>
          </div>
          <p>
            An interpretation of Einstein's Field Equations, the visual metric depth represents coordinates warped by mass:
          </p>
          <div className="bg-slate-950 p-1.5 rounded text-slate-300 font-semibold text-center border border-slate-850 font-mono">
            {"z = - M / \u221A(r\u00B2 + \u03B5\u00B2)"}
          </div>
          <p>
            Particles roll along geodesic lines. Under massive central nodes, trajectories warp because shortest spacetime lines converge inwards.
          </p>
        </div>
      </div>
    </div>
  );
}
