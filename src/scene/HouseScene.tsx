'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Geometry, HouseProfile, PlanResult, WeatherSeries } from '@/engine/types';
import { nowIndex } from '@/lib/weather';
import { sunPosition } from '@/engine/solar';
import House from './House';
import Sky from './Sky';

export interface SceneProps {
  profile: HouseProfile;
  geometry: Geometry;
  weather: WeatherSeries | null;
  plan: PlanResult | null;
}

/** Sun position and current weather for the scene, with a pleasant default before a location exists. */
export function sceneEnv(profile: HouseProfile, weather: WeatherSeries | null) {
  const loc = profile.location;
  if (!loc || !weather) return { elevationDeg: 40, azimuthDeg: 200, wx: null, indoorC: (profile.comfort.minC + profile.comfort.maxC) / 2 };
  const idx = nowIndex(weather);
  const wx = weather.hourly[idx];
  const sun = sunPosition(loc.lat, loc.lon, wx.time, weather.utcOffsetSeconds);
  return { ...sun, wx, indoorC: (profile.comfort.minC + profile.comfort.maxC) / 2 };
}

export default function HouseScene(props: SceneProps) {
  const env = sceneEnv(props.profile, props.weather);
  const size = Math.max(8, Math.sqrt(props.geometry.footprintM2) * 1.6);
  return (
    <Canvas camera={{ position: [size * 1.4, size * 0.9, size * 1.4], fov: 40 }} dpr={[1, 1.75]} shadows>
      <Sky elevationDeg={env.elevationDeg} azimuthDeg={env.azimuthDeg} cloudCover={env.wx?.cloudCover ?? 20} />
      <House {...props} sun={env} />
      <OrbitControls enablePan={false} minDistance={size * 0.8} maxDistance={size * 4} maxPolarAngle={Math.PI / 2.05} autoRotate autoRotateSpeed={0.4} />
    </Canvas>
  );
}
