import { SectorNode, GoblinAgent } from "../types";

export const DEFAULT_SECTORS: SectorNode[] = [
  {
    id: "sec-core",
    name: "Bedrock Central Core",
    code: "SEC-01",
    depthMeters: 450,
    x: 50,
    y: 48,
    type: "core",
    threatLevel: "LOW",
    signalStrength: 98,
    resources: [
      { name: "Raw Bandwidth", amount: 840, unit: "Tb/s" },
      { name: "Geothermal Watts", amount: 1250, unit: "kW" }
    ],
    description: "The beating cybernetic heart of Goblin territory. Massive optic fibers converge into ancient obsidian monoliths.",
    lore: "Legend holds that the first goblin found a discarded military mainframe here in 2004 and kicked it until it booted into peer-to-peer bedrock mode.",
    connections: ["sec-scrap", "sec-treasury", "sec-bio", "sec-aqueduct", "sec-lab"]
  },
  {
    id: "sec-scrap",
    name: "Scrap-Heap Substation",
    code: "SEC-02",
    depthMeters: 320,
    x: 24,
    y: 32,
    type: "scrap",
    threatLevel: "MODERATE",
    signalStrength: 76,
    resources: [
      { name: "Salvaged Copper", amount: 480, unit: "kg" },
      { name: "Recycled Silicon", amount: 190, unit: "wafers" }
    ],
    description: "Towering junk-pyramids of server chassis, burnt power supplies, and tangle-vines of braided Ethernet.",
    lore: "Every scrap goblin cuts their teeth here learning to identify pure gold-plated connectors by taste.",
    connections: ["sec-core", "sec-lab", "sec-bio"]
  },
  {
    id: "sec-treasury",
    name: "Shinies Treasury & Mint",
    code: "SEC-03",
    depthMeters: 600,
    x: 74,
    y: 28,
    type: "treasury",
    threatLevel: "LOW",
    signalStrength: 92,
    resources: [
      { name: "GoblinCoin Reserve", amount: 94820, unit: "GC" },
      { name: "Shiny Prisms", amount: 310, unit: "crystals" }
    ],
    description: "Guarded by three-ton hydraulic blast gates. Home of the physical press stamping real GoblinCoins into brass and bismuth.",
    lore: "Rule #1 of the treasury: One goblin may look, two goblins may count, but three goblins will definitely try to bite the coins to test density.",
    connections: ["sec-core", "sec-perimeter"]
  },
  {
    id: "sec-bio",
    name: "Luminescent Spore Groves",
    code: "SEC-04",
    depthMeters: 210,
    x: 20,
    y: 72,
    type: "bio",
    threatLevel: "LOW",
    signalStrength: 64,
    resources: [
      { name: "Bioluminescent Spores", amount: 620, unit: "liters" },
      { name: "Fermented Battery-Juice", amount: 140, unit: "casks" }
    ],
    description: "Damp cavern roof festooned with glowing emerald fungi that feed on stray radio frequencies and heat sinks.",
    lore: "The techno-alchemists distill a neon drink from these mushrooms that allows goblins to see Wi-Fi signals in the dark.",
    connections: ["sec-core", "sec-scrap", "sec-aqueduct"]
  },
  {
    id: "sec-aqueduct",
    name: "The Deep Siphon Aqueduct",
    code: "SEC-05",
    depthMeters: 780,
    x: 48,
    y: 84,
    type: "aqueduct",
    threatLevel: "HIGH",
    signalStrength: 52,
    resources: [
      { name: "Sub-Zero Coolant", amount: 9800, unit: "gal" },
      { name: "Heavy Minerals", amount: 340, unit: "kg" }
    ],
    description: "An abyss canal where icy subterranean water rushes over overclocked transformer banks before plunging into the fault.",
    lore: "Echoes here sound like dial-up modem tones. Scouts often drop breadcrumbs and waterproof hydro-phones to map rogue surface leaks.",
    connections: ["sec-core", "sec-bio", "sec-market"]
  },
  {
    id: "sec-perimeter",
    name: "Cyber-Warren Outpost",
    code: "SEC-06",
    depthMeters: 150,
    x: 82,
    y: 68,
    type: "perimeter",
    threatLevel: "CRITICAL",
    signalStrength: 85,
    resources: [
      { name: "Intercepted Feeds", amount: 54, unit: "streams" },
      { name: "Jamming Chaff", amount: 88, unit: "canisters" }
    ],
    description: "High-altitude bunker perched just beneath human storm drains. Armed with parabolic dish arrays and tripwire laser alarms.",
    lore: "When surface humans lose their cellular reception, 90% of the time it's because this warren of creature scouts gnawed through the trunk insulation to make warm moss bedding.",
    connections: ["sec-treasury", "sec-market"]
  },
  {
    id: "sec-lab",
    name: "Skunkworks Demolitions Lab",
    code: "SEC-07",
    depthMeters: 510,
    x: 35,
    y: 18,
    type: "lab",
    threatLevel: "HIGH",
    signalStrength: 70,
    resources: [
      { name: "Capacitor Spark Coils", amount: 160, unit: "units" },
      { name: "Mini-Drone Parts", amount: 45, unit: "frames" }
    ],
    description: "Smoky workshop rattling with miniature jet engines, magnetized catapults, and overclocked soldering irons.",
    lore: "No safety goggles here, only welded blast shields and a sign that reads: 'If it doesn't spark, you didn't connect enough 9V batteries.'",
    connections: ["sec-core", "sec-scrap"]
  },
  {
    id: "sec-market",
    name: "Black-Circuit Bazaar",
    code: "SEC-08",
    depthMeters: 390,
    x: 70,
    y: 85,
    type: "market",
    threatLevel: "MODERATE",
    signalStrength: 88,
    resources: [
      { name: "Flash Cartridges", amount: 1250, unit: "carts" },
      { name: "Roasted Grubs", amount: 73, unit: "skewers" }
    ],
    description: "Neon-lit stalls crowded under corrugated aluminum ceilings. Goblins barter memory sticks, copper rings, and hot noodles.",
    lore: "Strictly cash or GoblinCoin. Anyone attempting to pay with fiat paper is forced to wash the community heatsinks.",
    connections: ["sec-perimeter", "sec-aqueduct"]
  }
];

