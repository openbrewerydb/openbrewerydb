import { BreweryType } from "./utils/types";

export const headers = [
  "obdb_id",
  "name",
  "brewery_type",
  "street",
  "address_2",
  "address_3",
  "city",
  "state",
  "county_province",
  "postal_code",
  "website_url",
  "phone",
  "country",
  "longitude",
  "latitude",
  "tags",
];

export const slugifyOptions = {
  remove: /[*+~.,()'"!:@/]/g,
  lower: true,
  strict: true,
};

/** JSON Schema */
export const schema = {
  type: "object",
  required: ["name", "brewery_type", "city", "postal_code", "country"],
  properties: {
    obdb_id: {
      type: ["string", "null"],
    },
    name: {
      type: "string",
    },
    brewery_type: {
      enum: Object.values(BreweryType),
    },
    street: {
      type: ["string", "null"],
    },
    address_2: {
      type: ["string", "null"],
    },
    address_3: {
      type: ["string", "null"],
    },
    city: {
      type: "string",
    },
    state: {
      type: ["string", "null"],
    },
    county_province: {
      type: ["string", "null"],
    },
    postal_code: {
      type: ["string", "number"],
    },
    phone: {
      type: ["string", "number", "null"],
    },
    website_url: {
      type: ["string", "null"],
    },
    country: {
      type: "string",
    },
    longitude: {
      type: ["number", "null"],
    },
    latitude: {
      type: ["number", "null"],
    },
    tags: {
      type: ["array", "null"],
      uniqueItems: true,
      items: { type: "string" },
    },
  },
};
