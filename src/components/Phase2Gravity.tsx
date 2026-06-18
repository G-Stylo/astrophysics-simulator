/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2, Sliders, Milestone, Settings, Info, Pointer, Sun, Sparkles, Rocket, Atom } from 'lucide-react';
import { PhysicsObject, Vector2D } from '../types';

export default function Phase2Gravity() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Constants & simulation config
  const [G, setG] = useState<number>(0.15);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showTrails, setShowTrails] = useState<boolean>(true);
  const [spawnMass, setSpawnMass] = useState<number>(100);
  const [spawnRadius, setSpawnRadius] = useState<number>(10);
  const [spawnColor, setSpawnColor] = useState<string>('#38bdf8');
  const [interactiveMode, setInteractiveMode] = useState<'view' | 'spawn'>('spawn');
  const [zoom, setZoom] = useState<number>(1.0);

  // Object tracking state
  const [objects, setObjects] = useState<PhysicsObject[]>([]);
  const [activePreset, setActivePreset] = useState<'binary' | 'solar' | 'slingshot' | 'chaos'>('solar');
  
  // Interactive velocity selection on click-and-drag
  const [dragStart, setDragStart] = useState<Vector2D | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Vector2D | null>(null);

  // Helper to map screen coordinates to simulation space based on current zoom
  const getSimCoords = (screenCoords: Vector2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return screenCoords;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    return {
      x: (screenCoords.x - cx) / zoom + cx,
      y: (screenCoords.y - cy) / zoom + cy
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
      setZoom(z => Math.max(0.15, Math.min(6.0, z * zoomFactor)));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Preset Configurations
  const loadPreset = (presetName: 'binary' | 'solar' | 'slingshot' | 'chaos') => {
    setActivePreset(presetName);
    switch (presetName) {
      case 'binary': {
        // Binary Star System: Two identical bodies orbiting each other
        const starA: PhysicsObject = {
          id: 'star-a',
          name: 'Star Alpha',
          position: { x: 180, y: 150 },
          velocity: { x: 0, y: 1.4 },
          acceleration: { x: 0, y: 0 },
          mass: 12000,
          radius: 12,
          color: '#f59e0b',
          isAnchor: false,
          trail: []
        };
        const starB: PhysicsObject = {
          id: 'star-b',
          name: 'Star Beta',
          position: { x: 320, y: 150 },
          velocity: { x: 0, y: -1.4 },
          acceleration: { x: 0, y: 0 },
          mass: 12000,
          radius: 12,
          color: '#3b82f6',
          isAnchor: false,
          trail: []
        };
        setObjects([starA, starB]);
        setG(0.04);
        break;
      }
      case 'solar': {
        // Solar system: A massive heavy core stationary Sun (Anchor) and three orbiting planets
        const sun: PhysicsObject = {
          id: 'sun',
          name: 'Sun Core',
          position: { x: 250, y: 150 },
          velocity: { x: 0, y: 0 },
          acceleration: { x: 0, y: 0 },
          mass: 100000,
          radius: 18,
          color: '#eab308',
          isAnchor: true,
          trail: []
        };
        const innerPlanet: PhysicsObject = {
          id: 'p-inner',
          name: 'Hermes',
          position: { x: 250, y: 70 },
          velocity: { x: 3.5, y: 0 },
          acceleration: { x: 0, y: 0 },
          mass: 150,
          radius: 6,
          color: '#94a3b8',
          isAnchor: false,
          trail: []
        };
        const middlePlanet: PhysicsObject = {
          id: 'p-mid',
          name: 'Gaia',
          position: { x: 250, y: 40 },
          velocity: { x: 2.8, y: 0 },
          acceleration: { x: 0, y: 0 },
          mass: 400,
          radius: 9,
          color: '#10b981',
          isAnchor: false,
          trail: []
        };
        const outerPlanet: PhysicsObject = {
          id: 'p-outer',
          name: 'Ares',
          position: { x: 250, y: 10 },
          velocity: { x: 2.4, y: 0 },
          acceleration: { x: 0, y: 0 },
          mass: 100,
          radius: 5,
          color: '#f43f5e',
          isAnchor: false,
          trail: []
        };
        setObjects([sun, innerPlanet, middlePlanet, outerPlanet]);
        setG(0.03);
        break;
      }
      case 'slingshot': {
        // Gravitational Slingshot: Planet orbiting sun, asteroid thrown past them
        const sun: PhysicsObject = {
          id: 'slingshot-sun',
          name: 'Colossus',
          position: { x: 250, y: 150 },
          velocity: { x: 0, y: 0 },
          acceleration: { x: 0, y: 0 },
          mass: 150000,
          radius: 16,
          color: '#ef4444',
          isAnchor: true,
          trail: []
        };
        const asteroid: PhysicsObject = {
          id: 'slingshot-asteroid',
          name: 'Meteor-IX',
          position: { x: 40, y: 300 },
          velocity: { x: 3.3, y: -2.3 },
          acceleration: { x: 0, y: 0 },
          mass: 10,
          radius: 4,
          color: '#a855f7',
          isAnchor: false,
          trail: []
        };
        setObjects([sun, asteroid]);
        setG(0.04);
        break;
      }
      case 'chaos': {
        // Multi-body gravity sandbox preset
        const coreA: PhysicsObject = {
          id: 'chaos-1',
          name: 'Pulsar A',
          position: { x: 200, y: 160 },
          velocity: { x: 0.8, y: -0.4 },
          acceleration: { x: 0, y: 0 },
          mass: 50000,
          radius: 11,
          color: '#14b8a6',
          isAnchor: false,
          trail: []
        };
        const coreB: PhysicsObject = {
          id: 'chaos-2',
          name: 'Pulsar B',
          position: { x: 300, y: 140 },
          velocity: { x: -0.8, y: 0.4 },
          acceleration: { x: 0, y: 0 },
          mass: 50000,
          radius: 11,
          color: '#ec4899',
          isAnchor: false,
          trail: []
        };
        const lightA: PhysicsObject = {
          id: 'chaos-3',
          name: 'Probe',
          position: { x: 250, y: 240 },
          velocity: { x: -1.6, y: -0.4 },
          acceleration: { x: 0, y: 0 },
          mass: 1,
          radius: 3,
          color: '#e2e8f0',
          isAnchor: false,
          trail: []
        };
        setObjects([coreA, coreB, lightA]);
        setG(0.04);
        break;
      }
    }
  };

  // Initially load preset
  useEffect(() => {
    loadPreset('solar');
  }, []);

  // Pairwise gravity loops
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = () => {
      // Create copies of target objects to safely compute coordinate matrices
      let nextObjects = objects.map(o => ({
        ...o,
        trail: [...o.trail],
        acceleration: { x: 0, y: 0 }
      }));

      // Only iterate physics operations if running is active
      if (isPlaying) {
        const LEN = nextObjects.length;

        // Loop pairwise and sum gravitational force: Force = G * m1 * m2 / r^2
        for (let i = 0; i < LEN; i++) {
          for (let j = i + 1; j < LEN; j++) {
            const bodyA = nextObjects[i];
            const bodyB = nextObjects[j];

            const dx = bodyB.position.x - bodyA.position.x;
            const dy = bodyB.position.y - bodyA.position.y;
            const distSq = dx * dx + dy * dy;
            const distance = Math.sqrt(distSq);

            // Avoid collision singularities / infinite gravity warp
            const minimumPermittedDistance = (bodyA.radius + bodyB.radius) * 0.95;
            if (distance < minimumPermittedDistance) {
              // Collisions: merge smaller bodies or simply soft-deflect
              continue;
            }

            // Mutual Gravitational equation
            const forceMag = (G * bodyA.mass * bodyB.mass) / distSq;

            // Unit direction coordinates
            const uX = dx / distance;
            const uY = dy / distance;

            // Update accelerations for each body: a = F / m
            if (!bodyA.isAnchor) {
              bodyA.acceleration.x += (uX * forceMag) / bodyA.mass;
              bodyA.acceleration.y += (uY * forceMag) / bodyA.mass;
            }

            if (!bodyB.isAnchor) {
              bodyB.acceleration.x -= (uX * forceMag) / bodyB.mass;
              bodyB.acceleration.y -= (uY * forceMag) / bodyB.mass;
            }
          }
        }

        // Apply velocities and positions
        for (let i = 0; i < LEN; i++) {
          const body = nextObjects[i];
          if (body.isAnchor) continue;

          // Velocity sum: v = v + a * dt (dt = 0.5 for stability)
          body.velocity.x += body.acceleration.x * 0.35;
          body.velocity.y += body.acceleration.y * 0.35;

          // Position sum: p = p + v * dt
          body.position.x += body.velocity.x;
          body.position.y += body.velocity.y;

          // Manage trails points count
          if (showTrails) {
            body.trail.push({ ...body.position });
            if (body.trail.length > 120) {
              body.trail.shift();
            }
          } else {
            body.trail = [];
          }
        }

        setObjects(nextObjects);
      }

      // ----------------------------------------------------
      // DRAW CANVAS STAGES WITH ENHANCED MATRIX ZOOM SCALING
      // ----------------------------------------------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);

      // Background grid coordinate lines (expanded range to cover zoomed out maps)
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.lineWidth = 0.5;
      const stepGrid = 50;
      for (let x = -2000; x < canvas.width + 2000; x += stepGrid) {
        ctx.beginPath();
        ctx.moveTo(x, -2000);
        ctx.lineTo(x, canvas.height + 2000);
        ctx.stroke();
      }
      for (let y = -2000; y < canvas.height + 2000; y += stepGrid) {
        ctx.beginPath();
        ctx.moveTo(-2000, y);
        ctx.lineTo(canvas.width + 2000, y);
        ctx.stroke();
      }

      // 1. Draw trails
      if (showTrails) {
        nextObjects.forEach(body => {
          if (body.trail.length < 2) return;
          ctx.beginPath();
          ctx.moveTo(body.trail[0].x, body.trail[0].y);
          for (let k = 1; k < body.trail.length; k++) {
            ctx.lineTo(body.trail[k].x, body.trail[k].y);
          }
          ctx.strokeStyle = body.color + '55'; // semi-transparent
          ctx.lineWidth = 1.3 / zoom;
          ctx.stroke();
        });
      }

      // 2. Draw physical bodies
      nextObjects.forEach(body => {
        // Draw glow effect for giant masses
        if (body.mass > 10000) {
          const grad = ctx.createRadialGradient(
            body.position.x, body.position.y, body.radius,
            body.position.x, body.position.y, body.radius * 3
          );
          grad.addColorStop(0, body.color + '44');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(body.position.x, body.position.y, body.radius * 3, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Base sphere center filling
        ctx.fillStyle = body.color;
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, body.radius, 0, 2 * Math.PI);
        ctx.fill();

        // Shading reflections to make spheres look 3D
        const shadeGrad = ctx.createRadialGradient(
          body.position.x - body.radius * 0.3,
          body.position.y - body.radius * 0.3,
          body.radius * 0.1,
          body.position.x,
          body.position.y,
          body.radius
        );
        shadeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        shadeGrad.addColorStop(0.2, 'transparent');
        shadeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
        ctx.fillStyle = shadeGrad;
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, body.radius, 0, 2 * Math.PI);
        ctx.fill();

        // Body Vector labels (scale font size nicely so it doesn't get blocky)
        ctx.fillStyle = '#cbd5e1';
        ctx.font = `${Math.max(4, Math.min(16, 8 / zoom))}px monospace`;
        ctx.fillText(body.name, body.position.x + body.radius + 4, body.position.y + 3);
      });

      ctx.restore();

      // 3. Draw active custom spawner projectile vector on click-and-drag in clean overlay screen space
      if (dragStart && dragCurrent) {
        // Line representation for physical spring slingshot velocity vector
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(dragStart.x, dragStart.y);
        ctx.lineTo(dragCurrent.x, dragCurrent.y);
        ctx.stroke();
        ctx.setLineDash([]); // clear dash

        // Circle outline of launching object
        ctx.strokeStyle = spawnColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(dragStart.x, dragStart.y, spawnRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // Arrow end vector point
        const angle = Math.atan2(dragCurrent.y - dragStart.y, dragCurrent.x - dragStart.x);
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(dragCurrent.x, dragCurrent.y, 3, 0, 2 * Math.PI);
        ctx.fill();

        // Display velocity magnitude estimate (adjust according to zoom so velocity feels natural)
        const velEstimateX = (dragStart.x - dragCurrent.x) * 0.05;
        const velEstimateY = (dragStart.y - dragCurrent.y) * 0.05;
        const speed = Math.sqrt(velEstimateX * velEstimateX + velEstimateY * velEstimateY);
        ctx.fillStyle = '#f43f5e';
        ctx.font = '10px monospace';
        ctx.fillText(`v_init: ${speed.toFixed(1)} km/s`, dragStart.x + 12, dragStart.y - 12);
      }

      if (isPlaying) {
        animationId = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      animationId = requestAnimationFrame(tick);
    } else {
      tick();
    }

    return () => cancelAnimationFrame(animationId);
  }, [objects, G, isPlaying, showTrails, dragStart, dragCurrent, spawnRadius, spawnColor, zoom]);

  // Click & Drag Canvas Interactions to Spawn Objects
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (interactiveMode === 'view') return;
    const coords = getCanvasCoords(e);
    setDragStart(coords);
    setDragCurrent(coords);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStart) return;
    const coords = getCanvasCoords(e);
    setDragCurrent(coords);
  };

  const handleMouseUp = () => {
    if (!dragStart || !dragCurrent) return;

    // Direct slingshot launching vector magnitude
    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;
    
    // Scale down drags as starting speeds
    const vx = dx * 0.06;
    const vy = dy * 0.06;

    const names = ['Asteroid', 'Planetesimal', 'Chondrite', 'Meteor', 'Sputnik', 'Probe', 'Vanguard', 'Nautilus'];
    const selectedName = names[Math.floor(Math.random() * names.length)] + '-' + Math.floor(Math.random() * 100);

    const simPos = getSimCoords(dragStart);

    const newObj: PhysicsObject = {
      id: 'custom-' + Date.now(),
      name: selectedName,
      position: simPos,
      velocity: { x: vx, y: vy },
      acceleration: { x: 0, y: 0 },
      mass: spawnMass,
      radius: spawnRadius,
      color: spawnColor,
      isAnchor: false,
      trail: []
    };

    setObjects(prev => [...prev, newObj]);
    setDragStart(null);
    setDragCurrent(null);
  };

  const deleteObject = (id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
  };

  const clearSandbox = () => {
    setObjects([]);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full font-sans">
      {/* Simulation space */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex-1 flex flex-col items-center justify-center relative overflow-hidden min-h-[340px]">
          {/* Header Indicators */}
          <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400">
              N-Body Gravity Engine Scope
            </span>
          </div>

          <div className="absolute top-3 right-4 flex items-center gap-3 z-10 font-mono text-[11px] text-slate-400">
            <span className="text-[10px] text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">Scroll to zoom</span>
            <span>Mass Count: {objects.length}</span>
          </div>

          <canvas
            ref={canvasRef}
            width={500}
            height={340}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={`bg-slate-950/70 rounded-lg border border-slate-800/80 max-w-full cursor-${
              interactiveMode === 'spawn' ? 'crosshair' : 'grab'
            }`}
            id="rendering-canvas-phase-2"
          />

          {/* Player controls */}
          <div className="mt-3.5 flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              id="phase-2-play-btn"
              className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-400 rounded-lg border border-slate-700 transition"
              title={isPlaying ? "Pause simulation" : "Resume simulation"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => loadPreset(activePreset)}
              id="phase-2-reset-btn"
              className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Reset current preset parameters"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={clearSandbox}
              id="phase-2-clear"
              className="px-3 py-2 text-xs font-mono font-medium hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-lg border border-slate-800 hover:border-red-500/30 transition duration-150 active:scale-95"
            >
              Clear Sandbox
            </button>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex bg-slate-950/70 p-1 border border-slate-800 rounded-lg text-xs font-mono">
              <button
                onClick={() => setInteractiveMode('spawn')}
                id="mode-spawn"
                className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                  interactiveMode === 'spawn'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Pointer className="h-3.5 w-3.5" />
                Drag Launch
              </button>
            </div>
          </div>
        </div>

        {/* Live Vector coordinates table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-2">
              <Milestone className="h-4 w-4 text-cyan-400" />
              Dynamic Objects Vector State Table
            </h4>
          </div>
          
          <div className="max-h-[140px] overflow-y-auto border border-slate-850 rounded-lg">
            {objects.length === 0 ? (
              <p className="text-[11px] font-mono p-4 text-center text-slate-500 bg-slate-950/40">
                Sandbox empty. Click and slide-launch coordinates on viewport above to catalog stellar items.
              </p>
            ) : (
              <table className="w-full text-left font-mono text-[10px] bg-slate-950/50 rounded-lg">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                    <th className="px-3 py-1.5 font-bold">Stellar Object</th>
                    <th className="px-3 py-1.5 font-bold">Mass</th>
                    <th className="px-3 py-1.5 font-bold">Position [X, Y]</th>
                    <th className="px-3 py-1.5 font-bold">Velocity VECTOR [vx, vy]</th>
                    <th className="px-3 py-1.5 text-right font-bold pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60">
                  {objects.map((body) => (
                    <tr key={body.id} className="hover:bg-slate-900/60 transition group text-slate-300">
                      <td className="px-3 py-1.5 flex items-center gap-2 font-medium">
                        <span className="h-2 w-2 rounded-full inline-block shrink-0" style={{ backgroundColor: body.color }} />
                        {body.name} {body.isAnchor && <span className="text-[8px] bg-yellow-500/10 text-yellow-500 px-1 rounded-sm">ANCHOR</span>}
                      </td>
                      <td className="px-3 py-1.5 text-slate-400">{body.mass}</td>
                      <td className="px-3 py-1.5 text-slate-400">[{body.position.x.toFixed(0)}, {body.position.y.toFixed(0)}]</td>
                      <td className="px-3 py-1.5 text-cyan-400">[{body.velocity.x.toFixed(2)}, {body.velocity.y.toFixed(2)}]</td>
                      <td className="px-3 py-1.5 text-right pr-4">
                        <button
                          onClick={() => deleteObject(body.id)}
                          id={`delete-body-${body.id}`}
                          className="text-slate-500 hover:text-red-400 transition"
                          title="Erase coordinate node"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Control panel */}
      <div className="lg:w-[320px] flex flex-col gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shrink-0">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-1">
          <Settings className="h-5 w-5 text-cyan-400" />
          <div>
            <h3 className="font-semibold text-slate-200 text-sm font-sans">Gravity Core</h3>
            <p className="text-[10px] text-slate-400 font-normal">Stellar orbital controller</p>
          </div>
        </div>

        {/* Gravitational Constant Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400 font-semibold">Gravitation Constant (G)</span>
            <span className="text-cyan-400 font-bold">{G.toFixed(4)}</span>
          </div>
          <input
            type="range"
            min={0.005}
            max={0.8}
            step={0.005}
            value={G}
            onChange={(e) => setG(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            id="g-slider"
          />
        </div>

        {/* Spawner variables */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 flex flex-col gap-3">
          <h4 className="text-xs font-bold text-slate-300 font-mono text-center pb-2 border-b border-slate-800 flex items-center justify-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-cyan-400" /> Set Launched projectile Mass
          </h4>

          {/* Mass */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">Launch Mass</span>
              <span className="text-cyan-400">{spawnMass} units</span>
            </div>
            <input
              type="range"
              min={1}
              max={3000}
              step={10}
              value={spawnMass}
              onChange={(e) => {
                setSpawnMass(parseInt(e.target.value));
                // scale radius proportionally
                setSpawnRadius(Math.max(3, Math.min(18, Math.round(3 + Math.log10(parseInt(e.target.value)) * 3.5))));
              }}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              id="spawn-mass-slider"
            />
          </div>

          {/* Color mapping */}
          <div className="flex justify-between items-center text-[11px] font-mono pt-1.5">
            <span className="text-slate-400">Color Variant</span>
            <div className="flex gap-1.5">
              {['#38bdf8', '#fb7185', '#34d399', '#fbbf24', '#c084fc'].map((col) => (
                <button
                  key={col}
                  onClick={() => setSpawnColor(col)}
                  className={`h-4 w-4 rounded-full border transition ${
                    spawnColor === col ? 'border-white scale-110 ring-1 ring-cyan-400' : 'border-transparent scale-90'
                  }`}
                  style={{ backgroundColor: col }}
                  id={`color-preset-${col}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Trail persistent togglers */}
        <div className="flex items-center justify-between cursor-pointer text-xs text-slate-300 font-medium pt-1">
          <span>Draw Gravity Trails</span>
          <input
            type="checkbox"
            checked={showTrails}
            onChange={(e) => setShowTrails(e.target.checked)}
            className="sr-only peer"
            id="show-trails-toggle"
          />
          <div className="relative w-8 h-4 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 peer-checked:after:bg-slate-950 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
        </div>

        {/* Presets Grid */}
        <div className="flex flex-col gap-2 pt-2.5">
          <h4 className="text-xs font-bold text-slate-400 font-sans">Orbital Presets</h4>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <button
              onClick={() => loadPreset('solar')}
              id="preset-solar-btn"
              className={`py-1.5 px-2 rounded transition text-left flex items-center gap-1.5 border ${
                activePreset === 'solar'
                  ? 'border-cyan-500/60 bg-cyan-950/20 text-cyan-400 font-semibold'
                  : 'bg-slate-950 border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400'
              }`}
            >
              <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Solar Orbits</span>
            </button>
            <button
              onClick={() => loadPreset('binary')}
              id="preset-binary-btn"
              className={`py-1.5 px-2 rounded transition text-left flex items-center gap-1.5 border ${
                activePreset === 'binary'
                  ? 'border-cyan-500/60 bg-cyan-950/20 text-cyan-400 font-semibold'
                  : 'bg-slate-950 border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>Binary Stars</span>
            </button>
            <button
              onClick={() => loadPreset('slingshot')}
              id="preset-slingshot-btn"
              className={`py-1.5 px-2 rounded transition text-left flex items-center gap-1.5 border ${
                activePreset === 'slingshot'
                  ? 'border-cyan-500/60 bg-cyan-950/20 text-cyan-400 font-semibold'
                  : 'bg-slate-950 border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400'
              }`}
            >
              <Rocket className="h-3.5 w-3.5 text-orange-400 shrink-0" />
              <span>Gravity Slingshot</span>
            </button>
            <button
              onClick={() => loadPreset('chaos')}
              id="preset-chaos-btn"
              className={`py-1.5 px-2 rounded transition text-left flex items-center gap-1.5 border ${
                activePreset === 'chaos'
                  ? 'border-cyan-500/60 bg-cyan-950/20 text-cyan-400 font-semibold'
                  : 'bg-slate-950 border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400'
              }`}
            >
              <Atom className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>Pulsar Chaotic</span>
            </button>
          </div>
        </div>

        {/* Simple Info block */}
        <div className="mt-auto bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono text-[9px] leading-relaxed text-slate-400 flex items-start gap-1.5">
          <Info className="h-5 w-5 text-cyan-400 shrink-0" />
          <p>
            The engine iterates through the dynamic matrix of objects to sum gravitational pull: 
            <span className="text-cyan-300 font-semibold"> a_i = ∑ G * m_j * u / r²</span>. 
            Click & Slingshot drag onto viewport to dynamically introduce masses into orbital loops.
          </p>
        </div>
      </div>
    </div>
  );
}
