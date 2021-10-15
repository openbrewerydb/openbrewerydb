import { readFileSync } from "fs";
import { join } from "path";
import Ajv from "ajv";
import glob from "glob-promise";
import Papa from "papaparse";
import { Brewery } from "./utils/types";
import { schema } from "./config";

const ajv = new Ajv({ allowUnionTypes: true });
const validate = ajv.compile(schema);

function validateFiles(files: string[]) {
  const ids: Record<string, Brewery> = {};

  function checkValidity(data: Brewery) {
    const valid = validate(data);
    if (!valid) {
      console.log(data);
      console.error(validate.errors);
      throw new Error("Invalid schema");
    }
  }

  function checkUniqueness(data: Brewery) {
    if (ids[data.obdb_id]) {
      console.log(ids[data.obdb_id]);
      console.log(data);
      throw new Error("ID is not unique");
    }
    ids[data.obdb_id] = data;
  }

  for (let file of files) {
    console.log(`📋 Validating ${file}...`);
    const csv = readFileSync(file, { encoding: "utf-8" });
    const breweries = Papa.parse<Brewery>(csv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transform: (value) => {
        return value === "" ? null : value;
      },
    });

    for (let data of breweries.data) {
      checkValidity(data);
      checkUniqueness(data);
    }
  }
}

const main = async () => {
  const startTime = new Date().getTime();
  const fileGlob = join(__dirname, "../data/**/*.csv");

  // Validate individual files
  let files = await glob(fileGlob);
  validateFiles(files);

  // Separately validate full dataset CSV
  validateFiles([join(__dirname, "../breweries.csv")]);

  console.log(
    `✅  All ${files.length + 1} files are valid! (${
      new Date().getTime() - startTime
    }ms)`
  );
};

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
