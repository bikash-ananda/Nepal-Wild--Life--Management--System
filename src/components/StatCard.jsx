import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/motion/MotionKit";

export default function StatCard({ icon: Icon, label, value, sublabel, tone = "default", trend }) {
  const tones = {
    default: "bg-slate-50 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 16px 40px -12px rgba(16,185,129,0.35)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200/70 p-5 hover:border-emerald-200 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
          <div className="mt-2 text-2xl font-bold text-slate-800">
            <AnimatedCounter value={value} />
          </div>
          {sublabel && <div className="mt-1 text-xs text-slate-400">{sublabel}</div>}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", tones[tone])}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>
      {trend && (
        <div className="mt-3 text-xs font-medium text-emerald-600">{trend}</div>
      )}
    </motion.div>
  );
}