import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import { papaParseOptions } from "./config";
import { Brewery } from "./types";

const csvFilePath = join(__dirname, "../breweries.csv");
const jsonFilePath = join(__dirname, "../breweries.geojson");

function isValidCoordinate(longitude: number, latitude: number) {
  return (
    longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90
  );
}

interface GeoJsonFeature {
  type: "Feature";
  properties: { id: string };
  geometry: {
    type: "Point";
    coordinates: [number, number, number];
  };
}

interface GeoJsonObject {
  type: "FeatureCollection";
  crs: {
    type: string;
    properties: {
      name: string;
    };
  };
  features: GeoJsonFeature[];
}

let geoJson: GeoJsonObject = {
  type: "FeatureCollection",
  crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  features: [],
};

try {
  const data = readFileSync(csvFilePath, { encoding: "utf-8" });
  const result = Papa.parse<Brewery>(data, papaParseOptions);

  for (let brewery of result.data) {
    if (brewery.longitude && brewery.latitude) {
      if (isValidCoordinate(brewery.longitude, brewery.latitude)) {
        geoJson.features.push({
          type: "Feature",
          properties: { id: brewery.id },
          geometry: {
            type: "Point",
            coordinates: [brewery.longitude, brewery.latitude, 0.0],
          },
        });
      } else {
        console.log(
          `⚠️ ${brewery.name} (${brewery.state_province}, ${brewery.country}) has invalid coordinates (Lng: ${brewery.longitude}, Lat: ${brewery.latitude})`
        );
      }
    }
  }

  if (geoJson.features.length) {
    console.log(`📝 Writing to ${jsonFilePath}`);
    writeFileSync(jsonFilePath, JSON.stringify(geoJson));
    console.log("Summary:");
    console.log(`🍺 Total Breweries: ${geoJson.features.length}`);
  }
} catch (error) {
  console.error(`🛑 ${error}`);
}
