export type ArtifactType = "lore" | "art" | "document" | "relic" | "code";

export interface Artifact {
  id: string;
  title: string;
  type: ArtifactType;
  description: string;
  content: string; // Markdown text or detailed description/lore
  imageUrl?: string; // base64 or URL
  tags: string[];
  createdAt: string;
  sizeKb?: number;
}

export interface ContentText {
  type: "text";
  text: string;
}

export interface ContentImageUrl {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export type MessageContent = string | (ContentText | ContentImageUrl)[];

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: MessageContent;
  textContent: string;
  reasoning?: string;
  finalAnswer?: string;
  imageUrl?: string;
  retrievedArtifacts?: {
    id: string;
    title: string;
    type: ArtifactType;
  }[];
}

export type GoblinAgentRole = 
  | "scout" 
  | "scrapper" 
  | "alchemist" 
  | "hacker" 
  | "enforcer" 
  | "treasurer" 
  | "gadgeteer";

export type GoblinAgentStatus = 
  | "IDLE"
  | "PROCESSING"
  | "DISPATCHED"
  | "STANDBY";

export interface GoblinAgentLog {
  id: string;
  timestamp: string;
  message: string;
  type?: "info" | "success" | "warn" | "job";
}

export type JobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type JobPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export interface AgentJobLog {
  timestamp: string;
  stage: "INIT" | "ANALYZING" | "PROCESSING" | "STREAMING" | "COMPLETING" | "ERROR";
  message: string;
}

export interface AgentJob {
  id: string;
  title: string;
  agentId: string;
  agentName: string;
  agentRole: GoblinAgentRole;
  sectorId: string;
  priority: JobPriority;
  status: JobStatus;
  prompt: string;
  inputData?: string;
  result?: string;
  reasoning?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  logs: AgentJobLog[];
  artifactCreatedId?: string;
}

export interface GoblinAgent {
  id: string;
  name: string;
  callsign: string;
  role: GoblinAgentRole;
  status: GoblinAgentStatus;
  sectorId: string;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  targetSectorId?: string;
  avatarEmoji: string;
  tagline: string;
  specialization: string;
  capabilities: string[];
  activeJobId?: string;
  completedJobsCount: number;
  currentTask: string;
  taskProgress: number; // 0 - 100 for current active job
  logs: GoblinAgentLog[];
  // Backwards compatibility fields
  energy?: number;
  coins?: number;
}

export type SectorType = 
  | "core" 
  | "scrap" 
  | "treasury" 
  | "bio" 
  | "aqueduct" 
  | "perimeter" 
  | "lab" 
  | "market";

export interface SectorNode {
  id: string;
  name: string;
  code: string;
  depthMeters: number;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  type: SectorType;
  threatLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  signalStrength: number; // percentage 0 - 100
  resources: { name: string; amount: number; unit: string }[];
  description: string;
  lore: string;
  connections: string[]; // ids of connected sectors
}

export type MapOverlayMode = "tactical" | "thermal" | "signals";
