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
  "micro",
  "nano",
  "regional",
  "brewpub",
  "large",
  "planning",
  "bar",
  "contract",
  "proprietor",
  "closed",
  "taproom",
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
    return value === "" ? null : value;
  },
};

export const slugifyOptions = {
  remove: /[*+~.,()'"!:@/]/g,
  lower: true,
  strict: true,
};
