// The script expects JSON file to exist after `npm run pipeline:download:ba`
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { BrewersAssociation } from "../types/index.js";

async function main() {
  const json = await readFile(
    path.join(__dirname, "../../tmp/ba-breweries.json"),
    "utf-8"
  );
  const data = JSON.parse(json) as BrewersAssociation[];

  function splitByCraftBrewery(data: BrewersAssociation[]) {
    const craftBreweries: BrewersAssociation[] = [];
    const nonCraftBreweries: BrewersAssociation[] = [];

    for (const obj of data) {
      if (obj.Is_Craft_Brewery__c) {
        craftBreweries.push(obj);
      } else {
        nonCraftBreweries.push(obj);
      }
    }

    return [craftBreweries, nonCraftBreweries];
  }

  const [craftBreweries, nonCraftBreweries] = splitByCraftBrewery(data);

  // Write the new file
  await writeFile(
    "../../tmp/ba-craft-breweries.json",
    JSON.stringify(craftBreweries)
  );
  await writeFile(
    "../../tmp/ba-non-craft-breweries.json",
    JSON.stringify(nonCraftBreweries)
  );
}

main().catch(console.error);
