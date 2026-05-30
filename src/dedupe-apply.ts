import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync, unlinkSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import slugify from "slugify";
import { Brewery } from "./types";
import { papaParseOptions, headers, slugifyOptions } from "./config";
import { Resolution, loadResolutions } from "./dedupe-candidates";

// ---------------------------------------------------------------------------
// Apply resolutions to data/ files (source of truth)
// ---------------------------------------------------------------------------

function apply() {
  const startTime = Date.now();
  const resolutionsPath = join(__dirname, "../dedupe-resolutions.json");
  const csvPath = join(__dirname, "../breweries.csv");
  const storePath = join(__dirname, "../data");
  const backupPath = join(__dirname, "../data.backup");

  // Load resolutions
  let resolutions: Resolution[];
  try {
    resolutions = loadResolutions(resolutionsPath);
  } catch {
    console.log("❌ No resolutions file found. Run `npm run dedupe:review` first.");
    process.exit(1);
  }

  // Deduplicate: keep only the last resolution per hash (idempotent for re-reviews)
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

  // Create backup of data/ directory for rollback
  if (existsSync(backupPath)) {
    rmSync(backupPath, { recursive: true, force: true });
  }
  cpSync(storePath, backupPath, { recursive: true });
  console.log(`📦 Created backup at ${backupPath}`);

  try {
    // Read full dataset and filter
    const csv = readFileSync(csvPath, { encoding: "utf-8" });
    const allBreweries = Papa.parse<Brewery>(csv, papaParseOptions).data;

    // Validate that all breweries have UUIDs before proceeding
    const missingIds = allBreweries.filter((b) => !b.id || !/^[0-9a-f-]{36}$/i.test(b.id));
    if (missingIds.length > 0) {
      console.log("❌ Error: Some breweries are missing valid UUIDs. Run `npm run generate:ids` first.");
      console.log(`   Found ${missingIds.length} records without valid IDs.`);
      process.exit(1);
    }

    const deduped = allBreweries.filter((b) => {
      return !removeIds.has(b.id!);
    });

    const removedCount = allBreweries.length - deduped.length;
    console.log(`✂️  Splitting ${deduped.length} breweries (removed ${removedCount}) into data/...\n`);

    // Group by country/state-region
    const output: Record<string, Record<string, Brewery[]>> = {};

    for (const brewery of deduped) {
      const regionSlug = slugify(brewery.state_province.trim().toLowerCase(), slugifyOptions);
      const countrySlug = slugify(brewery.country.trim().toLowerCase(), slugifyOptions);

      if (!output[countrySlug]) output[countrySlug] = {};
      if (!output[countrySlug][regionSlug]) output[countrySlug][regionSlug] = [];
      output[countrySlug][regionSlug].push(brewery);
    }

    // Write all files to temp first, then rename into place
    const written: { temp: string; final: string }[] = [];

    try {
      for (const country of Object.keys(output)) {
        const countryPath = join(storePath, country);
        if (!existsSync(countryPath)) {
          mkdirSync(countryPath, { recursive: true });
        }

        for (const region of Object.keys(output[country])) {
          const finalPath = join(countryPath, `${region}.csv`);
          const tempPath = `${finalPath}.tmp`;

          // Sort by name
          output[country][region].sort((a, b) => a.name.localeCompare(b.name));

          writeFileSync(
            tempPath,
            Papa.unparse(output[country][region], {
              columns: headers,
              skipEmptyLines: true,
            })
          );
          written.push({ temp: tempPath, final: finalPath });
        }
      }

      // All writes succeeded — rename temp files into place
      for (const { temp, final } of written) {
        // Read temp and write to final (atomic-ish for our purposes)
        writeFileSync(final, readFileSync(temp, "utf-8"));
        unlinkSync(temp);
      }
    } catch (err) {
      // Clean up any temp files on error
      for (const { temp } of written) {
        try {
          if (existsSync(temp)) unlinkSync(temp);
        } catch {}
      }
      throw err;
    }

    // Post-operation validation: count records in written files
    let validatedCount = 0;
    const { glob } = require("glob");
    const dataFiles = glob.sync(join(storePath, "**/*.csv"));
    for (const f of dataFiles) {
      const rows = Papa.parse<Brewery>(readFileSync(f, "utf-8"), papaParseOptions).data;
      validatedCount += rows.length;
    }

    if (validatedCount !== deduped.length) {
      console.log(`❌ Validation failed: expected ${deduped.length} records, found ${validatedCount}`);
      console.log(`🔄 Rolling back from backup...`);
      rmSync(storePath, { recursive: true, force: true });
      cpSync(backupPath, storePath, { recursive: true });
      rmSync(backupPath, { recursive: true, force: true });
      console.log(`✅ Rollback complete`);
      process.exit(1);
    }

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
    console.log(`    Original:  ${allBreweries.length} records`);
    console.log(`    Removed:   ${confirmed.length} records`);
    console.log(`    Remaining: ${deduped.length} records`);
    console.log("");
    console.log(`  ✅ ${deduped.length} breweries written across ${Object.keys(output).length} countries.`);
    console.log(`  ✅ Validation passed: ${validatedCount} records in ${dataFiles.length} files`);
    console.log("");
    console.log(`  ✨ Applied in ${Date.now() - startTime}ms`);
    console.log("");
    console.log("  Next step: run `npm run workflow:maintain` to regenerate outputs.");
    console.log("");
  } catch (err) {
    console.log(`\n❌ Error during apply: ${err instanceof Error ? err.message : String(err)}`);
    console.log(`🔄 Rolling back from backup...`);
    try {
      rmSync(storePath, { recursive: true, force: true });
      cpSync(backupPath, storePath, { recursive: true });
      rmSync(backupPath, { recursive: true, force: true });
      console.log(`✅ Rollback complete`);
    } catch (rollbackErr) {
      console.log(`⚠️  Rollback failed. Restore manually from: ${backupPath}`);
    }
    process.exit(1);
  } finally {
    // Clean up backup
    if (existsSync(backupPath)) {
      rmSync(backupPath, { recursive: true, force: true });
    }
  }
}

if (require.main === module) {
  try {
    apply();
  } catch (err) {
    console.error("Error applying dedup:", err);
    process.exit(1);
  }
}
