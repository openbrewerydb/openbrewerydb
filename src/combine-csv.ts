// Export /data/* to /breweries.csv

import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import glob from "glob";
import Papa from "papaparse";
import { headers } from "./config";
import type { Brewery } from "./utils/types";

const fileGlob = join(__dirname, "../data/**/*.csv");
const filePath = join(__dirname, "../breweries.csv");

glob(fileGlob, {}, (globError, files) => {
  const breweries: Brewery[] = [];

  if (!globError) {
    files.forEach((file) => {
      try {
        const data = readFileSync(file, { encoding: "utf-8" });
        const result = Papa.parse<Brewery>(data, {
          header: true,
          skipEmptyLines: true,
        });
        console.log(`✍️ Adding ${result.data.length} breweries from ${file}`);
        breweries.push(...result.data);
      } catch (error) {
        console.error(error);
      }
    });

    // Sort breweries by ID
    breweries.sort((a, b) => a.obdb_id.localeCompare(b.obdb_id));

    if (breweries.length) {
      console.log(`📝 Writing to ${filePath}`);
      writeFileSync(
        filePath,
        Papa.unparse(breweries, {
          columns: headers,
          skipEmptyLines: true,
        })
      );
    }

    console.log("Summary:");
    console.log(`🗂 Total Files: ${files.length}`);
    console.log(`🍺 Total Breweries: ${breweries.length}`);
  } else {
    console.error(globError);
  }
});
