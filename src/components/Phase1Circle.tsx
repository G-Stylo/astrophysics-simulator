/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Eye, Sliders, ChevronRight } from 'lucide-react';

export default function Phase1Circle() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Custom states
  const [segments, setSegments] = useState<number>(12);
  const [radius, setRadius] = useState<number>(90);
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe' | 'vertices'>('wireframe');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showHelperMath, setShowHelperMath] = useState<boolean>(true);

  // Motion physics
  const [pos, setPos] = useState({ x: 200, y: 150 });
  const [vel, setVel] = useState({ x: 1.5, y: 1.0 });

  // Reset circle state
  const resetSimulation = () => {
    setPos({ x: 200, y: 150 });
    setVel({ x: 1.5, y: 1.0 });
  };

  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let currentX = pos.x;
    let currentY = pos.y;
    let currentVx = vel.x;
    let currentVy = vel.y;

    const step = () => {
      // 1. Update Physics (simple translation with wall collisions)
      if (isPlaying) {
        currentX += currentVx;
        currentY += currentVy;

        // Bounce off canvas boundaries
        const r = radius;
        if (currentX - r <= 0) {
          currentX = r;
          currentVx = -currentVx;
        } else if (currentX + r >= canvas.width) {
          currentX = canvas.width - r;
          currentVx = -currentVx;
        }

        if (currentY - r <= 0) {
          currentY = r;
          currentVy = -currentVy;
        } else if (currentY + r >= canvas.height) {
          currentY = canvas.height - r;
          currentVy = -currentVy;
        }

        setPos({ x: currentX, y: currentY });
        setVel({ x: currentVx, y: currentVy });
      }

      // 2. Render Screen
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw mathematical background grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Compute standard vertices using circular trigonometry:
      // x_i = cx + R * cos(angle), y_i = cy + R * sin(angle)
      const vertices: { x: number; y: number }[] = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (2 * Math.PI * i) / segments;
        const vx = currentX + radius * Math.cos(angle);
        const vy = currentY + radius * Math.sin(angle);
        vertices.push({ x: vx, y: vy });
      }

      // Draw according to the selected render mode (emulating OpenGL vertex stages)
      if (renderMode === 'solid') {
        // Draw the solid circle using a Pizza Slice (Triangle Fan) rendering simulation
        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(currentX, currentY); // Center node
        for (let i = 0; i < vertices.length; i++) {
          ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } 
      else if (renderMode === 'wireframe') {
        // Wireframe: draw each explicit triangle fan slice so the user can easily see OpenGL structural triangles
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;

        for (let i = 0; i < segments; i++) {
          const v1 = vertices[i];
          const v2 = vertices[i + 1];

          // Draw the triangle: Center -> v1 -> v2 -> Center
          ctx.beginPath();
          ctx.moveTo(currentX, currentY); // Start at Center
          ctx.lineTo(v1.x, v1.y);
          ctx.lineTo(v2.x, v2.y);
          ctx.closePath();
          
          // Fill individual slice with subtle gradient alternation to show slices
          ctx.fillStyle = i % 2 === 0 ? 'rgba(6, 182, 212, 0.08)' : 'rgba(147, 51, 234, 0.08)';
          ctx.fill();
          ctx.stroke();
        }

        // Highlight center hub
        ctx.fillStyle = '#fdba74';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 4, 0, 2 * Math.PI);
        ctx.fill();
      } 
      else if (renderMode === 'vertices') {
        // Vertices: Highlight the exact discrete coordinate indices passed into standard OpenGL vertex arrays
        ctx.strokeStyle = 'rgba(238, 242, 249, 0.15)';
        ctx.lineWidth = 1;

        // Draw boundary ring loosely
        ctx.beginPath();
        ctx.arc(currentX, currentY, radius, 0, 2 * Math.PI);
        ctx.stroke();

        // Target center
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px monospace';
        ctx.fillText('v_center', currentX + 8, currentY - 4);

        // Target fan points
        for (let i = 0; i < segments; i++) {
          const v = vertices[i];
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(v.x, v.y, 4, 0, 2 * Math.PI);
          ctx.fill();

          // Label points
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px monospace';
          ctx.fillText(`v${i}`, v.x + 8, v.y + 4);
        }
      }

      // Render vector parameters if toggle checked
      if (showHelperMath) {
        // Draw physical velocity vector arrow
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;
        const arrowLength = 40;
        const angle = Math.atan2(currentVy, currentVx);
        const arrowEndX = currentX + Math.cos(angle) * arrowLength;
        const arrowEndY = currentY + Math.sin(angle) * arrowLength;

        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(arrowEndX, arrowEndY);
        ctx.stroke();

        // Arrow head
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(arrowEndX, arrowEndY);
        ctx.lineTo(
          arrowEndX - 8 * Math.cos(angle - Math.PI / 6),
          arrowEndY - 8 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          arrowEndX - 8 * Math.cos(angle + Math.PI / 6),
          arrowEndY - 8 * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Label velocity vector text
        ctx.fillStyle = '#f43f5e';
        ctx.font = '10px monospace';
        ctx.fillText(`v = [${currentVx.toFixed(2)}, ${currentVy.toFixed(2)}]`, currentX + 15, currentY + 30);
      }

      if (isPlaying) {
        animationId = requestAnimationFrame(step);
      }
    };

    // Trigger initial run or single frame
    if (isPlaying) {
      animationId = requestAnimationFrame(step);
    } else {
      step();
    }

    return () => cancelAnimationFrame(animationId);
  }, [segments, radius, renderMode, isPlaying, showHelperMath]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
      setRadius(r => Math.max(20, Math.min(220, Math.round(r * zoomFactor))));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full font-sans">
      {/* Simulation Workspace */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex-1 flex flex-col items-center justify-center relative overflow-hidden min-h-[340px]">
          <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400">
              GPU Vertex Fan Viewport
            </span>
          </div>

          <div className="absolute top-3 right-4 flex items-center gap-2.5 z-10 font-mono text-[11px] text-slate-400">
            <span className="text-[10px] text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">Scroll to zoom</span>
            <span>Pos: [{pos.x.toFixed(0)}, {pos.y.toFixed(0)}] px</span>
          </div>

          <canvas
            ref={canvasRef}
            width={440}
            height={320}
            className="bg-slate-950/70 rounded-lg border border-slate-800/80 max-w-full cursor-zoom-in"
            id="rendering-canvas-phase-1"
          />

          <div className="mt-2.5 flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              id="phase-1-play-btn"
              className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-400 rounded-lg border border-slate-700 transition"
              title={isPlaying ? "Pause physics tick loop" : "Resume physics tick loop"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={resetSimulation}
              id="phase-1-reset-btn"
              className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Reset circle spatial state"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            
            <div className="h-4 w-px bg-slate-800" />

            <div className="flex bg-slate-950/70 p-1 border border-slate-800 rounded-lg text-xs font-mono">
              <button
                onClick={() => setRenderMode('solid')}
                id="mode-solid-btn"
                className={`px-2.5 py-1 rounded-md transition ${
                  renderMode === 'solid'
                    ? 'bg-cyan-500 text-slate-950 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Solid
              </button>
              <button
                onClick={() => setRenderMode('wireframe')}
                id="mode-wireframe-btn"
                className={`px-2.5 py-1 rounded-md transition ${
                  renderMode === 'wireframe'
                    ? 'bg-cyan-500 text-slate-950 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Wireframe
              </button>
              <button
                onClick={() => setRenderMode('vertices')}
                id="mode-vertices-btn"
                className={`px-2.5 py-1 rounded-md transition ${
                  renderMode === 'vertices'
                    ? 'bg-cyan-500 text-slate-950 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vertices
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel Panel */}
      <div className="lg:w-[320px] flex flex-col gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shrink-0 flex-shrink-0">
        <div className="flex items-center gap-2 items-start border-b border-slate-800 pb-3 mb-1">
          <Sliders className="h-5 w-5 text-cyan-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-200 text-sm font-sans">OpenGL Parameters</h3>
            <p className="text-[10px] text-slate-400 font-normal">Tweak triangle compilation parameters</p>
          </div>
        </div>

        {/* Resolution Selector */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400 font-semibold">Triangle Slices (N)</span>
            <span className="text-cyan-400 font-bold">{segments}</span>
          </div>
          <input
            type="range"
            min={3}
            max={48}
            step={1}
            value={segments}
            onChange={(e) => setSegments(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            id="segments-slider"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Triangle (3)</span>
            <span>Smooth (48)</span>
          </div>
        </div>

        {/* Radius Slider */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400 font-semibold">Radius (Pixels)</span>
            <span className="text-cyan-400 font-bold">{radius}px</span>
          </div>
          <input
            type="range"
            min={30}
            max={140}
            step={5}
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            id="radius-slider"
          />
        </div>

        <div className="h-px bg-slate-800 my-1" />

        {/* Visual helpers */}
        <div className="flex flex-col gap-2.5">
          <label className="flex items-center justify-between cursor-pointer group text-xs text-slate-300 font-medium">
            <span>Show Velocity Vector</span>
            <input
              type="checkbox"
              checked={showHelperMath}
              onChange={(e) => setShowHelperMath(e.target.checked)}
              className="sr-only peer"
              id="show-velocity-vector-toggle"
            />
            <div className="relative w-8 h-4 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 peer-checked:after:bg-slate-950 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
          </label>
        </div>

        {/* Educational Info box on circle compilation */}
        <div className="mt-auto bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono text-[10px] leading-relaxed text-slate-400 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <ChevronRight className="h-3.5 w-3.5" />
            <span>Mathematical Analysis</span>
          </div>
          <p>
            The circle coordinates are compiled using trigonometric equations matching local vertices:
          </p>
          <div className="bg-slate-950 p-1.5 rounded text-slate-300 font-medium text-center border border-slate-800">
            x = c.x + r * cos(θ)<br/>
            y = c.y + r * sin(θ)
          </div>
          <p>
            With resolution <span className="text-cyan-300">{segments}</span>, the engine computes <span className="text-cyan-300">{segments} vertices</span> along the circle boundaries connected back to the core hub center vertex, modeling <span className="text-cyan-300">{segments} rendering triangles</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
