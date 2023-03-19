import { readFileSync } from "fs";
import { join } from "path";
import glob from "glob-promise";
import Papa from "papaparse";
import { Brewery } from "./types";

function validateFiles(files: string[]) {
  let valid = true;
  let totalErrors = 0;

  for (let file of files) {
    console.log(`📋 Validating ${file}...`);
    const csv = readFileSync(file, { encoding: "utf-8" });
    const breweries = Papa.parse<Brewery>(csv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: {
        postal_code: false,
        website_url: true,
        longitude: true,
        latitude: true,
      },
    });

    let errors = [];
    for (let data of breweries.data) {
      const result = Brewery.safeParse(data);
      if (!result.success) {
        errors.push({
          brewery: data.name,
          error: result.error,
        });
        valid = false;
        console.log({ name: data.name, error: result.error });
      }
    }
    console.log(
      `${errors.length ? "🛑" : "✅"} There are ${errors.length} errors.\n`
    );
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

  const fullDatasetResult = { valid: false, totalErrors: 0 };
  // Separately validate full dataset CSV
  // const fullDatasetResult = validateFiles([
  //   join(__dirname, "../breweries.csv"),
  // ]);

  const resultText =
    filesResult.valid && fullDatasetResult.valid
      ? `✅  All ${files.length + 1} files are valid!`
      : `🛑 ${
          filesResult.totalErrors + fullDatasetResult.totalErrors
        } errors were found. Be ashamed. 😞`;

  console.log(`${resultText} (${new Date().getTime() - startTime}ms)`);
};

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
