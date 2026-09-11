'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Construction, Orientation } from '@/engine/types';
import type { SceneProps } from './HouseScene';
import { FACE_AZIMUTH, ORIENTATIONS } from '@/engine/derive';

const MATERIAL_COLOR: Record<Construction, string> = {
  wood_frame: '#d8c3a5',
  brick: '#b5563c',
  concrete_block: '#9aa0a6',
  stone: '#8b8c85',
  steel_sip: '#c9ced3',
  straw_bale: '#e2c977',
};
const FLOOR_H = 2.8;

interface Props extends SceneProps {
  sun: { elevationDeg: number; azimuthDeg: number; wx: { tempC: number; shortwaveWm2: number; windMs: number } | null };
}

/** Air-state tint: blue below the comfort band, red above, yellow for stale air, green when good. */
function airColor(indoorC: number, minC: number, maxC: number, co2?: number, pm25?: number) {
  if ((co2 ?? 0) > 1000 || (pm25 ?? 0) > 35) return new THREE.Color('#eab308');
  if (indoorC < minC) return new THREE.Color('#3b82f6');
  if (indoorC > maxC) return new THREE.Color('#ef4444');
  const t = (indoorC - minC) / (maxC - minC);
  return new THREE.Color('#22c55e').lerp(new THREE.Color(t < 0.5 ? '#3b82f6' : '#ef4444'), Math.abs(t - 0.5) * 0.8);
}

export default function House({ profile, geometry, plan, sun }: Props) {
  const { house } = profile;
  const short = Math.sqrt(geometry.footprintM2 / 1.3);
  const long = short * 1.3;
  const floors = Math.max(1, Math.round(house.floors));
  const color = MATERIAL_COLOR[house.construction];
  const now = plan?.now ?? null;
  const indoorC = now?.indoorC ?? (profile.comfort.minC + profile.comfort.maxC) / 2;
  const tint = airColor(indoorC, profile.comfort.minC, profile.comfort.maxC, profile.readings.co2Ppm, profile.readings.pm25);
  const action = now?.action ?? 'closed';

  // Rotate the house so its long, glassy side faces the "glass side" compass direction.
  const yaw = useMemo(() => THREE.MathUtils.degToRad(-FACE_AZIMUTH[house.glassSide]), [house.glassSide]);

  // Grow-in animation: floors scale up when the house changes.
  const group = useRef<THREE.Group>(null);
  const target = useRef(1);
  const key = `${floors}-${Math.round(geometry.footprintM2)}-${house.construction}-${house.roof}`;
  useEffect(() => { target.current = 0; }, [key]);
  useFrame((_, dt) => {
    if (!group.current) return;
    target.current = Math.min(1, target.current + dt * 1.6);
    const s = easeOut(target.current);
    group.current.scale.set(1, s, 1);
  });

  // Face-by-face heat glow: sun-facing walls warm up with irradiance.
  const glow = useMemo(() => {
    const out: Partial<Record<Orientation, number>> = {};
    if (!sun.wx || sun.elevationDeg <= 0) return out;
    for (const o of ORIENTATIONS) {
      const cosT = Math.cos(THREE.MathUtils.degToRad(sun.elevationDeg)) * Math.cos(THREE.MathUtils.degToRad(sun.azimuthDeg - FACE_AZIMUTH[o]));
      out[o] = Math.max(0, cosT) * Math.min(1, sun.wx.shortwaveWm2 / 800);
    }
    return out;
  }, [sun]);

  const windowsPerFace = (o: Orientation) => Math.max(0, Math.round((geometry.glazingByFace[o] / geometry.glazingAreaM2) * 12));
  const faceOf = (localAz: number): Orientation => {
    // Local face azimuth relative to the glass side; convert to a compass face.
    const idx = (ORIENTATIONS.indexOf(house.glassSide) + localAz / 45 + 8) % 8;
    return ORIENTATIONS[idx];
  };
  const faces: { localAz: number; w: number; pos: [number, number, number]; rotY: number }[] = [
    { localAz: 0, w: long, pos: [0, 0, short / 2], rotY: 0 }, // glass side (front, +z local)
    { localAz: 180, w: long, pos: [0, 0, -short / 2], rotY: Math.PI },
    { localAz: 90, w: short, pos: [long / 2, 0, 0], rotY: Math.PI / 2 },
    { localAz: 270, w: short, pos: [-long / 2, 0, 0], rotY: -Math.PI / 2 },
  ];

  return (
    <group rotation={[0, yaw, 0]}>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[Math.max(long, short) * 3, 48]} />
        <meshStandardMaterial color="#6f9a5e" />
      </mesh>
      <group ref={group}>
        {Array.from({ length: floors }).map((_, i) => (
          <group key={i} position={[0, i * FLOOR_H + FLOOR_H / 2, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[long, FLOOR_H, short]} />
              <meshStandardMaterial color={color} roughness={0.85} />
            </mesh>
            {/* interior air */}
            <mesh>
              <boxGeometry args={[long * 0.92, FLOOR_H * 0.9, short * 0.92]} />
              <meshStandardMaterial color={tint} transparent opacity={0.25} emissive={tint} emissiveIntensity={0.6} depthWrite={false} />
            </mesh>
            {/* heat glow per face */}
            {faces.map((f) => {
              const g = glow[faceOf(f.localAz)] ?? 0;
              if (g <= 0.03) return null;
              return (
                <mesh key={f.localAz} position={f.pos.map((v, j) => (j === 1 ? 0 : v * 1.004)) as [number, number, number]} rotation={[0, f.rotY, 0]}>
                  <planeGeometry args={[f.w, FLOOR_H]} />
                  <meshBasicMaterial color="#ff6a00" transparent opacity={0.35 * g} depthWrite={false} />
                </mesh>
              );
            })}
            {/* windows */}
            {faces.map((f) => {
              const n = Math.min(6, windowsPerFace(faceOf(f.localAz)) || 1);
              return Array.from({ length: n }).map((_, k) => {
                const x = -f.w / 2 + (f.w / (n + 1)) * (k + 1);
                const open = action === 'windows' || action === 'whf' || action === 'ventilate';
                return (
                  <group key={`${f.localAz}-${k}`} position={f.pos} rotation={[0, f.rotY, 0]}>
                    <mesh position={[x, 0, 0.03]}>
                      <boxGeometry args={[0.9, 1.3, 0.05]} />
                      {/* Panes glow with the indoor air state so the tint reads from outside. */}
                      <meshStandardMaterial color={open ? '#eaf8ff' : tint} emissive={tint} emissiveIntensity={open ? 0.25 : 0.55} transparent opacity={open ? 0.5 : 0.9} />
                    </mesh>
                  </group>
                );
              });
            })}
          </group>
        ))}
        <Roof type={house.roof} long={long} short={short} y={floors * FLOOR_H} atticFan={profile.hvac.atticFan} whfOn={action === 'whf'} />
      </group>
      {/* wind arrows when opened up */}
      {(action === 'windows' || action === 'whf') && <Breeze long={long} short={short} height={floors * FLOOR_H} strength={sun.wx?.windMs ?? 2} whf={action === 'whf'} />}
    </group>
  );
}

