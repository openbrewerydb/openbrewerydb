import { readFileSync, writeFileSync, statSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import { Brewery } from "./types";
import { papaParseOptions } from "./config";

interface BreweryStats {
  totalBreweries: number;
  byState: { [key: string]: number };
  byType: { [key: string]: number };
  byCity: { [key: string]: number };
  byCountry: { [key: string]: number };
  completeness: {
    total: number;
    byField: { [key: string]: number };
  };
}

function calculateCompleteness(breweries: Brewery[]): { total: number; byField: { [key: string]: number } } {
  const fields = Object.keys(breweries[0]).filter(field => field !== 'id');
  const totalFields = fields.length * breweries.length;
  let filledFields = 0;
  const byField: { [key: string]: number } = {};

  fields.forEach(field => {
    const filledCount = breweries.filter(b => b[field as keyof Brewery] !== null && b[field as keyof Brewery] !== '').length;
    byField[field] = Math.round((filledCount / breweries.length) * 100);
    filledFields += filledCount;
  });

  return {
    total: Math.round((filledFields / totalFields) * 100),
    byField
  };
}

function generateStats(breweries: Brewery[]): BreweryStats {
  const stats: BreweryStats = {
    totalBreweries: breweries.length,
    byState: {},
    byType: {},
    byCity: {},
    byCountry: {},
    completeness: {
      total: 0,
      byField: {}
    }
  };

  breweries.forEach(brewery => {
    // Count by state
    if (brewery.state_province) {
      stats.byState[brewery.state_province] = (stats.byState[brewery.state_province] || 0) + 1;
    }

    // Count by type
    if (brewery.brewery_type) {
      stats.byType[brewery.brewery_type] = (stats.byType[brewery.brewery_type] || 0) + 1;
    }

    // Count by city
    if (brewery.city && brewery.state_province) {
      // Include state with city to differentiate between cities with same name
      const cityKey = `${brewery.city}, ${brewery.state_province}`;
      stats.byCity[cityKey] = (stats.byCity[cityKey] || 0) + 1;
    }

    // Count by country
    if (brewery.country) {
      stats.byCountry[brewery.country] = (stats.byCountry[brewery.country] || 0) + 1;
    }
  });

  // Calculate data completeness
  stats.completeness = calculateCompleteness(breweries);

  return stats;
}

function formatStats(stats: BreweryStats): string {
  const sortedByCount = (obj: { [key: string]: number }) =>
    Object.entries(obj)
      .sort(([, a], [, b]) => b - a)
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

  // Get the last modified date of breweries.csv
  const breweriesFilePath = join(__dirname, '../breweries.csv');
  const { mtime } = statSync(breweriesFilePath);
  const lastUpdated = mtime.toISOString().split('T')[0];

  return `## 📊 Statistics

> Last updated: ${lastUpdated}

### Overview
- Total Breweries: ${stats.totalBreweries.toLocaleString()}
- Data Completeness: ${stats.completeness.total.toFixed(1)}%

### 🏛 Top 10 States by Brewery Count
| State | Count |
|-------|-------|
${Object.entries(sortedByCount(stats.byState))
  .slice(0, 10)
  .map(([state, count]) => `| ${state} | ${(count as number).toLocaleString()} |`)
  .join('\n')}

### 🍺 Brewery Types Distribution
| Type | Count | Percentage |
|------|--------|------------|
${Object.entries(sortedByCount(stats.byType))
  .map(([type, count]) => {
    const percentage = ((count as number / stats.totalBreweries) * 100).toFixed(1);
    return `| ${type} | ${(count as number).toLocaleString()} | ${percentage}% |`;
  })
  .join('\n')}

### 🌆 Top 10 Cities by Brewery Count
| City | Count |
|------|--------|
${Object.entries(sortedByCount(stats.byCity))
  .slice(0, 10)
  .map(([city, count]) => `| ${city} | ${(count as number).toLocaleString()} |`)
  .join('\n')}

### 🌍 By Country
| Country | Count | Percentage |
|---------|------------|------------|
${Object.entries(sortedByCount(stats.byCountry))
  .map(([country, count]) => {
    const percentage = ((count as number / stats.totalBreweries) * 100).toFixed(1);
    return `| ${country} | ${(count as number).toLocaleString()} | ${percentage}% |`;
  })
  .join('\n')}

### 📋 Data Completeness by Field
| Field | Completeness |
|-------|-------------|
${Object.entries(stats.completeness.byField)
  .sort(([, a], [, b]) => b - a)
  .map(([field, completeness]) => `| ${field} | ${completeness.toFixed(1)}% |`)
  .join('\n')}`;
}

function updateReadmeStats(statsContent: string) {
  const readmePath = join(__dirname, '../README.md');
  let readme = readFileSync(readmePath, 'utf-8');

  // Remove existing statistics section if it exists
  readme = readme.replace(/## 📊 Statistics[\s\S]*?$/, '');

  // Append new statistics at the end of the file
  readme = readme.trim() + '\n\n' + statsContent + '\n';

  // Write updated content back to README.md
  writeFileSync(readmePath, readme);
}

const main = async () => {
  try {
    console.log('Generating brewery statistics...');
    const startTime = new Date().getTime();

    // Read the main CSV file
    const csv = readFileSync(join(__dirname, '../breweries.csv'), { encoding: 'utf-8' });
    const breweries = Papa.parse<Brewery>(csv, papaParseOptions).data;

    // Generate and format statistics
    const stats = generateStats(breweries);
    const formattedStats = formatStats(stats);

    // Update README.md with new statistics
    updateReadmeStats(formattedStats);

    // Log statistics to console
    console.log(formattedStats);

    const endTime = new Date().getTime();
    console.log(`\n✨ Statistics generated and README.md updated in ${endTime - startTime}ms`);

    return stats;
  } catch (error) {
    console.error('Error generating statistics:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

export { generateStats, formatStats };
