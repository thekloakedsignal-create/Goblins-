import { Artifact } from "../types";
import { defaultArtifacts } from "../data/defaultArtifacts";

const STORAGE_KEY = "goblin_mode_artifacts_v1";

export function loadLocalArtifacts(): Artifact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultArtifacts));
      return defaultArtifacts;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return defaultArtifacts;
  } catch (e) {
    console.warn("Failed to load artifacts from localStorage, using defaults", e);
    return defaultArtifacts;
  }
}

export function saveLocalArtifacts(artifacts: Artifact[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(artifacts));
  } catch (e) {
    console.warn("Failed to save artifacts to localStorage", e);
  }
}

/**
 * Lightweight BM25 / token-overlap keyword scoring for RAG retrieval over vault artifacts.
 */
export function retrieveRelevantArtifacts(query: string, artifacts: Artifact[], maxResults = 3): {
  matchedArtifacts: Artifact[];
  ragContextString: string;
} {
  if (!query || !query.trim() || artifacts.length === 0) {
    return { matchedArtifacts: [], ragContextString: "" };
  }

  // Tokenize query words, stripping short stopwords
  const stopWords = new Set(["the", "is", "at", "which", "on", "and", "a", "an", "in", "to", "for", "of", "with", "as", "by", "that", "this", "it", "you", "me", "my", "we", "can", "what", "how", "why", "do", "tell", "about"]);
  const tokens = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2 && !stopWords.has(t));

  if (tokens.length === 0) {
    // If only very short tokens, use all non-empty tokens
    const simpleTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    if (simpleTokens.length === 0) return { matchedArtifacts: [], ragContextString: "" };
  }

  const queryTokens = tokens.length > 0 ? tokens : query.toLowerCase().split(/\s+/);

  const scored = artifacts.map(artifact => {
    let score = 0;
    const titleLower = artifact.title.toLowerCase();
    const descLower = artifact.description.toLowerCase();
    const contentLower = artifact.content.toLowerCase();
    const tagsLower = artifact.tags.map(t => t.toLowerCase()).join(" ");

    for (const token of queryTokens) {
      // Direct title match yields highest weight
      if (titleLower.includes(token)) score += 10;
      // Tag match
      if (tagsLower.includes(token)) score += 7;
      // Description match
      if (descLower.includes(token)) score += 4;
      // Content matches
      const contentMatches = (contentLower.match(new RegExp(token, "g")) || []).length;
      score += Math.min(contentMatches, 5) * 2;
    }

    return { artifact, score };
  });

  // Filter those with meaningful relevance score (>= 8) and sort descending
  const topMatches = scored
    .filter(item => item.score >= 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(item => item.artifact);

  if (topMatches.length === 0) {
    return { matchedArtifacts: [], ragContextString: "" };
  }

  // Build formatted context string
  const ragContextString = topMatches.map((art, idx) => {
    // Truncate long content to ~800 chars for context preservation
    const truncatedContent = art.content.length > 800 
      ? art.content.slice(0, 800) + "... [truncated]"
      : art.content;

    return `--- ARTIFACT #${idx + 1}: "${art.title}" (Type: ${art.type.toUpperCase()}) ---
Tags: ${art.tags.join(", ")}
Summary: ${art.description}
Content/Lore:
${truncatedContent}`;
  }).join("\n\n");

  return {
    matchedArtifacts: topMatches,
    ragContextString
  };
}
