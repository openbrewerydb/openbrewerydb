import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import { papaParseOptions } from "./config.ts";

const csvFilePath = join(import.meta.dirname, "../breweries.csv");
const jsonFilePath = join(import.meta.dirname, "../breweries.json");

try {
  const data = readFileSync(csvFilePath, { encoding: "utf-8" });
  const result = Papa.parse(data, papaParseOptions);
  const breweries = result.data;

  if (breweries) {
    console.log(`📝 Writing to ${jsonFilePath}`);
    writeFileSync(jsonFilePath, JSON.stringify(breweries));

    console.log("Summary:");
    console.log(`🍺 Total Breweries: ${breweries.length}`);
  }
} catch (error) {
  console.error(`🛑 ${error}`);
}
