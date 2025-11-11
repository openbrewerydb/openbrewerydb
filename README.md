# 🍻 Open Brewery DB Dataset

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-64-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

![Open Brewery DB Logo](obdb-logo-md.jpg)

This is the open-source dataset for the [Open Brewery DB API](https://www.openbrewerydb.org/) which is served by a [REST API built with Laravel](https://github.com/openbrewerydb/openbrewerydb-laravel-api)

## 🎯 Purpose

Provide an approval-based pipeline to update the dataset and API.

## 🗄 Data Formats

- [CSV - Full Dataset](breweries.csv)
- [JSON](breweries.json)
- [PostgreSQL SQL](breweries.sql)

## 🚀 Getting Started

1. `git clone git@github.com:openbrewerydb/openbrewerydb.git`
2. `cd openbrewerydb && npm install`

## ⚙️ Scripts

The following npm scripts help maintain and manage the dataset:

### Data Management

- `npm run validate`

  - Validates all CSV files against the JSON Schema
  - Checks for required fields and data format consistency
  - Reports any validation errors that need attention

- `npm run csv:combine`

  - Combines all individual CSV files from country/state-region folders into a single `breweries.csv`
  - Useful when you've made changes to individual state files and need to update the main dataset

- `npm run csv:split`
  - Splits the main `breweries.csv` into separate files by country/state-region
  - Helps maintain organized, manageable data files for each region
  - Creates directories if they don't exist

### Data Generation

- `npm run generate:ids`

  - Creates unique OBDB IDs for each brewery based on name and city
  - Automatically updates `breweries.csv` with new IDs
  - Ensures no duplicate IDs exist in the dataset

- `npm run generate:json`

  - Converts `breweries.csv` into a JSON format (`breweries.json`)
  - Useful for applications that prefer working with JSON data
  - Maintains data consistency across formats

- `npm run generate:sql`

  - Creates PostgreSQL SQL file from `breweries.csv`
  - Includes table creation and data insertion statements
  - Perfect for database implementations

- `npm run generate:stats`

  - Generates comprehensive dataset statistics
  - Shows brewery counts by state/city
  - Displays brewery type distribution
  - Reports data completeness metrics

- `npm run update:readme-stats`
  - Updates the Statistics section in `README.md` with latest data
  - Automatically calculates and formats all statistics
  - Includes last updated timestamp

### Contributor Management

- `npm run contributors:add`

  - Interactive CLI tool to add new contributors
  - Prompts for contributor information and contribution type
  - Updates `.all-contributorsrc` file

- `npm run contributors:check`

  - Verifies if any contributors are missing from the list
  - Helps maintain accurate recognition of all contributors

- `npm run contributors:generate`
  - Updates the Contributors section in `README.md`
  - Generates contributor table with avatars and contribution types

### Workflow

- `npm run workflow:maintain`
  - Comprehensive maintenance workflow that:
    1. Validates all CSV files
    2. Combines all CSV files
    3. Creates unique IDs for each brewery
    4. Splits back into individual state files
    5. Creates JSON and SQL files
    6. Updates README.md with latest statistics
  - Run this after making any dataset updates

## 🤝 Contributing

For information on contributing to this project, please see the [contributing guide](CONTRIBUTING.md) and our [code of conduct](CODE_OF_CONDUCT.md).

1. Fork the repository
2. Add or update breweries in the CSV (Excel, Google Sheets)
3. Submit a Pull Request

### Tips

First and foremost, don't worry about messing up! 🙂 Thank you so much for contributing! 🙌

- CSVs are organized by `data/[country]/[state_province]`
- Required fields/columns: `name`, `brewery_type`, `city`, `state_province`, and `country`
- When adding a brewery, do not include an `id`. This will be created after review.
- Please either add to `breweries.csv` (preferred if adding breweries for a new country) or the individual state/province CSV file. Adding to both at the same time may introduce duplicates/errors.

## 👾 Community

- [Join the Newsletter](http://eepurl.com/dBjS0j)
- [Join the Discord](https://discord.gg/3G3syaD)

## 📫 Feedback

Any feedback, please [email me](mailto:chris@openbrewerydb.org).

Cheers! 🍻

## 📊 Project Status

- **Status**: Active
- **Last Dataset Update**: 2024
- **Maintenance**: Actively maintained through community contributions
- **Dataset Size**: 8,000+ breweries
- **Coverage**: United States, with growing international data

## 🔧 Requirements

- Node.js v22 or higher
- npm package manager
- Git

## 📚 Data Schema

Each brewery entry contains the following fields:

| Field          | Type   | Description                                      | Required |
| -------------- | ------ | ------------------------------------------------ | -------- |
| id             | String | Unique identifier                                | Yes      |
| name           | String | Name of the brewery                              | Yes      |
| brewery_type   | String | Type of brewery (micro, regional, brewpub, etc.) | Yes      |
| street         | String | Street address                                   | No       |
| city           | String | City                                             | Yes      |
| state_province | String | State/Province                                   | Yes      |
| postal_code    | String | Postal code                                      | Yes      |
| country        | String | Country                                          | Yes      |
| longitude      | String | Decimal longitude coordinate                     | No       |
| latitude       | String | Decimal latitude coordinate                      | No       |
| phone          | String | Phone number                                     | No       |
| website_url    | String | Website URL                                      | No       |

## 📖 Usage Examples

### Python

```python
import pandas as pd

# Read CSV
breweries_df = pd.read_csv('breweries.csv')

# Filter by state
california_breweries = breweries_df[breweries_df['state_province'] == 'California']
```

### JavaScript/Node.js

```javascript
const fs = require("fs");

// Read JSON
const breweries = JSON.parse(fs.readFileSync("breweries.json", "utf8"));

// Filter by type
const microBreweries = breweries.filter((b) => b.brewery_type === "micro");
```

### SQL

```sql
-- After importing breweries.sql
SELECT name, city, state_province
FROM breweries
WHERE brewery_type = 'brewpub'
ORDER BY state_province, city;
```

## 🔄 Versioning

The dataset is updated regularly through community contributions. Each update goes through the following process:

1. Community members submit new breweries or updates via pull requests
2. Changes are reviewed and validated
3. Upon approval, changes are merged and new dataset files are generated
4. The API is automatically updated with the new data

Latest dataset version: 2024.1

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://theputnams.net/mike/"><img src="https://avatars3.githubusercontent.com/u/213371?v=4?s=100" width="100px;" alt="Mike Putnam"/><br /><sub><b>Mike Putnam</b></sub></a><br /><a href="#data-mikeputnam" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://andrewbarber.me/"><img src="https://avatars0.githubusercontent.com/u/135927?v=4?s=100" width="100px;" alt="Andrew A. Barber"/><br /><sub><b>Andrew A. Barber</b></sub></a><br /><a href="#data-AndrewBarber" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.therearefourmics.com/"><img src="https://avatars2.githubusercontent.com/u/39307371?v=4?s=100" width="100px;" alt="Jason Allen"/><br /><sub><b>Jason Allen</b></sub></a><br /><a href="#data-jallend1" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Juicob"><img src="https://avatars1.githubusercontent.com/u/68080175?v=4?s=100" width="100px;" alt="Juicob"/><br /><sub><b>Juicob</b></sub></a><br /><a href="#data-Juicob" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/wkarney"><img src="https://avatars0.githubusercontent.com/u/35663282?v=4?s=100" width="100px;" alt="Will Karnasiewicz"/><br /><sub><b>Will Karnasiewicz</b></sub></a><br /><a href="#data-wkarney" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://dvavs.github.io/"><img src="https://avatars0.githubusercontent.com/u/49594473?v=4?s=100" width="100px;" alt="Dylan T. Vavra"/><br /><sub><b>Dylan T. Vavra</b></sub></a><br /><a href="#data-dvavs" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/amadisonm1209"><img src="https://avatars0.githubusercontent.com/u/44384309?v=4?s=100" width="100px;" alt="Madison Martinez"/><br /><sub><b>Madison Martinez</b></sub></a><br /><a href="#data-amadisonm1209" title="Data">🔣</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/danieleremchuk"><img src="https://avatars0.githubusercontent.com/u/50344935?v=4?s=100" width="100px;" alt="Daniel Eremchuk"/><br /><sub><b>Daniel Eremchuk</b></sub></a><br /><a href="#data-danieleremchuk" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/alexchong"><img src="https://avatars2.githubusercontent.com/u/18007017?v=4?s=100" width="100px;" alt="Alex Chong"/><br /><sub><b>Alex Chong</b></sub></a><br /><a href="#data-alexchong" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.jackofalladmins.com/"><img src="https://avatars0.githubusercontent.com/u/19848610?v=4?s=100" width="100px;" alt="Matt S"/><br /><sub><b>Matt S</b></sub></a><br /><a href="#data-MStewGT" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/samuel-rusher/"><img src="https://avatars3.githubusercontent.com/u/55074718?v=4?s=100" width="100px;" alt="Samuel Rusher"/><br /><sub><b>Samuel Rusher</b></sub></a><br /><a href="#data-srusher" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/EACaraway"><img src="https://avatars1.githubusercontent.com/u/71463301?v=4?s=100" width="100px;" alt="Evan Caraway"/><br /><sub><b>Evan Caraway</b></sub></a><br /><a href="#data-EACaraway" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tylerkkp"><img src="https://avatars0.githubusercontent.com/u/30785626?v=4?s=100" width="100px;" alt="Tyler K Kuromiya Parker"/><br /><sub><b>Tyler K Kuromiya Parker</b></sub></a><br /><a href="#data-tylerkkp" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kendellmendoza"><img src="https://avatars.githubusercontent.com/u/32558172?v=4?s=100" width="100px;" alt="kendellmendoza"/><br /><sub><b>kendellmendoza</b></sub></a><br /><a href="#data-kendellmendoza" title="Data">🔣</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Johnnyk737"><img src="https://avatars.githubusercontent.com/u/20580717?v=4?s=100" width="100px;" alt="Johnnyk737"/><br /><sub><b>Johnnyk737</b></sub></a><br /><a href="#data-Johnnyk737" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jameshschuler"><img src="https://avatars.githubusercontent.com/u/41769529?v=4?s=100" width="100px;" alt="James Schuler"/><br /><sub><b>James Schuler</b></sub></a><br /><a href="#data-jameshschuler" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/cleif"><img src="https://avatars.githubusercontent.com/u/6209424?v=4?s=100" width="100px;" alt="Creighton Leif"/><br /><sub><b>Creighton Leif</b></sub></a><br /><a href="#data-cleif" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/vitaly-t"><img src="https://avatars.githubusercontent.com/u/5108906?v=4?s=100" width="100px;" alt="Vitaly Tomilov"/><br /><sub><b>Vitaly Tomilov</b></sub></a><br /><a href="https://github.com/openbrewerydb/openbrewerydb/commits?author=vitaly-t" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kylescudder"><img src="https://avatars.githubusercontent.com/u/74150974?v=4?s=100" width="100px;" alt="Kyle Scudder"/><br /><sub><b>Kyle Scudder</b></sub></a><br /><a href="#data-kylescudder" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://chrisjmears.com/"><img src="https://avatars.githubusercontent.com/u/96110?v=4?s=100" width="100px;" alt="Chris Mears"/><br /><sub><b>Chris Mears</b></sub></a><br /><a href="#question-chrisjm" title="Answering Questions">💬</a> <a href="https://github.com/openbrewerydb/openbrewerydb/commits?author=chrisjm" title="Code">💻</a> <a href="#data-chrisjm" title="Data">🔣</a> <a href="#maintenance-chrisjm" title="Maintenance">🚧</a> <a href="#projectManagement-chrisjm" title="Project Management">📆</a> <a href="#tool-chrisjm" title="Tools">🔧</a> <a href="#tutorial-chrisjm" title="Tutorials">✅</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/donkeyslaps"><img src="https://avatars.githubusercontent.com/u/91644699?v=4?s=100" width="100px;" alt="donkeyslaps"/><br /><sub><b>donkeyslaps</b></sub></a><br /><a href="#data-donkeyslaps" title="Data">🔣</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://deciphermiddleware.blogspot.com/"><img src="https://avatars.githubusercontent.com/u/30888879?v=4?s=100" width="100px;" alt="Pranav Davar"/><br /><sub><b>Pranav Davar</b></sub></a><br /><a href="#tool-cipherwizard9" title="Tools">🔧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ahbarrozo"><img src="https://avatars.githubusercontent.com/u/36050690?v=4?s=100" width="100px;" alt="Alexandre Hernandes Barrozo"/><br /><sub><b>Alexandre Hernandes Barrozo</b></sub></a><br /><a href="#data-ahbarrozo" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Resten1497"><img src="https://avatars.githubusercontent.com/u/19689492?v=4?s=100" width="100px;" alt="Resten"/><br /><sub><b>Resten</b></sub></a><br /><a href="#data-Resten1497" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://matthiggins.dev/"><img src="https://avatars.githubusercontent.com/u/8033424?v=4?s=100" width="100px;" alt="Matt Higgins"/><br /><sub><b>Matt Higgins</b></sub></a><br /><a href="#data-vextor22" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://alexjustesen.com/"><img src="https://avatars.githubusercontent.com/u/1144087?v=4?s=100" width="100px;" alt="Alex Justesen"/><br /><sub><b>Alex Justesen</b></sub></a><br /><a href="#data-alexjustesen" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.binarydolphin.com/"><img src="https://avatars.githubusercontent.com/u/4139590?v=4?s=100" width="100px;" alt="Craig Kelly"/><br /><sub><b>Craig Kelly</b></sub></a><br /><a href="#data-CraigKelly" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://rewak.pl/"><img src="https://avatars.githubusercontent.com/u/10898728?v=4?s=100" width="100px;" alt="Krzysztof Rewak"/><br /><sub><b>Krzysztof Rewak</b></sub></a><br /><a href="#data-krzysztofrewak" title="Data">🔣</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://johnbaumert.com/"><img src="https://avatars.githubusercontent.com/u/36886175?v=4?s=100" width="100px;" alt="John Baumert"/><br /><sub><b>John Baumert</b></sub></a><br /><a href="#data-baumertjohn" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/phortysiks"><img src="https://avatars.githubusercontent.com/u/25803180?v=4?s=100" width="100px;" alt="Charlie Cox"/><br /><sub><b>Charlie Cox</b></sub></a><br /><a href="#data-phortysiks" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/milsman2"><img src="https://avatars.githubusercontent.com/u/72627575?v=4?s=100" width="100px;" alt="Miles Kane"/><br /><sub><b>Miles Kane</b></sub></a><br /><a href="#data-milsman2" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/anthonylaflamme"><img src="https://avatars.githubusercontent.com/u/4626172?v=4?s=100" width="100px;" alt="Anthony Laflamme"/><br /><sub><b>Anthony Laflamme</b></sub></a><br /><a href="https://github.com/openbrewerydb/openbrewerydb/commits?author=anthonylaflamme" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Schurlo"><img src="https://avatars.githubusercontent.com/u/124918466?v=4?s=100" width="100px;" alt="Georg Engelsmann"/><br /><sub><b>Georg Engelsmann</b></sub></a><br /><a href="#data-Schurlo" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/solidocean007"><img src="https://avatars.githubusercontent.com/u/106035937?v=4?s=100" width="100px;" alt="Clinton Williams"/><br /><sub><b>Clinton Williams</b></sub></a><br /><a href="#data-solidocean007" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/buzzamus"><img src="https://avatars.githubusercontent.com/u/15583028?v=4?s=100" width="100px;" alt="Brent Busby"/><br /><sub><b>Brent Busby</b></sub></a><br /><a href="#data-buzzamus" title="Data">🔣</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kenster89"><img src="https://avatars.githubusercontent.com/u/32558172?v=4?s=100" width="100px;" alt="kenster89"/><br /><sub><b>kenster89</b></sub></a><br /><a href="#data-kenster89" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sadilet"><img src="https://avatars.githubusercontent.com/u/20108793?v=4?s=100" width="100px;" alt="Adilet Sarsembayev"/><br /><sub><b>Adilet Sarsembayev</b></sub></a><br /><a href="#data-sadilet" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://blog.deciphermiddleware.in/"><img src="https://avatars.githubusercontent.com/u/30888879?v=4?s=100" width="100px;" alt="Pranav Davar"/><br /><sub><b>Pranav Davar</b></sub></a><br /><a href="#data-pranav-davar" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/b-mc2"><img src="https://avatars.githubusercontent.com/u/78936105?v=4?s=100" width="100px;" alt="b-mc2"/><br /><sub><b>b-mc2</b></sub></a><br /><a href="#data-b-mc2" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nicole440"><img src="https://avatars.githubusercontent.com/u/111709554?v=4?s=100" width="100px;" alt="Nicole"/><br /><sub><b>Nicole</b></sub></a><br /><a href="#data-nicole440" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.reenhanced.com/"><img src="https://avatars.githubusercontent.com/u/602226?v=4?s=100" width="100px;" alt="Nicholas Hance"/><br /><sub><b>Nicholas Hance</b></sub></a><br /><a href="#data-nhance" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Jocce-Nilsson"><img src="https://avatars.githubusercontent.com/u/59723488?v=4?s=100" width="100px;" alt="Joachim Nilsson"/><br /><sub><b>Joachim Nilsson</b></sub></a><br /><a href="#data-Jocce-Nilsson" title="Data">🔣</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://alejandrolopezrocha.com/"><img src="https://avatars.githubusercontent.com/u/8307263?v=4?s=100" width="100px;" alt="Alejandro Lopez Rocha"/><br /><sub><b>Alejandro Lopez Rocha</b></sub></a><br /><a href="#data-alrocha" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/zshapleigh"><img src="https://avatars.githubusercontent.com/u/816109?v=4?s=100" width="100px;" alt="zshapleigh"/><br /><sub><b>zshapleigh</b></sub></a><br /><a href="#data-zshapleigh" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Stormalias"><img src="https://avatars.githubusercontent.com/u/44340476?v=4?s=100" width="100px;" alt="Praval Visvanath"/><br /><sub><b>Praval Visvanath</b></sub></a><br /><a href="#data-Stormalias" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://johnhenryward.me/"><img src="https://avatars.githubusercontent.com/u/43694168?v=4?s=100" width="100px;" alt="JohnHenry"/><br /><sub><b>JohnHenry</b></sub></a><br /><a href="#data-JohnHenry-Ward" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Jose-Alfredo-Garcia"><img src="https://avatars.githubusercontent.com/u/68479370?v=4?s=100" width="100px;" alt="Alfredo Garcia"/><br /><sub><b>Alfredo Garcia</b></sub></a><br /><a href="#data-Jose-Alfredo-Garcia" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Qerewe"><img src="https://avatars.githubusercontent.com/u/20256930?v=4?s=100" width="100px;" alt="Qerewe"/><br /><sub><b>Qerewe</b></sub></a><br /><a href="#data-Qerewe" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://portfolio.nathan-peters.me/"><img src="https://avatars.githubusercontent.com/u/77593152?v=4?s=100" width="100px;" alt="Nathan Peters"/><br /><sub><b>Nathan Peters</b></sub></a><br /><a href="#data-nathanpeters8" title="Data">🔣</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://www.eonjava.com/"><img src="https://avatars.githubusercontent.com/u/173938?v=4?s=100" width="100px;" alt="Erich Cervantez"/><br /><sub><b>Erich Cervantez</b></sub></a><br /><a href="#data-erichcervantez" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/epikkoder"><img src="https://avatars.githubusercontent.com/u/20148265?v=4?s=100" width="100px;" alt="Ronald Sahagun"/><br /><sub><b>Ronald Sahagun</b></sub></a><br /><a href="#data-epikkoder" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/gregwilson42"><img src="https://avatars.githubusercontent.com/u/132391327?v=4?s=100" width="100px;" alt="Greg W."/><br /><sub><b>Greg W.</b></sub></a><br /><a href="#data-gregwilson42" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/davidaholm"><img src="https://avatars.githubusercontent.com/u/4689571?v=4?s=100" width="100px;" alt="David Holm"/><br /><sub><b>David Holm</b></sub></a><br /><a href="#data-davidaholm" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sadilett"><img src="https://avatars.githubusercontent.com/u/195586942?v=4?s=100" width="100px;" alt="sadilett"/><br /><sub><b>sadilett</b></sub></a><br /><a href="#data-sadilett" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/RyanMallette"><img src="https://avatars.githubusercontent.com/u/13306840?v=4?s=100" width="100px;" alt="Ryan Mallette"/><br /><sub><b>Ryan Mallette</b></sub></a><br /><a href="#data-RyanMallette" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://chriscondreay.github.io/condreaychris/"><img src="https://avatars.githubusercontent.com/u/76202959?v=4?s=100" width="100px;" alt="Chris Condreay"/><br /><sub><b>Chris Condreay</b></sub></a><br /><a href="#data-chriscondreay" title="Data">🔣</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Wi5ARD"><img src="https://avatars.githubusercontent.com/u/42097753?v=4?s=100" width="100px;" alt="Wi5ARD"/><br /><sub><b>Wi5ARD</b></sub></a><br /><a href="#data-Wi5ARD" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://jpbulman.com/"><img src="https://avatars.githubusercontent.com/u/12652192?v=4?s=100" width="100px;" alt="JP Bulman"/><br /><sub><b>JP Bulman</b></sub></a><br /><a href="#data-jpbulman" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sarakaneki"><img src="https://avatars.githubusercontent.com/u/115870918?v=4?s=100" width="100px;" alt="Sara"/><br /><sub><b>Sara</b></sub></a><br /><a href="#data-sarakaneki" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://seanwp.pythonanywhere.com/"><img src="https://avatars.githubusercontent.com/u/133682090?v=4?s=100" width="100px;" alt="Sean"/><br /><sub><b>Sean</b></sub></a><br /><a href="#data-SeanRVACode" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://theclouddevopslearningblog.com/"><img src="https://avatars.githubusercontent.com/u/4686123?v=4?s=100" width="100px;" alt="Simon"/><br /><sub><b>Simon</b></sub></a><br /><a href="#data-simonmackinnon" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/willkrakow"><img src="https://avatars.githubusercontent.com/u/17362961?v=4?s=100" width="100px;" alt="willkrakow"/><br /><sub><b>willkrakow</b></sub></a><br /><a href="#data-willkrakow" title="Data">🔣</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CharlRitter"><img src="https://avatars.githubusercontent.com/u/13846799?v=4?s=100" width="100px;" alt="Charl Ritter"/><br /><sub><b>Charl Ritter</b></sub></a><br /><a href="#data-CharlRitter" title="Data">🔣</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/zingi"><img src="https://avatars.githubusercontent.com/u/9286499?v=4?s=100" width="100px;" alt="Aaron Zingerle"/><br /><sub><b>Aaron Zingerle</b></sub></a><br /><a href="#data-zingi" title="Data">🔣</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## 📊 Statistics

> Last updated: 2025-11-11

### Overview
- Total Breweries: 9,077
- Data Completeness: 78.0%

### 🏛 Top 10 States by Brewery Count
| State | Count |
|-------|-------|
| California | 919 |
| Washington | 498 |
| Colorado | 449 |
| New York | 419 |
| Michigan | 375 |
| Texas | 352 |
| Pennsylvania | 345 |
| Florida | 312 |
| North Carolina | 311 |
| Ohio | 303 |

### 🍺 Brewery Types Distribution
| Type | Count | Percentage |
|------|--------|------------|
| micro | 4,826 | 53.2% |
| brewpub | 2,574 | 28.4% |
| planning | 664 | 7.3% |
| closed | 313 | 3.4% |
| regional | 228 | 2.5% |
| contract | 187 | 2.1% |
| large | 114 | 1.3% |
| proprietor | 69 | 0.8% |
| taproom | 45 | 0.5% |
| bar | 37 | 0.4% |
| nano | 15 | 0.2% |
| beergarden | 3 | 0.0% |
| location | 1 | 0.0% |
| cidery | 1 | 0.0% |

### 🌆 Top 10 Cities by Brewery Count
| City | Count |
|------|--------|
| Denver, Colorado | 92 |
| San Diego, California | 91 |
| Portland, Oregon | 85 |
| Seattle, Washington | 85 |
| Chicago, Illinois | 64 |
| Austin, Texas | 49 |
| Houston, Texas | 40 |
| San Francisco, California | 39 |
| Minneapolis, Minnesota | 39 |
| Cincinnati, Ohio | 34 |

### 🌍 By Country
| Country | Count | Percentage |
|---------|------------|------------|
| United States | 8,121 | 89.5% |
| Australia | 514 | 5.7% |
| South Africa | 104 | 1.1% |
| Ireland | 70 | 0.8% |
| England | 62 | 0.7% |
| South Korea | 61 | 0.7% |
| Poland | 34 | 0.4% |
| Singapore | 33 | 0.4% |
| Austria | 15 | 0.2% |
| Portugal | 14 | 0.2% |
| Japan | 10 | 0.1% |
| Germany | 10 | 0.1% |
| Sweden | 10 | 0.1% |
| Scotland | 10 | 0.1% |
| Italy | 4 | 0.0% |
| France | 3 | 0.0% |
| Isle of Man | 2 | 0.0% |

### 📋 Data Completeness by Field
| Field | Completeness |
|-------|-------------|
| name | 100.0% |
| brewery_type | 100.0% |
| city | 100.0% |
| state_province | 100.0% |
| postal_code | 100.0% |
| country | 100.0% |
| address_1 | 92.0% |
| phone | 90.0% |
| website_url | 86.0% |
| longitude | 74.0% |
| latitude | 74.0% |
| address_2 | 3.0% |
| address_3 | 0.0% |
