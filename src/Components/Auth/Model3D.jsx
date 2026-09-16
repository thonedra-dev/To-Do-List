import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";

import modelUrl from "../../assets/models/base_basic_shaded.glb";
import checkmarkUrl from "../../assets/models/checkmark_pbr.glb";
import coffeeUrl from "../../assets/models/coffee_cup_pbr.glb";
import bookUrl from "../../assets/models/book_pbr.glb";
import calendarUrl from "../../assets/models/calendar_pbr.glb";
import clockUrl from "../../assets/models/clock_pbr.glb";

// ------------------------------------------------------------------
// MAIN FIGURE — static 3/4 pose, gentle breathing scale only.
// Not interactive at all.
// ------------------------------------------------------------------
function MainModel({ baseScale = 1.1 }) {
  const group = useRef();
  const { scene } = useGLTF(modelUrl);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 1.1) * 0.025;
    group.current.scale.setScalar(pulse * baseScale);
  });

  return (
    <primitive
      ref={group}
      object={scene}
      position={[0, -1.1, 0]}
      rotation={[0, -0.85, 0]}
    />
  );
}

// ------------------------------------------------------------------
// ORBITING PROP — roams in a small fixed-size loop around its own
// "home" point (homeX/homeY/homeZ), which is a tight ring placed
// away from the main figure's silhouette so nothing overlaps her.
//
// Draggable: pointer-down + drag sets a temporary dragOffset, so the
// prop's tiny roam loop shifts to wherever the user dropped it — it
// keeps roaming a small loop around the NEW spot, never snapping back
// while the page is open. dragOffset lives only in a ref (not saved
// anywhere), so a reload always starts fresh at the predefined home.
// ------------------------------------------------------------------
function OrbitingProp({
  url,
  homeX = 0,
  homeY = 0,
  homeZ = 0,
  loopRadius = 0.12, // ~"10cm" tiny roam loop
  speed = 0.06,       // very slow drift
  phase = 0,
  scale = 0.18,
  spinSelf = 0.3,
  bounds,             // { minX, maxX, minY, maxY } — right-panel clamp
}) {
  const pivot = useRef();
  const mesh = useRef();
  const { scene } = useGLTF(url);
  const clonedScene = useRef(scene.clone()).current;

  const { camera, gl, size } = useThree();
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ px: 0, py: 0, ox: 0, oy: 0 });
  const [hovered, setHovered] = useState(false);

  function clientToWorldDelta(dxPx, dyPx) {
    // Convert a pixel delta to an approximate world-space delta at the
    // prop's current depth, using the camera's vertical FOV.
    const vFov = (camera.fov * Math.PI) / 180;
    const worldHeightAtDepth = 2 * Math.tan(vFov / 2) * Math.abs(camera.position.z - homeZ);
    const worldPerPixelY = worldHeightAtDepth / size.height;
    const worldPerPixelX = worldPerPixelY; // roughly square pixels at this depth
    return { dx: dxPx * worldPerPixelX, dy: -dyPx * worldPerPixelY };
  }

  function onPointerDown(e) {
    e.stopPropagation();
    dragging.current = true;
    dragStart.current = {
      px: e.clientX,
      py: e.clientY,
      ox: dragOffset.current.x,
      oy: dragOffset.current.y,
    };
    gl.domElement.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging.current) return;
    const dxPx = e.clientX - dragStart.current.px;
    const dyPx = e.clientY - dragStart.current.py;
    const { dx, dy } = clientToWorldDelta(dxPx, dyPx);

    // Work in absolute world coordinates (home + offset), clamp against
    // the full panel domain, then convert back to an offset. This lets
    // the prop be dragged anywhere left-to-right in the panel, not just
    // near its own home point.
    let worldX = homeX + dragStart.current.ox + dx;
    let worldY = homeY + dragStart.current.oy + dy;

    if (bounds) {
      worldX = Math.min(bounds.maxX, Math.max(bounds.minX, worldX));
      worldY = Math.min(bounds.maxY, Math.max(bounds.minY, worldY));
    }

    const kept = pushOutsideKeepout(worldX, worldY);

    dragOffset.current.x = kept.x - homeX;
    dragOffset.current.y = kept.y - homeY;
  }

  function onPointerUp(e) {
    dragging.current = false;
    gl.domElement.releasePointerCapture?.(e.pointerId);
  }

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * speed + phase;

    if (pivot.current) {
      const cx = homeX + dragOffset.current.x;
      const cy = homeY + dragOffset.current.y;

      let px = cx + Math.cos(t) * loopRadius;
      let py = cy + Math.sin(t * 1.3) * loopRadius * 0.6;
      const pz = homeZ + Math.sin(t) * loopRadius * 0.4;

      // Hard clamp final position, then push outside the figure's
      // keep-out circle — belt-and-braces so the tiny roam loop can
      // never end up overlapping the nav row or her silhouette even
      // right after a drag lands near a boundary.
      if (bounds) {
        px = Math.min(bounds.maxX, Math.max(bounds.minX, px));
        py = Math.min(bounds.maxY, Math.max(bounds.minY, py));
      }
      const kept = pushOutsideKeepout(px, py);

      pivot.current.position.set(kept.x, kept.y, pz);
    }

    if (mesh.current) {
      mesh.current.rotation.y += 0.0035 * spinSelf * 16;
      const pulse = 1 + Math.sin(t * 2.4 + phase) * (hovered ? 0.16 : 0.1);
      const hoverBoost = hovered ? 1.12 : 1;
      mesh.current.scale.setScalar(pulse * scale * hoverBoost);
    }
  });

  return (
    <group ref={pivot}>
      <primitive
        ref={mesh}
        object={clonedScene}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          gl.domElement.style.cursor = "grab";
        }}
        onPointerOut={() => {
          setHovered(false);
          gl.domElement.style.cursor = "default";
        }}
      />
    </group>
  );
}

