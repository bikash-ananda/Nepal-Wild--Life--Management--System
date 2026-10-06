import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function WildlifeHero3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 600;
    const height = mount.clientHeight || 200;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // Wireframe icosahedron — the "monitoring globe"
    const geo = new THREE.IcosahedronGeometry(1.6, 1);
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.55 })
    );
    scene.add(wire);

    // Inner glow sphere
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x059669, transparent: true, opacity: 0.1 })
    );
    scene.add(sphere);

    // Orbiting particle field — monitoring nodes
    const pCount = 420;
    const positions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const r = 2.2 + Math.random() * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0x6ee7b7, size: 0.045, transparent: true, opacity: 0.85 })
    );
    scene.add(points);

    let raf;
    const animate = () => {
      wire.rotation.y += 0.003;
      wire.rotation.x += 0.001;
      sphere.rotation.y -= 0.002;
      points.rotation.y += 0.0008;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      geo.dispose();
      pGeo.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
}