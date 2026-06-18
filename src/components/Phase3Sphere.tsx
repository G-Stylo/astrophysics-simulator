/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { RotateCw, Globe, Sliders, Play, Pause, RefreshCw, Layers } from 'lucide-react';
import { Vertex3D, TriangleIndices } from '../types';

export default function Phase3Sphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Resolution parameters
  const [thetaSegs, setThetaSegs] = useState<number>(14);
  const [phiSegs, setPhiSegs] = useState<number>(10);
  const [sphereRadius, setSphereRadius] = useState<number>(85);
  const [perspectiveStrength, setPerspectiveStrength] = useState<number>(300); // FOV

  // State
  const [isPlayingOrbit, setIsPlayingOrbit] = useState<boolean>(true);
  const [renderStyle, setRenderStyle] = useState<'points' | 'wireframe' | 'triangles' | 'shaded'>('shaded');

  // Camera settings
  const [pitch, setPitch] = useState<number>(0.4); // horizontal angle
  const [yaw, setYaw] = useState<number>(0.5);   // vertical angle
  const [cameraDistance, setCameraDistance] = useState<number>(300);

  // Orbit angles
  const [orbitAngle, setOrbitAngle] = useState<number>(0);

  // Mouse handling for rotation
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.95 : 1.05; // scrolling up zooms in (decreases distance)
      setCameraDistance(d => Math.max(120, Math.min(800, Math.round(d * zoomFactor))));
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
    
    // Tweak Euler angles
    setPitch(p => p - dy * 0.007);
    setYaw(y => y + dx * 0.007);

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let currentOrbit = orbitAngle;

    const tick = () => {
      // 1. Core sphere Vertex compilation (Long/Lat)
      const baseVertices: Vertex3D[] = [];
      
      // We iterate y as Latitude from index 0 to phiSegs (angle phi = 0 to PI)
      for (let y = 0; y <= phiSegs; y++) {
        const phi = (Math.PI * y) / phiSegs;
        
        // We iterate x as Longitude from index 0 to thetaSegs (angle theta = 0 to 2PI)
        for (let x = 0; x <= thetaSegs; x++) {
          const theta = (2 * Math.PI * x) / thetaSegs;

          // Trigonometric spherical projection formula
          const vx = sphereRadius * Math.sin(phi) * Math.cos(theta);
          const vy = sphereRadius * Math.cos(phi); // Vertically oriented sphere Core
          const vz = sphereRadius * Math.sin(phi) * Math.sin(theta);

          // Normals align with center position for unit spheres
          const nx = vx / sphereRadius;
          const ny = vy / sphereRadius;
          const nz = vz / sphereRadius;

          baseVertices.push({
            position: { x: vx, y: vy, z: vz },
            projected: { x: 0, y: 0 },
            depth: 0,
            normal: { x: nx, y: ny, z: nz }
          });
        }
      }

      // Generate Satellite visual helper vertex if animation is active
      if (isPlayingOrbit) {
        currentOrbit += 0.02;
        setOrbitAngle(currentOrbit);
      }

      const satRadius = 15;
      const ringRadius = 140;
      const satX = ringRadius * Math.cos(currentOrbit);
      const satZ = ringRadius * Math.sin(currentOrbit);
      const satY = ringRadius * Math.sin(currentOrbit * 0.5) * 0.3; // subtle wave

      // 2. Index triangulation arrays (Two triangles per Quad segment grid)
      const triangles: TriangleIndices[] = [];
      for (let y = 0; y < phiSegs; y++) {
        for (let x = 0; x < thetaSegs; x++) {
          const row1 = y * (thetaSegs + 1);
          const row2 = (y + 1) * (thetaSegs + 1);

          // Indices maps:
          const p1 = row1 + x;
          const p2 = row1 + (x + 1);
          const p3 = row2 + x;
          const p4 = row2 + (x + 1);

          // Two triangles to compile a quadrilateral mesh
          triangles.push({ a: p1, b: p2, c: p3 });
          triangles.push({ a: p2, b: p4, c: p3 });
        }
      }

      // Camera orientation rotation matrices
      // Pitch (X-rotation) & Yaw (Y-rotation)
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);

      const rotateTranslateProject = (point: { x: number; y: number; z: number }) => {
        // Rotate around Y center (Yaw)
        let rx = point.x * cosY - point.z * sinY;
        let rz = point.x * sinY + point.z * cosY;
        let ry = point.y;

        // Rotate around X center (Pitch)
        let finalY = ry * cosP - rz * sinP;
        let finalZ = ry * sinP + rz * cosP;
        let finalX = rx;

        // Offset depth into camera viewport screen
        const depth = finalZ + cameraDistance;

        // 3D Perspective division formula
        let projX = canvas.width / 2;
        let projY = canvas.height / 2;
        if (depth > 1) {
          const perspectiveScale = (perspectiveStrength * cameraDistance) / (cameraDistance + finalZ);
          projX += finalX * (perspectiveScale / cameraDistance);
          projY -= finalY * (perspectiveScale / cameraDistance); // Inverse screen coordinates
        }

        return {
          coords: { x: projX, y: projY },
          finalZ,
          depth
        };
      };

      // Project sphere nodes
      baseVertices.forEach(v => {
        const trans = rotateTranslateProject(v.position);
        v.projected = trans.coords;
        v.depth = trans.depth;
      });

      // Project Orbit satellite core
      const satPosTrans = rotateTranslateProject({ x: satX, y: satY, z: satZ });

      // ----------------------------------------------------
      // DRAW VISUALS
      // ----------------------------------------------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Distant stars background cluster
      ctx.fillStyle = 'rgba(255,44,222,0.03)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Orbit trackring projection in 3D
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height / 2 + 10, ringRadius * 1.1, ringRadius * 0.3 * cosP, -yaw, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Flat shade lighting vector source: top-right corner pointing down-left
      const sunNormal = { x: 0.6, y: 0.7, z: -0.35 };
      const normalize = (v: { x: number; y: number; z: number }) => {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return { x: v.x / len, y: v.y / len, z: v.z / len };
      };
      const lightSource = normalize(sunNormal);

      // Render styles routing
      if (renderStyle === 'points') {
        // Draw standard discrete vertex particles
        baseVertices.forEach(v => {
          // Darken background nodes
          const depthMultiplier = Math.max(0.2, (cameraDistance + sphereRadius - v.depth) / (2 * sphereRadius));
          ctx.fillStyle = `rgba(34, 211, 238, ${depthMultiplier})`;
          ctx.beginPath();
          ctx.arc(v.projected.x, v.projected.y, 2 + 1.5 * depthMultiplier, 0, 2 * Math.PI);
          ctx.fill();
        });
      } 
      else if (renderStyle === 'wireframe') {
        // Drawing lines for longitude and latitude rings (wireframe mesh)
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.lineWidth = 0.8;

        triangles.forEach(tri => {
          const vA = baseVertices[tri.a];
          const vB = baseVertices[tri.b];
          const vC = baseVertices[tri.c];

          // Simple back-face culling to only draw wireframe facing camera for cleaner visually
          const dotZ = (vA.normal?.z || 0) * Math.sin(yaw) + (vA.normal?.x || 0) * Math.cos(yaw);
          if (dotZ < -0.15) return;

          ctx.beginPath();
          ctx.moveTo(vA.projected.x, vA.projected.y);
          ctx.lineTo(vB.projected.x, vB.projected.y);
          ctx.lineTo(vC.projected.x, vC.projected.y);
          ctx.closePath();
          ctx.stroke();
        });
      } 
      else if (renderStyle === 'triangles' || renderStyle === 'shaded') {
        // Compiling filled geometric faces. We perform Depth sorting (Painter's Algorithm)
        // to render deep vertices first, ensuring forward polygons cover background ones correctly.
        const sortedTriangles = triangles.map(tri => {
          const zA = baseVertices[tri.a].depth;
          const zB = baseVertices[tri.b].depth;
          const zC = baseVertices[tri.c].depth;
          const avgDepth = (zA + zB + zC) / 3;
          return { tri, depth: avgDepth };
        }).sort((a, b) => b.depth - a.depth); // sort descending (farthest rendered first)

        sortedTriangles.forEach(({ tri }) => {
          const vA = baseVertices[tri.a];
          const vB = baseVertices[tri.b];
          const vC = baseVertices[tri.c];

          // Compute raw surface normals for lighting shading
          const aX = vB.position.x - vA.position.x;
          const aY = vB.position.y - vA.position.y;
          const aZ = vB.position.z - vA.position.z;

          const bX = vC.position.x - vA.position.x;
          const bY = vC.position.y - vA.position.y;
          const bZ = vC.position.z - vA.position.z;

          // Cross product representing surface vector orthogonal
          const nx = aY * bZ - aZ * bY;
          const ny = aZ * bX - aX * bZ;
          const nz = aX * bY - aY * bX;

          // Normalize normal
          const normalMag = Math.sqrt(nx*nx + ny*ny + nz*nz);
          if (normalMag === 0) return;
          const unX = nx / normalMag;
          const unY = ny / normalMag;
          const unZ = nz / normalMag;

          // Camera vector points from center (yaw orientation offset)
          // Rotate normal along yaw / pitch before culling
          let rotNX = unX * cosY - unZ * sinY;
          let rotNZ = unX * sinY + unZ * cosY;
          let rotNY = unY;

          let finalNY = rotNY * cosP - rotNZ * sinP;
          let finalNZ = rotNY * sinP + rotNZ * cosP;

          // Backface culling: If final normal is pointing away from camera (nz > 0), don't draw it!
          if (finalNZ >= 0) return;

          // 3D Lambertian lighting shading calculation (dot product with light normal)
          const dotRay = unX * lightSource.x + unY * lightSource.y + unZ * lightSource.z;
          const diffuseIntensity = Math.max(0.12, dotRay);

          ctx.beginPath();
          ctx.moveTo(vA.projected.x, vA.projected.y);
          ctx.lineTo(vB.projected.x, vB.projected.y);
          ctx.lineTo(vC.projected.x, vC.projected.y);
          ctx.closePath();

          if (renderStyle === 'shaded') {
            // Gradient cyan or purple according to coordinates + diffuse intensity lighting
            const rVal = Math.round(15 + diffuseIntensity * 60);
            const gVal = Math.round(150 + diffuseIntensity * 105);
            const bVal = Math.round(200 + diffuseIntensity * 55);

            ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
            ctx.strokeStyle = `rgba(16, 185, 129, 0.12)`;
          } else {
            // Flat unshaded grid triangles
            ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
          }

          ctx.fill();
          ctx.stroke();
        });
      }

      // Draw Orbiting Satellite core sphere based on computed depth
      const drawSat = () => {
        const glow = ctx.createRadialGradient(
          satPosTrans.coords.x, satPosTrans.coords.y, satRadius * 0.2,
          satPosTrans.coords.x, satPosTrans.coords.y, satRadius
        );
        glow.addColorStop(0, '#fdba74');
        glow.addColorStop(1, '#ea580c');
        
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(satPosTrans.coords.x, satPosTrans.coords.y, satRadius, 0, 2 * Math.PI);
        ctx.fill();

        // White specular overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(satPosTrans.coords.x - satRadius * 0.2, satPosTrans.coords.y - satRadius * 0.2, satRadius * 0.3, 0, 2 * Math.PI);
        ctx.fill();
      };

      // Draw Satellite layered properly relative to Sphere Core
      const sphereAvgDepth = cameraDistance;
      if (satPosTrans.depth > sphereAvgDepth) {
        // Satellite is behind sphere, render it first so sphere draws over it (handled by lack of overlap since culling skips back faces, but we draw it now)
        drawSat();
      } else {
        // Satellite is in front, draw last (over sphere)
        drawSat();
      }

      if (isPlayingOrbit) {
        animationId = requestAnimationFrame(tick);
      }
    };

    if (isPlayingOrbit) {
      animationId = requestAnimationFrame(tick);
    } else {
      tick();
    }

    return () => cancelAnimationFrame(animationId);
  }, [thetaSegs, phiSegs, sphereRadius, perspectiveStrength, renderStyle, pitch, yaw, cameraDistance, isPlayingOrbit]);

  const resetCamera = () => {
    setPitch(0.4);
    setYaw(0.5);
    setCameraDistance(300);
    setPerspectiveStrength(300);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full font-sans">
      {/* Visual Canvas Block */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex-1 flex flex-col items-center justify-center relative overflow-hidden min-h-[340px]">
          
          {/* Header indicator */}
          <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
            <Globe className="h-4 w-4 text-cyan-400" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400">
              3D Matrix Perspective Projection Viewport
            </span>
          </div>

          <div className="absolute top-3 right-4 flex items-center gap-2.5 z-10 font-mono text-[10px] text-slate-500">
            <span className="text-[10px] text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">Scroll to zoom</span>
            <span>Drag mouse on canvas to alter Pitch/Yaw</span>
          </div>

          <canvas
            ref={canvasRef}
            width={460}
            height={325}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="bg-slate-950/70 rounded-lg border border-slate-800/80 cursor-grab active:cursor-grabbing max-w-full"
            id="rendering-canvas-phase-3"
          />

          {/* Core controls */}
          <div className="mt-3.5 flex items-center gap-3">
            <button
              onClick={() => setIsPlayingOrbit(!isPlayingOrbit)}
              id="phase-3-play-orbit"
              className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-400 rounded-lg border border-slate-700 transition"
              title={isPlayingOrbit ? "Pause 3D orbit satellite animation" : "Resume 3D orbit satellite animation"}
            >
              {isPlayingOrbit ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={resetCamera}
              id="phase-3-reset-cam"
              className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-1.5 text-xs font-mono font-medium"
              title="Reset cameras metrics"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset view
            </button>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex bg-slate-950/70 p-1 border border-slate-800 rounded-lg text-xs font-mono">
              <button
                onClick={() => setRenderStyle('points')}
                id="render-style-points"
                className={`px-2 py-1 rounded-sm transition ${
                  renderStyle === 'points'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Points
              </button>
              <button
                onClick={() => setRenderStyle('wireframe')}
                id="render-style-wireframe"
                className={`px-2 py-1 rounded-sm transition ${
                  renderStyle === 'wireframe'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Lattice
              </button>
              <button
                onClick={() => setRenderStyle('triangles')}
                id="render-style-triangles"
                className={`px-2 py-1 rounded-sm transition ${
                  renderStyle === 'triangles'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Triangles
              </button>
              <button
                onClick={() => setRenderStyle('shaded')}
                id="render-style-shaded"
                className={`px-2 py-1 rounded-sm transition ${
                  renderStyle === 'shaded'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Lit Shaded
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Control sliders */}
      <div className="lg:w-[320px] flex flex-col gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shrink-0">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-1">
          <Sliders className="h-5 w-5 text-cyan-400" />
          <div>
            <h3 className="font-semibold text-slate-200 text-sm font-sans">Sphere Layout</h3>
            <p className="text-[10px] text-slate-400 font-normal">Latitude & Longitude segments</p>
          </div>
        </div>

        {/* Theta segments Slider */}
        <div className="flex flex-col gap-1.5 animate-subtle">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Longitude Segments (Theta)</span>
            <span className="text-cyan-400 font-bold">{thetaSegs}</span>
          </div>
          <input
            type="range"
            min={4}
            max={32}
            step={1}
            value={thetaSegs}
            onChange={(e) => setThetaSegs(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            id="theta-slider"
          />
        </div>

        {/* Phi segments Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Latitude Segments (Phi)</span>
            <span className="text-cyan-400 font-bold">{phiSegs}</span>
          </div>
          <input
            type="range"
            min={3}
            max={24}
            step={1}
            value={phiSegs}
            onChange={(e) => setPhiSegs(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            id="phi-slider"
          />
        </div>

        {/* Sphere radius slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">3D Radius</span>
            <span className="text-cyan-400 font-bold">{sphereRadius} px</span>
          </div>
          <input
            type="range"
            min={40}
            max={130}
            step={5}
            value={sphereRadius}
            onChange={(e) => setSphereRadius(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            id="sphere-radius-slider"
          />
        </div>

        <div className="h-px bg-slate-800 my-1" />

        {/* Zoom slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Perspective Field of View</span>
            <span className="text-cyan-400 font-bold">{perspectiveStrength}</span>
          </div>
          <input
            type="range"
            min={100}
            max={600}
            step={20}
            value={perspectiveStrength}
            onChange={(e) => setPerspectiveStrength(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            id="zoom-slider"
          />
        </div>

        {/* Shading / Lambertian Explanation */}
        <div className="mt-auto bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono text-[9px] leading-relaxed text-slate-400 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <Layers className="h-3.5 w-3.5" />
            <span>GPU Mesh Shading Concept</span>
          </div>
          <p>
            Spheres are triangulation grids. To model realistic lighting, each face normal vector N is compared with light direction L using dot product math:
          </p>
          <div className="bg-slate-950 p-1.5 rounded text-center text-slate-300 font-semibold font-mono">
            {"intensity = max(0.12, N \u00B7 L)"}
          </div>
          <p>
            We use Painter's algorithm depth sorting against $z$ boundaries to avoid sorting overlaps on standard rendering canvases.
          </p>
        </div>
      </div>
    </div>
  );
}
