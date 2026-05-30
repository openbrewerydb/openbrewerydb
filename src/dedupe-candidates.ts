import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import Papa from "papaparse";
import { Brewery } from "./types";
import { papaParseOptions, headers } from "./config";
import { normalizeAddress, normalizeName } from "./utils/address-normalization";

// ---------------------------------------------------------------------------
// Jaro-Winkler similarity
// ---------------------------------------------------------------------------

function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const maxDist = Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0);

  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(i + maxDist + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3
  );
}

export function jaroWinkler(s1: string, s2: string): number {
  const jaro = jaroSimilarity(s1, s2);
  let prefixLen = 0;
  for (let i = 0; i < Math.min(Math.min(s1.length, s2.length), 4); i++) {
    if (s1[i] === s2[i]) prefixLen++;
    else break;
  }
  return jaro + prefixLen * 0.1 * (1 - jaro);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Generate a stable hash for a candidate pair based on keep and remove IDs.
 * This ensures resolutions remain valid even if candidates are regenerated.
 */
function generateCandidateHash(keepId: string, removeId: string): string {
  const sorted = [keepId, removeId].sort();
  return createHash("sha256").update(sorted.join("|||")).digest("hex").substring(0, 16);
}

export interface DedupCandidate {
  /** Stable hash for this candidate pair (based on keep+remove IDs) */
  hash: string;
  /** Record recommended to keep (higher quality score) */
  keep: Brewery;
  /** Record recommended to remove */
  remove: Brewery;
  /** Jaro-Winkler similarity (0-1) */
  similarity: number;
  /** Why these were matched */
  reason: string;
  /** Similarity-based confidence bucket */
  confidence: "high" | "medium" | "low";
}

export interface Resolution {
  /** Candidate hash this resolution refers to */
  hash: string;
  /** The ID of the record to remove, or null if rejecting the pair */
  removeId: string | null;
  /** The ID of the record to keep */
  keepId: string;
  /** Action taken */
  action: "confirmed" | "rejected" | "skipped";
  /** ISO timestamp */
  resolvedAt: string;
}

// ---------------------------------------------------------------------------
// Quality scoring
// ---------------------------------------------------------------------------

export function qualityScore(b: Brewery): number {
  let score = 0;
  if (b.phone) score += 1;
  if (b.website_url) score += 1;
  if (b.longitude && b.latitude) score += 1;
  if (b.address_2) score += 0.5;
  const nameLen = b.name.length;
  if (nameLen > 10 && nameLen < 60) score += 1;
  if (nameLen >= 60) score += 0.5;
  if (b.id && /^[0-9a-f-]{36}$/i.test(b.id)) score += 2;
  if (/\b(Company|Corporation|Brewing)\b/i.test(b.name)) score += 0.5;
  if (b.name.endsWith(".")) score -= 0.5;
  return score;
}

// ---------------------------------------------------------------------------
// Candidate detection
// ---------------------------------------------------------------------------

export function findDedupCandidates(
  breweries: Brewery[],
  fuzzyThreshold: number = 0.85,
  coordThreshold: number = 0.0005 // ~50m
): DedupCandidate[] {
  const candidates: DedupCandidate[] = [];
  const processedPairs = new Set<string>();

  // Group by normalized address
  const addrGroups = new Map<string, Brewery[]>();
  breweries.forEach((b) => {
    if (!b.address_1) return;
    const normAddr = normalizeAddress(b.address_1);
    const key =
      normAddr +
      "|||" +
      normalizeName(b.city) +
      "|||" +
      normalizeName(b.state_province) +
      "|||" +
      normalizeName(b.country);
    if (!addrGroups.has(key)) addrGroups.set(key, []);
    addrGroups.get(key)!.push(b);
  });

  // Group by rounded coordinates
  const coordGroups = new Map<string, Brewery[]>();
  breweries.forEach((b) => {
    if (!b.longitude || !b.latitude) return;
    const key = b.longitude.toFixed(3) + "," + b.latitude.toFixed(3);
    if (!coordGroups.has(key)) coordGroups.set(key, []);
    coordGroups.get(key)!.push(b);
  });

  function addCandidate(a: Brewery, b: Brewery, similarity: number, reason: string) {
    const scoreA = qualityScore(a);
    const scoreB = qualityScore(b);
    const keep = scoreA >= scoreB ? a : b;
    const remove = scoreA >= scoreB ? b : a;
    const confidence: DedupCandidate["confidence"] =
      similarity >= 0.95 ? "high" : similarity >= 0.90 ? "medium" : "low";
    candidates.push({
      hash: generateCandidateHash(keep.id || keep.name, remove.id || remove.name),
      keep,
      remove,
      similarity: Math.round(similarity * 1000) / 1000,
      reason,
      confidence,
    });
  }

  // Address-matched groups
  addrGroups.forEach((group) => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const normA = normalizeName(a.name);
        const normB = normalizeName(b.name);
        if (normA === normB) continue;
        const pairKey = [a.id || a.name, b.id || b.name].sort().join("||||");
        if (processedPairs.has(pairKey)) continue;

        processedPairs.add(pairKey);
        const sim = jaroWinkler(normA, normB);
        if (sim >= fuzzyThreshold) {
          addCandidate(a, b, sim, "Address match");
        }
      }
    }
  });

  // Coordinate-matched groups
  coordGroups.forEach((group) => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const normA = normalizeName(a.name);
        const normB = normalizeName(b.name);
        if (normA === normB) continue;
        const pairKey = [a.id || a.name, b.id || b.name].sort().join("||||");
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const dist = Math.sqrt(
          (a.longitude! - b.longitude!) ** 2 + (a.latitude! - b.latitude!) ** 2
        );
        if (dist > coordThreshold) continue;

        const sim = jaroWinkler(normA, normB);
        if (sim >= fuzzyThreshold) {
          addCandidate(a, b, sim, "Coordinate proximity");
        }
      }
    }
  });

  candidates.sort((a, b) => b.similarity - a.similarity);
  return candidates;
}

// ---------------------------------------------------------------------------
// I/O helpers
// ---------------------------------------------------------------------------

export function loadCandidates(path: string): DedupCandidate[] {
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

export function saveCandidates(candidates: DedupCandidate[], path: string) {
  writeFileSync(path, JSON.stringify(candidates, null, 2));
}

export function loadResolutions(path: string): Resolution[] {
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveResolutions(resolutions: Resolution[], path: string) {
  writeFileSync(path, JSON.stringify(resolutions, null, 2));
}

// ---------------------------------------------------------------------------
// Generate candidates from breweries.csv
// ---------------------------------------------------------------------------

export function generateCandidatesCsv(
  csvPath: string = join(__dirname, "../breweries.csv"),
  outputPath: string = join(__dirname, "../dedupe-candidates.json"),
  threshold: number = 0.85,
  coordThreshold: number = 0.0005
): DedupCandidate[] {
  const csv = readFileSync(csvPath, { encoding: "utf-8" });
  const breweries = Papa.parse<Brewery>(csv, papaParseOptions).data;
  const candidates = findDedupCandidates(breweries, threshold, coordThreshold);
  saveCandidates(candidates, outputPath);
  return candidates;
}
