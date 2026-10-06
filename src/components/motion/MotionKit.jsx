import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

export function FadeIn({ children, delay = 0, y = 16, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, stagger = 0.08, className }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.96 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCounter({ value, duration = 1.2, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);
  const isNumber = typeof value === "number";

  useEffect(() => {
    if (!inView || !isNumber) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, isNumber, duration]);

  if (!isNumber) return <span className={className}>{value}</span>;
  const isInt = Number.isInteger(value);
  return (
    <span ref={ref} className={className}>
      {isInt ? Math.round(display) : display.toFixed(1)}
    </span>
  );
}

export function TiltCard({ children, className, intensity = 8 }) {
  const ref = useRef(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 150, damping: 15 });
  const ry = useSpring(useMotionValue(0), { stiffness: 150, damping: 15 });
  const rotateX = useTransform(rx, [-1, 1], [intensity, -intensity]);
  const rotateY = useTransform(ry, [-1, 1], [-intensity, intensity]);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    rx.set((e.clientY - r.top) / r.height);
    ry.set((e.clientX - r.left) / r.width);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      whileHover={{ scale: 1.02 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}