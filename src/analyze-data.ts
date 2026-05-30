import { readFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import { Brewery } from "./types";
import { papaParseOptions } from "./config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lightweight normalisation for address comparison (casing, punctuation, abbreviations). */
function normalizeAddress(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/[.,#;:'"!@$%^&*()_+=\[\]\\\/\-]/g, " ")
    .replace(/\bstreet\b/g, "st")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\broad\b/g, "rd")
    .replace(/\blane\b/g, "ln")
    .replace(/\bcourt\b/g, "ct")
    .replace(/\bsuite\b/g, "ste")
    .replace(/\bunit\b/g, "ste")
    .replace(/\bno\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase, trimmed key for name comparison. */
function normalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().trim();
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
  const normAddrMap = new Map<string, DuplicateGroup["breweries"] & { original: string }>();
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
  const fs = require("fs");
  fs.writeFileSync(reportPath, report);

  console.log(`\n✨ Analysis complete in ${Date.now() - startTime}ms`);
  console.log(`Report written to ${reportPath}`);

  return analysis;
};

if (require.main === module) {
  main();
}

export { analyze, formatReport, normalizeAddress, normalizeName };