function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.4, 16, 16]} />
      <meshBasicMaterial wireframe color="#8a8fff" transparent opacity={0.3} />
    </mesh>
  );
}

// Right-panel domain clamp for DRAGGING. Wide open left-to-right (the
// user can drag a prop anywhere across the panel), but hard-capped at
// the top so nothing can ever reach the Log In / Sign Up row, and
// capped at the bottom so nothing exits the panel underneath.
const PANEL_BOUNDS = { minX: -2.1, maxX: 2.1, minY: -1.7, maxY: 0.75 };

// Keep-out radius around the main figure's center — dragged or roaming
// props are pushed outside this circle so they never overlap her.
const FIGURE_KEEPOUT = { cx: 0, cy: -0.1, radius: 0.95 };

function pushOutsideKeepout(x, y) {
  const dx = x - FIGURE_KEEPOUT.cx;
  const dy = y - FIGURE_KEEPOUT.cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0 || dist >= FIGURE_KEEPOUT.radius) return { x, y };
  const scale = FIGURE_KEEPOUT.radius / dist;
  return { x: FIGURE_KEEPOUT.cx + dx * scale, y: FIGURE_KEEPOUT.cy + dy * scale };
}

export default function Model3D({ baseScale = 0.8 }) {
  return (
    <div className="model3d-canvas-wrap">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 35 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} castShadow />
        <directionalLight position={[-4, -2, -3]} intensity={0.35} color="#8fb3ff" />
        <pointLight position={[0, 1.5, 2]} intensity={0.5} color="#a5b4ff" />

        <Suspense fallback={<Loader />}>
          <MainModel baseScale={baseScale} />

          <Sparkles
            count={40}
            scale={[4.5, 3.5, 2]}
            size={2}
            speed={0.15}
            opacity={0.3}
            color="#a5c8ff"
          />

          {/* Five tiny props, homed just outside her silhouette on all
              sides (left, right, above-left, above-right, below), each
              roaming a small ~0.12 unit loop very slowly. Draggable —
              grabbing one shifts its loop's center, clamped to the
              panel bounds, and resets on reload. */}
          <OrbitingProp
            url={checkmarkUrl}
            homeX={1.05}
            homeY={0.55}
            homeZ={0.3}
            loopRadius={0.12}
            speed={0.05}
            phase={0}
            scale={0.15}
            bounds={PANEL_BOUNDS}
          />
          <OrbitingProp
  url={coffeeUrl}
  homeX={0}
  homeY={-1.3}
  homeZ={0.1}
  loopRadius={0.12}
  speed={0.045}
  phase={1.4}
  scale={0.18}
  bounds={PANEL_BOUNDS}
/>
          <OrbitingProp
            url={bookUrl}
            homeX={1.1}
            homeY={-0.85}
            homeZ={0.2}
            loopRadius={0.12}
            speed={0.04}
            phase={2.8}
            scale={0.2}
            bounds={PANEL_BOUNDS}
          />
          <OrbitingProp
            url={calendarUrl}
            homeX={-1.0}
            homeY={0.6}
            homeZ={0.4}
            loopRadius={0.12}
            speed={0.05}
            phase={4.2}
            scale={0.17}
            bounds={PANEL_BOUNDS}
          />
         <OrbitingProp
  url={clockUrl}
  homeX={-1.15}
  homeY={-0.25}
  homeZ={0.5}
  loopRadius={0.12}
  speed={0.045}
  phase={5.5}
  scale={0.16}
  bounds={PANEL_BOUNDS}
/>

          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(modelUrl);
useGLTF.preload(checkmarkUrl);
useGLTF.preload(coffeeUrl);
useGLTF.preload(bookUrl);
useGLTF.preload(calendarUrl);
useGLTF.preload(clockUrl);