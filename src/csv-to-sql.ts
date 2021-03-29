// Convert CSV to SQL INSERTs
import { writeFileSync, readFileSync } from "fs";
import { mysql_real_escape_string as sqlEscape } from "./utils/sql";
import { join } from "path";
import type { Brewery } from "./utils/types";
import Papa from "papaparse";

const csvPath = join(__dirname, "../breweries.csv");
const sqlPath = join(__dirname, "../breweries.sql");

const headers =
  "name,brewery_type,street,address_2,address_3,city,state,county_province,postal_code,website_url,phone,created_at,updated_at,country,longitude,latitude";

try {
  const data = readFileSync(csvPath, { encoding: "utf-8" });
  const result = Papa.parse<Brewery>(data, {
    header: true,
    skipEmptyLines: true,
  });
  const breweries = result.data;
  const inserts = [];
  console.log(`📖 Read ${breweries.length} rows from ${csvPath}...`);

  for (let index = 0; index < breweries.length; index++) {
    const element = breweries[index];
    const insert = `INSERT INTO breweries (${headers}) VALUES ( '${sqlEscape(
      element.name
    )}', '${sqlEscape(element.brewery_type)}', '${sqlEscape(
      element.street
    )}', '${sqlEscape(element.address_2) || ""}', '${
      sqlEscape(element.address_3) || ""
    }', '${sqlEscape(element.city)}', '${sqlEscape(element.state)}', '${
      sqlEscape(element.county_province) || ""
    }', '${sqlEscape(element.postal_code) || ""}', '${
      sqlEscape(element.website_url) || ""
    }', '${sqlEscape(element.phone) || ""}', '${sqlEscape(
      element.created_at
    )}', '${sqlEscape(element.updated_at)}', '${sqlEscape(element.country)}', ${
      element.longitude || "NULL"
    }, ${element.latitude || "NULL"});`;
    inserts.push(insert);
  }
  writeFileSync(sqlPath, inserts.join("\n"));
  console.log(`✅ Wrote ${inserts.length} SQL inserts to ${sqlPath}...`);
} catch (error) {
  console.error(error);
}
