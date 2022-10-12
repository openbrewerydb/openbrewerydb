# 🍻 Open Brewery DB Dataset

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-28-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

![Open Brewery DB Logo](obdb-logo-md.jpg)

This is the open-source dataset for the [Open Brewery DB API](https://www.openbrewerydb.org/) which is served by a [REST API built with Ruby on Rails](https://github.com/chrisjm/openbrewerydb-rails-api)

## 🎯 Purpose

Provide an approval-based pipeline to update the dataset and API.

## 🗄 Data Formats

- [CSV - Full Dataset](breweries.csv) (1.5 MB)
- [CSV - Lite Dataset](breweries-lite.csv) (460 KB) - Only the features `name`, `city`, `state`, and `country` for breweries without the `closed` brewery type.
- [JSON](breweries.json)
- [PostgreSQL SQL](breweries.sql)

### API

Access the dataset programmatically via the [Open Brewery DB API](https://www.openbrewerydb.org/). Use the following tools to get started without any code:

#### [databar.ai](https://databar.ai)
If you don't know how to use APIs, you can use Brewery DB without code through the [databar.ai](https://databar.ai) platform.

[![Run without code](https://databar.ai/external/ref_button.svg)](https://databar.ai/source/36?utm_source=brewery&utm_campaign=apiref)

#### [Postman](https://www.postman.com/)
A shared Postman collection containing all the API requests to fetch breweries information from the open-source dataset.

[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/1913239-1eef575a-1e78-4d6e-9678-f4649acce4ef?action=collection%2Ffork&collection-url=entityId%3D1913239-1eef575a-1e78-4d6e-9678-f4649acce4ef%26entityType%3Dcollection%26workspaceId%3D4d34510d-0d62-465a-a884-20c6ae1d468d)

## 🚀 Getting Started

1. `git clone git@github.com:openbrewerydb/openbrewerydb.git`
2. `cd openbrewerydb && npm install`


## 🤝 Contributing

For information on contributing to this project, please see the [contributing guide](CONTRIBUTING.md) and our [code of conduct](CODE_OF_CONDUCT.md).

1. Fork the repository
2. Add or update breweries in the CSV (Excel, Google Sheets)
3. Submit a Pull Request

### Tips

- CSVs are organized by `data/[country]/[state]` or `data/[country]/[county_province]`
- Required fields/columns: `name`, `street`, `brewery_type`, `city`, `state` (or `county_province`), `postal_code`, and `country`

## ⚙️ Scripts

These are the npm scripts used to maintain this dataset.

- `npm run csv:combine` - Combine CSVs from country/state-region folders into `breweries.csv`
- `npm run csv:split` - Split `breweries.csv` into country/state-region/city CSVs
- `npm run contributors:add` - Add contributor (interactive CLI)
- `npm run contributors:check` - Check if there are any missing contributors
- `npm run contributors:generate` - Generate contributors into `README.md`
- `npm run generate:ids` - Generate unique OBDB IDs based on the brewery name and city and overwrite `breweries.csv`
- `npm run generate:json` - Generate JSON from `breweries.csv` output to `breweries.json`
- `npm run generate:sql` - Generate PostgreSQL SQL from `breweries.csv` output to `breweries.sql`
- `npm run validate` - Validate CSVs based on JSON Schema
- `npm run workflow:maintain` - Combine, generate, split (used when updating individual CSVs)

## 👾 Community

- [Join the Newsletter](http://eepurl.com/dBjS0j)
- [Join the Discord](https://discord.gg/SHtpdEN)

## 📫 Feedback

Any feedback, please [email me](mailto:chris@openbrewerydb.org).

Cheers! 🍻

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://theputnams.net/mike/"><img src="https://avatars3.githubusercontent.com/u/213371?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Mike Putnam</b></sub></a><br /><a href="#data-mikeputnam" title="Data">🔣</a></td>
    <td align="center"><a href="https://andrewbarber.me/"><img src="https://avatars0.githubusercontent.com/u/135927?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Andrew A. Barber</b></sub></a><br /><a href="#data-AndrewBarber" title="Data">🔣</a></td>
    <td align="center"><a href="http://www.therearefourmics.com/"><img src="https://avatars2.githubusercontent.com/u/39307371?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jason Allen</b></sub></a><br /><a href="#data-jallend1" title="Data">🔣</a></td>
    <td align="center"><a href="https://github.com/Juicob"><img src="https://avatars1.githubusercontent.com/u/68080175?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Juicob</b></sub></a><br /><a href="#data-Juicob" title="Data">🔣</a></td>
    <td align="center"><a href="https://github.com/wkarney"><img src="https://avatars0.githubusercontent.com/u/35663282?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Will Karnasiewicz</b></sub></a><br /><a href="#data-wkarney" title="Data">🔣</a></td>
    <td align="center"><a href="https://dvavs.github.io/"><img src="https://avatars0.githubusercontent.com/u/49594473?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Dylan T. Vavra</b></sub></a><br /><a href="#data-dvavs" title="Data">🔣</a></td>
    <td align="center"><a href="https://github.com/amadisonm1209"><img src="https://avatars0.githubusercontent.com/u/44384309?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Madison Martinez</b></sub></a><br /><a href="#data-amadisonm1209" title="Data">🔣</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/danieleremchuk"><img src="https://avatars0.githubusercontent.com/u/50344935?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Daniel Eremchuk</b></sub></a><br /><a href="#data-danieleremchuk" title="Data">🔣</a></td>
    <td align="center"><a href="https://github.com/alexchong"><img src="https://avatars2.githubusercontent.com/u/18007017?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alex Chong</b></sub></a><br /><a href="#data-alexchong" title="Data">🔣</a></td>
    <td align="center"><a href="https://www.jackofalladmins.com/"><img src="https://avatars0.githubusercontent.com/u/19848610?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Matt S</b></sub></a><br /><a href="#data-MStewGT" title="Data">🔣</a></td>
    <td align="center"><a href="https://www.linkedin.com/in/samuel-rusher/"><img src="https://avatars3.githubusercontent.com/u/55074718?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Samuel Rusher</b></sub></a><br /><a href="#data-srusher" title="Data">🔣</a></td>
    <td align="center"><a href="https://github.com/EACaraway"><img src="https://avatars1.githubusercontent.com/u/71463301?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Evan Caraway</b></sub></a><br /><a href="#data-EACaraway" title="Data">🔣</a></td>
    <td align="center"><a href="https://github.com/tylerkkp"><img src="https://avatars0.githubusercontent.com/u/30785626?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Tyler K Kuromiya Parker</b></sub></a><br /><a href="#data-tylerkkp" title="Data">🔣</a></td>
    <td align="center"><a href="https://github.com/kendellmendoza"><img src="https://avatars.githubusercontent.com/u/32558172?v=4?s=100" width="100px;" alt=""/><br /><sub><b>kendellmendoza</b></sub></a><br /><a href="#data-kendellmendoza" title="Data">🔣</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/Johnnyk737"><img src="https://avatars.githubusercontent.com/u/20580717?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Johnnyk737</b></sub></a><br /><a href="#data-Johnnyk737" title="Data">🔣</a></td>
    <td align="center"><a href="https://github.com/jameshschuler"><img src="https://avatars.githubusercontent.com/u/41769529?v=4?s=100" width="100px;" alt=""/><br /><sub><b>James Schuler</b></sub></a><br /><a href="#data-jameshschuler" title="Data">🔣</a></td>
    <td align="center"><a href="https://github.com/cleif"><img src="https://avatars.githubusercontent.com/u/6209424?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Creighton Leif</b></sub></a><br /><a href="#data-cleif" title="Data">🔣</a></td>
    <td align="center"><a href="https://github.com/vitaly-t"><img src="https://avatars.githubusercontent.com/u/5108906?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Vitaly Tomilov</b></sub></a><br /><a href="https://github.com/openbrewerydb/openbrewerydb/commits?author=vitaly-t" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/kylescudder"><img src="https://avatars.githubusercontent.com/u/74150974?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Kyle Scudder</b></sub></a><br /><a href="#data-kylescudder" title="Data">🔣</a></td>
    <td align="center"><a href="https://chrisjmears.com/"><img src="https://avatars.githubusercontent.com/u/96110?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Chris Mears</b></sub></a><br /><a href="#question-chrisjm" title="Answering Questions">💬</a> <a href="https://github.com/openbrewerydb/openbrewerydb/commits?author=chrisjm" title="Code">💻</a> <a href="#data-chrisjm" title="Data">🔣</a> <a href="#maintenance-chrisjm" title="Maintenance">🚧</a> <a href="#projectManagement-chrisjm" title="Project Management">📆</a> <a href="#tool-chrisjm" title="Tools">🔧</a> <a href="#tutorial-chrisjm" title="Tutorials">✅</a></td>
    <td align="center"><a href="https://github.com/donkeyslaps"><img src="https://avatars.githubusercontent.com/u/91644699?v=4?s=100" width="100px;" alt=""/><br /><sub><b>donkeyslaps</b></sub></a><br /><a href="#data-donkeyslaps" title="Data">🔣</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://deciphermiddleware.blogspot.com/"><img src="https://avatars.githubusercontent.com/u/30888879?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Pranav Davar</b></sub></a><br /><a href="#tool-cipherwizard9" title="Tools">🔧</a></td>
    <td align="center"><a href="https://github.com/ahbarrozo"><img src="https://avatars.githubusercontent.com/u/36050690?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alexandre Hernandes Barrozo</b></sub></a><br /><a href="#data-ahbarrozo" title="Data">🔣</a></td>
    <td align="center"><a href="https://github.com/Resten1497"><img src="https://avatars.githubusercontent.com/u/19689492?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Resten</b></sub></a><br /><a href="#data-Resten1497" title="Data">🔣</a></td>
    <td align="center"><a href="https://matthiggins.dev/"><img src="https://avatars.githubusercontent.com/u/8033424?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Matt Higgins</b></sub></a><br /><a href="#data-vextor22" title="Data">🔣</a></td>
    <td align="center"><a href="https://alexjustesen.com/"><img src="https://avatars.githubusercontent.com/u/1144087?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alex Justesen</b></sub></a><br /><a href="#data-alexjustesen" title="Data">🔣</a></td>
    <td align="center"><a href="https://www.binarydolphin.com/"><img src="https://avatars.githubusercontent.com/u/4139590?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Craig Kelly</b></sub></a><br /><a href="#data-CraigKelly" title="Data">🔣</a></td>
    <td align="center"><a href="http://rewak.pl/"><img src="https://avatars.githubusercontent.com/u/10898728?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Krzysztof Rewak</b></sub></a><br /><a href="#data-krzysztofrewak" title="Data">🔣</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
