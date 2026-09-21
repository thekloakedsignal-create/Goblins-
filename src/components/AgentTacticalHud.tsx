import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Send, 
  MapPin, 
  Radio, 
  Zap, 
  Coins, 
  Shield, 
  Wrench, 
  Cpu, 
  Navigation, 
  Loader2, 
  Terminal, 
  Package, 
  ListOrdered,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { GoblinAgent, SectorNode } from "../types";

interface AgentTacticalHudProps {
  agent: GoblinAgent;
  sectors: SectorNode[];
  onClose: () => void;
  onDispatchAgent: (agentId: string, targetSectorId: string) => void;
  onAssignTask: (agentId: string, taskDescription: string) => void;
  onSendAgentComm: (agent: GoblinAgent, userPrompt: string) => Promise<string>;
  onOpenJobDispatcher?: (agentId: string) => void;
  playBeep?: (freq?: number, duration?: number, type?: OscillatorType) => void;
}

export default function AgentTacticalHud({
  agent,
  sectors,
  onClose,
  onDispatchAgent,
  onAssignTask,
  onSendAgentComm,
  onOpenJobDispatcher,
  playBeep
}: AgentTacticalHudProps) {
  const currentSector = sectors.find(s => s.id === agent.sectorId);
  const [commInput, setCommInput] = useState("");
  const [commLogs, setCommLogs] = useState<{ sender: "user" | "agent"; text: string; time: string }[]>([
    {
      sender: "agent",
      text: `${agent.tagline} Standing by for bedrock orders.`,
      time: "NOW"
    }
  ]);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [showDispatchPicker, setShowDispatchPicker] = useState(false);
  const commEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commLogs]);

  const handleTransmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commInput.trim() || isTransmitting) return;

    const userText = commInput.trim();
    setCommInput("");
    playBeep?.(520, 0.08, "sine");

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setCommLogs(prev => [...prev, { sender: "user", text: userText, time: now }]);
    setIsTransmitting(true);

    try {
      const reply = await onSendAgentComm(agent, userText);
      setCommLogs(prev => [...prev, { 
        sender: "agent", 
        text: reply, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
      playBeep?.(880, 0.08, "triangle");
    } catch (err) {
      setCommLogs(prev => [...prev, { 
        sender: "agent", 
        text: "*Krrrrk* Static interference on bedrock channel. But I heard ya loud and clear!", 
        time: "WARN" 
      }]);
    } finally {
      setIsTransmitting(false);
    }
  };

  const [customTaskInput, setCustomTaskInput] = useState("");

  const quickDirectives = [
    { label: "Scout Sector", task: `Scout dark crawlspaces and scan for unmapped tunnels in ${currentSector?.name}` },
    { label: "Forage Scrap", task: `Forage shiny copper cables, nuts, and silicon wafers in ${currentSector?.name}` },
    { label: "Count Shinies", task: `Polish, sort, and count shiny GoblinCoins in stash pouch` },
    { label: "Harvest Spores", task: `Gather bioluminescent cave mushrooms for warren rations` },
    { label: "Fortify Burrow", task: `Reinforce cavern tunnel walls with salvaged metal beams` }
  ];

  return (
    <div className="flex flex-col h-full bg-[#05110d] border border-emerald-500/30 rounded-xl overflow-hidden shadow-2xl">
      {/* Header Profile */}
      <div className="shrink-0 p-4 border-b border-emerald-500/25 bg-black/60 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="w-13 h-13 rounded-xl bg-emerald-950/80 border border-emerald-400/50 flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              {agent.avatarEmoji}
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-emerald-200 font-tech tracking-wider uppercase truncate">
                {agent.name}
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                {agent.callsign}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400/80 mt-0.5">
              <span className="capitalize px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/20 text-emerald-300">
                {agent.role}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-bold uppercase">
                [{agent.status}]
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
          title="Close Agent HUD"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Body - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
        
        {/* Location & Dispatch Bar */}
        <div className="p-3 rounded-lg bg-black/40 border border-emerald-500/20 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-emerald-500/70 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Stationed Sector
            </span>
            <button
              onClick={() => {
                setShowDispatchPicker(!showDispatchPicker);
                playBeep?.(650, 0.04);
              }}
              className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm"
            >
              <Navigation className="w-3 h-3 text-emerald-400" />
              {showDispatchPicker ? "Cancel Relocation" : "Dispatch to Sector"}
            </button>
          </div>

          <div className="text-sm font-bold text-emerald-300 font-tech">
            {currentSector?.name} <span className="text-xs text-emerald-500/70">({currentSector?.code} | -{currentSector?.depthMeters}m)</span>
          </div>

          {/* Quick Dispatch Sector Picker Dropdown */}
          <AnimatePresence>
            {showDispatchPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-2 border-t border-emerald-500/20"
              >
                <div className="text-[10px] text-emerald-400/60 mb-1.5">SELECT DESTINATION SECTOR:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {sectors.map(s => {
                    const isCurrent = s.id === agent.sectorId;
                    return (
                      <button
                        key={s.id}
                        disabled={isCurrent}
                        onClick={() => {
                          onDispatchAgent(agent.id, s.id);
                          setShowDispatchPicker(false);
                          playBeep?.(850, 0.08, "triangle");
                        }}
                        className={`text-left p-1.5 rounded border text-[10px] transition-all flex items-center justify-between ${
                          isCurrent 
                            ? "border-emerald-500/10 text-emerald-700 bg-black/40 cursor-not-allowed" 
                            : "border-emerald-500/30 text-emerald-300 hover:border-emerald-300 hover:bg-emerald-950/70"
                        }`}
                      >
                        <span className="truncate">{s.name}</span>
                        <ChevronRight className="w-3 h-3 shrink-0 text-emerald-400" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Agent Operational Metrics & Capabilities */}
        <div className="p-3 rounded-lg bg-black/40 border border-emerald-500/20 space-y-2.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-emerald-500/70 uppercase flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              SPECIALIZATION & CAPABILITIES
            </span>
            <span className="text-emerald-400 font-bold">
              {agent.completedJobsCount} JOBS COMPLETED
            </span>
          </div>

          <div className="text-xs text-emerald-200 font-semibold leading-relaxed">
            {agent.specialization}
          </div>

          <div className="flex flex-wrap gap-1 pt-1">
            {agent.capabilities?.map((cap, i) => (
              <span 
                key={i} 
                className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px]"
              >
                {cap}
              </span>
            ))}
          </div>

          {onOpenJobDispatcher && (
            <div className="pt-2 border-t border-emerald-500/15">
              <button
                onClick={() => {
                  playBeep?.(800, 0.05);
                  onOpenJobDispatcher(agent.id);
                }}
                className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Launch Operational Job for {agent.name}</span>
              </button>
            </div>
          )}
        </div>

        {/* Current Active Task / Directive */}
        <div className="p-3 rounded-lg bg-black/40 border border-emerald-500/20 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-emerald-500/70 uppercase">CURRENT DIRECTIVE</span>
            <span className="text-emerald-400 font-bold uppercase">[{agent.status}]</span>
          </div>
          <div className="text-xs text-emerald-200 font-medium">
            {agent.currentTask}
          </div>

          {/* Quick Directives & Custom Directive Input */}
          <div className="pt-2 border-t border-emerald-500/15 space-y-2">
            <div className="text-[10px] text-emerald-500/70">QUICK TASK OVERRIDE:</div>
            <div className="flex flex-wrap gap-1.5">
              {quickDirectives.map((d, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onAssignTask(agent.id, d.task);
                    playBeep?.(750, 0.05);
                  }}
                  className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-[10px] transition-all cursor-pointer"
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Custom Directive Input */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!customTaskInput.trim()) return;
                onAssignTask(agent.id, customTaskInput.trim());
                setCustomTaskInput("");
                playBeep?.(800, 0.06);
              }}
              className="flex gap-1.5 pt-1"
            >
              <input
                type="text"
                value={customTaskInput}
                onChange={e => setCustomTaskInput(e.target.value)}
                placeholder="Type quick task for agent..."
                className="flex-1 bg-black/80 border border-emerald-500/30 rounded px-2 py-1 text-[11px] text-emerald-200 placeholder-emerald-700 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                disabled={!customTaskInput.trim()}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold rounded disabled:opacity-40 cursor-pointer"
              >
                Assign
              </button>
            </form>
          </div>
        </div>

        {/* Direct Neural Comm-Link (Chat directly with THIS goblin agent) */}
        <div className="p-3 rounded-lg bg-black/60 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-emerald-400 font-bold uppercase flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              DIRECT COMM-LINK WITH {agent.name.toUpperCase()}
            </span>
            <span className="text-emerald-500/60">FREQ: 142.85 MHz</span>
          </div>

          {/* Comm Log Window */}
          <div className="h-36 overflow-y-auto space-y-2 p-2 rounded bg-[#020705] border border-emerald-500/20 text-[11px]">
            {commLogs.map((log, idx) => (
              <div 
                key={idx}
                className={`p-2 rounded-lg ${
                  log.sender === "user" 
                    ? "bg-emerald-950/50 border border-emerald-500/30 text-emerald-100 ml-4" 
                    : "bg-black/70 border border-emerald-500/20 text-emerald-300 mr-4"
                }`}
              >
                <div className="flex items-center justify-between text-[9px] text-emerald-500/60 mb-0.5">
                  <span className="font-bold">{log.sender === "user" ? "OPERATOR (YOU)" : agent.name.toUpperCase()}</span>
                  <span>{log.time}</span>
                </div>
                <div className="leading-relaxed whitespace-pre-wrap">{log.text}</div>
              </div>
            ))}
            {isTransmitting && (
              <div className="flex items-center gap-2 text-emerald-400 text-[10px] p-1 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{agent.name} is decoding bedrock transmission...</span>
              </div>
            )}
            <div ref={commEndRef} />
          </div>

          {/* Transmit Form */}
          <form onSubmit={handleTransmit} className="flex gap-1.5">
            <input
              type="text"
              value={commInput}
              onChange={(e) => setCommInput(e.target.value)}
              placeholder={`Send orders or prompt ${agent.name}...`}
              disabled={isTransmitting}
              className="flex-1 bg-black/80 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-emerald-200 text-xs focus:outline-none focus:border-emerald-300 placeholder-emerald-700"
            />
            <button
              type="submit"
              disabled={!commInput.trim() || isTransmitting}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Live Field Logs */}
        <div className="p-3 rounded-lg bg-black/40 border border-emerald-500/20 space-y-1.5">
          <div className="text-[10px] text-emerald-500/70 uppercase flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
            AGENT FIELD TELEMETRY LOGS
          </div>
          <div className="space-y-1 text-[10px]">
            {agent.logs.map(log => (
              <div key={log.id} className="flex items-start gap-1.5 text-emerald-400/80">
                <span className="text-emerald-600 shrink-0">[{log.timestamp}]</span>
                <span className={log.type === "job" ? "text-cyan-300 font-bold" : log.type === "success" ? "text-emerald-300" : log.type === "warn" ? "text-red-400" : ""}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
