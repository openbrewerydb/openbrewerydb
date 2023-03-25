import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import glob from "glob";
import Papa from "papaparse";
import { papaParseOptions, headers } from "./config";
import { Brewery } from "./types";
import { z } from "zod";

const fileGlob = join(__dirname, "../data/**/*.csv");
const fullFilePath = join(__dirname, "../breweries.csv");

glob(fileGlob, {}, (globError, files) => {
  const breweries: Brewery[] = [];

  if (!globError) {
    files.forEach((file) => {
      const data = readFileSync(file, { encoding: "utf-8" });
      const result = Papa.parse<Brewery>(data, papaParseOptions);
      console.log(
        `+ ${result.data.length} breweries from ` +
          `${result.data[0].state_province}, ` +
          `${result.data[0].country}`
      );

      // Full dataset
      const dataFull = result.data;

      // Validate
      console.log("📋 Validating breweries...");
      dataFull.map((b) => {
        try {
          Brewery.parse(b);
        } catch (e) {
          // TODO: Check if path is id and invalid_type is string,
          // because that's ok with split workflow
          console.error(e);
        }
      });

      breweries.push(...dataFull);
    });

    if (breweries.length) {
      // Sort breweries by Name
      breweries.sort((a, b) => a.name.localeCompare(b.name));

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
