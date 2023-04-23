import https from "https";
import fs from "fs";
import path from "path";

const fileUrl =
  "https://www.brewersassociation.org/wp-content/themes/ba2019/json-store/breweries/breweries.json";
const directory = path.join(__dirname, "../../../tmp");
const filePath = directory + "/ba-breweries.json";

// Create the tmp directory if it doesn't exist
fs.mkdirSync(directory, { recursive: true });

// Delete the contents of the file if it exists
if (fs.existsSync(filePath)) {
  console.log(`Truncate ${filePath}`);
  fs.truncateSync(filePath);
}

// Download the file using https and save it to the tmp directory
const file = fs.createWriteStream(filePath);
console.log(`Writing to ${filePath}...`);
https.get(fileUrl, (response) => {
  response.pipe(file);
});
