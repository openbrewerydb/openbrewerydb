import * as dotenv from "dotenv";
import * as fs from "fs";
import pgp from "pg-promise";
import path from "path";
import { BrewersAssociation } from "src/types";

dotenv.config();

async function main() {
  const schema = "pipelines";
  const now = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 8);
  const tableName = `ba_breweries_${now}`;

  const baFilePath = path.join(
    __dirname,
    "../../../tmp/ba-craft-breweries.json"
  );
  const baBreweries = JSON.parse(fs.readFileSync(baFilePath, "utf-8"));

  const client = pgp()(process.env.OBDB_DEV || "");

  await client.query(`
    CREATE SCHEMA IF NOT EXISTS ${schema};
  `);

  const columns = [
    "id",
    "name",
    "parent",
    "phone",
    "website",
    "brewery_type",
    "billing_address_city",
    "billing_address_country",
    "billing_address_country_code",
    "billing_address_geocode_accuracy",
    "billing_address_latitude",
    "billing_address_longitude",
    "billing_address_postal_code",
    "billing_address_state",
    "billing_address_state_code",
    "billing_address_street",
    "is_craft_brewery",
    "voting_member",
    "membership_record_item",
    "membership_record_paid_through_date",
    "membership_record_status",
    "account_badges",
  ];
  const columnSchema = [
    "id TEXT",
    "name TEXT",
    "parent TEXT",
    "phone TEXT",
    "website TEXT",
    "brewery_type TEXT",
    "billing_address_city TEXT",
    "billing_address_country TEXT",
    "billing_address_country_code TEXT",
    "billing_address_geocode_accuracy TEXT",
    "billing_address_latitude NUMERIC",
    "billing_address_longitude NUMERIC",
    "billing_address_postal_code TEXT",
    "billing_address_state TEXT",
    "billing_address_state_code TEXT",
    "billing_address_street TEXT",
    "is_craft_brewery BOOLEAN",
    "voting_member BOOLEAN",
    "membership_record_item TEXT",
    "membership_record_paid_through_date TEXT",
    "membership_record_status TEXT",
    "account_badges TEXT",
  ];

  await client.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.${tableName} (
      ${columnSchema.join(", ")}
    );
    TRUNCATE TABLE ${schema}.${tableName};
  `);

  const formattedBreweries = baBreweries.map((brewery: BrewersAssociation) => {
    return {
      id: brewery.Id,
      name: brewery.Name,
      parent: brewery.Parent?.Id,
      phone: brewery.Phone,
      website: brewery.Website,
      brewery_type: brewery.Brewery_Type__c,
      is_craft_brewery: brewery.Is_Craft_Brewery__c,
      voting_member: brewery.Voting_Member__c,
      membership_record_item: brewery.Membership_Record_Item__c,
      membership_record_paid_through_date:
        brewery.Membership_Record_Paid_Through_Date__c,
      membership_record_status: brewery.Membership_Record_Status__c,
      account_badges: brewery.Account_Badges__c,
      billing_address_city: brewery.BillingAddress.city,
      billing_address_country: brewery.BillingAddress.country,
      billing_address_country_code: brewery.BillingAddress.countryCode,
      billing_address_geocode_accuracy: brewery.BillingAddress.geocodeAccuracy,
      billing_address_latitude: brewery.BillingAddress.latitude,
      billing_address_longitude: brewery.BillingAddress.longitude,
      billing_address_postal_code: brewery.BillingAddress.postalCode,
      billing_address_state: brewery.BillingAddress.state,
      billing_address_state_code: brewery.BillingAddress.stateCode,
      billing_address_street: brewery.BillingAddress.street,
    };
  });

  const insert = pgp().helpers.insert(formattedBreweries, columns, {
    table: tableName,
    schema,
  });

  client.query(insert, `pipelines.${tableName}`);
}

main().catch(console.error);
