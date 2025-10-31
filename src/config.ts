export const headers = [
  "id",
  "name",
  "brewery_type",
  "address_1",
  "address_2",
  "address_3",
  "city",
  "state_province",
  "postal_code",
  "country",
  "phone",
  "website_url",
  "longitude",
  "latitude",
];

export const BREWERY_TYPES = [
  "alt prop",
  "bar",
  "beer brand",
  "brewpub",
  "cidery",
  "closed",
  "contract",
  "large",
  "location",
  "micro",
  "nano",
  "office only location",
  "planning",
  "proprietor",
  "regional",
  "taproom",
  "beergarden"
] as const;

export const papaParseOptions = {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: {
    postal_code: false,
    longitude: true,
    latitude: true,
  },
  transform: (value: string | number | null | undefined) => {
    if (typeof value === 'string') {
      value = value.trim();
      return value === "" ? null : value;
    }
    return value;
  },
};

export const slugifyOptions = {
  remove: /[*+~.,()'"!:@/]/g,
  lower: true,
  strict: true,
};
