import { motion } from "motion/react";
import { 
  X, 
  MapPin, 
  Radio, 
  ShieldAlert, 
  Layers, 
  Cpu, 
  Sparkles, 
  Flame, 
  Navigation,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { SectorNode, GoblinAgent } from "../types";

interface SectorDetailDrawerProps {
  sector: SectorNode;
  agents: GoblinAgent[];
  onClose: () => void;
  onSelectAgent: (agentId: string) => void;
  onOpenDeploy: (defaultSectorId: string) => void;
  onOpenJobDispatcher?: (agentId?: string) => void;
  playBeep?: (freq?: number, duration?: number, type?: OscillatorType) => void;
}

export default function SectorDetailDrawer({
  sector,
  agents,
  onClose,
  onSelectAgent,
  onOpenDeploy,
  onOpenJobDispatcher,
  playBeep
}: SectorDetailDrawerProps) {
  const stationedAgents = agents.filter(a => a.sectorId === sector.id);

  const threatColor = 
    sector.threatLevel === "CRITICAL" ? "text-red-400 bg-red-950/50 border-red-500/40" :
    sector.threatLevel === "HIGH" ? "text-amber-400 bg-amber-950/50 border-amber-500/40" :
    sector.threatLevel === "MODERATE" ? "text-yellow-300 bg-yellow-950/50 border-yellow-500/40" :
    "text-emerald-400 bg-emerald-950/50 border-emerald-500/40";

  return (
    <div className="flex flex-col h-full bg-[#05110d] border border-emerald-500/30 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-emerald-500/25 bg-black/60 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <MapPin className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-emerald-200 font-tech tracking-wider uppercase truncate">
                {sector.name}
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                {sector.code}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400/80 mt-0.5">
              <span>Depth: -{sector.depthMeters}m</span>
              <span>•</span>
              <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${threatColor}`}>
                THREAT: {sector.threatLevel}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            playBeep?.(350, 0.05);
            onClose();
          }}
          className="p-1.5 rounded-lg text-emerald-400/70 hover:text-emerald-100 hover:bg-emerald-950/80 transition-colors"
          title="Close Sector Details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
        
        {/* Description & Lore */}
        <div className="p-3 rounded-lg bg-black/40 border border-emerald-500/20 space-y-2">
          <div className="text-[10px] text-emerald-500/70 uppercase">SURVEILLANCE OVERVIEW</div>
          <p className="text-emerald-200 leading-relaxed text-[11px]">
            {sector.description}
          </p>
          <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-[10px] text-emerald-300/90 italic flex items-start gap-2">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>"{sector.lore}"</span>
          </div>
        </div>

        {/* Vital Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-500/20">
            <div className="text-[10px] text-emerald-500/70 uppercase mb-1">SIGNAL RECEPTION</div>
            <div className="text-sm font-bold text-emerald-300 font-tech">{sector.signalStrength}%</div>
            <div className="w-full h-1 bg-black/80 rounded-full mt-1.5 border border-emerald-500/30">
              <div 
                className="h-full bg-emerald-400 rounded-full"
                style={{ width: `${sector.signalStrength}%` }}
              />
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-500/20">
            <div className="text-[10px] text-emerald-500/70 uppercase mb-1">STATIONED AGENTS</div>
            <div className="text-sm font-bold text-emerald-300 font-tech">{stationedAgents.length} AGENTS</div>
            <div className="text-[10px] text-emerald-500/70 mt-1">
              Active in this zone
            </div>
          </div>
        </div>

        {/* Operational Resources & Throughput */}
        <div className="p-3 rounded-lg bg-black/40 border border-emerald-500/20 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-emerald-500/70 uppercase flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              NODE TELEMETRY & RESOURCES
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {sector.resources.map((res, i) => (
              <div key={i} className="p-2 rounded bg-black/60 border border-emerald-500/15">
                <div className="text-[10px] text-emerald-400 font-semibold">{res.name}</div>
                <div className="text-xs font-bold text-emerald-200 mt-0.5">
                  {res.amount.toLocaleString()} <span className="text-[9px] text-emerald-500">{res.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stationed Agents List & Dispatch */}
        <div className="p-3 rounded-lg bg-black/40 border border-emerald-500/20 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-emerald-500/70 uppercase">STATIONED AGENTS ({stationedAgents.length})</span>
            <button
              onClick={() => {
                onOpenDeploy(sector.id);
                playBeep?.(700, 0.05);
              }}
              className="text-emerald-300 hover:text-emerald-100 underline text-[10px]"
            >
              + Deploy Agent Here
            </button>
          </div>

          {stationedAgents.length === 0 ? (
            <div className="text-emerald-600 text-[11px] italic py-2">
              No goblin agents currently stationed in this sector.
            </div>
          ) : (
            <div className="space-y-1.5">
              {stationedAgents.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => {
                    onSelectAgent(agent.id);
                    playBeep?.(750, 0.05);
                  }}
                  className="p-2 rounded-lg bg-black/60 hover:bg-emerald-950/60 border border-emerald-500/25 hover:border-emerald-400 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{agent.avatarEmoji}</span>
                    <div>
                      <div className="text-xs font-bold text-emerald-200 font-tech">{agent.name} ({agent.role})</div>
                      <div className="text-[9px] text-emerald-400/70 truncate max-w-[170px]">{agent.specialization}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-bold">
                      {agent.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {stationedAgents.length > 0 && onOpenJobDispatcher && (
            <div className="pt-2">
              <button
                onClick={() => {
                  playBeep?.(800, 0.05);
                  onOpenJobDispatcher(stationedAgents[0].id);
                }}
                className="w-full py-1.5 px-3 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-emerald-100 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <span>Dispatch Job to Node Agent</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
