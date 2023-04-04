import * as fs from "fs";
import path from "path";
import stringSimilarity from "string-similarity";
import { v4 as uuid } from "uuid";
import Papa from "papaparse";
import slugify from "slugify";
import { slugifyOptions, headers } from "../config";

interface Brewery {
  id: string;
  name: string;
  brewery_type: string;
  address_1: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone?: string;
  website_url?: string;
  latitude: number;
  longitude: number;
}

interface AbaData {
  attributes: {
    type: string;
    url: string;
  };
  Id: string;
  Name: string;
  Parent?: any;
  Phone: string;
  Website: string;
  Brewery_Type__c: string;
  BillingAddress: {
    city: string;
    country: string;
    countryCode: string;
    geocodeAccuracy: string;
    latitude: number;
    longitude: number;
    postalCode: string;
    state: string;
    stateCode: string;
    street: string;
  };
  Is_Craft_Brewery__c: boolean;
  Voting_Member__c: boolean;
  Membership_Record_Item__c?: any;
  Membership_Record_Paid_Through_Date__c?: any;
  Membership_Record_Status__c?: any;
  Account_Badges__c?: any;
}

const abaFilePath = path.join(__dirname, "../../tmp/aba-breweries.json");
const breweriesFilePath = path.join(__dirname, "../../breweries.json");
const csvFilePath = path.join(__dirname, "../../breweries.csv");
let abaBreweries: AbaData[];
let breweries: Brewery[];

try {
  abaBreweries = JSON.parse(fs.readFileSync(abaFilePath, "utf-8"));
  breweries = JSON.parse(fs.readFileSync(breweriesFilePath, "utf-8"));
} catch (err) {
  throw err;
}

const numAbaRecords = abaBreweries.length;
const numBreweries = breweries.length;
const craftBreweries = abaBreweries.filter(
  (b) =>
    b.Is_Craft_Brewery__c &&
    b.BillingAddress.city &&
    b.BillingAddress.state &&
    b.BillingAddress.street
);
const matches: { [id: string]: string } = {};

const breweriesById = breweries.reduce((m: Record<string, Brewery>, b) => {
  m[b.id] = b;
  return m;
}, {});

const formattedBreweries: Brewery[] = craftBreweries.map((brewery) => {
  return {
    id: brewery.Id,
    name: brewery.Name,
    brewery_type: brewery.Brewery_Type__c?.toLowerCase(),
    address_1: brewery.BillingAddress.street,
    address_2: null,
    address_3: null,
    city: brewery.BillingAddress.city,
    state_province: brewery.BillingAddress.state,
    postal_code: brewery.BillingAddress.postalCode,
    country: brewery.BillingAddress.country,
    phone: brewery.Phone?.replace(/[\s()+-]/g, ""),
    website_url: brewery.Website
      ? "http://" + brewery.Website.replace(/[\s]/g, "")
      : undefined,
    latitude: brewery.BillingAddress.latitude,
    longitude: brewery.BillingAddress.longitude,
  };
});

const abaBreweriesById = formattedBreweries.reduce(
  (m: Record<string, Brewery>, b) => {
    m[b.id] = b;
    return m;
  },
  {}
);

const breweryTable: { [key: string]: Brewery } = {};

breweries
  .filter(
    (brewery) => brewery.city && brewery.state_province && brewery.address_1
  )
  .forEach((brewery) => {
    const key = slugify(
      `${brewery.city.toLowerCase()}_${brewery.state_province.toLowerCase()}_${brewery.address_1.toLowerCase()}_${brewery.brewery_type.toLowerCase()}`,
      slugifyOptions
    );
    breweryTable[key] = brewery;
  });

