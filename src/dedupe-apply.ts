import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import { Brewery } from "./types";
import { papaParseOptions, headers } from "./config";
import { Resolution, loadResolutions } from "./dedupe-candidates";

// ---------------------------------------------------------------------------
// Apply resolutions to produce deduped output
// ---------------------------------------------------------------------------

function apply() {
  const startTime = Date.now();
  const resolutionsPath = join(__dirname, "../dedupe-resolutions.json");
  const csvPath = join(__dirname, "../breweries.csv");
  const outputPath = join(__dirname, "../breweries-deduped.csv");

  let resolutions: Resolution[];
  try {
    resolutions = loadResolutions(resolutionsPath);
  } catch {
    console.log("❌ No resolutions file found. Run `npm run dedupe:review` first.");
    process.exit(1);
  }

  // Deduplicate: keep only the last resolution per hash (in case of re-reviews)
  const lastByHash = new Map<string, Resolution>();
  resolutions.forEach((r) => lastByHash.set(r.hash, r));
  const unique = [...lastByHash.values()];

  const confirmed = unique.filter((r) => r.action === "confirmed");
  const rejected = unique.filter((r) => r.action === "rejected");
  const skipped = unique.filter((r) => r.action === "skipped");

  if (confirmed.length === 0 && skipped.length === 0) {
    console.log("⚠️  No confirmed resolutions found. Nothing to apply.");
    console.log("   Run `npm run dedupe:review` to review candidates.");
    process.exit(0);
  }

  // IDs to remove
  const removeIds = new Set(confirmed.map((r) => r.removeId).filter(Boolean) as string[]);

  // Read full dataset
  const csv = readFileSync(csvPath, { encoding: "utf-8" });
  const breweries = Papa.parse<Brewery>(csv, papaParseOptions).data;

  // Validate that all breweries have UUIDs before proceeding
  const missingIds = breweries.filter((b) => !b.id || !/^[0-9a-f-]{36}$/i.test(b.id));
  if (missingIds.length > 0) {
    console.log("❌ Error: Some breweries are missing valid UUIDs. Run `npm run generate:ids` first.");
    console.log(`   Found ${missingIds.length} records without valid IDs.`);
    process.exit(1);
  }

  // Filter
  const deduped = breweries.filter((b) => {
    return !removeIds.has(b.id!);
  });

  // Write deduped CSV
  writeFileSync(
    outputPath,
    Papa.unparse(deduped, { columns: headers, skipEmptyLines: true })
  );

  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║                 🍺  Dedup Apply Results                          ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  Resolutions applied:`);
  console.log(`    ✅ Confirmed (remove): ${confirmed.length}`);
  console.log(`    ❌ Rejected (keep):    ${rejected.length}`);
  console.log(`    ⏭  Skipped:            ${skipped.length}`);
  console.log("");
  console.log(`  Dataset:`);
  console.log(`    Original:  ${breweries.length} records`);
  console.log(`    Removed:   ${confirmed.length} records`);
  console.log(`    Remaining: ${deduped.length} records`);
  console.log("");
  console.log(`  Output written to: ${outputPath}`);
  console.log("");
  console.log(`  ✨ Applied in ${Date.now() - startTime}ms`);
  console.log("");
  console.log("  Next step: review the deduped file, then run `npm run workflow:maintain`");
  console.log("  to regenerate all outputs (JSON, SQL, README stats).");
  console.log("");
}

if (require.main === module) {
  try {
    apply();
  } catch (err) {
    console.error("Error applying dedup:", err);
    process.exit(1);
  }
}