export const INITIAL_AGENTS: GoblinAgent[] = [
  {
    id: "agent-1",
    name: "Glint-Eye",
    callsign: "SCOUT-01",
    role: "scout",
    status: "IDLE",
    sectorId: "sec-aqueduct",
    x: 48,
    y: 84,
    avatarEmoji: "🧌",
    tagline: "Subterranean reconnaissance and external signal scanning.",
    specialization: "Field Intelligence, Web Intercept, Deep Research",
    capabilities: ["Signal Intercept", "Surface Crawler Recon", "Threat Briefing"],
    completedJobsCount: 19,
    currentTask: "Awaiting job dispatch",
    taskProgress: 0,
    logs: [
      { id: "l1", timestamp: "18:42", message: "Conduit hydro-probe calibrated and synchronized.", type: "info" },
      { id: "l2", timestamp: "18:47", message: "Job #JOB-881 deliverable archived to knowledge vault.", type: "job" }
    ]
  },
  {
    id: "agent-2",
    name: "Bog-Spark",
    callsign: "SYNTH-09",
    role: "alchemist",
    status: "IDLE",
    sectorId: "sec-bio",
    x: 20,
    y: 72,
    avatarEmoji: "🧪",
    tagline: "Data transformation, schema synthesis, and telemetry parsing.",
    specialization: "Data Formatting, JSON Extraction, Markdown Synthesis",
    capabilities: ["Schema Validation", "Telemetry Distillation", "Report Formulation"],
    completedJobsCount: 24,
    currentTask: "Awaiting job dispatch",
    taskProgress: 0,
    logs: [
      { id: "l4", timestamp: "18:30", message: "Batch dataset ingestion completed with 100% parity.", type: "info" },
      { id: "l5", timestamp: "18:38", message: "Job #JOB-874 schema extraction finalized.", type: "job" }
    ]
  },
  {
    id: "agent-3",
    name: "Rust-Tooth",
    callsign: "SCRAP-CHIEF",
    role: "scrapper",
    status: "IDLE",
    sectorId: "sec-scrap",
    x: 24,
    y: 32,
    avatarEmoji: "⚙️",
    tagline: "Code scrap refactoring, script optimization, and architectural auditing.",
    specialization: "Code Review, Script Deconstruction, Performance Scraping",
    capabilities: ["Code Refactoring", "Dependency Auditing", "Memory Scrap Stripping"],
    completedJobsCount: 31,
    currentTask: "Awaiting job dispatch",
    taskProgress: 0,
    logs: [
      { id: "l6", timestamp: "18:15", message: "Extracted reusable utility modules from legacy script scrap.", type: "info" },
      { id: "l7", timestamp: "18:22", message: "Job #JOB-869 code optimization report delivered.", type: "job" }
    ]
  },
  {
    id: "agent-4",
    name: "Bit-Goblin",
    callsign: "CIPHER-00",
    role: "hacker",
    status: "IDLE",
    sectorId: "sec-core",
    x: 50,
    y: 48,
    avatarEmoji: "👾",
    tagline: "Cryptographic verification, threat modeling, and network security review.",
    specialization: "Cybersecurity Audits, Threat Modeling, Exploit Mitigation",
    capabilities: ["Vulnerability Assessment", "Firewall Configuration", "Zero-Trust Audits"],
    completedJobsCount: 42,
    currentTask: "Awaiting job dispatch",
    taskProgress: 0,
    logs: [
      { id: "l8", timestamp: "18:40", message: "Bedrock firewall rules verified against penetration probes.", type: "info" },
      { id: "l9", timestamp: "18:43", message: "Job #JOB-879 vulnerability audit delivered.", type: "job" }
    ]
  },
  {
    id: "agent-5",
    name: "Shiny-Paw",
    callsign: "MINT-LORD",
    role: "treasurer",
    status: "IDLE",
    sectorId: "sec-treasury",
    x: 74,
    y: 28,
    avatarEmoji: "💰",
    tagline: "Resource accounting, token budgeting, and cost optimization.",
    specialization: "Compute Accounting, Token Usage Analysis, Budget Audits",
    capabilities: ["Token Metering", "Cloud Cost Optimization", "Ledger Reconciliations"],
    completedJobsCount: 16,
    currentTask: "Awaiting job dispatch",
    taskProgress: 0,
    logs: [
      { id: "l10", timestamp: "18:20", message: "Token consumption ledger audit verified.", type: "info" },
      { id: "l11", timestamp: "18:35", message: "Job #JOB-865 compute efficiency report submitted.", type: "job" }
    ]
  },
  {
    id: "agent-6",
    name: "Grizzle-Jaw",
    callsign: "ENFORCE-44",
    role: "enforcer",
    status: "IDLE",
    sectorId: "sec-perimeter",
    x: 82,
    y: 68,
    avatarEmoji: "🛡️",
    tagline: "Rule enforcement, validation guarantees, and input guardrails.",
    specialization: "Validation Safeguards, Policy Enforcement, Boundary Defense",
    capabilities: ["Input Sanitization", "Rate Limit Guardrails", "Policy Compliance"],
    completedJobsCount: 22,
    currentTask: "Awaiting job dispatch",
    taskProgress: 0,
    logs: [
      { id: "l12", timestamp: "18:10", message: "Input validation boundaries synchronized across endpoints.", type: "info" },
      { id: "l13", timestamp: "18:25", message: "Job #JOB-860 guardrail stress test verified.", type: "job" }
    ]
  },
  {
    id: "agent-7",
    name: "Fizzy-Crank",
    callsign: "SPARK-X",
    role: "gadgeteer",
    status: "IDLE",
    sectorId: "sec-lab",
    x: 35,
    y: 18,
    avatarEmoji: "💥",
    tagline: "Automation pipelines, workflow scripting, and tooling integration.",
    specialization: "Automation Tooling, CI/CD Scripting, Workflow Orchestration",
    capabilities: ["Shell Scripting", "Tooling Architecture", "Pipeline Optimization"],
    completedJobsCount: 28,
    currentTask: "Awaiting job dispatch",
    taskProgress: 0,
    logs: [
      { id: "l14", timestamp: "18:18", message: "Automated test harnesses executed with zero failures.", type: "info" },
      { id: "l15", timestamp: "18:32", message: "Job #JOB-872 tooling pipeline delivered.", type: "job" }
    ]
  }
];
