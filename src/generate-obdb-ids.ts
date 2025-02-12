import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import slugify from "slugify";
import Papa from "papaparse";

import { papaParseOptions, headers, slugifyOptions } from "./config";
import { Brewery } from "./types";

const csvFilePath = join(__dirname, "../breweries.csv");

function generateId(brewery: Brewery, suffix: null | string = null) {
  return slugify(
    `${brewery.name.toLowerCase()}-${brewery.city.toLowerCase()}${
      suffix ? `-${suffix}` : ""
    }`,
    slugifyOptions
  );
}

// Helper function to check if an ID is unique
function isUnique(id: string, collection: Record<string, any>): boolean {
  return collection[id] === undefined;
}

const main = () => {
  let obdbIdMapping = new Map<string, string>();
  const breweries: Record<string, Brewery> = {};
  const duplicates: Record<string, Brewery[]> = {};

  try {
    const csvFile = readFileSync(csvFilePath, { encoding: "utf-8" });
    const result = Papa.parse<Brewery>(csvFile, papaParseOptions);

    // Build hash table of breweries; collect duplicates

    for (let brewery of result.data) {
      const obdbId = generateId(brewery);
      if (isUnique(obdbId, breweries) && isUnique(obdbId, duplicates)) {
        brewery.id = obdbId;
        breweries[obdbId] = brewery;
      } else {
        if (duplicates[obdbId] === undefined) {
          duplicates[obdbId] = [];
          duplicates[obdbId].push(breweries[obdbId]);
          delete breweries[obdbId];
        }
        duplicates[obdbId].push(brewery);
      }
    }

    // Handle duplicates by adding a suffix
    if (Object.keys(duplicates).length) {
      for (let key of Object.keys(duplicates)) {
        for (let i = 0; i < duplicates[key].length; i++) {
          const dedupedBrewery = duplicates[key][i];
          const obdbId = generateId(dedupedBrewery, (i + 1).toString());
          dedupedBrewery.id = obdbId;
          breweries[obdbId] = dedupedBrewery;
        }
      }
    }

    const sortedBreweries = Object.values(breweries).sort((a, b) =>
      a.id < b.id ? -1 : 1
    );

    if (result.data.length === sortedBreweries.length) {
      writeFileSync(
        csvFilePath,
        Papa.unparse(sortedBreweries, {
          columns: headers,
          skipEmptyLines: true,
        })
      );
      console.log(`✅ Wrote ${Object.keys(breweries).length} breweries.`);
    } else {
      console.log(
        `🛑 ERROR! Read Breweries (${result.data.length}) ≠ Output Breweries (${sortedBreweries.length}).`
      );
    }
  } catch (error) {
    console.log(error);
    throw new Error("Error");
  }
};

main();