formattedBreweries.forEach((formattedBrewery) => {
  const key = slugify(
    `${formattedBrewery.city.toLowerCase()}_${formattedBrewery.state_province.toLowerCase()}_${formattedBrewery.address_1.toLowerCase()}_${formattedBrewery.brewery_type.toLowerCase()}`,
    slugifyOptions
  );
  const brewery = breweryTable[key];
  if (brewery) {
    const similarity = stringSimilarity.compareTwoStrings(
      formattedBrewery.name.toLowerCase(),
      brewery.name.toLowerCase()
    );
    if (similarity >= 0.8) {
      matches[formattedBrewery.id] = brewery.id;
    }
  }
});

const numCraftBreweries = craftBreweries.length;
const numVotingMembers = craftBreweries.filter(
  (b) => b.Voting_Member__c
).length;
const numParentCompanies = craftBreweries.filter((b) => b.Parent).length;
const numMatches = Object.keys(matches).length;

for (const [abaBreweryId, breweryId] of Object.entries(matches)) {
  breweriesById[breweryId].name = abaBreweriesById[abaBreweryId].name;
  breweriesById[breweryId].brewery_type =
    abaBreweriesById[abaBreweryId].brewery_type;
  breweriesById[breweryId].address_1 = abaBreweriesById[abaBreweryId].address_1;
  breweriesById[breweryId].city = abaBreweriesById[abaBreweryId].city;
  breweriesById[breweryId].state_province =
    abaBreweriesById[abaBreweryId].state_province;
  breweriesById[breweryId].postal_code =
    abaBreweriesById[abaBreweryId].postal_code;
  breweriesById[breweryId].country = abaBreweriesById[abaBreweryId].country;
  breweriesById[breweryId].phone = abaBreweriesById[abaBreweryId].phone;
  breweriesById[breweryId].website_url =
    abaBreweriesById[abaBreweryId].website_url;
  breweriesById[breweryId].latitude = abaBreweriesById[abaBreweryId].latitude;
  breweriesById[breweryId].longitude = abaBreweriesById[abaBreweryId].longitude;
}

// Add unmatched data to breweries with a new UUID v4
for (const [abaBreweryId, brewery] of Object.entries(abaBreweriesById)) {
  if (matches[abaBreweryId]) continue;
  const new_id = uuid();
  breweriesById[new_id] = {
    ...brewery,
    id: new_id,
  };
}

// Sort Breweries by name
const sortedBreweries = Object.values(breweriesById)
  .map((b) => b)
  .sort((a, b) => (a.name < b.name ? -1 : 1));

const numTotalBreweries = sortedBreweries.length;

try {
  fs.writeFileSync(
    csvFilePath,
    Papa.unparse(sortedBreweries, {
      columns: headers,
      skipEmptyLines: true,
    })
  );
} catch (error) {
  console.log(error);
  throw new Error("Error");
}

const numGeocoded = sortedBreweries.filter(
  (b) => b.latitude && b.longitude
).length;

console.log(`Stats:`);
console.log(`💯 - ${numAbaRecords} total ABA records`);
console.log(
  `🍺 - ${numCraftBreweries} ABA craft breweries (${Math.round(
    (numCraftBreweries / numAbaRecords) * 100
  )}%)`
);
console.log(
  `🗳️  - ${numVotingMembers} ABA craft breweries are voting members (${Math.round(
    (numVotingMembers / numCraftBreweries) * 100
  )}%)`
);
console.log(
  `🎩 - ${numParentCompanies} ABA craft breweries are parent companies (${Math.round(
    (numParentCompanies / numCraftBreweries) * 100
  )}%)`
);
console.log("---");
console.log(`🍻 - ${numBreweries} total OBDB Breweries`);
console.log(
  `✅ - ${numMatches} ABA craft breweries match OBDB breweries (${Math.round(
    (numMatches / numCraftBreweries) * 100
  )}%)`
);
console.log("---");
console.log(
  `🌐 - ${numGeocoded} breweries are geocoded (${Math.round(
    (numGeocoded / numTotalBreweries) * 100
  )}%)`
);
console.log(`📝 Wrote ${numTotalBreweries} breweries!`);
