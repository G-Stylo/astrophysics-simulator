/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface PhysicsObject {
  id: string;
  name: string;
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  mass: number;
  radius: number;
  color: string;
  isAnchor: boolean;
  trail: Vector2D[];
}

export interface Vertex3D {
  position: Vector3D;
  projected: Vector2D;
  depth: number; // for depth sorting/shading
  normal?: Vector3D;
}

export interface TriangleIndices {
  a: number;
  b: number;
  c: number;
}
