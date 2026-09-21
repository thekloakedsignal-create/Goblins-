import { useState } from "react";
import { motion } from "motion/react";
import { Users, Filter, Search, ChevronRight, Zap, Coins, Navigation } from "lucide-react";
import { GoblinAgent, GoblinAgentRole, SectorNode } from "../types";

interface AgentListRosterProps {
  agents: GoblinAgent[];
  sectors: SectorNode[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  onOpenDeploy: () => void;
  playBeep?: (freq?: number, duration?: number, type?: OscillatorType) => void;
}

export default function AgentListRoster({
  agents,
  sectors,
  selectedAgentId,
  onSelectAgent,
  onOpenDeploy,
  playBeep
}: AgentListRosterProps) {
  const [filterRole, setFilterRole] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAgents = agents.filter(a => {
    const matchesRole = filterRole === "all" || a.role === filterRole;
    const matchesSearch = 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.callsign.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.currentTask.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-[#030907] border border-emerald-500/25 rounded-xl overflow-hidden shadow-xl text-xs font-mono">
      {/* Header */}
      <div className="p-3 border-b border-emerald-500/20 bg-black/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <span className="font-tech font-bold text-emerald-200 uppercase tracking-wider text-xs">
            GOBLIN AGENTS ({agents.length})
          </span>
        </div>
        <button
          onClick={() => {
            playBeep?.(750, 0.05);
            onOpenDeploy();
          }}
          className="text-[10px] text-emerald-400 hover:text-emerald-200 underline cursor-pointer"
        >
          + Deploy
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-2 border-b border-emerald-500/15 space-y-1.5 bg-black/40">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filter agents by name / task..."
            className="w-full bg-black/80 border border-emerald-500/30 rounded-lg px-2.5 py-1 text-[11px] text-emerald-200 placeholder-emerald-700 focus:outline-none focus:border-emerald-400"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
          {["all", "scout", "scrapper", "alchemist", "hacker", "enforcer", "treasurer"].map(role => (
            <button
              key={role}
              onClick={() => {
                setFilterRole(role);
                playBeep?.(600, 0.03);
              }}
              className={`px-2 py-0.5 rounded capitalize whitespace-nowrap transition-all ${
                filterRole === role
                  ? "bg-emerald-500 text-black font-bold"
                  : "bg-emerald-950/40 text-emerald-400/70 hover:text-emerald-200"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Scroll List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-6 text-emerald-600 text-[11px]">
            No agents found matching criteria.
          </div>
        ) : (
          filteredAgents.map(agent => {
            const isSelected = selectedAgentId === agent.id;
            const sector = sectors.find(s => s.id === agent.sectorId);

            return (
              <div
                key={agent.id}
                onClick={() => {
                  onSelectAgent(agent.id);
                  playBeep?.(750, 0.05);
                }}
                className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                  isSelected
                    ? "bg-emerald-500/20 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "bg-black/40 border-emerald-500/15 hover:border-emerald-500/40 hover:bg-emerald-950/30"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-base shrink-0">
                    {agent.avatarEmoji}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-emerald-200 font-tech text-xs truncate">{agent.name}</span>
                      <span className="text-[9px] text-emerald-400/60 uppercase">[{agent.status}]</span>
                    </div>
                    <div className="text-[10px] text-emerald-500/80 truncate">
                      {sector?.name || "Transit"} • {agent.currentTask}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 text-[10px]">
                  <div className="text-emerald-300 font-bold">{agent.completedJobsCount} JOBS</div>
                  <div className="text-emerald-500/70 capitalize">{agent.role}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
