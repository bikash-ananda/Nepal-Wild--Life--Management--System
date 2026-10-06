import React, { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export default function BoundingBoxEditor({ imageUrl, initialBoxes = [], onChange, className }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [boxes, setBoxes] = useState(initialBoxes);
  const [drawing, setDrawing] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef(new Image());
  const scaleRef = useRef({ x: 1, y: 1 });

  useEffect(() => {
    const img = imgRef.current;
    img.onload = () => setImgLoaded(true);
    img.src = imageUrl;
  }, [imageUrl]);

  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x: Math.max(0, Math.min(canvas.width, x)), y: Math.max(0, Math.min(canvas.height, y)) };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgLoaded) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
    [...boxes, drawing].filter(Boolean).forEach((box, i) => {
      const isDrawing = box === drawing;
      const color = colors[i % colors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.fillStyle = color + "20";
      ctx.fillRect(box.x, box.y, box.w, box.h);
      if (!isDrawing) {
        ctx.fillStyle = color;
        ctx.fillRect(box.x, box.y - 18, 60, 18);
        ctx.fillStyle = "#fff";
        ctx.font = "11px sans-serif";
        ctx.fillText(box.label || `Box ${i + 1}`, box.x + 4, box.y - 5);
      }
    });
  }, [boxes, drawing, imgLoaded]);

  useEffect(() => { draw(); }, [draw]);

  const handleDown = (e) => {
    if (e.button !== 0) return;
    const { x, y } = getCanvasCoords(e);
    setDrawing({ x, y, w: 0, h: 0, label: "Unknown" });
    setSelectedIdx(null);
  };

  const handleMove = (e) => {
    if (!drawing) return;
    const { x, y } = getCanvasCoords(e);
    setDrawing({ ...drawing, w: x - drawing.x, h: y - drawing.y });
  };

  const handleUp = () => {
    if (drawing && Math.abs(drawing.w) > 8 && Math.abs(drawing.h) > 8) {
      const normalized = {
        x: Math.min(drawing.x, drawing.x + drawing.w),
        y: Math.min(drawing.y, drawing.y + drawing.h),
        w: Math.abs(drawing.w),
        h: Math.abs(drawing.h),
        label: drawing.label || "Unknown",
      };
      const newBoxes = [...boxes, normalized];
      setBoxes(newBoxes);
      onChange?.(newBoxes);
    }
    setDrawing(null);
  };

  const removeBox = (idx) => {
    const newBoxes = boxes.filter((_, i) => i !== idx);
    setBoxes(newBoxes);
    onChange?.(newBoxes);
  };

  const updateLabel = (idx, label) => {
    const newBoxes = boxes.map((b, i) => i === idx ? { ...b, label } : b);
    setBoxes(newBoxes);
    onChange?.(newBoxes);
  };

  const canvasSize = () => {
    if (!containerRef.current) return { w: 640, h: 360 };
    const w = containerRef.current.clientWidth;
    return { w, h: Math.round(w * 0.5625) };
  };
  const cs = canvasSize();

  return (
    <div className={cn("space-y-2", className)}>
      <div ref={containerRef} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
        <canvas
          ref={canvasRef}
          width={cs.w}
          height={cs.h}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
        />
        {!imgLoaded && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Loading image...</div>}
      </div>
      {boxes.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-slate-400 uppercase font-medium">Bounding Boxes ({boxes.length})</div>
          {boxes.map((b, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
              <input
                value={b.label || ""}
                onChange={(e) => updateLabel(i, e.target.value)}
                className="flex-1 text-xs bg-transparent border-none outline-none text-slate-700"
                placeholder="Label"
              />
              <span className="text-[10px] text-slate-400 font-mono">{Math.round(b.w)}×{Math.round(b.h)}</span>
              <button onClick={() => removeBox(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="text-[10px] text-slate-400">Draw boxes on the image to label objects. Click a box label to edit.</div>
    </div>
  );
}