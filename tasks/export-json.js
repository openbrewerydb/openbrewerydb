// Export /data to /breweries.json

import {
  writeFileSync, readFileSync,
} from 'fs';
import { join } from 'path';
import glob from 'glob';

const fileGlob = join(__dirname, '../data/**/*.json');
const filePath = join(__dirname, '../breweries.json');

glob(fileGlob, {}, (globError, files) => {
  const breweries = [];

  if (!globError) {
    files.forEach((file) => {
      try {
        const data = readFileSync(file, { encoding: 'utf-8' });
        const cityBreweries = JSON.parse(data);
        breweries.push(...cityBreweries);
      } catch (error) {
        console.error(error);
      }
    });

    if (breweries.length) {
      console.log(`🗂 Total Files: ${files.length}`);
      console.log(`🍺 Total Breweries: ${breweries.length}`);

      writeFileSync(filePath, JSON.stringify(breweries));
      console.log(`📝 Wrote to ${filePath}`);
    } else {
      console.log('👎 No breweries found.');
    }
  } else {
    console.error(globError);
  }
});
