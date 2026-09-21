import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Compass, 
  Layers, 
  Radio, 
  Cpu, 
  Zap, 
  ShieldAlert, 
  MapPin, 
  Maximize2, 
  RotateCcw,
  Sparkles,
  Flame,
  Activity,
  Navigation
} from "lucide-react";
import { GoblinAgent, SectorNode, MapOverlayMode } from "../types";

interface GoblinAgentMapCanvasProps {
  sectors: SectorNode[];
  agents: GoblinAgent[];
  selectedAgentId: string | null;
  selectedSectorId: string | null;
  onSelectAgent: (agentId: string) => void;
  onSelectSector: (sectorId: string) => void;
  overlayMode: MapOverlayMode;
  onSetOverlayMode: (mode: MapOverlayMode) => void;
  playBeep?: (freq?: number, duration?: number, type?: OscillatorType) => void;
}

export default function GoblinAgentMapCanvas({
  sectors,
  agents,
  selectedAgentId,
  selectedSectorId,
  onSelectAgent,
  onSelectSector,
  overlayMode,
  onSetOverlayMode,
  playBeep
}: GoblinAgentMapCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [hoveredAgent, setHoveredAgent] = useState<GoblinAgent | null>(null);
  const [hoveredSector, setHoveredSector] = useState<SectorNode | null>(null);
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number; depth: number }>({ x: 50, y: 50, depth: -420 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Group agents by sector for quick map count
  const agentsBySector = useMemo(() => {
    const map = new Map<string, GoblinAgent[]>();
    agents.forEach(a => {
      const list = map.get(a.sectorId) || [];
      list.push(a);
      map.set(a.sectorId, list);
    });
    return map;
  }, [agents]);

  // Handle map mouse move for bedrock coordinates
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    const calcDepth = Math.round(-150 - (yPct * 7.5));
    setMouseCoords({ x: xPct, y: yPct, depth: calcDepth });
  };

  // Build connection links
  const connectionLinks = useMemo(() => {
    const links: { id: string; x1: number; y1: number; x2: number; y2: number; from: string; to: string }[] = [];
    const seen = new Set<string>();

    sectors.forEach(s => {
      s.connections.forEach(targetId => {
        const target = sectors.find(t => t.id === targetId);
        if (target) {
          const key = [s.id, target.id].sort().join("---");
          if (!seen.has(key)) {
            seen.add(key);
            links.push({
              id: key,
              x1: s.x,
              y1: s.y,
              x2: target.x,
              y2: target.y,
              from: s.id,
              to: target.id
            });
          }
        }
      });
    });
    return links;
  }, [sectors]);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full min-h-[480px] bg-[#030807] overflow-hidden select-none flex flex-col justify-between border border-emerald-500/20 rounded-xl"
    >
      {/* Top Map HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Left: Tactical Coordinates / Depth */}
        <div className="pointer-events-auto flex items-center gap-2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/30 text-[11px] font-mono shadow-[0_0_15px_rgba(0,0,0,0.8)]">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-emerald-500/80">GRID:</span>
          <span className="text-emerald-300 font-bold">{mouseCoords.x.toString().padStart(2, '0')}.{mouseCoords.y.toString().padStart(2, '0')}</span>
          <span className="text-emerald-600">|</span>
          <span className="text-emerald-500/80">BEDROCK:</span>
          <span className="text-emerald-300 font-bold">{mouseCoords.depth}m</span>
          <span className="text-emerald-600">|</span>
          <span className="text-emerald-400 font-semibold uppercase">{overlayMode}</span>
        </div>

        {/* Right: Map Controls & Overlay Modes */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-black/85 backdrop-blur-md p-1 rounded-lg border border-emerald-500/30 shadow-[0_0_15px_rgba(0,0,0,0.8)]">
          {/* Overlay Selector */}
          <button
            onClick={() => {
              onSetOverlayMode("tactical");
              playBeep?.(700, 0.04);
            }}
            className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1 transition-all ${
              overlayMode === "tactical" 
                ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                : "text-emerald-400/70 hover:text-emerald-200 hover:bg-emerald-950/40"
            }`}
            title="Tactical Radar Layer"
          >
            <Compass className="w-3 h-3" />
            Tactical
          </button>

          <button
            onClick={() => {
              onSetOverlayMode("thermal");
              playBeep?.(750, 0.04);
            }}
            className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1 transition-all ${
              overlayMode === "thermal" 
                ? "bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                : "text-amber-400/70 hover:text-amber-200 hover:bg-amber-950/40"
            }`}
            title="Resource & Geothermal Heat Layer"
          >
            <Flame className="w-3 h-3" />
            Thermal
          </button>

          <button
            onClick={() => {
              onSetOverlayMode("signals");
              playBeep?.(800, 0.04);
            }}
            className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1 transition-all ${
              overlayMode === "signals" 
                ? "bg-cyan-400 text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]" 
                : "text-cyan-400/70 hover:text-cyan-200 hover:bg-cyan-950/40"
            }`}
            title="Fiber Optic Signal Grid"
          >
            <Activity className="w-3 h-3" />
            Signals
          </button>

          <div className="w-[1px] h-4 bg-emerald-500/20 mx-1" />

          {/* Zoom Controls */}
          <button
            onClick={() => {
              setZoom(z => Math.min(1.4, Number((z + 0.1).toFixed(1))));
              playBeep?.(650, 0.03);
            }}
            className="w-6 h-6 flex items-center justify-center rounded text-emerald-300 hover:bg-emerald-950/60 font-mono text-xs font-bold"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => {
              setZoom(z => Math.max(0.8, Number((z - 0.1).toFixed(1))));
              playBeep?.(550, 0.03);
            }}
            className="w-6 h-6 flex items-center justify-center rounded text-emerald-300 hover:bg-emerald-950/60 font-mono text-xs font-bold"
            title="Zoom Out"
          >
            -
          </button>
          <button
            onClick={() => {
              setZoom(1);
              playBeep?.(500, 0.05);
            }}
            className="w-6 h-6 flex items-center justify-center rounded text-emerald-300 hover:bg-emerald-950/60"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Interactive Map Stage */}
      <div 
        className="w-full h-full relative transition-transform duration-300 ease-out"
        style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
      >
        {/* Background Bedrock Tactical Grid */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle at center, rgba(16, 185, 129, 0.15) 0, transparent 70%),
              linear-gradient(to right, rgba(16, 185, 129, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(16, 185, 129, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 40px 40px, 40px 40px"
          }}
        />

        {/* Radar Rotating Sweep Overlay (Tactical Mode) */}
        {overlayMode === "tactical" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
            <div 
              className="w-[180%] h-[180%] rounded-full opacity-15"
              style={{
                background: "conic-gradient(from 0deg, rgba(16,185,129,0) 0deg, rgba(16,185,129,0) 300deg, rgba(16,185,129,0.3) 360deg)",
                animation: "spin 9s linear infinite"
              }}
            />
            {/* Concentric distance rings */}
            <div className="absolute w-[20%] h-[20%] rounded-full border border-emerald-500/10" />
            <div className="absolute w-[45%] h-[45%] rounded-full border border-emerald-500/15" />
            <div className="absolute w-[70%] h-[70%] rounded-full border border-emerald-500/10" />
            <div className="absolute w-[95%] h-[95%] rounded-full border border-emerald-500/10 border-dashed" />
          </div>
        )}

        {/* Thermal Glows (Thermal Mode) */}
        {overlayMode === "thermal" && (
          <div className="absolute inset-0 pointer-events-none">
            {sectors.map(s => (
              <div
                key={`thermal-${s.id}`}
                className="absolute rounded-full blur-[40px] opacity-35"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  transform: "translate(-50%, -50%)",
                  width: `${120 + s.resources.length * 40}px`,
                  height: `${120 + s.resources.length * 40}px`,
                  backgroundColor: s.type === "treasury" ? "#f59e0b" : s.type === "core" ? "#10b981" : s.type === "aqueduct" ? "#3b82f6" : "#ef4444"
                }}
              />
            ))}
          </div>
        )}

        {/* SVG Conduit Lines between Sectors */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <linearGradient id="conduit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
            </linearGradient>
            <filter id="glow-line" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {connectionLinks.map(link => {
            const isHighlight = selectedSectorId === link.from || selectedSectorId === link.to;
            return (
              <g key={link.id}>
                {/* Background conduit */}
                <line
                  x1={`${link.x1}%`}
                  y1={`${link.y1}%`}
                  x2={`${link.x2}%`}
                  y2={`${link.y2}%`}
                  stroke={isHighlight ? "#34d399" : "#065f46"}
                  strokeWidth={isHighlight ? 2.5 : 1.2}
                  strokeDasharray={isHighlight ? "4 2" : "none"}
                  strokeOpacity={isHighlight ? 0.9 : 0.4}
                />

                {/* Animated data pulse packet traveling along the wire */}
                {overlayMode === "signals" && (
                  <circle
                    r={isHighlight ? 3 : 2}
                    fill="#34d399"
                    filter="url(#glow-line)"
                  >
                    <animateMotion
                      path={`M ${(link.x1 / 100) * (containerRef.current?.clientWidth || 800)} ${(link.y1 / 100) * (containerRef.current?.clientHeight || 600)} L ${(link.x2 / 100) * (containerRef.current?.clientWidth || 800)} ${(link.y2 / 100) * (containerRef.current?.clientHeight || 600)}`}
                      dur={`${3 + (link.x1 % 4)}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Sector Nodes */}
        {sectors.map(sector => {
          const isSelected = selectedSectorId === sector.id;
          const isHovered = hoveredSector?.id === sector.id;
          const sectorAgents = agentsBySector.get(sector.id) || [];

          return (
            <div
              key={sector.id}
              onClick={() => {
                onSelectSector(sector.id);
                playBeep?.(600, 0.06);
              }}
              onMouseEnter={() => setHoveredSector(sector)}
              onMouseLeave={() => setHoveredSector(null)}
              className="absolute z-20 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${sector.x}%`, top: `${sector.y}%` }}
            >
              {/* Outer pulsing ring if selected or threatened */}
              <div className={`absolute -inset-3 rounded-full transition-all duration-300 ${
                isSelected 
                  ? "border border-emerald-400 bg-emerald-500/15 animate-ping" 
                  : isHovered 
                  ? "border border-emerald-500/40 bg-emerald-500/10" 
                  : "border border-transparent"
              }`} />

              {/* Core Node Plate */}
              <motion.div 
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                className={`relative w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                  isSelected 
                    ? "bg-emerald-500 text-black border-white shadow-[0_0_25px_rgba(16,185,129,0.8)] ring-2 ring-emerald-400" 
                    : isHovered
                    ? "bg-emerald-950/90 text-emerald-200 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                    : "bg-[#071712]/90 text-emerald-400 border-emerald-500/40 hover:border-emerald-300"
                }`}
              >
                {/* Sector Type Icon */}
                {sector.type === "core" && <Cpu className="w-5 h-5" />}
                {sector.type === "scrap" && <Layers className="w-5 h-5" />}
                {sector.type === "treasury" && <Sparkles className="w-5 h-5" />}
                {sector.type === "bio" && <Zap className="w-5 h-5" />}
                {sector.type === "aqueduct" && <Radio className="w-5 h-5" />}
                {sector.type === "perimeter" && <ShieldAlert className="w-5 h-5" />}
                {sector.type === "lab" && <Flame className="w-5 h-5" />}
                {sector.type === "market" && <Compass className="w-5 h-5" />}

                {/* Stationed Agents Count Pip */}
                {sectorAgents.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-400 text-black font-mono font-black text-[10px] flex items-center justify-center border border-black shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                    {sectorAgents.length}
                  </span>
                )}
              </motion.div>

              {/* Sector Name & Depth Label */}
              <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-center pointer-events-none">
                <div className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition-all ${
                  isSelected 
                    ? "bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.6)]" 
                    : isHovered 
                    ? "bg-black/90 text-emerald-200 border border-emerald-500/40" 
                    : "bg-black/75 text-emerald-400/90 border border-emerald-500/20"
                }`}>
                  {sector.name}
                </div>
                <div className="text-[9px] font-mono text-emerald-500/70">
                  -{sector.depthMeters}m | {sector.code}
                </div>
              </div>
            </div>
          );
        })}

        {/* Goblin Agents Active Pins on the Map */}
        {agents.map(agent => {
          const isSelected = selectedAgentId === agent.id;
          const isHovered = hoveredAgent?.id === agent.id;
          const sector = sectors.find(s => s.id === agent.sectorId);

          // Position slightly offset from sector if multiple agents share same sector
          const sectorAgents = agentsBySector.get(agent.sectorId) || [];
          const agentIndex = sectorAgents.findIndex(a => a.id === agent.id);
          const offsetAngle = (agentIndex * (360 / Math.max(1, sectorAgents.length))) * (Math.PI / 180);
          const radius = sectorAgents.length > 1 ? 26 : 0;
          
          const posX = (sector?.x || agent.x) + (radius ? (Math.cos(offsetAngle) * 3) : 0);
          const posY = (sector?.y || agent.y) + (radius ? (Math.sin(offsetAngle) * 4) : 0);

          return (
            <div
              key={agent.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectAgent(agent.id);
                playBeep?.(820, 0.08, "triangle");
              }}
              onMouseEnter={() => setHoveredAgent(agent)}
              onMouseLeave={() => setHoveredAgent(null)}
              className="absolute z-25 cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${posX}%`, top: `${posY}%` }}
            >
              {/* Agent Pulse Wave */}
              <div className={`absolute -inset-2 rounded-full ${
                isSelected 
                  ? "bg-emerald-400/30 animate-ping border border-emerald-400" 
                  : isHovered 
                  ? "bg-emerald-500/20 animate-pulse border border-emerald-500/40" 
                  : "bg-transparent"
              }`} />

              {/* Agent Avatar Badge */}
              <motion.div
                whileHover={{ scale: 1.25, y: -2 }}
                whileTap={{ scale: 0.9 }}
                className={`relative w-9 h-9 rounded-full flex items-center justify-center text-sm shadow-lg transition-all duration-200 ${
                  isSelected
                    ? "bg-emerald-400 text-black ring-4 ring-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.9)]"
                    : isHovered
                    ? "bg-emerald-900 border-2 border-emerald-300 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                    : "bg-[#0b2419] border border-emerald-400/70 text-emerald-200"
                }`}
                title={`${agent.name} (${agent.callsign}) - ${agent.status}`}
              >
                <span className="select-none">{agent.avatarEmoji}</span>

                {/* Status Dot */}
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black ${
                  agent.status === "PROCESSING" ? "bg-amber-400 animate-ping" :
                  agent.status === "DISPATCHED" ? "bg-cyan-400" :
                  agent.status === "STANDBY" ? "bg-zinc-500" :
                  "bg-emerald-400"
                }`} />
              </motion.div>

              {/* Compact Agent Tag Label */}
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm ${
                  isSelected 
                    ? "bg-emerald-400 text-black" 
                    : "bg-black/90 text-emerald-300 border border-emerald-500/40"
                }`}>
                  {agent.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Map Floating HUD / Hover Inspector */}
      <AnimatePresence>
        {(hoveredAgent || hoveredSector) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-3 left-3 right-3 z-30 pointer-events-none"
          >
            <div className="bg-black/90 backdrop-blur-md p-3 rounded-xl border border-emerald-500/40 shadow-[0_0_20px_rgba(0,0,0,0.9)] max-w-xl mx-auto flex items-center justify-between gap-4 pointer-events-auto">
              {hoveredAgent ? (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-xl shrink-0">
                    {hoveredAgent.avatarEmoji}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-300 font-tech uppercase">{hoveredAgent.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {hoveredAgent.callsign}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400/70 uppercase">
                        [{hoveredAgent.status}]
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-400/80 font-mono truncate">{hoveredAgent.currentTask}</p>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[10px]">
                    <div className="text-emerald-400 font-bold">{hoveredAgent.coins} GC</div>
                    <div className="text-emerald-500/70">PWR: {hoveredAgent.energy}%</div>
                  </div>
                </div>
              ) : hoveredSector ? (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-300 font-tech uppercase">{hoveredSector.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {hoveredSector.code}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-500/70">
                        -{hoveredSector.depthMeters}m
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-400/80 font-mono truncate">{hoveredSector.description}</p>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[10px]">
                    <div className="text-emerald-400 font-bold">{agentsBySector.get(hoveredSector.id)?.length || 0} AGENTS</div>
                    <div className="text-emerald-500/70">SIGNAL: {hoveredSector.signalStrength}%</div>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Legend Corner Overlay */}
      <div className="absolute bottom-3 right-3 z-20 pointer-events-none hidden md:flex flex-col items-end gap-1 text-[9px] font-mono text-emerald-500/60 bg-black/60 backdrop-blur-xs px-2 py-1.5 rounded border border-emerald-500/15">
        <div>BEDROCK SECTOR MESH v2.4</div>
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>RADAR SWEEP ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
