import { useState } from "react";
import { motion } from "motion/react";
import { X, UserPlus, Sparkles, MapPin, Check } from "lucide-react";
import { GoblinAgent, GoblinAgentRole, SectorNode } from "../types";

interface DeployAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectors: SectorNode[];
  defaultSectorId?: string;
  onDeploy: (newAgent: Omit<GoblinAgent, "id" | "logs">) => void;
  playBeep?: (freq?: number, duration?: number, type?: OscillatorType) => void;
}

const ROLES: { role: GoblinAgentRole; label: string; emoji: string; desc: string }[] = [
  { role: "scout", label: "Recon Scout", emoji: "🧌", desc: "Specializes in stealth exploration and fiber tap detection" },
  { role: "scrapper", label: "Scrap Harvester", emoji: "⚙️", desc: "Salvages high-grade copper, chips, and server blades" },
  { role: "alchemist", label: "Techno-Alchemist", emoji: "🧪", desc: "Brews conductive battery drinks and spore fuel" },
  { role: "hacker", label: "Glitch Hacker", emoji: "👾", desc: "Bypasses firewalls and intercepts surface data streams" },
  { role: "enforcer", label: "Tunnel Enforcer", emoji: "🛡️", desc: "Guards bedrock trenches with EMP slingshots and shields" },
  { role: "treasurer", label: "Coin Hoarder", emoji: "💰", desc: "Inspects and counts shiny physical GoblinCoins" },
  { role: "gadgeteer", label: "Gadgeteer", emoji: "💥", desc: "Builds unstable scrap drones and spark cannons" },
];

