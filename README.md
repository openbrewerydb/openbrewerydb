![Open Brewery DB Logo](OpenBreweryDBLogo.png)

# 🍻 Open Brewery DB Dataset

## Overview

This is the dataset for the [Open Brewery DB API](https://www.openbrewerydb.org/).

## Purpose

Provide an approval-based pipeline to update the dataset and API.

## Data Formats

[CSV](/breweries.csv)
[JSON](/breweries.json)

## Roadmap Progress

- [x] 📤 Release data set
- [x] ✅ Task > Import JSON (i.e., /breweries.json ➡️ /data)
- [x] ✅ Task > Export JSON (i.e., /data ➡️ /breweries.json)
- [x] ✅ Task > Export CSV (i.e., /data ➡️ /breweries.csv)
- [ ] ✅ Task > Import CSV (i.e., /breweries.csv ➡️ /data)
- [ ] ⚙️ Github Action > Validate Data
- [ ] 🤖 Unit Tests > Tasks
- [ ] ⚙️ Github Action > Update Open Brewery DB API [#12](https://github.com/openbrewerydb/openbrewerydb/issues/12)

## Contributing

### 1. Create Pull Request

Create a pull request. There are two ways to do this:

- [Edit file directly](https://help.github.com/en/github/managing-files-in-a-repository/editing-files-in-your-repository) & [create pull request](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request)
- [Create a pull request from a fork](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request-from-a-fork)

### 2. Validation (WIP)

- ESlint (validate JavaScript and JSON)
- Data (validate CSV via [goodtables](https://goodtables.io/))
- Duplicates (TBD)

NOTE: This is a work in progress. See issues: [#2](https://github.com/openbrewerydb/openbrewerydb/issues/2), [#3](https://github.com/openbrewerydb/openbrewerydb/issues/3)

### 4. Merge

Note: The automatic "update API on Github merge" pipeline is a work in progess. See Issue [#12](https://github.com/openbrewerydb/openbrewerydb/issues/12).

## Feedback

Any feedback, please [email me](mailto:chris@openbrewerydb.org). Cheers! 🍻
