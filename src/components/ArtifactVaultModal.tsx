import { useState, useMemo } from "react";
import { 
  X, 
  Search, 
  Plus, 
  BookOpen, 
  Palette, 
  FileText, 
  ShieldAlert, 
  Sparkles, 
  Eye, 
  Archive,
  Cpu,
  Layers,
  CheckCircle2,
  XCircle,
  Tag
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Artifact, ArtifactType } from "../types";
import ArtifactDetailModal from "./ArtifactDetailModal";
import CreateArtifactModal from "./CreateArtifactModal";

interface ArtifactVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifacts: Artifact[];
  onAddArtifact: (artifact: Omit<Artifact, "id" | "createdAt">) => void;
  onAskGoblin: (artifact: Artifact) => void;
  ragEnabled: boolean;
  onToggleRag: () => void;
  playBeep?: (freq?: number, duration?: number, type?: OscillatorType) => void;
}

export default function ArtifactVaultModal({
  isOpen,
  onClose,
  artifacts,
  onAddArtifact,
  onAskGoblin,
  ragEnabled,
  onToggleRag,
  playBeep
}: ArtifactVaultModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [inspectedArtifact, setInspectedArtifact] = useState<Artifact | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Filter artifacts
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter(art => {
      // Type filter
      if (selectedType !== "all" && art.type !== selectedType) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = art.title.toLowerCase().includes(q);
        const matchDesc = art.description.toLowerCase().includes(q);
        const matchContent = art.content.toLowerCase().includes(q);
        const matchTags = art.tags.some(t => t.toLowerCase().includes(q));
        return matchTitle || matchDesc || matchContent || matchTags;
      }
      return true;
    });
  }, [artifacts, selectedType, searchQuery]);

  // Counts by type
  const counts = useMemo(() => {
    return {
      all: artifacts.length,
      lore: artifacts.filter(a => a.type === "lore").length,
      art: artifacts.filter(a => a.type === "art").length,
      document: artifacts.filter(a => a.type === "document").length,
      relic: artifacts.filter(a => a.type === "relic").length,
    };
  }, [artifacts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-5xl h-[94vh] flex flex-col bg-[#030607] border border-emerald-500/35 rounded-2xl shadow-[0_0_50px_rgba(5,150,105,0.25)] overflow-hidden relative"
      >
        {/* Top Vault Header */}
        <header className="shrink-0 border-b border-emerald-500/20 bg-black/80 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-widest text-emerald-200 font-mono uppercase">
                  THE GOBLIN ARTIFACTS VAULT
                </h1>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                  {artifacts.length} DEPOSITED
                </span>
              </div>
              <p className="text-[11px] text-emerald-500/60 font-mono">
                RAG repository of cavern lore, clandestine art, and peer relics
              </p>
            </div>
          </div>

          {/* RAG Toggle & Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* RAG Retrieval Status Switch */}
            <button
              onClick={() => {
                playBeep?.(600, 0.05);
                onToggleRag();
              }}
              className={`h-9 px-3 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                ragEnabled
                  ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                  : "bg-black/50 border-emerald-900/50 text-emerald-600/50 hover:text-emerald-500"
              }`}
              title="Toggle RAG retrieval: When enabled, Goblin searches these artifacts to answer user questions"
            >
              <Cpu className={`w-3.5 h-3.5 ${ragEnabled ? "animate-pulse text-emerald-400" : ""}`} />
              <span className="hidden sm:inline">RAG RETRIEVAL:</span>
              <span className={ragEnabled ? "text-emerald-300" : "text-emerald-700"}>
                {ragEnabled ? "ONLINE" : "DISABLED"}
              </span>
            </button>

            {/* Add Artifact Button */}
            <button
              onClick={() => {
                playBeep?.(700, 0.05);
                setIsCreating(true);
              }}
              className="h-9 px-3.5 rounded-xl glowing-btn-primary text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">DEPOSIT ARTIFACT</span>
              <span className="sm:hidden">DEPOSIT</span>
            </button>

            {/* Close Vault Button */}
            <button
              onClick={() => {
                playBeep?.(350, 0.05);
                onClose();
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/40 border border-emerald-500/25 transition-all cursor-pointer"
              title="Close Vault"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Filter and Search Toolbar */}
        <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-emerald-500/15 bg-black/40 flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {[
              { key: "all", label: "ALL", icon: Layers, count: counts.all },
              { key: "lore", label: "LORE", icon: BookOpen, count: counts.lore },
              { key: "art", label: "ART & VISUALS", icon: Palette, count: counts.art },
              { key: "document", label: "DOCUMENTS", icon: FileText, count: counts.document },
              { key: "relic", label: "RELICS", icon: ShieldAlert, count: counts.relic },
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => {
                  playBeep?.(480, 0.03);
                  setSelectedType(key);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  selectedType === key
                    ? "bg-emerald-950/50 border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                    : "bg-black/30 border-transparent text-emerald-500/60 hover:text-emerald-300 hover:bg-emerald-950/20"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-black/50 text-emerald-400/80">
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-emerald-500/50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lore, tags, art..."
              className="w-full h-8 pl-8 pr-3 bg-black/60 border border-emerald-500/25 rounded-lg text-xs font-mono text-emerald-100 placeholder-emerald-800/40 focus:outline-none focus:border-emerald-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500/60 hover:text-emerald-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Main Vault Gallery / Grid View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#040708]/90">
          {filteredArtifacts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-emerald-500/20 rounded-2xl">
              <Archive className="w-10 h-10 text-emerald-500/30 mb-3" />
              <p className="text-sm font-mono text-emerald-300 font-bold mb-1">
                No artifacts discovered in this cavern sector
              </p>
              <p className="text-xs font-mono text-emerald-500/50 max-w-sm mb-4">
                {searchQuery
                  ? "No records matched your search query. Try broadening your keywords."
                  : "The vault contains no artifacts in this category yet. Deposit your own lore or artwork above!"}
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 rounded-xl glowing-btn-primary text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>DEPOSIT FIRST ARTIFACT</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredArtifacts.map((art) => {
                const isArt = art.type === "art" || Boolean(art.imageUrl);
                return (
                  <motion.div
                    key={art.id}
                    layoutId={`artifact-card-${art.id}`}
                    whileHover={{ y: -3, scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      playBeep?.(500, 0.04);
                      setInspectedArtifact(art);
                    }}
                    className="group flex flex-col bg-black/50 border border-emerald-500/20 hover:border-emerald-400/60 rounded-xl overflow-hidden cursor-pointer transition-all shadow-md hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  >
                    {/* Visual Preview Header if image exists */}
                    {art.imageUrl ? (
                      <div className="h-44 w-full bg-black/90 relative overflow-hidden border-b border-emerald-500/15 flex items-center justify-center group-hover:brightness-110 transition-all">
                        <img
                          src={art.imageUrl}
                          alt={art.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300 uppercase backdrop-blur-sm">
                          {art.type}
                        </span>
                      </div>
                    ) : (
                      <div className="h-24 w-full bg-gradient-to-br from-emerald-950/20 to-black relative overflow-hidden border-b border-emerald-500/15 p-3 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300 uppercase">
                            {art.type}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-500/50">
                            {new Date(art.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400/40 text-[11px] font-mono">
                          {art.type === "lore" && <BookOpen className="w-3.5 h-3.5" />}
                          {art.type === "document" && <FileText className="w-3.5 h-3.5" />}
                          {art.type === "relic" && <ShieldAlert className="w-3.5 h-3.5" />}
                          <span className="uppercase tracking-wider">SCROLL RECORD</span>
                        </div>
                      </div>
                    )}

                    {/* Card Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-emerald-100 font-mono tracking-wide group-hover:text-emerald-300 transition-colors line-clamp-1 mb-1.5">
                          {art.title}
                        </h3>
                        <p className="text-xs text-emerald-500/70 font-sans line-clamp-2 leading-relaxed mb-3">
                          {art.description || art.content.slice(0, 100)}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-emerald-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-1 overflow-hidden">
                          {art.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/30 text-emerald-400/80 border border-emerald-500/15 truncate">
                              #{t}
                            </span>
                          ))}
                          {art.tags.length > 2 && (
                            <span className="text-[9px] font-mono text-emerald-500/40">
                              +{art.tags.length - 2}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <Eye className="w-3.5 h-3.5" />
                          <span>OPEN</span>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vault Footer Status Bar */}
        <footer className="shrink-0 px-4 sm:px-6 py-2.5 border-t border-emerald-500/15 bg-black/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-emerald-500/60">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              {ragEnabled ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-emerald-700" />
              )}
              <span>RAG Knowledge Grounding: {ragEnabled ? "Active across chats" : "Standby"}</span>
            </span>
          </div>
          <div>
            <span>Showing {filteredArtifacts.length} of {artifacts.length} Vault Artifacts</span>
          </div>
        </footer>

        {/* Sub-Modals */}
        <AnimatePresence>
          {inspectedArtifact && (
            <ArtifactDetailModal
              artifact={inspectedArtifact}
              onClose={() => setInspectedArtifact(null)}
              onAskGoblin={(art) => {
                onAskGoblin(art);
                setInspectedArtifact(null);
                onClose();
              }}
              playBeep={playBeep}
            />
          )}

          {isCreating && (
            <CreateArtifactModal
              onClose={() => setIsCreating(false)}
              onSave={onAddArtifact}
              playBeep={playBeep}
            />
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
