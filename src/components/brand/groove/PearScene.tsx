'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/PearScene.tsx
//
// Three.js scene for the RipeningPear hero — built
// imperatively (no R3F / no JSX augmentation). Mounts a
// canvas, manages the scene + animation loop in useEffect,
// disposes everything on unmount.
//
// Scene: lathe pear body + cylinder stem + cone leaf.
// Colour morphs by ripeness prop (0 green → 0.5 butter → 1
// terra). Idle breathing scales the body gently.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface PearSceneProps {
  /** The latest ripeness value lives on a ref so the scene can
   *  read it inside its rAF loop without any React renders.
   *  Parent updates the ref directly on scroll. */
  ripenessRef: { current: number };
  size?: number;
}

export default function PearScene({ ripenessRef, size = 360 }: PearSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = size;
    const height = size;

    // ── Renderer ────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Scene + camera ──────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.6);

    // ── Lights ──────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const warmFill = new THREE.DirectionalLight(0xf4c55a, 0.25);
    warmFill.position.set(-3, -2, -4);
    scene.add(warmFill);

    // ── Pear body (lathe geometry from silhouette) ──────────
    const profile = [
      new THREE.Vector2(0.02, -1.0),
      new THREE.Vector2(0.55, -0.85),
      new THREE.Vector2(0.80, -0.55),
      new THREE.Vector2(0.88, -0.15),
      new THREE.Vector2(0.75,  0.25),
      new THREE.Vector2(0.55,  0.55),
      new THREE.Vector2(0.38,  0.80),
      new THREE.Vector2(0.18,  0.95),
      new THREE.Vector2(0.04,  1.00),
    ];
    const bodyGeom = new THREE.LatheGeometry(profile, 48);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#7A9B6E'),
      roughness: 0.65,
      metalness: 0.05,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = -0.1;
    scene.add(body);

    // ── Stem ────────────────────────────────────────────────
    const stemGeom = new THREE.CylinderGeometry(0.03, 0.04, 0.25, 12);
    const stemMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#5a4028'),
      roughness: 0.9,
    });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.set(0, 1.05, 0);
    stem.rotation.z = 0.08;
    scene.add(stem);

    // ── Leaf ────────────────────────────────────────────────
    const leafGeom = new THREE.ConeGeometry(0.12, 0.35, 4, 1, false, Math.PI / 4);
    const leafMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#7A9B6E'),
      roughness: 0.7,
      side: THREE.DoubleSide,
    });
    const leaf = new THREE.Mesh(leafGeom, leafMat);
    leaf.position.set(0.2, 1.12, 0);
    leaf.rotation.z = -0.6;
    scene.add(leaf);

    // ── Colour interpolation ────────────────────────────────
    const unripe = new THREE.Color('#7A9B6E');
    const ripeCol = new THREE.Color('#F4C55A');
    const bruise = new THREE.Color('#D97746');
    const tmp = new THREE.Color();

    // ── Animation loop ──────────────────────────────────────
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;

      // Update colour from the latest ripeness.
      const r = Math.max(0, Math.min(1, ripenessRef.current));
      if (r < 0.5) tmp.copy(unripe).lerp(ripeCol, r * 2);
      else tmp.copy(ripeCol).lerp(bruise, (r - 0.5) * 2);
      bodyMat.color.copy(tmp);

      // Breathing + slow idle rotation.
      body.rotation.y = t * 0.12;
      const breathe = 1 + Math.sin(t * 1.4) * 0.015;
      body.scale.set(breathe, breathe, breathe);

      leaf.rotation.z = Math.sin(t * 0.9) * 0.08 - 0.6;

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    // ── Cleanup ─────────────────────────────────────────────
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      bodyGeom.dispose();
      bodyMat.dispose();
      stemGeom.dispose();
      stemMat.dispose();
      leafGeom.dispose();
      leafMat.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  return (
    <div
      ref={mountRef}
      style={{ width: size, height: size, display: 'block' }}
      aria-hidden
    />
  );
}
