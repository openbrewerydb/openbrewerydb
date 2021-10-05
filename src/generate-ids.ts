import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import slugify from "slugify";
import Papa from "papaparse";

import { headers, slugifyOptions } from "./config";
import { Brewery } from "./utils/types";

const csvFilePath = join(__dirname, "../breweries.csv");

function generateId(brewery: Brewery, suffix: null | string = null) {
  return slugify(
    `${brewery.name.toLowerCase()}-${brewery.city.toLowerCase()}${
      suffix ? `-${suffix}` : ""
    }`,
    slugifyOptions
  );
}

function isUnique(
  id: string,
  ids: Record<string, Brewery> | Record<string, Brewery[]>
) {
  return ids[id] ? false : true;
}

const main = () => {
  let breweries: Record<string, Brewery> = {};
  let duplicates: Record<string, Brewery[]> = {};

  try {
    const csvFile = readFileSync(csvFilePath, { encoding: "utf-8" });
    const result = Papa.parse<Brewery>(csvFile, {
      header: true,
      skipEmptyLines: true,
    });

    // Build hash table of breweries; collect duplicates
    for (let brewery of result.data) {
      const obdbId = generateId(brewery);
      if (isUnique(obdbId, breweries) && isUnique(obdbId, duplicates)) {
        brewery.obdb_id = obdbId;
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
          dedupedBrewery.obdb_id = obdbId;
          breweries[obdbId] = dedupedBrewery;
        }
      }
    }

    const sortedBreweries = Object.values(breweries).sort((a, b) =>
      a.obdb_id < b.obdb_id ? -1 : 1
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
