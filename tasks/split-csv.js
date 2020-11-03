// Export /breweries.json to /breweries.csv

import {
  existsSync, mkdirSync, writeFileSync, readFileSync,
} from 'fs';
import Papa from 'papaparse';
import { join } from 'path';
import slugify from 'slugify';

const slugifyOptions = { remove: /[*+~.,()'"!:@/]/g };
const csvFilePath = join(__dirname, '../breweries.csv');
const storePath = join(__dirname, '../data');
const headers = 'id,name,brewery_type,street,address_2,address_3,city,state,county_province,postal_code,website_url,phone,created_at,updated_at,country,longitude,latitude,tags';

const skippedBreweries = [];

try {
  const csvFile = readFileSync(csvFilePath, { encoding: 'utf-8' });
  const results = Papa.parse(csvFile, { header: true });

  console.log('✂️ Splitting breweries.csv...');
  results.data.forEach((brewery) => {
    if (!brewery.id) return;

    const countrySlug = slugify(brewery.country.toLowerCase(), slugifyOptions);
    let stateSlug = '';

    if (brewery.state === '') {
      stateSlug = slugify(brewery.county_province.toLowerCase(), slugifyOptions);
    } else {
      stateSlug = slugify(brewery.state.toLowerCase(), slugifyOptions);
    }

    // Create empty folder for brewery country
    const countryPath = `${storePath}/${countrySlug}`;
    if (!existsSync(countryPath)) {
      console.log(`🌟 Creating ${countryPath}...`);
      mkdirSync(countryPath);
    }

    // Create empty folder for brewery state or county/province
    const statePath = `${countryPath}/${stateSlug}`;
    if (!existsSync(statePath)) {
      console.log(`🌟 Creating ${statePath}...`);
      mkdirSync(statePath);
    }

    // Create state file with headers
    const stateFilePath = `${statePath}/${stateSlug}.csv`;
    if (!existsSync(stateFilePath)) {
      console.log(`🌟 Creating ${stateFilePath}...`);
      writeFileSync(stateFilePath, headers);
    }

    // Read file into variable
    const stateFile = readFileSync(stateFilePath, { encoding: 'utf-8' });
    const stateBreweries = Papa.parse(stateFile, { header: true });

    if (stateBreweries.data.find((b) => b.id === brewery.id)) {
      console.log(`⏭ Skipping ${brewery.name}. (reason: duplicate)`);
      skippedBreweries.push(brewery);
    } else {
      console.log(`✍️ Adding ${brewery.name} to ${stateFilePath}`);
      stateBreweries.data.push(brewery);
    }

    writeFileSync(stateFilePath, Papa.unparse(stateBreweries.data));
  });

  if (skippedBreweries.length) {
    const csvSkippedFilePath = join(__dirname, '../skipped.csv');
    if (!existsSync(csvSkippedFilePath)) {
      writeFileSync(csvSkippedFilePath, headers);
    }
    writeFileSync(csvSkippedFilePath, Papa.unparse(skippedBreweries));
  }

  console.log('✅ Success!');
} catch (error) {
  console.error(`🛑 ${error}`);
}
