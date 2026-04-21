import { useState, useEffect, useRef } from "react";
import { Brain, type LucideProps } from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

export type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

export interface OrbitalNode {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export default function RadialOrbitalTimeline({ nodes }: { nodes: OrbitalNode[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [angle, setAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoRotate) return;
    let rafId = 0;
    let last = performance.now();
    const DEG_PER_MS = 0.006; // ~2.16°/s — slow orbital drift
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setAngle(a => (a + DEG_PER_MS * dt) % 360);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [autoRotate]);

  const getPos = (index: number) => {
    const deg = ((index / nodes.length) * 360 + angle) % 360;
    const rad = (deg * Math.PI) / 180;
    const r = 185;
    return {
      x: r * Math.cos(rad),
      y: r * Math.sin(rad),
      z: Math.round(100 + 50 * Math.cos(rad)),
      opacity: Math.max(0.35, 0.35 + 0.65 * ((1 + Math.sin(rad)) / 2)),
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[560px] flex items-center justify-center bg-white overflow-hidden"
      onClick={e => {
        if (e.target === containerRef.current) {
          setExpandedId(null);
          setAutoRotate(true);
        }
      }}
    >
      {/* Orbit rings */}
      <div className="absolute w-[380px] h-[380px] rounded-full border border-gray-200" />
      <div className="absolute w-[430px] h-[430px] rounded-full border border-gray-100" />

      {/* Center — LLM */}
      <div className="absolute z-10 flex flex-col items-center gap-2 pointer-events-none">
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <div className="absolute w-20 h-20 rounded-full border border-violet-400/40 animate-ping opacity-60" />
          <div
            className="absolute w-28 h-28 rounded-full border border-violet-400/20 animate-ping opacity-40"
            style={{ animationDelay: "0.8s" }}
          />
          <Brain size={26} className="text-white relative z-10" />
        </div>
        <span className="text-[10px] font-mono font-bold text-violet-600 tracking-widest uppercase">LLM</span>
        <span className="text-[9px] text-gray-400">Cerveau central</span>
      </div>

      {/* Orbital nodes */}
      {nodes.map((node, i) => {
        const p = getPos(i);
        const isOpen = expandedId === node.id;
        const Icon = node.icon;

        return (
          <div
            key={node.id}
            className="absolute cursor-pointer"
            style={{
              transform: `translate(${p.x}px, ${p.y}px)`,
              zIndex: isOpen ? 200 : p.z,
              opacity: isOpen ? 1 : p.opacity,
              willChange: "transform, opacity",
            }}
            onClick={e => {
              e.stopPropagation();
              if (isOpen) {
                setExpandedId(null);
                setAutoRotate(true);
              } else {
                setExpandedId(node.id);
                setAutoRotate(false);
              }
            }}
          >
            {/* Node circle */}
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-[transform,box-shadow,background-color,border-color] duration-300 shadow-sm ${
                isOpen ? "scale-150 shadow-lg" : "hover:shadow-md"
              }`}
              style={{
                backgroundColor: isOpen ? node.color + "18" : node.color + "0d",
                borderColor: node.color,
              }}
            >
              <Icon size={17} style={{ color: node.color }} />
            </div>

            {/* Label */}
            <div className="absolute top-[54px] whitespace-nowrap text-center left-1/2 -translate-x-1/2">
              <p className="text-[11px] font-semibold transition-colors duration-300" style={{ color: isOpen ? node.color : "rgb(55,65,81)" }}>
                {node.title}
              </p>
              <p className="text-[9px] text-gray-400 mt-0.5">{node.subtitle}</p>
            </div>

            {/* Expanded popover */}
            {isOpen && (
              <div className="absolute top-[78px] left-1/2 -translate-x-1/2 w-52 rounded-xl border border-gray-200 bg-white p-4 shadow-xl shadow-gray-900/10">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-px h-2.5 bg-gray-300" />
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center mb-2.5"
                  style={{ backgroundColor: node.color + "18", border: `1px solid ${node.color}35` }}
                >
                  <Icon size={13} style={{ color: node.color }} />
                </div>
                <p className="text-xs font-semibold text-gray-900 mb-1.5">{node.title}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">{node.description}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
