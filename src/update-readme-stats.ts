import { readFileSync, writeFileSync, statSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import { Brewery } from "./types";
import { papaParseOptions } from "./config";
import { generateStats, formatStats } from "./generate-stats";

function updateReadmeStats(statsContent: string) {
  const readmePath = join(__dirname, '../README.md');
  let readme = readFileSync(readmePath, 'utf-8');

  // Remove existing statistics section if it exists
  readme = readme.replace(/## 📊 Statistics[\s\S]*?$/, '');

  // Append new statistics at the end of the file
  readme = readme.trim() + '\n\n' + statsContent + '\n';

  // Write updated content back to README.md
  writeFileSync(readmePath, readme);
}

const main = async () => {
  try {
    console.log('Updating README.md with latest statistics...');
    const startTime = new Date().getTime();

    // Read the main CSV file
    const csv = readFileSync(join(__dirname, '../breweries.csv'), { encoding: 'utf-8' });
    const breweries = Papa.parse<Brewery>(csv, papaParseOptions).data;

    // Generate and format statistics
    const stats = generateStats(breweries);
    const formattedStats = formatStats(stats);

    // Update README.md with new statistics
    updateReadmeStats(formattedStats);

    const endTime = new Date().getTime();
    console.log(`✨ README.md updated with latest statistics in ${endTime - startTime}ms`);
  } catch (error) {
    console.error('Error updating README.md with statistics:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

export { updateReadmeStats };
