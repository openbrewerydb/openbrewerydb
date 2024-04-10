import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import { papaParseOptions } from "./config";
import { Brewery } from "./types";

const csvFilePath = join(__dirname, "../breweries.csv");
const jsonFilePath = join(__dirname, "../breweries-map.json");

interface BreweryMarker {
  name: string;
  lngLat: number[];
  id: string;
}

try {
  const data = readFileSync(csvFilePath, { encoding: "utf-8" });
  const result = Papa.parse<Brewery>(data, papaParseOptions);
  let breweries: BreweryMarker[] = [];

  for (let brewery of result.data) {
    if (brewery.latitude && brewery.longitude) {
      breweries.push({
        id: brewery.id,
        name: brewery.name,
        lngLat: [brewery.longitude, brewery.latitude],
      })
    }
  }

  if (breweries.length) {
    console.log(`📝 Writing to ${jsonFilePath}`);
    writeFileSync(jsonFilePath, JSON.stringify(breweries));

    console.log("Summary:");
    console.log(`🍺 Total Breweries: ${breweries.length}`);
  }
} catch (error) {
  console.error(`🛑 ${error}`);
}
