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
