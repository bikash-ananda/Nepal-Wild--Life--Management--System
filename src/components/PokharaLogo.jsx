import { useState } from "react";

const LOGO_SOURCES = [
  "https://tourism.pokharamun.gov.np/img/pokhara/logo-1.png",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkBKM0ap6uAY5HWvu5Mr6Jw-c9KaQkqr2K3RyKAvuiYA&s",
];

export default function PokharaLogo({ className = "" }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  if (sourceIndex >= LOGO_SOURCES.length) {
    return <span className={`flex items-center justify-center rounded-xl bg-emerald-900 px-1 text-[9px] font-bold leading-tight text-white ${className}`}>POKHARA<br />METRO</span>;
  }

  return (
    <img
      src={LOGO_SOURCES[sourceIndex]}
      alt="Pokhara Metropolitan City official logo"
      onError={() => setSourceIndex((current) => current + 1)}
      className={`rounded-xl bg-white object-contain p-0.5 ${className}`}
    />
  );
}
