import { motion } from "motion/react";
import { 
  Users, 
  Map, 
  Activity, 
  UserPlus, 
  Terminal, 
  Archive,
  Volume2,
  VolumeX,
  Tv,
  Cpu,
  CheckCircle2
} from "lucide-react";
import { GoblinAgent, SectorNode } from "../types";

interface MapStatsBarProps {
  agents: GoblinAgent[];
  sectors: SectorNode[];
  activeView: "jobs" | "map" | "terminal" | "vault";
  onSetView: (view: "jobs" | "map" | "terminal" | "vault") => void;
  onOpenDeploy: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  crtActive: boolean;
  onToggleCrt: () => void;
  vaultArtifactsCount: number;
  runningJobsCount?: number;
  completedJobsTotal?: number;
  playBeep?: (freq?: number, duration?: number, type?: OscillatorType) => void;
}

export default function MapStatsBar({
  agents,
  sectors,
  activeView,
  onSetView,
  onOpenDeploy,
  soundEnabled,
  onToggleSound,
  crtActive,
  onToggleCrt,
  vaultArtifactsCount,
  runningJobsCount = 0,
  completedJobsTotal = 0,
  playBeep
}: MapStatsBarProps) {
  const activeAgents = agents.filter(a => a.status === "PROCESSING" || a.status === "DISPATCHED").length;
  const avgSignal = Math.round(sectors.reduce((acc, s) => acc + s.signalStrength, 0) / sectors.length);

  return (
    <div className="shrink-0 border-b border-emerald-500/25 bg-black/85 backdrop-blur-md px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
      
      {/* View Switchers */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-emerald-500/30">
        <button
          onClick={() => {
            onSetView("jobs");
            playBeep?.(750, 0.04);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeView === "jobs"
              ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              : "text-emerald-400/80 hover:text-emerald-200 hover:bg-emerald-950/40"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Job Pipeline
          {runningJobsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-mono font-black text-[9px] animate-pulse">
              {runningJobsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            onSetView("map");
            playBeep?.(700, 0.04);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeView === "map"
              ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              : "text-emerald-400/80 hover:text-emerald-200 hover:bg-emerald-950/40"
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          Tactical Map
        </button>

        <button
          onClick={() => {
            onSetView("terminal");
            playBeep?.(650, 0.04);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeView === "terminal"
              ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              : "text-emerald-400/80 hover:text-emerald-200 hover:bg-emerald-950/40"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Terminal
        </button>

        <button
          onClick={() => {
            onSetView("vault");
            playBeep?.(600, 0.04);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeView === "vault"
              ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              : "text-emerald-400/80 hover:text-emerald-200 hover:bg-emerald-950/40"
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Knowledge Vault
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-mono">
            {vaultArtifactsCount}
          </span>
        </button>
      </div>

      {/* Operational KPI Pills */}
      <div className="hidden lg:flex items-center gap-4 text-emerald-300">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-500/80 text-[11px]">AGENTS:</span>
          <span className="font-bold text-emerald-200">{agents.length}</span>
          <span className="text-emerald-500/60 text-[10px]">({activeAgents} Active)</span>
        </div>

        <div className="w-[1px] h-3.5 bg-emerald-500/20" />

        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-500/80 text-[11px]">JOBS COMPLETED:</span>
          <span className="font-bold text-emerald-300">{completedJobsTotal}</span>
        </div>

        <div className="w-[1px] h-3.5 bg-emerald-500/20" />

        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-emerald-500/80 text-[11px]">NODE MESH:</span>
          <span className="font-bold text-cyan-300">{avgSignal}%</span>
        </div>
      </div>

      {/* Action Controls (Deploy Agent, CRT, Sound) */}
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            playBeep?.(800, 0.05);
            onOpenDeploy();
          }}
          className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-tech font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
          title="Commission a new goblin agent on the map"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Deploy Agent</span>
        </motion.button>

        {/* CRT Scanline Toggle */}
        <button
          onClick={onToggleCrt}
          className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
            crtActive 
              ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
              : "bg-black/50 border-emerald-500/20 text-emerald-600 hover:text-emerald-400"
          }`}
          title="Toggle CRT Scanline Simulation"
        >
          <Tv className="w-3.5 h-3.5" />
        </button>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
            soundEnabled 
              ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
              : "bg-black/50 border-emerald-500/20 text-emerald-600 hover:text-emerald-400"
          }`}
          title="Toggle Subterranean Tactical Audio"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      </div>

    </div>
  );
}
