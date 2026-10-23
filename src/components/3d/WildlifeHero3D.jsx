import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/** Decorative, low-cost WebGL field-monitoring motif. It contains no live map data. */
export default function WildlifeHero3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    let frame = 0;
    let visible = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 0, 6.5);

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);
    } catch {
      return undefined;
    }

    const root = new THREE.Group();
    scene.add(root);

    const sphereGeometry = new THREE.IcosahedronGeometry(1.28, 2);
    const sphereWire = new THREE.WireframeGeometry(sphereGeometry);
    const sphereLines = new THREE.LineSegments(sphereWire, new THREE.LineBasicMaterial({ color: 0xb7e7a3, transparent: true, opacity: 0.46 }));
    root.add(sphereLines);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x55b890, transparent: true, opacity: 0.075, depthWrite: false }),
    );
    root.add(core);

    const rings = [
      { rotation: [0.85, 0.2, 0.38], radius: 1.7, opacity: 0.32 },
      { rotation: [0.2, 1.1, 0.9], radius: 2.02, opacity: 0.18 },
    ].map(({ rotation, radius, opacity }) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.006, 5, 120),
        new THREE.MeshBasicMaterial({ color: 0xd3eead, transparent: true, opacity }),
      );
      ring.rotation.set(...rotation);
      root.add(ring);
      return ring;
    });

    const pointCount = window.matchMedia("(max-width: 700px)").matches ? 110 : 190;
    const positions = new Float32Array(pointCount * 3);
    for (let index = 0; index < pointCount; index += 1) {
      const radius = 2.2 + Math.random() * 1.3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[index * 3 + 2] = radius * Math.cos(phi);
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({ color: 0xd6f7bd, size: 0.026, transparent: true, opacity: 0.68, sizeAttenuation: true }),
    );
    scene.add(particles);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };

    const render = () => {
      if (!visible) return;
      if (!reducedMotion.matches) {
        root.rotation.y += 0.0018;
        root.rotation.x += 0.0005;
        particles.rotation.y -= 0.00025;
        rings[0].rotation.z += 0.00035;
      }
      renderer.render(scene, camera);
      if (!reducedMotion.matches) frame = window.requestAnimationFrame(render);
    };

    const start = () => {
      if (visible && !frame && !reducedMotion.matches) frame = window.requestAnimationFrame(render);
      else if (visible && reducedMotion.matches) renderer.render(scene, camera);
    };
    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (!visible && frame) window.cancelAnimationFrame(frame);
      frame = 0;
      start();
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(mount);
    if (!observer) window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotion.addEventListener?.("change", start);
    resize();
    start();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      if (!observer) window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener?.("change", start);
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material?.dispose?.());
      });
      sphereGeometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" aria-hidden="true" />;
}
