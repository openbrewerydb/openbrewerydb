// Export /data to /breweries-combined.csv

import {
  writeFileSync, readFileSync,
} from 'fs';
import { join } from 'path';
import glob from 'glob';
import Papa from 'papaparse';

const fileGlob = join(__dirname, '../data/**/*.csv');
const filePath = join(__dirname, '../breweries.csv');

glob(fileGlob, {}, (globError, files) => {
  const breweries = [];

  if (!globError) {
    files.forEach((file) => {
      console.log(`📖 Reading ${file}...`);
      try {
        const data = readFileSync(file, { encoding: 'utf-8' });
        const result = Papa.parse(data, { header: true });
        console.log(`✍️ Adding ${result.data.length} breweries...`);
        breweries.push(...result.data);
      } catch (error) {
        console.error(error);
      }
    });

    if (breweries.length) {
      console.log(`📝 Writing to ${filePath}`);
      writeFileSync(filePath, Papa.unparse(breweries));
    }

    console.log('Summary:');
    console.log(`🗂 Total Files: ${files.length}`);
    console.log(`🍺 Total Breweries: ${breweries.length}`);
  } else {
    console.error(globError);
  }
});
