// Split breweries.json into multiple files by state

import {
  readFile, existsSync, mkdirSync, writeFileSync, readFileSync,
} from 'fs';
import jsonFormat from 'json-format';
import { join } from 'path';
import STATES from './states';

const filePath = join(__dirname, '../data/breweries.json');
const storePath = join(__dirname, '../data/us');

readFile(filePath, { encoding: 'utf-8' }, (err, data) => {
  if (!err) {
    const breweries = JSON.parse(data);
    let errors = 0;

    // Create parent country directory
    if (!existsSync(storePath)) {
      mkdirSync(storePath);
    }

    breweries.forEach((brewery) => {
      const state = STATES[brewery.state];

      // Log error if state is empty
      if (state === undefined) {
        console.log(`👎 ${brewery.name} (${brewery.id}) doesn't have a state.`);
        errors += 1;
        return;
      }

      // Create empty file with empty array if it doesn't exist
      const stateFilePath = `${storePath}/${state.slug}.json`;
      if (!existsSync(stateFilePath)) {
        writeFileSync(stateFilePath, '[]');
      }

      // Read file into variable
      const stateBreweries = JSON.parse(readFileSync(stateFilePath));

      // Append current brewery
      stateBreweries.push(brewery);

      // Ovewrite file
      const jsonFormatConfig = {
        type: 'space',
        size: 2,
      };
      writeFileSync(stateFilePath, jsonFormat(stateBreweries, jsonFormatConfig));
    });
    console.log(`☹️ # of Errors: ${errors}`);
  } else {
    console.error(err);
  }
});
