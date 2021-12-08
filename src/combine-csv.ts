// Export /data/* to /breweries.csv

import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import glob from "glob";
import Papa from "papaparse";
import { headers, headersLite } from "./config";
import { Brewery, BreweryLite } from "./utils/types";

const fileGlob = join(__dirname, "../data/**/*.csv");
const fullFilePath = join(__dirname, "../breweries.csv");
const liteFilePath = join(__dirname, "../breweries-lite.csv");

glob(fileGlob, {}, (globError, files) => {
  const breweries: Brewery[] = [];
  const breweriesLite: BreweryLite[] = [];

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

        // Go through each data object and create new lite version
        const dataLite: BreweryLite[] = result.data
          .filter((brewery) => brewery.brewery_type !== "closed")
          .map((brewery) => {
            return {
              name: brewery.name,
              city: brewery.city,
              state: brewery.state,
              country: brewery.country,
            };
          });
        breweriesLite.push(...dataLite);
      } catch (error) {
        console.error(error);
      }
    });

    if (breweries.length) {
      // Sort breweries by ID
      breweries.sort((a, b) => a.obdb_id.localeCompare(b.obdb_id));
      breweriesLite.sort((a, b) => a.name.localeCompare(b.name));

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

      console.log(
        `Writing lite dataset to ${liteFilePath} (${breweriesLite.length} breweries)`
      );
      writeFileSync(
        liteFilePath,
        Papa.unparse(breweriesLite, {
          columns: headersLite,
          skipEmptyLines: true,
        })
      );
    }
  } else {
    console.error(globError);
  }
});
