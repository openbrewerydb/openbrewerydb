// Import /breweries.json into /data

import {
  readFile, existsSync, mkdirSync, writeFileSync,
} from 'fs';
import jsonFormat from 'json-format';
import slugify from 'slugify';
import Papa from 'papaparse';
import { join } from 'path';

const importFilePath = join(__dirname, '../breweries.csv');
const storePath = join(__dirname, '../data/us');
const slugifyOptions = { remove: /[*+~.,()'"!:@]/g };

readFile(importFilePath, { encoding: 'utf-8' }, (err, data) => {
  if (!err) {
    Papa.parse(data, {
      header: true,
      complete: (results) => {
        let importErrors = 0;
        const { data: breweries } = results;
        const states = {};

        console.log(`ℹ️ Number of rows found: ${breweries.length}`);

        // Create parent country directory
        // TODO: Open this up for more than just 'us'
        if (!existsSync(storePath)) {
          mkdirSync(storePath);
        }

        breweries.forEach((brewery) => {
          const updatedBrewery = brewery;

          // Log error if state is empty
          if (brewery.state === undefined) {
            console.log(`👎 ${brewery.name} (${brewery.id}) doesn't have a state.`);
            importErrors += 1;
            return;
          }

          // Set up slugs
          const stateSlug = slugify(brewery.state.toLowerCase(), slugifyOptions);
          const citySlug = slugify(brewery.city.toLowerCase(), slugifyOptions);

          // Set up object, if needed
          if (states[stateSlug] === undefined) {
            states[stateSlug] = {};
          }
          if (states[stateSlug][citySlug] === undefined) {
            states[stateSlug][citySlug] = {
              breweries: [],
            };
          }

          // Convert `tags` to an array
          if (brewery.tags === '') {
            updatedBrewery.tags = [];
          } else {
            updatedBrewery.tags = brewery.tags.split(',');
          }

          // Push the current brewery object
          states[stateSlug][citySlug].breweries.push(updatedBrewery);
        });

        Object.keys(states).forEach((stateKey) => {
          const state = states[stateKey];

          // Create empty folder for brewery state, if it doesn't exist
          const statePath = `${storePath}/${stateKey}`;
          if (!existsSync(statePath)) {
            mkdirSync(statePath);
          }

          Object.keys(state).forEach((cityKey) => {
            const city = states[stateKey][cityKey];

            // Read file into variable
            const cityFilePath = `${statePath}/${cityKey}.json`;
            const cityBreweries = city.breweries;

            // Ovewrite file
            const jsonFormatConfig = {
              type: 'space',
              size: 2,
            };
            writeFileSync(cityFilePath, jsonFormat(cityBreweries, jsonFormatConfig));
          });
        });

        if (!importErrors) {
          console.log('✅ Successfully imported CSV!');
        } else {
          console.log(`❗️Import Errors: ${importErrors}`);
        }
      },
      error: (error) => {
        console.error(`🛑 Parse Error : ${error}`);
      },
    });
  } else {
    console.error(err);
  }
});
