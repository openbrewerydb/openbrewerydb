import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";
import { headers, slugifyOptions } from "./config";
import type { Brewery } from "./types";

const csvFilePath = join(__dirname, "../breweries.csv");
const storePath = join(__dirname, "../data");

const main = () => {
  try {
    let output: Record<
      Brewery["country"],
      Record<Brewery["state_province"], Brewery[]>
    > = {};

    const csvFile = readFileSync(csvFilePath, { encoding: "utf-8" });
    const results = Papa.parse<Brewery>(csvFile, {
      header: true,
      skipEmptyLines: true,
    });

    console.log("✂️ Splitting breweries.csv...");

    const breweries = results.data;

    for (let brewery of breweries) {
      if (!brewery.id) {
        brewery.id = uuidv4();
      }

      const regionSlug = slugify(
        brewery.state_province.toLowerCase(),
        slugifyOptions
      );

      const countrySlug = slugify(
        brewery.country.toLowerCase(),
        slugifyOptions
      );

      if (output[countrySlug] === undefined) {
        output[countrySlug] = {};
      }

      if (output[countrySlug][regionSlug] === undefined) {
        output[countrySlug][regionSlug] = [];
      }

      output[countrySlug][regionSlug].push(brewery);
    }

    for (let country of Object.keys(output)) {
      // Create empty folder for brewery country
      const countryPath = `${storePath}/${country}`;
      if (!existsSync(countryPath)) {
        console.log(`🌟 Creating ${countryPath}...`);
        mkdirSync(countryPath, { recursive: true });
      }

      for (let region of Object.keys(output[country])) {
        // Create state file with headers
        const regionFilePath = `${countryPath}/${region}.csv`;
        if (!existsSync(regionFilePath)) {
          console.log(`🌟 Creating ${regionFilePath}...`);
          writeFileSync(regionFilePath, headers.join(","));
        }

        // Sort breweries by ID
        output[country][region].sort((a, b) => a.name.localeCompare(b.name));

        // Write to state file
        writeFileSync(
          regionFilePath,
          Papa.unparse(output[country][region], {
            columns: headers,
            skipEmptyLines: true,
          })
        );
      }
    }

    console.log("✅ Success!");
  } catch (error) {
    console.error(`🛑 ${error}`);
  }
};

main();
