// Export /data/* to /breweries.csv

import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import glob from "glob";
import Papa from "papaparse";
import { headers } from "./config";
import { Brewery } from "./utils/types";

const fileGlob = join(__dirname, "../data/**/*.csv");
const fullFilePath = join(__dirname, "../breweries.csv");

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
        console.log(
          `+ ${result.data.length} breweries from ` +
            `${
              result.data[0].state
                ? result.data[0].state
                : result.data[0].county_province
            }, ` +
            `${result.data[0].country}`
        );

        // Full dataset
        const dataFull = result.data;
        breweries.push(...dataFull);
      } catch (error) {
        console.error(error);
      }
    });

    if (breweries.length) {
      // Sort breweries by ID
      breweries.sort((a, b) => a.obdb_id.localeCompare(b.obdb_id));

      console.log(
        `Writing full dataset to ${fullFilePath} (${breweries.length} breweries)`
      );
      writeFileSync(
        fullFilePath,
        Papa.unparse(breweries, {
          columns: headers,
          skipEmptyLines: true,
        })
      );
    }
  } else {
    console.error(globError);
  }
});