export default function DeployAgentModal({
  isOpen,
  onClose,
  sectors,
  defaultSectorId,
  onDeploy,
  playBeep
}: DeployAgentModalProps) {
  const [name, setName] = useState("");
  const [callsign, setCallsign] = useState("");
  const [selectedRole, setSelectedRole] = useState<GoblinAgentRole>("scout");
  const [sectorId, setSectorId] = useState(defaultSectorId || sectors[0]?.id || "sec-core");
  const [customTagline, setCustomTagline] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const roleCapabilitiesMap: Record<GoblinAgentRole, { spec: string; caps: string[] }> = {
      scout: {
        spec: "External Reconnaissance & Fiber Tap Analysis",
        caps: ["Subterranean Mapping", "Fiber Tap Detection", "Packet Sniffing", "Edge Recon"]
      },
      scrapper: {
        spec: "Code Scraping, Script Deconstruction & Module Extraction",
        caps: ["Code Scrap Deconstruction", "Refactoring", "Pipeline Scraping", "Hardware Salvage"]
      },
      alchemist: {
        spec: "Data Schema Synthesis & Unstructured Log Distillation",
        caps: ["Schema Normalization", "Log Parsing", "Telemetry Distillation", "Format Conversion"]
      },
      hacker: {
        spec: "Zero-Trust Conduit Security Auditing & Threat Analysis",
        caps: ["Security Audit", "API Boundary Probing", "Vulnerability Discovery", "Injection Defense"]
      },
      enforcer: {
        spec: "Resource Allocation Guarding & Agent Pipeline Integrity",
        caps: ["Process Enforcement", "Deadlock Resolution", "Priority Handling", "Failover Recovery"]
      },
      treasurer: {
        spec: "Token Efficiency Auditing & Compute Budget Optimization",
        caps: ["Token Audit", "Compute Budgeting", "Cost Optimization", "Model Benchmarking"]
      },
      gadgeteer: {
        spec: "Automated Tooling & Custom Script Synthesis",
        caps: ["Script Generation", "CLI Tooling", "Webhook Automation", "Scrap Assembly"]
      }
    };

    const roleInfo = ROLES.find(r => r.role === selectedRole);
    const assignedSector = sectors.find(s => s.id === sectorId) || sectors[0];
    const roleDetails = roleCapabilitiesMap[selectedRole] || {
      spec: "General Bedrock Operations",
      caps: ["Script Execution", "Task Routing"]
    };

    const newAgentData: Omit<GoblinAgent, "id" | "logs"> = {
      name: name.trim(),
      callsign: callsign.trim().toUpperCase() || `${selectedRole.toUpperCase()}-${Math.floor(10 + Math.random() * 89)}`,
      role: selectedRole,
      status: "STANDBY",
      sectorId: assignedSector.id,
      x: assignedSector.x,
      y: assignedSector.y,
      specialization: roleDetails.spec,
      capabilities: roleDetails.caps,
      completedJobsCount: 0,
      avatarEmoji: roleInfo?.emoji || "🧌",
      tagline: customTagline.trim() || `Bedrock operational unit ready in ${assignedSector.name}.`,
      currentTask: `Reporting for duty at ${assignedSector.name}`,
      taskProgress: 0
    };

    onDeploy(newAgentData);
    playBeep?.(900, 0.15, "triangle");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-[#040e0a] border border-emerald-500/40 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.3)] flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-emerald-500/20 bg-black/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-emerald-200 font-tech tracking-wider uppercase">
                COMMISSION GOBLIN AGENT
              </h2>
              <p className="text-[10px] text-emerald-500/60 font-mono">Deploy operational unit to the Bedrock Map</p>
            </div>
          </div>
          <button
            onClick={() => {
              playBeep?.(350, 0.05);
              onClose();
            }}
            className="text-emerald-400/70 hover:text-emerald-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto font-mono text-xs text-emerald-300">
          
          {/* Name & Callsign */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-emerald-500/80 uppercase mb-1">Agent Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Copper-Snout"
                className="w-full bg-black/70 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-200 text-xs focus:outline-none focus:border-emerald-300 placeholder-emerald-700"
              />
            </div>
            <div>
              <label className="block text-[10px] text-emerald-500/80 uppercase mb-1">Callsign</label>
              <input
                type="text"
                value={callsign}
                onChange={e => setCallsign(e.target.value)}
                placeholder="e.g. RECON-77"
                className="w-full bg-black/70 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-200 text-xs focus:outline-none focus:border-emerald-300 placeholder-emerald-700"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-[10px] text-emerald-500/80 uppercase mb-1.5">Goblin Specialization</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES.map(r => {
                const isSelected = selectedRole === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(r.role);
                      playBeep?.(650, 0.04);
                    }}
                    className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.3)]" 
                        : "bg-black/50 border-emerald-500/20 text-emerald-400/70 hover:border-emerald-500/40"
                    }`}
                  >
                    <span className="text-xl">{r.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold font-tech text-emerald-200">{r.label}</div>
                      <div className="text-[9px] text-emerald-500/80 mt-0.5 leading-tight">{r.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination Sector */}
          <div>
            <label className="block text-[10px] text-emerald-500/80 uppercase mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              Initial Station Sector
            </label>
            <select
              value={sectorId}
              onChange={e => setSectorId(e.target.value)}
              className="w-full bg-black/80 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-200 text-xs focus:outline-none focus:border-emerald-300"
            >
              {sectors.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code} | -{s.depthMeters}m)
                </option>
              ))}
            </select>
          </div>

          {/* Custom Tagline */}
          <div>
            <label className="block text-[10px] text-emerald-500/80 uppercase mb-1">Motto / Voice Tagline (Optional)</label>
            <input
              type="text"
              value={customTagline}
              onChange={e => setCustomTagline(e.target.value)}
              placeholder="e.g. If it shines, it belongs in my pocket."
              className="w-full bg-black/70 border border-emerald-500/30 rounded-lg px-3 py-2 text-emerald-200 text-xs focus:outline-none focus:border-emerald-300 placeholder-emerald-700"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-tech font-black text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Confirm Deployment to Bedrock Map
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
