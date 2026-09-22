import { useState } from "react";
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Copy, 
  Check, 
  Archive, 
  FileText, 
  Zap, 
  Filter, 
  Search, 
  Plus, 
  ChevronRight,
  Terminal,
  Cpu,
  ShieldAlert,
  Sparkles,
  Download
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { AgentJob, GoblinAgent, SectorNode, JobPriority, Artifact } from "../types";

interface AgentJobCenterProps {
  jobs: AgentJob[];
  agents: GoblinAgent[];
  sectors: SectorNode[];
  onDispatchJob: (newJob: {
    title: string;
    agentId: string;
    sectorId: string;
    priority: JobPriority;
    prompt: string;
    inputData?: string;
  }) => Promise<void>;
  onCancelJob?: (jobId: string) => void;
  onSaveToVault: (job: AgentJob) => void;
  onSelectAgent?: (agentId: string) => void;
  playBeep?: (freq?: number, duration?: number, type?: OscillatorType) => void;
}

export default function AgentJobCenter({
  jobs,
  agents,
  sectors,
  onDispatchJob,
  onSaveToVault,
  onSelectAgent,
  playBeep
}: AgentJobCenterProps) {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "RUNNING" | "COMPLETED" | "QUEUED">("ALL");
  const [selectedJob, setSelectedJob] = useState<AgentJob | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [jobTitle, setJobTitle] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || "");
  const [jobPriority, setJobPriority] = useState<JobPriority>("NORMAL");
  const [jobPrompt, setJobPrompt] = useState("");
  const [jobInputData, setJobInputData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];
  const assignedSector = sectors.find(s => s.id === selectedAgent?.sectorId) || sectors[0];

  const presets = [
    {
      label: "Code Scrap Review",
      role: "scrapper",
      title: "Script Scrap & Architecture Audit",
      prompt: "Deconstruct the attached script/code. Identify architectural bottlenecks, memory leaks, security risks, and extract clean reusable modular scraps.",
      sampleInput: `function processTelemetry(stream) {\n  let cache = [];\n  for (var i = 0; i < stream.length; i++) {\n    if (stream[i].tag === 'ORPHAN') cache.push(stream[i]);\n  }\n  return eval(cache.map(c => c.rawPayload).join(';'));\n}`
    },
    {
      label: "Vulnerability Audit",
      role: "hacker",
      title: "Bedrock Conduit Security Review",
      prompt: "Perform a zero-trust vulnerability assessment. Review API authorization boundaries, input sanitization, and suggest mitigations against injection attacks.",
      sampleInput: `POST /api/telemetry/inject HTTP/1.1\nHost: node-7.bedrock.local\nContent-Type: application/json\n\n{"sensorId": "conduit-9", "override": true, "auth": "guest_token_unverified"}`
    },
    {
      label: "Data Schema Synthesis",
      role: "alchemist",
      title: "Telemetry Data Schema Extraction",
      prompt: "Transform this raw unstructured log dump into a clean, normalized TypeScript interface and a JSON summary with analytical conclusions.",
      sampleInput: `[2026-09-15 19:12:01] SENSOR_PING temp=42C depth=-450m node=sec-core status=NOMINAL\n[2026-09-15 19:12:04] SENSOR_PING temp=58C depth=-320m node=sec-scrap status=WARM_HEATPIPE\n[2026-09-15 19:12:08] PACKET_DROP node=sec-aqueduct err="submerged coax resistance"`
    },
    {
      label: "Intelligence Recon",
      role: "scout",
      title: "External Reconnaissance Briefing",
      prompt: "Synthesize an intelligence briefing comparing autonomous agent workflow patterns against traditional monolithic pipelines. Provide tactical takeaways for subterranean nodes.",
      sampleInput: `Focus areas:\n- Distributed autonomous tool use\n- Background asynchronous task workers\n- Latency and cost optimization for edge agents`
    },
    {
      label: "Token & Compute Audit",
      role: "treasurer",
      title: "Compute Budget & Token Efficiency Audit",
      prompt: "Audit LLM token utilization patterns. Recommend token compression methods, caching strategies, and quantify estimated efficiency gains.",
      sampleInput: `Average prompt tokens: 1,850\nAverage completion tokens: 420\nHourly requests: 1,200\nModel endpoint: TheKloakedSignal/Goblin1.02 via Featherless API`
    }
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    playBeep?.(750, 0.04);
    setJobTitle(preset.title);
    setJobPrompt(preset.prompt);
    setJobInputData(preset.sampleInput);
    const matchingAgent = agents.find(a => a.role === preset.role) || agents[0];
    if (matchingAgent) {
      setSelectedAgentId(matchingAgent.id);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !jobPrompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    playBeep?.(880, 0.08, "triangle");

    try {
      await onDispatchJob({
        title: jobTitle.trim(),
        agentId: selectedAgentId,
        sectorId: selectedAgent?.sectorId || sectors[0].id,
        priority: jobPriority,
        prompt: jobPrompt.trim(),
        inputData: jobInputData.trim() || undefined
      });

      setJobTitle("");
      setJobPrompt("");
      setJobInputData("");
      setIsDispatchModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    playBeep?.(900, 0.04);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredJobs = jobs.filter(job => {
    if (activeFilter !== "ALL" && job.status !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        job.title.toLowerCase().includes(q) ||
        job.agentName.toLowerCase().includes(q) ||
        job.prompt.toLowerCase().includes(q) ||
        (job.result && job.result.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeRunningCount = jobs.filter(j => j.status === "RUNNING").length;
  const completedCount = jobs.filter(j => j.status === "COMPLETED").length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#060b09] text-emerald-100 font-mono text-xs overflow-hidden">
      {/* Top Header & Metrics Bar */}
      <div className="px-4 py-3 bg-black/60 border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-emerald-300 tracking-wide flex items-center gap-2">
              AGENT JOB ORCHESTRATION PIPELINE
            </h1>
            <p className="text-[11px] text-emerald-600">
              Autonomous task execution, code scraping, and deliverable synthesis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Metrics */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-[11px]">
            <div>
              <span className="text-emerald-500/60">ACTIVE: </span>
              <span className="text-emerald-400 font-bold">{activeRunningCount}</span>
            </div>
            <div className="w-px h-3 bg-emerald-500/20" />
            <div>
              <span className="text-emerald-500/60">COMPLETED: </span>
              <span className="text-emerald-300 font-bold">{completedCount}</span>
            </div>
            <div className="w-px h-3 bg-emerald-500/20" />
            <div>
              <span className="text-emerald-500/60">AGENTS: </span>
              <span className="text-emerald-200 font-bold">{agents.length}</span>
            </div>
          </div>

          <button
            onClick={() => {
              playBeep?.(750, 0.05);
              setIsDispatchModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Dispatch New Job</span>
          </button>
        </div>
      </div>

      {/* Main Split Body: Job List on Left, Active/Selected Job Deliverable on Right */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Column: Job Queue & History */}
        <div className="w-full md:w-96 lg:w-[420px] flex flex-col border-r border-emerald-500/20 bg-black/40 shrink-0">
          {/* Filter & Search Bar */}
          <div className="p-3 border-b border-emerald-500/15 space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600" />
              <input
                type="text"
                placeholder="Search jobs, deliverables, or agents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded bg-black/80 border border-emerald-500/25 text-emerald-200 placeholder-emerald-700 text-xs focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
              {(["ALL", "RUNNING", "COMPLETED", "QUEUED"] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => {
                    playBeep?.(800, 0.02);
                    setActiveFilter(filter);
                  }}
                  className={`px-2 py-1 rounded transition-all cursor-pointer font-bold shrink-0 ${
                    activeFilter === filter
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-emerald-600 hover:text-emerald-400 hover:bg-emerald-950/40"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Job Items Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-emerald-500/10">
            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center text-emerald-600/70 space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-40 text-emerald-500" />
                <p className="text-xs">No jobs found in this category.</p>
                <p className="text-[10px]">Click "Dispatch New Job" to assign a task to a goblin agent.</p>
              </div>
            ) : (
              filteredJobs.map(job => {
                const isSelected = selectedJob?.id === job.id;
                const isRunning = job.status === "RUNNING";

                return (
                  <div
                    key={job.id}
                    onClick={() => {
                      playBeep?.(700, 0.02);
                      setSelectedJob(job);
                    }}
                    className={`p-3 transition-all cursor-pointer select-none relative group ${
                      isSelected
                        ? "bg-emerald-950/40 border-l-2 border-emerald-400"
                        : "hover:bg-emerald-950/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-emerald-200 text-xs truncate flex-1 group-hover:text-emerald-100">
                        {job.title}
                      </h3>
                      {isRunning ? (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold animate-pulse shrink-0">
                          <Zap className="w-2.5 h-2.5" />
                          RUNNING
                        </span>
                      ) : job.status === "COMPLETED" ? (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          DONE
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 text-[9px] shrink-0">
                          {job.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-emerald-500/70 mb-1.5">
                      <span className="flex items-center gap-1">
                        <span>Agent:</span>
                        <span className="text-emerald-300 font-bold">{job.agentName}</span>
                        <span className="text-emerald-600">({job.agentRole})</span>
                      </span>
                      <span>{job.createdAt}</span>
                    </div>

                    <p className="text-[10px] text-emerald-400/80 line-clamp-2 mb-1.5">
                      {job.prompt}
                    </p>

                    {/* Progress preview or metadata */}
                    <div className="flex items-center justify-between text-[9px] text-emerald-600 pt-1 border-t border-emerald-500/10">
                      <span>{job.priority} PRIORITY</span>
                      {job.durationMs ? (
                        <span>{(job.durationMs / 1000).toFixed(1)}s runtime</span>
                      ) : (
                        <span>{job.logs.length} events logged</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Job View / Deliverable Inspector */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#040806] overflow-y-auto">
          {selectedJob ? (
            <div className="flex-1 flex flex-col min-h-0 p-4 space-y-4">
              {/* Job Header Card */}
              <div className="p-4 rounded-xl bg-black/60 border border-emerald-500/30 space-y-3 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-emerald-200">
                        {selectedJob.title}
                      </h2>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                        {selectedJob.id}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-500/80">
                      <span>Assigned: <strong className="text-emerald-300">{selectedJob.agentName}</strong> ({selectedJob.agentRole})</span>
                      <span>•</span>
                      <span>Priority: <strong className="text-amber-300">{selectedJob.priority}</strong></span>
                      <span>•</span>
                      <span>Created: {selectedJob.createdAt}</span>
                      {selectedJob.durationMs && (
                        <>
                          <span>•</span>
                          <span>Execution: {(selectedJob.durationMs / 1000).toFixed(2)}s</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedJob.result && (
                      <>
                        <button
                          onClick={() => handleCopyText(selectedJob.result!, selectedJob.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5 cursor-pointer transition-all"
                          title="Copy deliverable Markdown to clipboard"
                        >
                          {copiedId === selectedJob.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            playBeep?.(850, 0.06);
                            onSaveToVault(selectedJob);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 hover:text-emerald-100 text-[11px] flex items-center gap-1.5 cursor-pointer transition-all"
                          title="Save this output permanently to the Knowledge Vault"
                        >
                          <Archive className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Save to Vault</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Job Prompt Box */}
                <div className="p-2.5 rounded bg-black/80 border border-emerald-500/20 text-xs">
                  <div className="text-[10px] text-emerald-500/70 uppercase mb-1 font-bold">
                    Job Directive / Objective:
                  </div>
                  <p className="text-emerald-200 leading-relaxed whitespace-pre-wrap">
                    {selectedJob.prompt}
                  </p>
                  {selectedJob.inputData && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/15">
                      <div className="text-[10px] text-emerald-500/70 uppercase mb-1">
                        Attached Input Payload:
                      </div>
                      <pre className="p-2 rounded bg-black/90 border border-emerald-500/20 text-[11px] text-emerald-400/90 overflow-x-auto max-h-32">
                        {selectedJob.inputData}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Live Logs Bar */}
                {selectedJob.logs.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-emerald-500/70 uppercase font-bold flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-emerald-400" />
                      EXECUTION LOG STREAM ({selectedJob.logs.length} events)
                    </div>
                    <div className="p-2 rounded bg-black/90 border border-emerald-500/20 max-h-24 overflow-y-auto space-y-1 text-[10px] font-mono">
                      {selectedJob.logs.map((log, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-emerald-400/80">
                          <span className="text-emerald-600 shrink-0">[{log.timestamp}]</span>
                          <span className="text-emerald-500 shrink-0">[{log.stage}]</span>
                          <span className="text-emerald-200">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Deliverable Markdown Display */}
              <div className="flex-1 min-h-[300px] p-5 rounded-xl bg-black/70 border border-emerald-500/30 overflow-y-auto space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    AGENT DELIVERABLE OUTPUT
                  </span>
                  {selectedJob.status === "RUNNING" && (
                    <span className="flex items-center gap-1.5 text-[11px] text-amber-400 animate-pulse font-bold">
                      <Zap className="w-3.5 h-3.5" />
                      Synthesizing live output stream...
                    </span>
                  )}
                </div>

                {selectedJob.result ? (
                  <div className="prose prose-invert prose-emerald max-w-none text-emerald-200 text-xs leading-relaxed">
                    <ReactMarkdown>{selectedJob.result}</ReactMarkdown>
                  </div>
                ) : selectedJob.status === "RUNNING" ? (
                  <div className="py-12 text-center text-emerald-500 space-y-3">
                    <Zap className="w-8 h-8 mx-auto animate-bounce text-emerald-400" />
                    <p className="text-sm font-bold text-emerald-300">Agent {selectedJob.agentName} is executing directive...</p>
                    <p className="text-xs text-emerald-600">Synthesizing telemetry, analyzing input data, and compiling Markdown report.</p>
                  </div>
                ) : (
                  <div className="py-12 text-center text-emerald-600">
                    <FileText className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p>No output generated yet for this job.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-emerald-600 space-y-3">
              <Cpu className="w-12 h-12 text-emerald-500/30" />
              <h3 className="text-sm font-bold text-emerald-400">Select an Agent Job</h3>
              <p className="text-xs max-w-sm text-emerald-600">
                Choose a job from the queue on the left to review its live logs, execution timing, and formatted deliverable.
              </p>
              <button
                onClick={() => setIsDispatchModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold cursor-pointer transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Create & Dispatch New Job</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dispatch New Job Modal */}
      <AnimatePresence>
        {isDispatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#08120e] border border-emerald-500/40 rounded-xl shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-emerald-200">DISPATCH AGENT JOB</h2>
                </div>
                <button
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="p-1 rounded hover:bg-emerald-950 text-emerald-500 hover:text-emerald-300 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Quick Presets Carousel */}
              <div className="space-y-1.5 shrink-0">
                <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wide">
                  SELECT OPERATIONAL JOB PRESET:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {presets.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 hover:text-emerald-100 text-[10px] whitespace-nowrap cursor-pointer transition-all"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateJob} className="flex-1 flex flex-col min-h-0 space-y-3 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-emerald-500/80 uppercase font-bold mb-1">
                      Assigned Goblin Agent
                    </label>
                    <select
                      value={selectedAgentId}
                      onChange={e => setSelectedAgentId(e.target.value)}
                      className="w-full bg-black/80 border border-emerald-500/30 rounded px-2.5 py-1.5 text-xs text-emerald-200 focus:outline-none focus:border-emerald-400"
                    >
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.role}) - {a.specialization}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-emerald-500/80 uppercase font-bold mb-1">
                      Priority Level
                    </label>
                    <select
                      value={jobPriority}
                      onChange={e => setJobPriority(e.target.value as JobPriority)}
                      className="w-full bg-black/80 border border-emerald-500/30 rounded px-2.5 py-1.5 text-xs text-emerald-200 focus:outline-none focus:border-emerald-400"
                    >
                      <option value="LOW">LOW - Routine Telemetry</option>
                      <option value="NORMAL">NORMAL - Standard Pipeline</option>
                      <option value="HIGH">HIGH - Urgent Conduit Task</option>
                      <option value="CRITICAL">CRITICAL - Immediate Bedrock Priority</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-emerald-500/80 uppercase font-bold mb-1">
                    Job Title / Objective Name
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="e.g. Scrape Network Telemetry & Review Code"
                    required
                    className="w-full bg-black/80 border border-emerald-500/30 rounded px-2.5 py-1.5 text-xs text-emerald-200 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <label className="block text-[10px] text-emerald-500/80 uppercase font-bold mb-1">
                    Detailed Prompt / Directives
                  </label>
                  <textarea
                    value={jobPrompt}
                    onChange={e => setJobPrompt(e.target.value)}
                    placeholder="Provide detailed instructions for the goblin agent to execute..."
                    required
                    rows={3}
                    className="w-full bg-black/80 border border-emerald-500/30 rounded p-2 text-xs text-emerald-200 focus:outline-none focus:border-emerald-400 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-emerald-500/80 uppercase font-bold mb-1">
                    Attached Input Context / Code Scrap (Optional)
                  </label>
                  <textarea
                    value={jobInputData}
                    onChange={e => setJobInputData(e.target.value)}
                    placeholder="Paste scripts, raw logs, JSON data, or markdown for the agent to process..."
                    rows={3}
                    className="w-full font-mono bg-black/80 border border-emerald-500/30 rounded p-2 text-[11px] text-emerald-400/90 focus:outline-none focus:border-emerald-400 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 shrink-0 border-t border-emerald-500/20">
                  <button
                    type="button"
                    onClick={() => setIsDispatchModalOpen(false)}
                    className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !jobTitle.trim() || !jobPrompt.trim()}
                    className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isSubmitting ? "Dispatching..." : "Launch Job"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
