// Export /data to /breweries-combined.csv

import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import glob from "glob";
import Papa from "papaparse";
import type { Brewery } from './utils/types';

const fileGlob = join(__dirname, "../data/**/*.csv");
const filePath = join(__dirname, "../breweries.csv");

const headers: string =
  "id,name,brewery_type,street,address_2,address_3,city,state,county_province,postal_code,website_url,phone,created_at,updated_at,country,longitude,latitude,tags";

glob(fileGlob, {}, (globError, files) => {
  const breweries: Brewery[] = [];

  if (!globError) {
    files.forEach((file) => {
      console.log(`📖 Reading ${file}...`);
      try {
        const data = readFileSync(file, { encoding: "utf-8" });
        const result = Papa.parse<Brewery>(data, { header: true, skipEmptyLines: true });
        console.log(`✍️ Adding ${result.data.length} breweries...`);
        breweries.push(...result.data);
      } catch (error) {
        console.error(error);
      }
    });

    // Sort breweries by ID
    breweries.sort((a, b) => a.id.localeCompare(b.id));

    if (breweries.length) {
      console.log(`📝 Writing to ${filePath}`);
      writeFileSync(
        filePath,
        Papa.unparse(breweries, {
          columns: headers.split(','),
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