function Roof({ type, long, short, y, atticFan, whfOn }: { type: string; long: number; short: number; y: number; atticFan: boolean; whfOn: boolean }) {
  const h = type === 'cathedral' ? short * 0.55 : short * 0.4;
  // Gable roof: a triangular prism along the long axis.
  const shape = useMemoShape(short, h);
  if (type === 'flat') {
    return (
      <mesh position={[0, y + 0.15, 0]} castShadow>
        <boxGeometry args={[long * 1.04, 0.3, short * 1.04]} />
        <meshStandardMaterial color="#555" />
      </mesh>
    );
  }
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-long * 0.52, 0, 0]} castShadow>
        <extrudeGeometry args={[shape, { depth: long * 1.04, bevelEnabled: false }]} />
        <meshStandardMaterial color="#5a5550" roughness={0.95} />
      </mesh>
      {(atticFan || whfOn) && (
        <mesh position={[0, h * 0.6, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.3, 16]} />
          <meshStandardMaterial color={whfOn ? '#14b8a6' : '#777'} emissive={whfOn ? '#14b8a6' : '#000'} emissiveIntensity={whfOn ? 0.8 : 0} />
        </mesh>
      )}
    </group>
  );
}

function useMemoShape(short: number, h: number) {
  return useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-short * 0.52, 0);
    s.lineTo(short * 0.52, 0);
    s.lineTo(0, h);
    s.closePath();
    return s;
  }, [short, h]);
}

/** Simple drifting particles to show air moving through the house. */
function Breeze({ long, short, height, strength, whf }: { long: number; short: number; height: number; strength: number; whf: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = 40;
  // Deterministic pseudo-random seeds so render stays pure.
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => [hash(i * 3 + 1), hash(i * 3 + 2), hash(i * 3 + 3)]), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * (0.15 + strength * 0.05);
    seeds.forEach(([a, b, c], i) => {
      const p = (t + a) % 1;
      let x: number, y: number, z: number;
      if (whf) {
        // Rise through the house and out the attic.
        x = (b - 0.5) * long * 0.8;
        z = (c - 0.5) * short * 0.8;
        y = p * (height + short * 0.5);
      } else {
        x = (p - 0.5) * long * 1.6;
        y = 0.5 + b * (height - 1);
        z = (c - 0.5) * short * 0.9;
      }
      m.makeTranslation(x, y, z);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <sphereGeometry args={[0.08, 6, 6]} />
      <meshBasicMaterial color={whf ? '#14b8a6' : '#ffffff'} transparent opacity={0.7} />
    </instancedMesh>
  );
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const hash = (i: number) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
