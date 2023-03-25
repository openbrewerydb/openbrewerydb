import { readFileSync } from "fs";
import { join } from "path";
import glob from "glob-promise";
import Papa from "papaparse";
import { Brewery } from "./types";
import { papaParseOptions } from "./config";

function validateFiles(files: string[]) {
  let valid = true;
  let totalErrors = 0;

  for (let file of files) {
    console.log(`📋 Validating ${file}...`);
    const csv = readFileSync(file, { encoding: "utf-8" });
    const breweries = Papa.parse<Brewery>(csv, papaParseOptions);

    let errors = [];
    for (let data of breweries.data) {
      const result = Brewery.safeParse(data);
      if (!result.success) {
        valid = false;
        for (let error of result.error.issues) {
          errors.push({
            brewery: data.name,
            error: error,
          });
          console.log(
            `${data.name}: ${error.path.join(" > ")} - ${error.message}`
          );
        }
      }
    }
    if (errors.length) {
      console.log(`🛑 There are ${errors.length} errors!\n`);
    }
    totalErrors += errors.length;
  }

  return { valid, totalErrors };
}

const main = async () => {
  const startTime = new Date().getTime();
  const fileGlob = join(__dirname, "../data/**/*.csv");

  // Validate individual files
  let files = await glob(fileGlob);
  const filesResult = validateFiles(files);

  // Separately validate full dataset CSV
  const fullDatasetResult = validateFiles([
    join(__dirname, "../breweries.csv"),
  ]);

  const resultText =
    filesResult.valid && fullDatasetResult.valid
      ? `✅  All ${files.length + 1} files are valid!`
      : `🛑 ${
          filesResult.totalErrors + fullDatasetResult.totalErrors
        } errors were found.`;

  console.log(`${resultText} (${new Date().getTime() - startTime}ms)`);

  if (!filesResult.valid || !fullDatasetResult.valid) {
    throw new Error("invalid");
  }
};

try {
  main();
} catch (error) {
  process.exit(1);
}
