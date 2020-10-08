// Export /breweries.json to /breweries.csv

import {
  existsSync, mkdirSync, writeFileSync, readFileSync,
} from 'fs';
import Papa from 'papaparse';
import { join } from 'path';
import slugify from 'slugify';

const slugifyOptions = { remove: /[*+~.,()'"!:@]/g };
const csvFilePath = join(__dirname, '../breweries.csv');
const storePath = join(__dirname, '../data/us');
const headers = 'id,name,brewery_type,street,city,state,postal_code,website_url,phone,created_at,updated_at,country,longitude,latitude,tags';

try {
  console.log('✂️ Split breweries.csv by state...');
  const csvFile = readFileSync(csvFilePath, { encoding: 'utf-8' });
  const results = Papa.parse(csvFile, { header: true });
  results.data.forEach((brewery) => {
    const stateSlug = slugify(brewery.state.toLowerCase(), slugifyOptions);

    // Create empty folder for brewery state, if it doesn't exist
    const statePath = `${storePath}/${stateSlug}`;
    if (!existsSync(statePath)) {
      mkdirSync(statePath);
    }

    // Create state file with headers, if it doesn't exist
    const stateFilePath = `${statePath}/${stateSlug}.csv`;
    if (!existsSync(stateFilePath)) {
      writeFileSync(stateFilePath, headers);
    }

    console.log(`✍️ Adding ${brewery.name} to ${stateFilePath}`);

    // Read file into variable
    const stateFile = readFileSync(stateFilePath, { encoding: 'utf-8' });
    const stateBreweries = Papa.parse(stateFile, { header: true });

    // Append current brewery
    stateBreweries.data.push(brewery);

    writeFileSync(stateFilePath, Papa.unparse(stateBreweries.data));
  });

  console.log('✅ Success!');
} catch (error) {
  console.error(`🛑 ${error}`);
}
