import * as fs from "fs";
import path from "path";
import stringSimilarity from "string-similarity";

interface Brewery {
  id: string;
  name: string;
  brewery_type: string;
  address_1: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone: string;
  website: string;
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

const abaFilePath = path.join(
  __dirname,
  "../archive/aba-breweries-20230330.json"
);
const breweriesFilePath = path.join(__dirname, "../breweries.json");
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
const craftBreweries = abaBreweries.filter((b) => b.Is_Craft_Brewery__c);
const matches: { [id: string]: string } = {};

const breweriesById = breweries.reduce((m: Record<string, Brewery>, b) => {
  m[b.id] = b;
  return m;
}, {});

const formattedBreweries: Brewery[] = craftBreweries
  .filter(
    (brewery) => brewery.BillingAddress.city && brewery.BillingAddress.state
  )
  .map((brewery) => {
    return {
      id: brewery.Id,
      name: brewery.Name,
      brewery_type: brewery.Brewery_Type__c?.toLowerCase(),
      address_1: brewery.BillingAddress.street,
      city: brewery.BillingAddress.city,
      state_province: brewery.BillingAddress.state,
      postal_code: brewery.BillingAddress.postalCode,
      country: brewery.BillingAddress.country,
      phone: brewery.Phone,
      website: brewery.Website,
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

breweries.forEach((brewery) => {
  const key = `${brewery.city.toLowerCase()}_${brewery.state_province.toLowerCase()}_${brewery.address_1?.toLowerCase()}`;
  breweryTable[key] = brewery;
});

formattedBreweries.forEach((formattedBrewery) => {
  const key = `${formattedBrewery.city.toLowerCase()}_${formattedBrewery.state_province.toLowerCase()}_${formattedBrewery.address_1?.toLowerCase()}`;
  const brewery = breweryTable[key];
  if (brewery) {
    const similarity = stringSimilarity.compareTwoStrings(
      formattedBrewery.name.toLowerCase(),
      brewery.name.toLowerCase()
    );
    if (similarity >= 0.7) {
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

// console.dir(craftBreweries.slice(0, 1), { depth: null });
// console.log(Object.entries(breweriesById).slice(0, 1));

console.log(`Stats:`);
console.log(`💯 - ${numAbaRecords} total ABA records`);
console.log(
  `🍺 - ${numCraftBreweries} ASA craft breweries (${Math.round(
    (numCraftBreweries / numAbaRecords) * 100
  )}%)`
);
console.log(
  `🗳️  - ${numVotingMembers} ASA breweries are voting members (${Math.round(
    (numVotingMembers / numAbaRecords) * 100
  )}%)`
);
console.log(
  `🎩 - ${numParentCompanies} ASA breweries are parent companies (${Math.round(
    (numParentCompanies / numAbaRecords) * 100
  )}%)`
);
console.log(`🍻 - ${numBreweries} total OBDB Breweries`);
console.log(
  `✅ - ${numMatches} ASA breweries match OBDB breweries (${Math.round(
    (numMatches / numBreweries) * 100
  )}%)`
);

Object.entries(matches)
  .slice(0, 5)
  .forEach(([abaId, breweryId]) => {
    console.log(`${abaId} = ${breweryId}`);
    console.log('ABA', abaBreweriesById[abaId]);
    console.log('OBDB', breweriesById[breweryId]);
  });
