import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import { Brewery } from "./types";
import { papaParseOptions } from "./config";
import { normalizeAddress, normalizeName } from "./utils/address-normalization";

// ---------------------------------------------------------------------------
// Jaro-Winkler similarity
// ---------------------------------------------------------------------------

/**
 * Jaro similarity between two strings.
 * Returns a value between 0 (no similarity) and 1 (identical).
 */
function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const maxDist = Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0);

  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
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

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3;

  return jaro;
}

/**
 * Jaro-Winkler similarity — boosts the Jaro score for common prefixes.
 * Returns a value between 0 (no similarity) and 1 (identical).
 */
function jaroWinkler(s1: string, s2: string): number {
  const jaro = jaroSimilarity(s1, s2);

  // Find common prefix (max 4 chars)
  let prefixLen = 0;
  for (let i = 0; i < Math.min(Math.min(s1.length, s2.length), 4); i++) {
    if (s1[i] === s2[i]) prefixLen++;
    else break;
  }

  // Winkler scaling factor (standard = 0.1, max boost = 0.25)
  return jaro + prefixLen * 0.1 * (1 - jaro);
}

// ---------------------------------------------------------------------------
// Analysis types
// ---------------------------------------------------------------------------

interface FieldCompleteness {
  field: string;
  filled: number;
  total: number;
  pct: number;
}

interface DuplicateGroup {
  key: string;
  count: number;
  breweries: { name: string; city: string; state_province: string; country: string; brewery_type: string }[];
}

interface AddressFormatStats {
  total: number;
  missingGeo: number;
  hasSuiteUnit: number;
  abbreviationVariants: Record<string, { full: number; abbreviated: number }>;
  samples: string[];
}

interface FuzzyDup {
  name1: string;
  name2: string;
  address: string;
  city: string;
  state_province: string;
  country: string;
  type1: string;
  type2: string;
  similarity: number;
  matchReason: string;
}

interface DataAnalysis {
  overview: {
    totalBreweries: number;
    countries: number;
    generatedAt: string;
  };
  completeness: {
    totalPct: number;
    byField: FieldCompleteness[];
  };
  byCountry: Record<string, number>;
  byType: Record<string, number>;
  duplicates: {
    exactNameDups: { count: number; top: DuplicateGroup[] };
    exactAddressDups: { count: number; top: DuplicateGroup[] };
    normalizedAddressDups: { count: number; top: DuplicateGroup[] };
    exactCoordDups: { count: number; top: DuplicateGroup[] };
    fuzzyDups: { count: number; groups: FuzzyDup[] };
  };
  addressAnalysis: Record<string, AddressFormatStats>;
}

// ---------------------------------------------------------------------------
// Main analysis
// ---------------------------------------------------------------------------

