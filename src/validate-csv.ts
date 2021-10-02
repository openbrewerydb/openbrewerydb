import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import glob from "glob-promise";
import type { Brewery } from "./utils/types";

// @ts-ignore
// csval is a newer library and doesn't have any published types yet
import csval from "csval";

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

const main = async () => {
  const fileGlob = join(__dirname, "../data/**/*.csv");

  const rules = {
    $schema: "http://json-schema.org/schema#",
    type: "object",
    required: [
      "id",
      "name",
      "brewery_type",
      "city",
      "country",
    ],
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

  try {
    const files = await glob(fileGlob);
    for (let file of files) {
      console.log(`📋 Validating ${file}...`);
      const data = readFileSync(file, { encoding: "utf-8" });
      const parsed: Brewery = await csval.parseCsv(data);
      const valid = await csval.validate(parsed, rules);
    }
    console.log(`✅  All ${files.length} files are valid!`);
  } catch (error) {
    console.error(`${error}`);
    throw new Error("🛑 Invalid CSV");
  }
};

main();
