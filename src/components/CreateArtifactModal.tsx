import { useState, useRef } from "react";
import { 
  X, 
  UploadCloud, 
  Image as ImageIcon, 
  FileText, 
  BookOpen, 
  Palette, 
  ShieldAlert, 
  Check, 
  Plus
} from "lucide-react";
import { motion } from "motion/react";
import { Artifact, ArtifactType } from "../types";

interface CreateArtifactModalProps {
  onClose: () => void;
  onSave: (artifact: Omit<Artifact, "id" | "createdAt">) => void;
  playBeep?: (freq?: number, duration?: number, type?: OscillatorType) => void;
}

export default function CreateArtifactModal({
  onClose,
  onSave,
  playBeep
}: CreateArtifactModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ArtifactType>("lore");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const SUGGESTED_TAGS = ["goblincoin", "cave-lore", "scavenge", "art", "lichen", "manifesto", "relic", "history"];

  const handleFileProcess = (file: File) => {
    setError(null);
    playBeep?.(580, 0.08, "triangle");

    // Default title from filename if title is empty
    const cleanFileName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    if (!title.trim()) {
      setTitle(cleanFileName.charAt(0).toUpperCase() + cleanFileName.slice(1));
    }

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setType("art");
        if (!content.trim()) {
          setContent(`Visual artifact record captured from cavern scanner: ${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Treat as text / markdown file
      const reader = new FileReader();
      reader.onloadend = () => {
        const text = reader.result as string;
        setContent(text);
        if (file.name.endsWith(".md") || file.name.endsWith(".txt")) {
          setType("lore");
        } else {
          setType("document");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Artifact title is required");
      return;
    }
    if (!content.trim() && !imageUrl) {
      setError("Please provide either lore text/content or an uploaded image");
      return;
    }

    // Process tags
    const tags = tagsInput
      .split(/[,#\s]+/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    if (tags.length === 0) {
      tags.push(type);
    }

    playBeep?.(750, 0.1, "triangle");

    onSave({
      title: title.trim(),
      type,
      description: description.trim() || title.trim(),
      content: content.trim() || `Visual artifact: ${title.trim()}`,
      imageUrl: imageUrl || undefined,
      tags,
      sizeKb: (content.length + (imageUrl ? imageUrl.length * 0.75 : 0)) / 1024
    });

    onClose();
  };

  const addTag = (tag: string) => {
    const existing = tagsInput.split(/[,#\s]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
    if (!existing.includes(tag)) {
      setTagsInput(prev => prev ? `${prev}, ${tag}` : tag);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#040809] border border-emerald-500/35 rounded-2xl shadow-[0_0_40px_rgba(5,150,105,0.2)] overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-emerald-500/20 bg-black/60">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold text-emerald-200 font-mono tracking-wide">
              DEPOSIT GOBLIN ARTIFACT
            </h2>
          </div>
          <button
            onClick={() => {
              playBeep?.(350, 0.05);
              onClose();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/40 border border-emerald-500/20 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-mono">
              ⚠️ {error}
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-emerald-400 bg-emerald-950/30 scale-[0.99]"
                : "border-emerald-500/30 hover:border-emerald-500/60 bg-black/40 hover:bg-emerald-950/10"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileProcess(file);
              }}
              accept="image/*,.txt,.md,.json"
              className="hidden"
            />
            
            {imageUrl ? (
              <div className="flex items-center justify-center gap-4">
                <div className="relative group">
                  <img src={imageUrl} alt="Preview" className="h-20 w-auto rounded-lg object-contain border border-emerald-500/40 bg-black" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageUrl(null);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-900 border border-red-400 text-red-100 flex items-center justify-center text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-left text-xs font-mono">
                  <p className="text-emerald-300 font-bold">Image Attached</p>
                  <p className="text-emerald-500/60">Click or drop another file to replace</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="w-8 h-8 text-emerald-400/70 animate-bounce" />
                <p className="text-xs font-mono text-emerald-300">
                  <span className="font-bold underline">Click to browse</span> or drag & drop images (.png, .jpg, .webp) or lore files (.txt, .md)
                </p>
                <p className="text-[10px] font-mono text-emerald-500/50">
                  Visual art and text scrolls will be indexed for the Goblin's RAG knowledge retrieval
                </p>
              </div>
            )}
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-mono font-bold text-emerald-400 mb-1.5 uppercase">
              Artifact Classification
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: "lore", label: "Lore / Story", icon: BookOpen },
                { key: "art", label: "Art / Image", icon: Palette },
                { key: "document", label: "Document", icon: FileText },
                { key: "relic", label: "Cave Relic", icon: ShieldAlert },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    playBeep?.(500, 0.03);
                    setType(key as ArtifactType);
                  }}
                  className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center gap-2 justify-center transition-all cursor-pointer ${
                    type === key
                      ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                      : "bg-black/40 border-emerald-500/20 text-emerald-500/60 hover:text-emerald-300 hover:border-emerald-500/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-mono font-bold text-emerald-400 mb-1.5 uppercase">
              Artifact Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., The Lost Map of Sector 4"
              className="w-full h-10 px-3 bg-black/60 border border-emerald-500/30 rounded-xl text-emerald-100 text-sm font-mono placeholder-emerald-800/40 focus:outline-none focus:border-emerald-400"
              required
            />
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-xs font-mono font-bold text-emerald-400 mb-1.5 uppercase">
              Short Summary / Inscription
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., An ancient parchment outlining cave trade agreements..."
              className="w-full h-10 px-3 bg-black/60 border border-emerald-500/30 rounded-xl text-emerald-100 text-sm font-mono placeholder-emerald-800/40 focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Detailed Content / Lore */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono font-bold text-emerald-400 uppercase">
                Lore Records / Markdown Content *
              </label>
              <span className="text-[10px] font-mono text-emerald-500/50">Markdown supported</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="# Deep Cavern Lore&#10;&#10;Write the stories, history, notes, or poem here. The Goblin will scan this during chats to cite it as underground lore..."
              className="w-full p-3 bg-black/60 border border-emerald-500/30 rounded-xl text-emerald-100 text-sm font-mono placeholder-emerald-800/40 focus:outline-none focus:border-emerald-400 leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-mono font-bold text-emerald-400 mb-1.5 uppercase">
              Index Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="goblincoin, caves, deep-relic"
              className="w-full h-10 px-3 bg-black/60 border border-emerald-500/30 rounded-xl text-emerald-100 text-sm font-mono placeholder-emerald-800/40 focus:outline-none focus:border-emerald-400 mb-2"
            />
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="text-emerald-500/50">Suggested:</span>
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="px-2 py-0.5 rounded bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-500/20 text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                playBeep?.(350, 0.05);
                onClose();
              }}
              className="px-4 py-2 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs font-mono hover:bg-emerald-950/30 cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl glowing-btn-primary text-xs font-mono font-bold flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>DEPOSIT TO VAULT</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
