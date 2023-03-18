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

export const slugifyOptions = {
  remove: /[*+~.,()'"!:@/]/g,
  lower: true,
  strict: true,
};
