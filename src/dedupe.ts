import { join } from "path";
import { writeFileSync } from "fs";
import {
  generateCandidatesCsv,
  findDedupCandidates,
  loadCandidates,
  qualityScore,
} from "./dedupe-candidates";
import { readFileSync } from "fs";
import Papa from "papaparse";
import { Brewery } from "./types";
import { papaParseOptions } from "./config";

// ---------------------------------------------------------------------------
// Report formatter
// ---------------------------------------------------------------------------

function formatCandidates(candidates: ReturnType<typeof findDedupCandidates>): string {
  if (!candidates.length) {
    return "✅ No fuzzy duplicates found — dataset looks clean!";
  }

  const lines = [
    `## 🔎 Fuzzy Duplicate Report (${candidates.length} candidates)`,
    "",
    "> Review each pair below. Run `npm run dedupe:review` to interactively confirm or reject each one.",
    "",
    "| # | Keep | Remove | Similarity | Confidence | City | Country |",
    "|---|------|--------|------------|------------|------|---------|",
  ];

  candidates.forEach((c, i) => {
    const conf =
      c.confidence === "high" ? "🟢 high" : c.confidence === "medium" ? "🟡 med" : "🔴 low";
    lines.push(
      `| ${(i + 1).toString().padStart(2)} | ${c.keep.name} (${c.keep.brewery_type}) | **${c.remove.name}** (${c.remove.brewery_type}) | ${(c.similarity * 100).toFixed(1)}% | ${conf} | ${c.remove.city}, ${c.remove.state_province} | ${c.remove.country} |`
    );
  });

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const startTime = Date.now();
  const FUZZY_THRESHOLD = 0.85;
  const candidatesPath = join(__dirname, "../dedupe-candidates.json");
  const reportPath = join(__dirname, "../dedupe-report.md");

  console.log("🔎 Running fuzzy duplicate detection...\n");

  const csvPath = join(__dirname, "../breweries.csv");
  const csv = readFileSync(csvPath, { encoding: "utf-8" });
  const breweries = Papa.parse<Brewery>(csv, papaParseOptions).data;

  console.log(`Analyzing ${breweries.length} breweries (threshold: ${FUZZY_THRESHOLD})...\n`);

  const candidates = findDedupCandidates(breweries, FUZZY_THRESHOLD);

  // Save candidates as JSON for the review tool
  const { saveCandidates } = require("./dedupe-candidates");
  saveCandidates(candidates, candidatesPath);

  // Generate markdown report
  const report = formatCandidates(candidates);
  writeFileSync(reportPath, report);
  console.log(report);

  console.log(`\n✨ Detection complete in ${Date.now() - startTime}ms`);
  console.log(`  ${candidates.length} duplicate candidate pairs found.`);
  console.log(`  Candidates saved to ${candidatesPath}`);
  console.log(`  Report saved to ${reportPath}`);
  console.log("");
  console.log("  Next step: run `npm run dedupe:review` to review and confirm/reject each pair.");
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error("Error running dedup:", err);
    process.exit(1);
  }
}

export { findDedupCandidates, qualityScore };
