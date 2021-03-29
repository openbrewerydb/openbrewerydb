// Export /data to /breweries.json
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";

const csvFilePath = join(__dirname, "../breweries.csv");
const jsonFilePath = join(__dirname, "../breweries.json");

try {
  const data = readFileSync(csvFilePath, { encoding: "utf-8" });
  const result = Papa.parse(data, { header: true });
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