function analyze(breweries: Brewery[]): DataAnalysis {
  const total = breweries.length;
  const generatedAt = new Date().toISOString();

  // -- Completeness --
  const fields = Object.keys(breweries[0]).filter((f) => f !== "id") as (keyof Brewery)[];
  const byField: FieldCompleteness[] = fields.map((field) => {
    const filled = breweries.filter((b) => b[field] !== null && b[field] !== "").length;
    return { field, filled, total, pct: Math.round((filled / total) * 1000) / 10 };
  });
  const totalFilled = byField.reduce((sum, f) => sum + f.filled, 0);
  const totalPct = Math.round((totalFilled / (fields.length * total)) * 1000) / 10;

  // -- By country / type --
  const byCountry: Record<string, number> = {};
  const byType: Record<string, number> = {};
  breweries.forEach((b) => {
    byCountry[b.country] = (byCountry[b.country] || 0) + 1;
    byType[b.brewery_type] = (byType[b.brewery_type] || 0) + 1;
  });

  // -- Exact name duplicates --
  const nameMap = new Map<string, DuplicateGroup["breweries"]>();
  breweries.forEach((b) => {
    const key = normalizeName(b.name);
    if (!key) return;
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key)!.push({ name: b.name, city: b.city, state_province: b.state_province, country: b.country, brewery_type: b.brewery_type });
  });
  const exactNameDups = [...nameMap.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([key, breweries]) => ({ key, count: breweries.length, breweries }))
    .sort((a, b) => b.count - a.count);

  // -- Exact address duplicates (raw address_1 + city + state + country) --
  const addrMap = new Map<string, DuplicateGroup["breweries"]>();
  breweries.forEach((b) => {
    if (!b.address_1) return;
    const key = [b.address_1, b.city, b.state_province, b.country].map((v) => normalizeName(v)).join("|||");
    if (!addrMap.has(key)) addrMap.set(key, []);
    addrMap.get(key)!.push({ name: b.name, city: b.city, state_province: b.state_province, country: b.country, brewery_type: b.brewery_type });
  });
  const exactAddrDups = [...addrMap.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([key, breweries]) => ({ key, count: breweries.length, breweries }))
    .sort((a, b) => b.count - a.count);

  // -- Normalized address duplicates --
  interface NormAddrEntry {
    original: string;
    breweries: DuplicateGroup["breweries"];
  }
  const normAddrMap = new Map<string, NormAddrEntry>();
  breweries.forEach((b) => {
    if (!b.address_1) return;
    const norm = normalizeAddress(b.address_1);
    const key = norm + "|||" + normalizeName(b.city) + "|||" + normalizeName(b.state_province) + "|||" + normalizeName(b.country);
    if (!normAddrMap.has(key)) normAddrMap.set(key, { original: b.address_1, breweries: [] });
    normAddrMap.get(key)!.breweries.push({ name: b.name, city: b.city, state_province: b.state_province, country: b.country, brewery_type: b.brewery_type });
  });
  const normAddrDups = [...normAddrMap.entries()]
    .filter(([, v]) => {
      const names = new Set(v.breweries.map((r) => normalizeName(r.name)));
      return names.size > 1;
    })
    .map(([key, v]) => ({ key: v.original, count: v.breweries.length, breweries: v.breweries }))
    .sort((a, b) => b.count - a.count);

  // -- Exact coordinate duplicates --
  const coordMap = new Map<string, DuplicateGroup["breweries"]>();
  breweries.forEach((b) => {
    if (!b.longitude || !b.latitude) return;
    const key = b.longitude.toFixed(6) + "," + b.latitude.toFixed(6);
    if (!coordMap.has(key)) coordMap.set(key, []);
    coordMap.get(key)!.push({ name: b.name, city: b.city, state_province: b.state_province, country: b.country, brewery_type: b.brewery_type });
  });
  const exactCoordDups = [...coordMap.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([key, breweries]) => ({ key, count: breweries.length, breweries }))
    .sort((a, b) => b.count - a.count);

  // -- Fuzzy duplicate detection --
  // Group by normalized address, then run Jaro-Winkler on names within each group
  const fuzzyDups: FuzzyDup[] = [];
  const FUZZY_THRESHOLD = 0.85;

  // Build address-based groups (only for records with addresses)
  const fuzzyAddrGroups = new Map<string, Brewery[]>();
  breweries.forEach((b) => {
    if (!b.address_1) return;
    const normAddr = normalizeAddress(b.address_1);
    const key = normAddr + "|||" + normalizeName(b.city) + "|||" + normalizeName(b.state_province) + "|||" + normalizeName(b.country);
    if (!fuzzyAddrGroups.has(key)) fuzzyAddrGroups.set(key, []);
    fuzzyAddrGroups.get(key)!.push(b);
  });

  // Also build lat/lng groups for records that might have coordinates but fuzzy addresses
  const fuzzyCoordGroups = new Map<string, Brewery[]>();
  breweries.forEach((b) => {
    if (!b.longitude || !b.latitude || !b.address_1) return;
    // Round to 4 decimal places (~11m precision) to catch near-identical coordinates
    const key = b.longitude.toFixed(4) + "," + b.latitude.toFixed(4);
    if (!fuzzyCoordGroups.has(key)) fuzzyCoordGroups.set(key, []);
    fuzzyCoordGroups.get(key)!.push(b);
  });
  // Avoid re-processing groups already found by address
  const processedPairs = new Set<string>();

  // Process address-matched groups
  fuzzyAddrGroups.forEach((group) => {
    // Only care about groups with multiple distinct names
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const normA = normalizeName(a.name);
        const normB = normalizeName(b.name);
        // Skip identical names (already caught by exact name dedup)
        if (normA === normB) continue;
        // Avoid duplicate pair checking
        const pairKey = [a.id || a.name, b.id || b.name].sort().join("||||");
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const similarity = jaroWinkler(normA, normB);
        if (similarity >= FUZZY_THRESHOLD) {
          fuzzyDups.push({
            name1: a.name,
            name2: b.name,
            address: a.address_1 || "(missing)",
            city: a.city,
            state_province: a.state_province,
            country: a.country,
            type1: a.brewery_type,
            type2: b.brewery_type,
            similarity: Math.round(similarity * 1000) / 1000,
            matchReason: "Normalized address match + fuzzy name similarity",
          });
        }
      }
    }
  });

  // Process coordinate-matched groups (catch cases where address text differs slightly
  // but coordinates place them at the same spot)
  fuzzyCoordGroups.forEach((group) => {
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

        // Only flag if names are somewhat similar
        const similarity = jaroWinkler(normA, normB);
        if (similarity >= FUZZY_THRESHOLD) {
          fuzzyDups.push({
            name1: a.name,
            name2: b.name,
            address: a.address_1 || "(missing)",
            city: a.city,
            state_province: a.state_province,
            country: a.country,
            type1: a.brewery_type,
            type2: b.brewery_type,
            similarity: Math.round(similarity * 1000) / 1000,
            matchReason: "Coordinate proximity (~11m) + fuzzy name similarity",
          });
        }
      }
    }
  });

  // Sort by similarity descending
  fuzzyDups.sort((a, b) => b.similarity - a.similarity);

  // -- Address format analysis by country --
  const addressAnalysis: Record<string, AddressFormatStats> = {};
  const ABBV_PAIRS: [RegExp, RegExp, string][] = [
    [/\bstreet\b/i, /\b st\b/i, "Street/St"],
    [/\bavenue\b/i, /\b ave\b/i, "Avenue/Ave"],
    [/\bboulevard\b/i, /\b blvd\b/i, "Boulevard/Blvd"],
    [/\bdrive\b/i, /\b dr\b/i, "Drive/Dr"],
    [/\blane\b/i, /\b ln\b/i, "Lane/Ln"],
    [/\bcourt\b/i, /\b ct\b/i, "Court/Ct"],
    [/\bsuite\b/i, /\b ste\b/i, "Suite/Ste"],
  ];

  const countryRecords: Record<string, Brewery[]> = {};
  breweries.forEach((b) => {
    if (!countryRecords[b.country]) countryRecords[b.country] = [];
    countryRecords[b.country].push(b);
  });

  Object.entries(countryRecords).forEach(([country, records]) => {
    if (!records.length) return;
    let missingGeo = 0;
    let hasSuiteUnit = 0;
    const abbreviationVariants: Record<string, { full: number; abbreviated: number }> = {};
    ABBV_PAIRS.forEach(([, , label]) => { abbreviationVariants[label] = { full: 0, abbreviated: 0 }; });
    const samples: string[] = [];

    records.forEach((b) => {
      if (!b.longitude || !b.latitude) missingGeo++;
      if (b.address_1 && /\b(suite|ste|unit|#)\b/i.test(b.address_1)) hasSuiteUnit++;
      if (samples.length < 3 && b.address_1) samples.push(b.address_1);

      for (const [fullRe, abbrRe, label] of ABBV_PAIRS) {
        if (b.address_1) {
          const lower = b.address_1.toLowerCase();
          if (fullRe.test(lower)) abbreviationVariants[label].full++;
          if (abbrRe.test(lower)) abbreviationVariants[label].abbreviated++;
        }
      }
    });

    addressAnalysis[country] = {
      total: records.length,
      missingGeo,
      hasSuiteUnit,
      abbreviationVariants,
      samples,
    };
  });

  return {
    overview: {
      totalBreweries: total,
      countries: Object.keys(byCountry).length,
      generatedAt,
    },
    completeness: { totalPct, byField },
    byCountry,
    byType,
    duplicates: {
      exactNameDups: { count: exactNameDups.length, top: exactNameDups.slice(0, 10) },
      exactAddressDups: { count: exactAddrDups.length, top: exactAddrDups.slice(0, 10) },
      normalizedAddressDups: { count: normAddrDups.length, top: normAddrDups.slice(0, 10) },
      exactCoordDups: { count: exactCoordDups.length, top: exactCoordDups.slice(0, 10) },
      fuzzyDups: { count: fuzzyDups.length, groups: fuzzyDups.slice(0, 20) },
    },
    addressAnalysis,
  };
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatOverview(a: DataAnalysis): string {
  const o = a.overview;
  return [
    "## 📊 Data Quality Analysis",
    "",
    `> Generated: ${o.generatedAt}`,
    "",
    "### Overview",
    `- **Total Breweries:** ${o.totalBreweries.toLocaleString()}`,
    `- **Countries:** ${o.countries}`,
    `- **Overall Data Completeness:** ${a.completeness.totalPct}%`,
    "",
  ].join("\n");
}

function formatCompleteness(a: DataAnalysis): string {
  const lines = [
    "### 📋 Data Completeness by Field",
    "",
    "| Field | Filled | Total | Completeness |",
    "|-------|--------|-------|-------------|",
    ...a.completeness.byField
      .sort((x, y) => y.pct - x.pct)
      .map((f) => `| ${f.field} | ${f.filled.toLocaleString()} | ${f.total.toLocaleString()} | ${f.pct}% |`),
    "",
  ];
  return lines.join("\n");
}

function formatDuplicates(a: DataAnalysis): string {
  const lines: string[] = ["### 🔍 Potential Duplicates", ""];

  // Exact name duplicates
  lines.push(`**Exact Name Matches:** ${a.duplicates.exactNameDups.count} names appear more than once`);
  lines.push("");
  if (a.duplicates.exactNameDups.top.length) {
    lines.push("| Name | Count | Locations |");
    lines.push("|------|-------|-----------|");
    a.duplicates.exactNameDups.top.forEach((d) => {
      const locations = d.breweries.map((b) => `${b.city}, ${b.state_province}`).join("; ");
      lines.push(`| ${d.key} | ${d.count} | ${locations} |`);
    });
    lines.push("");
  }

  // Exact address duplicates
  lines.push(`**Exact Address Matches (raw):** ${a.duplicates.exactAddressDups.count} addresses shared by multiple breweries`);
  lines.push("");
  if (a.duplicates.exactAddressDups.top.length) {
    lines.push("| Address | Count | Breweries |");
    lines.push("|---------|-------|-----------|");
    a.duplicates.exactAddressDups.top.forEach((d) => {
      const addrParts = d.key.split("|||");
      const addr = `${addrParts[0]}, ${addrParts[1]}`;
      const names = d.breweries.map((b) => `${b.name} (${b.brewery_type})`).join("; ");
      lines.push(`| ${addr} | ${d.count} | ${names} |`);
    });
    lines.push("");
  }

  // Normalized address duplicates with different names
  lines.push(`**Normalized Address Matches (different names):** ${a.duplicates.normalizedAddressDups.count} addresses`);
  lines.push("");
  if (a.duplicates.normalizedAddressDups.top.length) {
    lines.push("| Address | Count | Breweries |");
    lines.push("|---------|-------|-----------|");
    a.duplicates.normalizedAddressDups.top.forEach((d) => {
      const names = d.breweries.map((b) => `${b.name} (${b.brewery_type})`).join("; ");
      lines.push(`| ${d.key} | ${d.count} | ${names} |`);
    });
    lines.push("");
  }

  // Exact coordinate duplicates
  lines.push(`**Exact Coordinate Matches:** ${a.duplicates.exactCoordDups.count} coordinate pairs shared`);
  lines.push("");
  if (a.duplicates.exactCoordDups.top.length) {
    lines.push("| Coordinates | Count | Breweries |");
    lines.push("|-------------|-------|-----------|");
    a.duplicates.exactCoordDups.top.forEach((d) => {
      const names = d.breweries.map((b) => `${b.name} (${b.city})`).join("; ");
      lines.push(`| ${d.key} | ${d.count} | ${names} |`);
    });
    lines.push("");
  }

  // Fuzzy duplicates
  lines.push(`**🔎 Fuzzy Name Matches (Jaro-Winkler ≥ 0.85):** ${a.duplicates.fuzzyDups.count} potential duplicate pairs found`);
  lines.push("");
  lines.push("> These records share the same address (or nearby coordinates) AND have similar brewery names. They may be duplicates that need manual review.");
  lines.push("");
  if (a.duplicates.fuzzyDups.groups.length) {
    lines.push("| Name 1 | Name 2 | Similarity | Address | City | Country | Reason |");
    lines.push("|--------|--------|------------|---------|------|---------|--------|");
    a.duplicates.fuzzyDups.groups.forEach((d) => {
      lines.push(`| ${d.name1} | ${d.name2} | ${(d.similarity * 100).toFixed(1)}% | ${d.address} | ${d.city}, ${d.state_province} | ${d.country} | ${d.matchReason} |`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

function formatAddressAnalysis(a: DataAnalysis): string {
  const lines: string[] = ["### 🏠 Address Quality by Country", ""];

  const sortedCountries = Object.entries(a.addressAnalysis).sort((x, y) => y[1].total - x[1].total);

  for (const [country, info] of sortedCountries) {
    lines.push(`#### ${country} (${info.total} records)`);
    lines.push("");
    lines.push(`- Missing lat/lng: **${info.missingGeo}** (${((info.missingGeo / info.total) * 100).toFixed(1)}%)`);
    lines.push(`- Records with unit/suite: **${info.hasSuiteUnit}** (${((info.hasSuiteUnit / info.total) * 100).toFixed(1)}%)`);
    lines.push(`- Sample addresses:`);
    info.samples.forEach((s) => lines.push(`  - "${s}"`));

    // Abbreviation breakdown (only show if any found)
    const activeAbbvs = Object.entries(info.abbreviationVariants).filter(([, v]) => v.full > 0 || v.abbreviated > 0);
    if (activeAbbvs.length) {
      lines.push("");
      lines.push("| Variant | Full form | Abbreviated |");
      lines.push("|---------|-----------|-------------|");
      activeAbbvs.forEach(([label, v]) => {
        lines.push(`| ${label} | ${v.full} | ${v.abbreviated} |`);
      });
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatByCountry(a: DataAnalysis): string {
  const sorted = Object.entries(a.byCountry).sort((x, y) => y[1] - x[1]);
  const lines = [
    "### 🌍 Breweries by Country",
    "",
    "| Country | Count | Percentage |",
    "|---------|-------|------------|",
    ...sorted.map(([c, n]) => `| ${c} | ${n.toLocaleString()} | ${((n / a.overview.totalBreweries) * 100).toFixed(1)}% |`),
    "",
  ];
  return lines.join("\n");
}

function formatByType(a: DataAnalysis): string {
  const sorted = Object.entries(a.byType).sort((x, y) => y[1] - x[1]);
  const lines = [
    "### 🍺 Brewery Types",
    "",
    "| Type | Count | Percentage |",
    "|------|-------|------------|",
    ...sorted.map(([t, n]) => `| ${t} | ${n.toLocaleString()} | ${((n / a.overview.totalBreweries) * 100).toFixed(1)}% |`),
    "",
  ];
  return lines.join("\n");
}

/** Full markdown report. */
function formatReport(a: DataAnalysis): string {
  return [
    formatOverview(a),
    formatByCountry(a),
    formatByType(a),
    formatCompleteness(a),
    formatAddressAnalysis(a),
    formatDuplicates(a),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const main = () => {
  const startTime = Date.now();
  console.log("Analyzing brewery data...\n");

  const csv = readFileSync(join(__dirname, "../breweries.csv"), { encoding: "utf-8" });
  const breweries = Papa.parse<Brewery>(csv, papaParseOptions).data;
  const analysis = analyze(breweries);

  const report = formatReport(analysis);
  console.log(report);

  // Write report to file for CI comment use
  const reportPath = join(__dirname, "../data-quality-report.md");
  writeFileSync(reportPath, report);

  console.log(`\n✨ Analysis complete in ${Date.now() - startTime}ms`);
  console.log(`Report written to ${reportPath}`);

  return analysis;
};

if (require.main === module) {
  main();
}

export { analyze, formatReport, normalizeAddress, normalizeName };
