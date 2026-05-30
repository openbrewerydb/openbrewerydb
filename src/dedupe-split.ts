import { existsSync, mkdirSync, writeFileSync, readFileSync, renameSync, unlinkSync, rmSync, cpSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";
import { papaParseOptions, headers, slugifyOptions } from "./config";
import { Brewery } from "./types";
import { Resolution, loadResolutions } from "./dedupe-candidates";

/**
 * Applies dedup resolutions to breweries.csv, then splits the result
 * back into the individual country/state-region CSV files under data/.
 *
 * This is the "commit" step — the data/ files become the source of truth,
 * and breweries.csv can be regenerated from them via the normal workflow.
 */
function main() {
  const startTime = Date.now();
  const csvPath = join(__dirname, "../breweries.csv");
  const resolutionsPath = join(__dirname, "../dedupe-resolutions.json");
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

  // Deduplicate: keep only the last resolution per hash
  const lastByHash = new Map<string, Resolution>();
  resolutions.forEach((r) => lastByHash.set(r.hash, r));
  const unique = [...lastByHash.values()];

  const confirmed = unique.filter((r) => r.action === "confirmed");
  const removeIds = new Set(confirmed.map((r) => r.removeId).filter(Boolean) as string[]);

  if (removeIds.size === 0) {
    console.log("⚠️  No confirmed removals found. Nothing to do.");
    process.exit(0);
  }

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

    console.log(
      `✂️  Splitting ${deduped.length} breweries (removed ${allBreweries.length - deduped.length}) into data/...\n`
    );

    // Group by country/state-region
    const output: Record<string, Record<string, Brewery[]>> = {};

    for (const brewery of deduped) {
      const regionSlug = slugify(brewery.state_province.trim().toLowerCase(), slugifyOptions);
      const countrySlug = slugify(brewery.country.trim().toLowerCase(), slugifyOptions);

      if (!output[countrySlug]) output[countrySlug] = {};
      if (!output[countrySlug][regionSlug]) output[countrySlug][regionSlug] = [];
      output[countrySlug][regionSlug].push(brewery);
    }

    let fileCount = 0;
    const tempFiles: string[] = [];
    try {
      for (const country of Object.keys(output)) {
        const countryPath = join(storePath, country);
        if (!existsSync(countryPath)) {
          mkdirSync(countryPath, { recursive: true });
        }

        for (const region of Object.keys(output[country])) {
          const regionFilePath = join(countryPath, `${region}.csv`);
          const tempFilePath = `${regionFilePath}.tmp`;

          // Sort by name
          output[country][region].sort((a, b) => a.name.localeCompare(b.name));

          // Write to temp file first (atomic)
          writeFileSync(
            tempFilePath,
            Papa.unparse(output[country][region], {
              columns: headers,
              skipEmptyLines: true,
            })
          );
          tempFiles.push(tempFilePath);

          // Atomic rename
          renameSync(tempFilePath, regionFilePath);
          fileCount++;
        }
      }
    } catch (err) {
      // Cleanup temp files on error
      for (const tempFile of tempFiles) {
        try {
          if (existsSync(tempFile)) {
            unlinkSync(tempFile);
          }
        } catch {}
      }
      throw err;
    }

    // Post-operation validation: verify split files match expected count
    let validatedCount = 0;
    for (const country of Object.keys(output)) {
      for (const region of Object.keys(output[country])) {
        validatedCount += output[country][region].length;
      }
    }

    if (validatedCount !== deduped.length) {
      console.log(`❌ Validation failed: Expected ${deduped.length} breweries in split files, but got ${validatedCount}`);
      console.log(`🔄 Rolling back changes from backup...`);
      rmSync(storePath, { recursive: true, force: true });
      cpSync(backupPath, storePath, { recursive: true });
      rmSync(backupPath, { recursive: true, force: true });
      console.log(`✅ Rollback complete`);
      process.exit(1);
    }

    console.log(
      `✅ ${deduped.length} breweries split into ${fileCount} files across ${Object.keys(output).length} countries.`
    );
    console.log(`✅ Validation passed: ${validatedCount} records written`);
    console.log(`\n✨ Done in ${Date.now() - startTime}ms`);
    console.log(
      `\nNext step: run \`npm run workflow:maintain\` to regenerate breweries.csv from the updated data/ files.`
    );
  } catch (err) {
    console.log(`❌ Error during split: ${err}`);
    console.log(`🔄 Rolling back changes from backup...`);
    rmSync(storePath, { recursive: true, force: true });
    cpSync(backupPath, storePath, { recursive: true });
    rmSync(backupPath, { recursive: true, force: true });
    console.log(`✅ Rollback complete`);
    throw err;
  } finally {
    // Clean up backup on success
    if (existsSync(backupPath)) {
      rmSync(backupPath, { recursive: true, force: true });
    }
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}
