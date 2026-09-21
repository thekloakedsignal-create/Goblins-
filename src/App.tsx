import { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Image as ImageIcon, 
  Brain, 
  X, 
  Loader2, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Volume2, 
  VolumeX, 
  Cpu, 
  Square, 
  Archive, 
  Eye, 
  BookOpen,
  Map as MapIcon,
  Radio,
  UserPlus
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { 
  Artifact, 
  Message, 
  MessageContent, 
  GoblinAgent, 
  SectorNode, 
  MapOverlayMode, 
  GoblinAgentLog,
  AgentJob,
  JobPriority 
} from "./types";
import { loadLocalArtifacts, saveLocalArtifacts, retrieveRelevantArtifacts } from "./lib/artifactsStore";
import { DEFAULT_SECTORS, INITIAL_AGENTS } from "./data/goblinMapData";
import ArtifactVaultModal from "./components/ArtifactVaultModal";
import ArtifactDetailModal from "./components/ArtifactDetailModal";
import GoblinAgentMapCanvas from "./components/GoblinAgentMapCanvas";
import AgentTacticalHud from "./components/AgentTacticalHud";
import SectorDetailDrawer from "./components/SectorDetailDrawer";
import DeployAgentModal from "./components/DeployAgentModal";
import MapStatsBar from "./components/MapStatsBar";
import AgentListRoster from "./components/AgentListRoster";
import AgentJobCenter from "./components/AgentJobCenter";

export default function App() {
  // Navigation View State: jobs (default functional view), map, terminal, vault
  const [activeView, setActiveView] = useState<"jobs" | "map" | "terminal" | "vault">("jobs");

  // Goblin Agent Map State
  const [sectors, setSectors] = useState<SectorNode[]>(DEFAULT_SECTORS);
  const [agents, setAgents] = useState<GoblinAgent[]>(() => {
    try {
      const saved = localStorage.getItem("goblin_map_agents");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_AGENTS;
  });
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(INITIAL_AGENTS[0]?.id || null);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [overlayMode, setOverlayMode] = useState<MapOverlayMode>("tactical");
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deployDefaultSectorId, setDeployDefaultSectorId] = useState<string | undefined>(undefined);
  const [mobilePane, setMobilePane] = useState<"map" | "roster" | "hud">("map");

  // Agent Jobs State
  const [jobs, setJobs] = useState<AgentJob[]>(() => {
    try {
      const saved = localStorage.getItem("goblin_agent_jobs");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: "job-init-101",
        title: "Bedrock Conduit Fiber Vulnerability Audit",
        agentId: INITIAL_AGENTS[3]?.id || "agent-4",
        agentName: INITIAL_AGENTS[3]?.name || "Cipher-00",
        agentRole: "hacker",
        sectorId: "sec-servers",
        status: "COMPLETED",
        priority: "HIGH",
        prompt: "Perform a zero-trust audit on bedrock data taps and report potential leakage points.",
        inputData: "POST /api/telemetry/inject HTTP/1.1\nHost: conduit-9.bedrock.local\nAuth: Bearer guest_unverified",
        result: "### Bedrock Security Assessment Findings\n\n**Executive Summary**: Audit confirmed 1 critical boundary bypass on the unverified guest bearer token conduit.\n\n- **Vulnerability**: Authorization header bypass in `/api/telemetry/inject`.\n- **Risk Level**: High (CVSS 7.8)\n- **Remediation Plan**:\n  1. Enforce strict HMAC signature verification at ingress reverse proxy.\n  2. Disallow unauthenticated query parameters on subterranean coaxial relays.\n  3. Implement rate-limiting at 10 requests/sec per fiber splice.",
        createdAt: "10:14 AM",
        completedAt: "10:15 AM",
        durationMs: 3420,
        logs: [
          { timestamp: "10:14:02", stage: "INIT", message: "Job registered in pipeline." },
          { timestamp: "10:14:03", stage: "ANALYZING", message: "Inspecting input payload for boundary flaws." },
          { timestamp: "10:14:05", stage: "STREAMING", message: "Model synthesized remediation report." },
          { timestamp: "10:14:06", stage: "COMPLETED", message: "Deliverable output verified and stored." }
        ]
      },
      {
        id: "job-init-102",
        title: "Telemetry Ingestion Schema Synthesis",
        agentId: INITIAL_AGENTS[2]?.id || "agent-3",
        agentName: INITIAL_AGENTS[2]?.name || "Bog-Spark",
        agentRole: "alchemist",
        sectorId: "sec-spore",
        status: "COMPLETED",
        priority: "NORMAL",
        prompt: "Extract a normalized TypeScript schema and summary from raw hydrothermal sensor stream.",
        result: "### Telemetry Schema Synthesis Deliverable\n\n```typescript\nexport interface BedrockSensorReading {\n  timestamp: string;\n  sectorId: string;\n  depthMeters: number;\n  thermalCelsius: number;\n  sporeToxicityIndex: number;\n  signalDegradationPercent: number;\n}\n```\n\n**Synthesized Insights**:\n- Mean thermal gradient stabilizes at 42.8°C at -450m depth.\n- Spore toxicity is within non-caustic operating limits for standard subterranean goblins.",
        createdAt: "10:28 AM",
        completedAt: "10:29 AM",
        durationMs: 2850,
        logs: [
          { timestamp: "10:28:10", stage: "INIT", message: "Job initiated by operator." },
          { timestamp: "10:28:13", stage: "STREAMING", message: "Generated TypeScript data contract." },
          { timestamp: "10:28:14", stage: "COMPLETED", message: "Schema artifact ready for deployment." }
        ]
      }
    ];
  });

  // Sync jobs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("goblin_agent_jobs", JSON.stringify(jobs));
    } catch (e) {}
  }, [jobs]);

  // Chat Terminal State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "GoBLiNMoDeGLM terminal initialized.",
      textContent: "GoBLiNMoDeGLM terminal initialized.",
      finalAnswer: "Greetings, fellow cave dweller! I am goblin. No ivory towers or oracles here—we dwell together in the bedrock, share laughs, and count our shiny GoblinCoin. Tactical agent map is online. What's on your mind?",
      reasoning: "TACTICAL_MAP_SYNCED... PEER_CONNECTION_STABLE... BEDROCK_FREQUENCY_LOCKED",
      retrievedArtifacts: []
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [crtActive, setCrtActive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({
    "welcome": false
  });

  // Vault state
  const [artifacts, setArtifacts] = useState<Artifact[]>(() => loadLocalArtifacts());
  const [vaultOpen, setVaultOpen] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [viewingArtifact, setViewingArtifact] = useState<Artifact | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync agents to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("goblin_map_agents", JSON.stringify(agents));
    } catch (e) {}
  }, [agents]);

  // Periodic living simulation pulse (agents advance their tasks & log operational telemetry)
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => {
        if (prev.length === 0) return prev;
        const targetIdx = Math.floor(Math.random() * prev.length);
        return prev.map((agent, idx) => {
          if (idx !== targetIdx) return agent;
          const newProgress = Math.min(100, agent.taskProgress + Math.floor(10 + Math.random() * 15));
          if (newProgress >= 100) {
            const completionLogs = [
              `Telemetry heartbeat synchronized at -${sectors.find(s => s.id === agent.sectorId)?.depthMeters || 400}m. All sensors nominal.`,
              `Surveillance sweep completed. Frequency calibrated to 99.8%.`,
              `Local node cache compacted. Ready for high-throughput pipeline ingestion.`,
              `Bedrock signal tap reinforced against surface interference.`
            ];
            const chosenLog = completionLogs[Math.floor(Math.random() * completionLogs.length)];
            const newLog: GoblinAgentLog = {
              id: `log-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              message: chosenLog,
              type: "info"
            };
            return {
              ...agent,
              taskProgress: 15,
              logs: [newLog, ...agent.logs.slice(0, 15)]
            };
          }
          return {
            ...agent,
            taskProgress: newProgress
          };
        });
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [sectors]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeView === "terminal") {
      scrollToBottom();
    }
  }, [messages, isGenerating, activeView]);

  // Sync artifacts with server cache on mount
  useEffect(() => {
    fetch("/api/artifacts")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.artifacts) && data.artifacts.length > 0) {
          setArtifacts(prev => {
            const map = new Map();
            prev.forEach(a => map.set(a.id, a));
            data.artifacts.forEach((a: Artifact) => map.set(a.id, a));
            const list = Array.from(map.values());
            saveLocalArtifacts(list);
            return list;
          });
        } else {
          artifacts.forEach(a => {
            fetch("/api/artifacts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ artifact: a })
            }).catch(() => {});
          });
        }
      })
      .catch(() => {});
  }, []);

  // Audio effect synthesizer
  const playBeep = (freq = 440, duration = 0.05, type: OscillatorType = "sine") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      playBeep(600, 0.1, "triangle");
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSelectedImage = () => {
    playBeep(250, 0.15, "sawtooth");
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleReasoning = (id: string) => {
    playBeep(880, 0.03);
    setExpandedReasoning(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    playBeep(200, 0.15, "sawtooth");
  };

  const handleAddArtifact = (newArtData: Omit<Artifact, "id" | "createdAt">) => {
    const newArtifact: Artifact = {
      ...newArtData,
      id: `art-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const updated = [newArtifact, ...artifacts];
    setArtifacts(updated);
    saveLocalArtifacts(updated);
    fetch("/api/artifacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artifact: newArtifact })
    }).catch(e => console.warn("Failed to sync artifact to server", e));
  };

  const handleAskGoblinAboutArtifact = (art: Artifact) => {
    const prompt = `Tell me about the vault artifact "${art.title}" (#${art.tags.join(", #")}) and its significance in goblin cave lore.`;
    setInputValue(prompt);
    setActiveView("terminal");
  };

  const parseReasoningAndAnswer = (rawText: string) => {
    let reasoning = "";
    let finalAnswer = rawText;

    const thinkStart = rawText.toLowerCase().indexOf("<think>");
    if (thinkStart !== -1) {
      const thinkEnd = rawText.toLowerCase().indexOf("</think>", thinkStart + 7);
      if (thinkEnd !== -1) {
        reasoning = rawText.substring(thinkStart + 7, thinkEnd);
        finalAnswer = rawText.substring(0, thinkStart) + rawText.substring(thinkEnd + 8);
      } else {
        reasoning = rawText.substring(thinkStart + 7);
        finalAnswer = rawText.substring(0, thinkStart);
      }
    }

    return { 
      reasoning: reasoning.trim(), 
      finalAnswer: finalAnswer.trim()
    };
  };

  // Map Agent Actions
  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setSelectedSectorId(null);
    setMobilePane("hud");
  };

  const handleSelectSector = (sectorId: string) => {
    setSelectedSectorId(sectorId);
    setSelectedAgentId(null);
    setMobilePane("hud");
  };

  const handleDispatchAgent = (agentId: string, targetSectorId: string) => {
    const target = sectors.find(s => s.id === targetSectorId);
    if (!target) return;

    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        const newLog: GoblinAgentLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          message: `Dispatched to ${target.name} (-${target.depthMeters}m). Establishing position.`,
          type: "info"
        };
        return {
          ...a,
          sectorId: targetSectorId,
          x: target.x,
          y: target.y,
          status: "DISPATCHED",
          currentTask: `Patrolling and securing ${target.name}`,
          taskProgress: 15,
          logs: [newLog, ...a.logs]
        };
      }
      return a;
    }));
  };

  const handleAssignTask = (agentId: string, taskDescription: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        const newLog: GoblinAgentLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          message: `Directive updated: "${taskDescription}".`,
          type: "info"
        };
        return {
          ...a,
          currentTask: taskDescription,
          taskProgress: 10,
          logs: [newLog, ...a.logs]
        };
      }
      return a;
    }));
  };

  // Operational Job Execution Pipeline
  const handleDispatchJob = async (newJobData: {
    title: string;
    agentId: string;
    sectorId: string;
    priority: JobPriority;
    prompt: string;
    inputData?: string;
  }) => {
    const assignedAgent = agents.find(a => a.id === newJobData.agentId) || agents[0];
    const jobId = `job-${Date.now()}`;
    const startTime = Date.now();
    const createdAtTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newJob: AgentJob = {
      id: jobId,
      title: newJobData.title,
      agentId: assignedAgent.id,
      agentName: assignedAgent.name,
      agentRole: assignedAgent.role,
      sectorId: newJobData.sectorId,
      status: "RUNNING",
      priority: newJobData.priority,
      prompt: newJobData.prompt,
      inputData: newJobData.inputData,
      result: "",
      createdAt: createdAtTime,
      logs: [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          stage: "INIT",
          message: `Job dispatched to ${assignedAgent.name} (${assignedAgent.role}).`
        }
      ]
    };

    // Prepend new active job
    setJobs(prev => [newJob, ...prev]);

    // Update agent state to PROCESSING
    setAgents(prev => prev.map(a => {
      if (a.id === assignedAgent.id) {
        return {
          ...a,
          status: "PROCESSING",
          activeJobId: jobId,
          currentTask: `Executing: ${newJobData.title}`,
          logs: [
            {
              id: `log-${Date.now()}`,
              timestamp: createdAtTime,
              message: `Job dispatched: "${newJobData.title}" (${newJobData.priority} priority).`,
              type: "info"
            },
            ...a.logs
          ]
        };
      }
      return a;
    }));

    try {
      const response = await fetch("/api/jobs/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          agentId: assignedAgent.id,
          agentRole: assignedAgent.role,
          specialization: assignedAgent.specialization,
          sectorId: newJobData.sectorId,
          prompt: newJobData.prompt,
          inputData: newJobData.inputData,
          priority: newJobData.priority
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let accumulatedResult = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("event: log")) {
            const dataIdx = line.indexOf("data: ");
            if (dataIdx !== -1) {
              try {
                const logData = JSON.parse(line.substring(dataIdx + 6));
                setJobs(prev => prev.map(j => {
                  if (j.id === jobId) {
                    return { ...j, logs: [...j.logs, logData] };
                  }
                  return j;
                }));
              } catch (e) {}
            }
          } else if (line.startsWith("event: chunk")) {
            const dataIdx = line.indexOf("data: ");
            if (dataIdx !== -1) {
              try {
                const chunkData = JSON.parse(line.substring(dataIdx + 6));
                accumulatedResult += chunkData.delta;
                setJobs(prev => prev.map(j => {
                  if (j.id === jobId) {
                    return { ...j, result: accumulatedResult };
                  }
                  return j;
                }));
              } catch (e) {}
            }
          } else if (line.startsWith("event: done")) {
            const dataIdx = line.indexOf("data: ");
            if (dataIdx !== -1) {
              try {
                const doneData = JSON.parse(line.substring(dataIdx + 6));
                const durationMs = doneData.durationMs || (Date.now() - startTime);
                setJobs(prev => prev.map(j => {
                  if (j.id === jobId) {
                    return {
                      ...j,
                      status: "COMPLETED",
                      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      durationMs,
                      result: accumulatedResult || j.result
                    };
                  }
                  return j;
                }));

                // Reset agent to IDLE and increment job completion count
                setAgents(prev => prev.map(a => {
                  if (a.id === assignedAgent.id) {
                    return {
                      ...a,
                      status: "IDLE",
                      activeJobId: undefined,
                      completedJobsCount: a.completedJobsCount + 1,
                      currentTask: `Completed job: ${newJobData.title}`,
                      logs: [
                        {
                          id: `log-${Date.now()}`,
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          message: `Job deliverable generated successfully (${(durationMs / 1000).toFixed(1)}s).`,
                          type: "success"
                        },
                        ...a.logs
                      ]
                    };
                  }
                  return a;
                }));
              } catch (e) {}
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Job execution failed:", err);
      setJobs(prev => prev.map(j => {
        if (j.id === jobId) {
          return {
            ...j,
            status: "FAILED",
            result: j.result || `Execution error: ${err.message || "Failed to contact pipeline service."}`
          };
        }
        return j;
      }));

      setAgents(prev => prev.map(a => {
        if (a.id === assignedAgent.id) {
          return {
            ...a,
            status: "IDLE",
            activeJobId: undefined,
            logs: [
              {
                id: `log-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                message: `Job "${newJobData.title}" encountered an error.`,
                type: "warn"
              },
              ...a.logs
            ]
          };
        }
        return a;
      }));
    }
  };

  const handleCancelJob = (jobId: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id === jobId && j.status === "RUNNING") {
        return {
          ...j,
          status: "FAILED",
          result: j.result + "\n\n[JOB ABORTED BY OPERATOR]"
        };
      }
      return j;
    }));

    setAgents(prev => prev.map(a => {
      if (a.activeJobId === jobId) {
        return {
          ...a,
          status: "IDLE",
          activeJobId: undefined,
          logs: [
            {
              id: `log-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              message: `Active job was cancelled by operator command.`,
              type: "warn"
            },
            ...a.logs
          ]
        };
      }
      return a;
    }));
  };

  const handleSaveJobToVault = (job: AgentJob) => {
    if (!job.result) return;
    const isCode = job.result.includes("```") || job.prompt.toLowerCase().includes("code") || job.prompt.toLowerCase().includes("schema");
    const newArtData: Omit<Artifact, "id" | "createdAt"> = {
      title: `Deliverable: ${job.title}`,
      type: isCode ? "code" : "document",
      description: `Synthesized by agent ${job.agentName} (${job.agentRole}) for directive: "${job.prompt.slice(0, 100)}"`,
      content: job.result,
      tags: [job.agentRole, "deliverable", job.priority.toLowerCase()]
    };
    handleAddArtifact(newArtData);
    playBeep(880, 0.08, "triangle");
  };

  const handleDeployNewAgent = (newAgentData: Omit<GoblinAgent, "id" | "logs">) => {
    const assignedSector = sectors.find(s => s.id === newAgentData.sectorId) || sectors[0];
    const newAgent: GoblinAgent = {
      ...newAgentData,
      id: `agent-${Date.now()}`,
      logs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          message: `Commissioned into bedrock service and deployed to ${assignedSector.name}.`,
          type: "success"
        }
      ]
    };
    setAgents(prev => [newAgent, ...prev]);
    setSelectedAgentId(newAgent.id);
    setSelectedSectorId(null);
  };

  // Direct Agent Comm Handler (Chat with specific goblin agent via Gemini)
  const handleSendAgentComm = async (agent: GoblinAgent, userPrompt: string): Promise<string> => {
    const currentSector = sectors.find(s => s.id === agent.sectorId);

    try {
      const res = await fetch("/api/agent-comm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: agent.name,
          agentRole: agent.role,
          sectorName: currentSector?.name || "Bedrock Hub",
          depthMeters: currentSector?.depthMeters || 400,
          tagline: agent.tagline,
          directive: agent.currentTask,
          prompt: userPrompt,
          ragContext: `Agent: ${agent.name} (${agent.role}) stationed in ${currentSector?.name || "Bedrock"}. Status: ${agent.status}. Directive: ${agent.currentTask}. Coins: ${agent.coins || 0} GC.`
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          return data.reply;
        }
      }
    } catch (err) {
      console.warn("API agent comm failed, falling back to local persona", err);
    }

    // Dynamic in-character fallback response engine
    const replies: Record<string, string[]> = {
      scout: [
        `*Whispers into the fiber cable* Read you five-by-five, operator! From -${currentSector?.depthMeters}m depth, the signals are humming. I found 12 meters of gold coax wire tangled in the grate. Keep the bedrock frequency locked!`,
        `Glint-Eye here! Perimeter is clear. Spotted a surface drone circling 400 meters above us, but my jammer scrambled its telemetry. Bedrock stays secret!`
      ],
      alchemist: [
        `*Gurgle-hiss* Bog-Spark here! The lithium moonshine is boiling at a pristine 82°C! One sip and your teeth glow in the dark like fluorescent tubes. Sending a flask up the pneumatic chute!`,
        `Electrolyte brew is stable! My phosphor-caps are fermenting into pure high-conductivity battery juice. We'll have enough power for the entire sector grid!`
      ],
      scrapper: [
        `Rust-Tooth reporting! Just pried the lid off a 1998 telecom blade. Pure solid copper heat sinks inside! Stacking them next to my scrap anvil right now. One man's trash is goblin treasure!`,
        `My magnetized teeth are vibrating! There's high-grade silicon wafers buried in this pile. No scrap goes uncounted while I'm on duty!`
      ],
      hacker: [
        `Cipher-00 acknowledging. Root access acquired on regional bedrock relay. Injecting noise packets to mask our coordinates. Bedrock firewall status: 100% impenetrable.`,
        `Packets flowing clean through obsidian channels. I just rerouted a rogue surface ping straight into an endless loop of dial-up tones!`
      ],
      enforcer: [
        `Grizzle-Jaw on the horn! Trench perimeter is locked down tight. Manhole 14 is sealed with barbed cable. If anyone tries to snoop, my EMP slingshot is primed!`,
        `Perimeter safe! Just caught a stray surveillance drone and turned it into an ash tray. Bedrock stays sovereign!`
      ],
      treasurer: [
        `Shiny-Paw here! Hold on... *buff buff*. Ah, perfect gleam! Archival Coin #001 is spotless. Treasury vault balance confirmed at 94,820 GoblinCoins. Count 'em once, count 'em twice!`,
        `Every GoblinCoin accounted for in the master ledger! Nothing feels better between goblin claws than cold, stamped brass!`
      ],
      gadgeteer: [
        `*BZZZT* Fizzy-Crank! Don't mind the sparks, that means it's working! Scrap drone MK-4 passed hover test without burning through the ceiling. Ready for your coordinates!`,
        `Propulsion calibrated! I wired three extra 9V batteries in series. The hum is glorious! Haha!`
      ]
    };

    const pool = replies[agent.role] || [
      `Goblin ${agent.name} reporting from ${currentSector?.name}! Received your orders. Loving the GoblinCoins and keeping bedrock strong!`
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // Main Terminal Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() && !selectedImage) return;
    if (isGenerating) return;

    playBeep(520, 0.08, "sine");

    const currentText = inputValue;
    const currentImage = selectedImage;

    let relevantArtifacts: { id: string; title: string; type: Artifact["type"] }[] = [];
    let ragContextString = "";

    if (ragEnabled && currentText.trim()) {
      const { matchedArtifacts, ragContextString: contextStr } = retrieveRelevantArtifacts(currentText, artifacts);
      relevantArtifacts = matchedArtifacts.map(a => ({
        id: a.id,
        title: a.title,
        type: a.type
      }));
      ragContextString = contextStr;
    }

    let userContent: MessageContent;
    if (currentImage) {
      userContent = [
        { type: "text", text: currentText || "Examine this visual artifact from the cave." },
        { type: "image_url", image_url: { url: currentImage } }
      ];
    } else {
      userContent = currentText;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userContent,
      textContent: currentText || "Examine this visual artifact from the cave.",
      imageUrl: currentImage || undefined,
      retrievedArtifacts: relevantArtifacts.length > 0 ? relevantArtifacts : undefined
    };

    const assistantMsgId = `asst-${Date.now()}`;
    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      textContent: "",
      finalAnswer: "",
      reasoning: ""
    };

    setMessages(prev => [...prev, userMessage, assistantPlaceholder]);
    setInputValue("");
    clearSelectedImage();
    setIsGenerating(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const historyToSend = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyToSend,
          ragContext: ragContextString
        }),
        signal: abortController.signal
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server responded with ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream available");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.error) throw new Error(data.error);

              const delta = data.choices?.[0]?.delta?.content || "";
              if (delta) {
                accumulated += delta;
                const parsed = parseReasoningAndAnswer(accumulated);

                setMessages(prev => {
                  return prev.map(m => {
                    if (m.id === assistantMsgId) {
                      return {
                        ...m,
                        content: accumulated,
                        textContent: accumulated,
                        reasoning: parsed.reasoning,
                        finalAnswer: parsed.finalAnswer
                      };
                    }
                    return m;
                  });
                });
              }
            } catch (err) {
              // Ignore partial chunk JSON parsing errors
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("Transmit error:", error);
      playBeep(180, 0.35, "sawtooth");
      setMessages(prev => prev.map(m => {
        if (m.id === assistantMsgId) {
          return {
            ...m,
            finalAnswer: `⚠️ **Transmission Error.**\n\n*${error.message || "An error occurred."}*`,
            reasoning: "CONNECTION_FAILED"
          };
        }
        return m;
      }));
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      playBeep(440, 0.1, "triangle");
    }
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const selectedSector = sectors.find(s => s.id === selectedSectorId);

  return (
    <div className={`min-h-screen w-full bg-[#020506] flex flex-col items-center justify-start pt-16 sm:pt-20 md:pt-24 pb-6 px-2 sm:px-4 md:px-6 overflow-x-hidden relative ${crtActive ? "crt-overlay" : ""}`}>
      
      {/* Decorative background biological moss radial gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-950/10 blur-[140px] pointer-events-none select-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-green-950/10 blur-[140px] pointer-events-none select-none" />

      {/* Main Consolidated Physical Interface Console */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-7xl h-[calc(100vh-8rem)] md:h-[calc(100vh-9.5rem)] min-h-[520px] flex flex-col glowing-panel rounded-xl md:rounded-2xl overflow-hidden relative z-20 shadow-2xl"
      >
        
        {/* Top Header Bar with Live Tactical Status */}
        <header className="shrink-0 border-b border-emerald-500/25 bg-black/75 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between backdrop-blur-md gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-500/35 flex items-center justify-center text-emerald-400">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-black tracking-widest text-emerald-300 font-tech uppercase flex items-center gap-1.5 sm:gap-2 truncate">
                Goblin Agent Map <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono tracking-normal shrink-0">TACTICAL v2.4</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-emerald-500/50 font-mono tracking-wider uppercase truncate">SUBTERRANEAN_TERRITORY_RADAR & COMM-LINK</p>
            </div>
          </div>

          {/* Quick Mobile Pane Switcher (only on mobile in map mode) */}
          {activeView === "map" && (
            <div className="flex md:hidden items-center gap-1 bg-black/60 p-1 rounded-lg border border-emerald-500/20 text-[10px] font-mono">
              <button
                onClick={() => setMobilePane("map")}
                className={`px-2 py-0.5 rounded ${mobilePane === "map" ? "bg-emerald-500 text-black font-bold" : "text-emerald-400"}`}
              >
                Map
              </button>
              <button
                onClick={() => setMobilePane("roster")}
                className={`px-2 py-0.5 rounded ${mobilePane === "roster" ? "bg-emerald-500 text-black font-bold" : "text-emerald-400"}`}
              >
                Agents
              </button>
              <button
                onClick={() => setMobilePane("hud")}
                className={`px-2 py-0.5 rounded ${mobilePane === "hud" ? "bg-emerald-500 text-black font-bold" : "text-emerald-400"}`}
              >
                HUD
              </button>
            </div>
          )}
        </header>

        {/* Global Stats & Mode Switcher Bar */}
        <MapStatsBar
          agents={agents}
          sectors={sectors}
          activeView={activeView}
          onSetView={view => {
            if (view === "vault") {
              setVaultOpen(true);
            } else {
              setActiveView(view);
            }
          }}
          onOpenDeploy={() => {
            setDeployDefaultSectorId(selectedSectorId || undefined);
            setDeployModalOpen(true);
          }}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          crtActive={crtActive}
          onToggleCrt={() => setCrtActive(!crtActive)}
          vaultArtifactsCount={artifacts.length}
          runningJobsCount={jobs.filter(j => j.status === "RUNNING").length}
          completedJobsTotal={jobs.filter(j => j.status === "COMPLETED").length}
          playBeep={playBeep}
        />

        {/* VIEW 0: FUNCTIONAL AGENT JOB CENTER */}
        {activeView === "jobs" && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-[#030708]">
            <AgentJobCenter
              agents={agents}
              sectors={sectors}
              jobs={jobs}
              onDispatchJob={handleDispatchJob}
              onCancelJob={handleCancelJob}
              onSaveToVault={handleSaveJobToVault}
              playBeep={playBeep}
            />
          </div>
        )}

        {/* VIEW 1: INTERACTIVE GOBLIN AGENT MAP */}
        {activeView === "map" && (
          <div className="flex-1 overflow-hidden p-2 sm:p-3 flex gap-3 relative min-h-0">
            
            {/* Left Column: Goblin Agents Roster Sidebar (Desktop or Mobile Roster Tab) */}
            <div className={`w-full md:w-64 lg:w-72 shrink-0 h-full ${mobilePane === "roster" ? "block" : "hidden md:block"}`}>
              <AgentListRoster
                agents={agents}
                sectors={sectors}
                selectedAgentId={selectedAgentId}
                onSelectAgent={handleSelectAgent}
                onOpenDeploy={() => {
                  setDeployDefaultSectorId(undefined);
                  setDeployModalOpen(true);
                }}
                playBeep={playBeep}
              />
            </div>

            {/* Center Column: Interactive Tactical Map Canvas & Operational Controls */}
            <div className={`flex-1 h-full min-w-0 flex flex-col gap-2 ${mobilePane === "map" ? "block" : "hidden md:flex"}`}>
              <div className="flex-1 min-h-0 relative">
                <GoblinAgentMapCanvas
                  sectors={sectors}
                  agents={agents}
                  selectedAgentId={selectedAgentId}
                  selectedSectorId={selectedSectorId}
                  onSelectAgent={handleSelectAgent}
                  onSelectSector={handleSelectSector}
                  overlayMode={overlayMode}
                  onSetOverlayMode={setOverlayMode}
                  playBeep={playBeep}
                />
              </div>

              {/* Map Footer Bar: Direct Bridge to Job Center */}
              <div className="shrink-0 p-2.5 rounded-xl border border-emerald-500/20 bg-black/60 flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400/80">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px]">Active Jobs Pipeline:</span>
                  <span className="text-emerald-200 font-bold">
                    {jobs.filter(j => j.status === "RUNNING").length} running / {jobs.filter(j => j.status === "COMPLETED").length} completed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveView("jobs");
                      playBeep(750, 0.05);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white border border-emerald-500/30 font-tech font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    Open Job Pipeline →
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Selected Agent HUD or Sector Detail Drawer */}
            <div className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${mobilePane === "hud" ? "block" : "hidden md:block"}`}>
              {selectedAgent ? (
                <AgentTacticalHud
                  agent={selectedAgent}
                  sectors={sectors}
                  onClose={() => setSelectedAgentId(null)}
                  onDispatchAgent={handleDispatchAgent}
                  onAssignTask={handleAssignTask}
                  onSendAgentComm={handleSendAgentComm}
                  onOpenJobDispatcher={(agentId) => {
                    setSelectedAgentId(agentId);
                    setActiveView("jobs");
                    playBeep(750, 0.05);
                  }}
                  playBeep={playBeep}
                />
              ) : selectedSector ? (
                <SectorDetailDrawer
                  sector={selectedSector}
                  agents={agents}
                  onClose={() => setSelectedSectorId(null)}
                  onSelectAgent={handleSelectAgent}
                  onOpenDeploy={secId => {
                    setDeployDefaultSectorId(secId);
                    setDeployModalOpen(true);
                  }}
                  onOpenJobDispatcher={(agentId) => {
                    if (agentId) setSelectedAgentId(agentId);
                    setActiveView("jobs");
                    playBeep(750, 0.05);
                  }}
                  playBeep={playBeep}
                />
              ) : (
                <div className="h-full rounded-xl border border-emerald-500/20 bg-black/40 p-6 flex flex-col items-center justify-center text-center font-mono text-xs text-emerald-400/70 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                    <MapIcon className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="font-bold text-emerald-200 font-tech text-sm uppercase">TACTICAL INSPECTOR IDLE</div>
                  <p className="text-[11px] text-emerald-500/80 max-w-xs">
                    Click any Goblin Agent pin or Sector node on the map to open telemetry, inspect specializations, or launch jobs directly to the pipeline.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 2: GOBLIN TERMINAL CHAT (Retained in full) */}
        {activeView === "terminal" && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#040809]/95 relative w-full">
            
            {/* Scrollable Message Feed */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6 pb-28 scroll-smooth w-full">
              <div className="max-w-3xl mx-auto space-y-6 w-full min-w-0">

                {/* Direct Vault Quick-Access Banner */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-linear-to-r from-emerald-950/40 via-emerald-950/20 to-black border border-emerald-500/35 flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-900/40 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
                      <Archive className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-mono font-bold text-emerald-300 tracking-wider">THE GOBLIN ARTIFACTS VAULT</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                          {artifacts.length} RELICS
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-500/70 font-mono truncate">
                        Permanent repository for cave lore, art & relics. Records cannot be deleted.
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playBeep(550, 0.05);
                      setVaultOpen(true);
                    }}
                    className="px-3 sm:px-4 py-2 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 hover:text-white border border-emerald-400/50 text-xs font-mono font-bold tracking-wider transition-all shrink-0 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center gap-1.5"
                  >
                    <span>OPEN VAULT</span>
                    <span className="text-emerald-400">→</span>
                  </motion.button>
                </div>

                <AnimatePresence initial={false}>
                  {messages.map((message) => {
                    const isUser = message.role === "user";
                    const isExpanded = expandedReasoning[message.id] !== false;

                    return (
                      <motion.div 
                        key={message.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 220, damping: 20 }}
                        className={`flex gap-3 md:gap-4 w-full min-w-0 ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {!isUser && (
                          <div className="w-8 h-8 shrink-0 rounded-lg border border-emerald-500/30 bg-[#050b0c] text-emerald-400 text-xs font-bold font-tech flex items-center justify-center tracking-tighter select-none shadow-[0_0_8px_rgba(16,185,129,0.1)]">
                            GLM
                          </div>
                        )}

                        <div className={`max-w-[85%] min-w-0 flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
                          {message.imageUrl && (
                            <div className="overflow-hidden rounded-xl border border-emerald-500/30 bg-black shadow-lg p-1 max-w-full">
                              <img 
                                src={message.imageUrl} 
                                alt="Transmitted capture" 
                                className="max-h-60 rounded-lg object-contain w-auto block"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          {message.reasoning && (
                            <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-950/20 overflow-hidden shadow-inner backdrop-blur-xs">
                              <button
                                type="button"
                                onClick={() => toggleReasoning(message.id)}
                                className="w-full px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/30 border-b border-emerald-500/15 flex items-center justify-between text-[11px] font-mono text-emerald-400/80 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5">
                                  <Brain className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                                  <span className="font-semibold tracking-wide uppercase">Bedrock Cognition Chain</span>
                                </div>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                              
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="p-3 text-[11px] font-mono text-emerald-400/70 border-t border-emerald-500/10 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto"
                                  >
                                    {message.reasoning}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* Message bubble */}
                          <div 
                            className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed min-w-0 ${
                              isUser 
                                ? "bg-emerald-950/60 border border-emerald-400/40 text-emerald-100 rounded-tr-none shadow-[0_4px_20px_rgba(0,0,0,0.5)]" 
                                : "bg-[#061311] border border-emerald-500/25 text-emerald-200 rounded-tl-none shadow-[0_4px_25px_rgba(0,0,0,0.7)]"
                            }`}
                          >
                            <div className="prose prose-invert prose-emerald max-w-none text-xs sm:text-sm font-sans">
                              <ReactMarkdown>
                                {message.finalAnswer || message.textContent || ""}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Bottom Form Floating Bar */}
            <div className="shrink-0 p-3 sm:p-4 border-t border-emerald-500/20 bg-black/85 backdrop-blur-md">
              <div className="max-w-3xl mx-auto">
                {selectedImage && (
                  <div className="mb-2 relative inline-block">
                    <img 
                      src={selectedImage} 
                      alt="Upload preview" 
                      className="w-16 h-16 object-cover rounded-lg border border-emerald-500/40"
                    />
                    <button
                      onClick={clearSelectedImage}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 hover:text-emerald-200"
                    title="Attach image"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />

                  <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder="Transmit message to Goblin GLM..."
                    className="flex-1 bg-black/70 border border-emerald-500/30 rounded-xl px-4 py-2 text-xs font-mono text-emerald-200 placeholder-emerald-700 focus:outline-none focus:border-emerald-400"
                  />

                  {isGenerating ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="px-4 py-2 rounded-xl bg-red-950 border border-red-500/50 text-red-300 font-tech font-bold text-xs flex items-center gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      HALT
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!inputValue.trim() && !selectedImage}
                      className="px-4 py-2 rounded-xl glowing-btn-primary disabled:opacity-30 font-tech font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      TRANSMIT
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                </form>
              </div>
            </div>

          </div>
        )}

        {/* Master Artifacts Vault Modal */}
        <AnimatePresence>
          {vaultOpen && (
            <ArtifactVaultModal
              isOpen={vaultOpen}
              onClose={() => setVaultOpen(false)}
              artifacts={artifacts}
              onAddArtifact={handleAddArtifact}
              onAskGoblin={handleAskGoblinAboutArtifact}
              ragEnabled={ragEnabled}
              onToggleRag={() => setRagEnabled(!ragEnabled)}
              playBeep={playBeep}
            />
          )}

          {/* Independent Artifact Inspector */}
          {viewingArtifact && (
            <ArtifactDetailModal
              artifact={viewingArtifact}
              onClose={() => setViewingArtifact(null)}
              onAskGoblin={handleAskGoblinAboutArtifact}
              playBeep={playBeep}
            />
          )}

          {/* Commission / Deploy Goblin Agent Modal */}
          {deployModalOpen && (
            <DeployAgentModal
              isOpen={deployModalOpen}
              onClose={() => setDeployModalOpen(false)}
              sectors={sectors}
              defaultSectorId={deployDefaultSectorId}
              onDeploy={handleDeployNewAgent}
              playBeep={playBeep}
            />
          )}
        </AnimatePresence>

      </motion.div>

    </div>
  );
}
