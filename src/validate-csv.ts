import { readFileSync } from "fs";
import { join } from "path";
import glob from "glob-promise";
import type { Brewery } from "./utils/types";
import Papa from "papaparse";
import Ajv from "ajv";

const BREWERY_TYPES = [
  "micro",
  "nano",
  "regional",
  "brewpub",
  "large",
  "planning",
  "bar",
  "contract",
  "proprietor",
  "taproom",
  "closed",
];

const fileGlob = join(__dirname, "../data/**/*.csv");

// JSON Schema Validation
const ajv = new Ajv();
const schema = {
  type: "object",
  required: ["obdb_id", "name", "brewery_type", "city", "country"],
  properties: {
    obdb_id: {
      type: "string",
    },
    name: {
      type: "string",
    },
    brewery_type: {
      enum: BREWERY_TYPES,
    },
    street: {
      type: "string",
    },
    city: {
      type: "string",
    },
    country: {
      type: "string",
    },
  },
};
const validate = ajv.compile(schema);

function checkValidity(data: Brewery) {
  const valid = validate(data);
  if (!valid) {
    console.log(data);
    console.error(validate.errors);
    throw new Error("Invalid schema");
  }
}

const ids: Record<string, Brewery> = {};
function checkUniqueness(data: Brewery) {
  if (ids[data.obdb_id]) {
    console.log(ids[data.obdb_id]);
    console.log(data);
    throw new Error("ID is not unique");
  }
  ids[data.obdb_id] = data;
}

const main = async () => {
  try {
    const startTime = new Date().getTime();
    const files = await glob(fileGlob);

    for (let file of files) {
      console.log(`📋 Validating ${file}...`);
      const csv = readFileSync(file, { encoding: "utf-8" });
      const breweries = await Papa.parse<Brewery>(csv, {
        header: true,
        skipEmptyLines: true,
      });

      for (let data of breweries.data) {
        checkValidity(data);
        checkUniqueness(data);
      }
    }

    console.log(
      `✅  All ${files.length} files are valid! (${
        new Date().getTime() - startTime
      }ms)`
    );
  } catch (error) {
    console.error(error);
  }
};

main();
