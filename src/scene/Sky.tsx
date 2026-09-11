'use client';
import { useMemo } from 'react';
import * as THREE from 'three';

/** Sun + sky lighting driven by real sun position and cloud cover. */
export default function Sky({ elevationDeg, azimuthDeg, cloudCover }: { elevationDeg: number; azimuthDeg: number; cloudCover: number }) {
  const { dir, sunColor, skyColor, intensity, ambient } = useMemo(() => {
    const el = THREE.MathUtils.degToRad(Math.max(elevationDeg, -10));
    const az = THREE.MathUtils.degToRad(azimuthDeg);
    // Scene: +x east, -z north. Azimuth is clockwise from north.
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).multiplyScalar(60);
    const cloud = Math.min(1, Math.max(0, cloudCover / 100));
    const day = THREE.MathUtils.clamp((elevationDeg + 6) / 20, 0, 1);
    const dusk = THREE.MathUtils.clamp(1 - Math.abs(elevationDeg) / 12, 0, 1);
    const skyDay = new THREE.Color('#9ec9ff').lerp(new THREE.Color('#b9c3cf'), cloud);
    const skyNight = new THREE.Color('#0b1220');
    const skyColor = skyNight.clone().lerp(skyDay, day).lerp(new THREE.Color('#f2a65a'), dusk * 0.35 * (1 - cloud));
    const sunColor = new THREE.Color('#fff4d6').lerp(new THREE.Color('#ff9b54'), dusk);
    const intensity = day * (1 - 0.75 * cloud) * 2.2;
    const ambient = 0.6 + 0.9 * day * (0.6 + 0.4 * cloud);
    return { dir, sunColor, skyColor, intensity, ambient };
  }, [elevationDeg, azimuthDeg, cloudCover]);

  return (
    <>
      <color attach="background" args={[skyColor]} />
      <fog attach="fog" args={[skyColor, 60, 160]} />
      <hemisphereLight args={[skyColor, '#8a7a6a', ambient]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={dir} color={sunColor} intensity={intensity} castShadow shadow-mapSize={[2048, 2048]}>
        <orthographicCamera attach="shadow-camera" args={[-30, 30, 30, -30, 1, 150]} />
      </directionalLight>
      {elevationDeg > -2 && (
        <mesh position={dir.clone().normalize().multiplyScalar(120)}>
          <sphereGeometry args={[4, 16, 16]} />
          <meshBasicMaterial color={sunColor} />
        </mesh>
      )}
    </>
  );
}
