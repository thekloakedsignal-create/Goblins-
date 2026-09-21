import { useState } from "react";
import { 
  X, 
  Copy, 
  Check, 
  MessageSquare, 
  Calendar, 
  Tag, 
  BookOpen, 
  Palette, 
  FileText, 
  ShieldAlert,
  Sparkles,
  Lock
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "motion/react";
import { Artifact } from "../types";

interface ArtifactDetailModalProps {
  artifact: Artifact;
  onClose: () => void;
  onAskGoblin: (artifact: Artifact) => void;
  playBeep?: (freq?: number, duration?: number, type?: OscillatorType) => void;
}

export default function ArtifactDetailModal({
  artifact,
  onClose,
  onAskGoblin,
  playBeep
}: ArtifactDetailModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    playBeep?.(800, 0.05);
    const textToCopy = `# ${artifact.title}\n\n${artifact.description}\n\n${artifact.content}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeIcon = () => {
    switch (artifact.type) {
      case "art":
        return <Palette className="w-4 h-4 text-purple-400" />;
      case "lore":
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case "document":
        return <FileText className="w-4 h-4 text-blue-400" />;
      case "relic":
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getTypeColor = () => {
    switch (artifact.type) {
      case "art":
        return "bg-purple-950/40 text-purple-300 border-purple-500/40";
      case "lore":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-500/40";
      case "document":
        return "bg-blue-950/40 text-blue-300 border-blue-500/40";
      case "relic":
        return "bg-amber-950/40 text-amber-300 border-amber-500/40";
      default:
        return "bg-emerald-950/40 text-emerald-300 border-emerald-500/40";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#040809] border border-emerald-500/35 rounded-2xl shadow-[0_0_40px_rgba(5,150,105,0.2)] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-emerald-500/20 bg-black/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono uppercase font-bold border flex items-center gap-1.5 shrink-0 ${getTypeColor()}`}>
              {getTypeIcon()}
              <span>{artifact.type}</span>
            </span>
            <h2 className="text-base sm:text-lg font-bold text-emerald-100 font-mono tracking-wide truncate">
              {artifact.title}
            </h2>
          </div>
          
          <button
            onClick={() => {
              playBeep?.(350, 0.05);
              onClose();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/40 border border-emerald-500/20 transition-all cursor-pointer"
            title="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          
          {/* Visual Showcase (if image attached) */}
          {artifact.imageUrl && (
            <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-black/80 flex items-center justify-center shadow-lg p-2 max-h-96">
              <img 
                src={artifact.imageUrl} 
                alt={artifact.title} 
                className="max-h-88 w-auto max-w-full rounded-lg object-contain" 
              />
            </div>
          )}

          {/* Description Summary */}
          {artifact.description && (
            <div className="p-3.5 rounded-xl bg-emerald-950/15 border border-emerald-500/20 text-emerald-300 text-sm font-sans italic">
              "{artifact.description}"
            </div>
          )}

          {/* Main Markdown Lore / Content */}
          <div className="prose prose-invert max-w-none text-sm leading-relaxed text-emerald-100/90 font-sans break-words [overflow-wrap:anywhere]">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed text-emerald-100/90 font-sans">{children}</p>,
                h1: ({ children }) => <h1 className="text-lg font-bold text-emerald-300 mt-4 mb-2 font-mono uppercase border-b border-emerald-500/30 pb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold text-emerald-300 mt-3 mb-2 font-mono uppercase">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold text-emerald-300 mt-2 mb-1 font-mono uppercase">{children}</h3>,
                code: ({ children }) => (
                  <code className="bg-black border border-emerald-500/30 text-emerald-300 px-2 py-1 rounded font-mono text-xs block my-2 overflow-x-auto whitespace-pre-wrap select-all">
                    {children}
                  </code>
                ),
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-3 pl-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-3 pl-2">{children}</ol>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-emerald-400 pl-3 my-2 italic text-emerald-300/80">{children}</blockquote>,
              }}
            >
              {artifact.content}
            </ReactMarkdown>
          </div>

          {/* Tags & Metadata */}
          <div className="pt-4 border-t border-emerald-500/15 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-emerald-500/70">
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              {artifact.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/25 text-emerald-300 text-[11px]">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(artifact.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </span>
              {artifact.sizeKb && (
                <span>{artifact.sizeKb.toFixed(1)} KB</span>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-emerald-500/20 bg-black/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/30 border border-emerald-500/25 text-emerald-400 text-xs font-mono">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>PERMANENT VAULT RECORD</span>
            </div>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg border border-emerald-500/25 text-emerald-300 hover:text-emerald-100 hover:bg-emerald-950/30 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "COPIED" : "COPY LORE"}</span>
            </button>
          </div>

          <button
            onClick={() => {
              playBeep?.(650, 0.08);
              onAskGoblin(artifact);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-black font-bold font-mono text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 fill-current" />
            <span>ASK GOBLIN ABOUT THIS</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
}
