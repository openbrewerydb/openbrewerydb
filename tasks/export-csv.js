// Export /breweries.json to /breweries.csv

import {
  writeFileSync, readFileSync,
} from 'fs';
import { join } from 'path';
import Papa from 'papaparse';

const jsonFilePath = join(__dirname, '../breweries.json');
const csvFilePath = join(__dirname, '../breweries.csv');
let jsonData;

try {
  console.log('✍️ Converting breweries.json to breweries.csv...');
  jsonData = readFileSync(jsonFilePath, { encoding: 'utf-8' });
  const csvData = Papa.unparse(jsonData);
  writeFileSync(csvFilePath, csvData);
  console.error('✅ Success!');
} catch (error) {
  console.error(`🛑 ${error}`);
}
