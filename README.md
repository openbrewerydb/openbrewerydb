# Open Brewery DB

This is the Open Brewery DB data set for [Open Brewery DB](https://www.openbrewerydb.org/). 

It is a work in progress, but please feel free to start contributing! 

Thank you!

## The data set

[JSON](/breweries.json)

## Why

Provide a way for the community to suggest updates to [Open Brewery DB](https://www.openbrewerydb.org/).

## Roadmap

- [x] 📤 Release data set
- [x] ✅ Task > Import JSON (i.e., /breweries.json ➡️ /data)
- [x] ✅ Task > Export JSON (i.e., /data ➡️ /breweries.json)
- [ ] ✅ Task > Import CSV (i.e., /breweries.csv ➡️ /data)
- [ ] ✅ Task > Export CSV (i.e., /data ➡️ /breweries.csv)
- [ ] ⚙️ Github Action > Validate Data
- [ ] ⚙️ Github Action > Update Open Brewery DB API
- [ ] 🤖 Unit Tests > Tasks

## How to contribute

Create a pull request for any additions, deletions, and/or updates.

## The process

### 1. Create Pull Request

You can create a pull request via:

- [Edit file](https://help.github.com/en/github/managing-files-in-a-repository/editing-files-in-your-repository) & [create pull request](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request)
- [Create a pull request from a fork](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request-from-a-fork)

### 2. Validation

- ESlint (validate JavaScript and JSON)
- Data (validate CSV via [goodtables](https://goodtables.io/))
- Duplicates (TBD)

NOTE: This is a work in progress. See issues: [#2](https://github.com/openbrewerydb/openbrewerydb/issues/2), [#3](https://github.com/openbrewerydb/openbrewerydb/issues/3)

### 3. Peer Review

If everything is green, a moderator or I will manually review the data for validity.

TODO: Get moderators. Want to be a moderator? [email me](mailto:chris@openbrewerydb.org)!

### 4. Merge

Hooray! Once the peer reviewer approves, the pull request will be approved and the data will be merged into the master data set.

TODO: Automate the update. In the meantime, this will happen manually. Thank you for your patience. 😊

## Feedback

Any feedback, please email me at chris@openbrewerydb.org. Thanks!
