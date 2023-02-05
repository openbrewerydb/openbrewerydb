export enum BreweryType {
  "micro",
  "nano",
  "regional",
  "brewpub",
  "large",
  "planning",
  "bar",
  "contract",
  "proprietor",
  "taproom",
  "closed",
}

export type BreweryKey =
  | "obdb_id"
  | "name"
  | "brewery_type"
  | "street"
  | "address_2"
  | "address_3"
  | "city"
  | "state"
  | "county_province"
  | "postal_code"
  | "website_url"
  | "phone"
  | "country"
  | "longitude"
  | "latitude"
  | "tags";

export interface Brewery {
  obdb_id: string;
  name: string;
  brewery_type: string;
  street: string;
  address_2: string;
  address_3: string;
  city: string;
  state: string;
  county_province: string;
  postal_code: string;
  website_url: string;
  phone: string;
  country: string;
  longitude: Float64Array;
  latitude: Float64Array;
  tags: string[];
}
