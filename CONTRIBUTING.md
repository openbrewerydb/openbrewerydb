# Contributing to Open Brewery DB

## Welcome to the Open Brewery DB community

Thank you for contributing to Open Brewery DB! It's fellow beer lovers like you that make Open Brewery DB such a great resource. 🍻

## Why the guidelines

Following these guidelines helps to communicate that you respect the time of the developers managing and developing this open source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and helping you finalize your pull requests.

## What to contribute

Open Brewery DB is a fully transparent, open source project and we love to receive any contributions from our community — you! There are many ways to contribute, from suggesting brewery updates, writing tutorials or blog posts, improving the documentation, submitting bug reports and feature requests or writing code which can be incorporated into Open Brewery DB itself.

## Brewers Guilds

Guild source files live at `datasets/[country]/guilds.csv`. Update a country source file, then run `npm run workflow:guilds` to rebuild the committed `guilds.csv`, `guilds.json`, and `guilds.sql` artifacts.

Guild files use these columns in order:

```text
id,scope,country_code,country,subdivision_code,subdivision,organization,website
```

- `id` is a stable UUID. Leave it empty for a new record and the guild workflow will generate it from the country code, scope, subdivision code, and organization name. Never remove or change an existing ID when editing a record.
- `scope` is `national`, `subdivision`, or `regional`.
- `country_code` is an uppercase ISO 3166-1 alpha-2 code.
- `subdivision_code` and `subdivision` must be empty for national records and present for subdivision and regional records.
- `organization` is required. `website` is optional.

## Responsibilities

* Create issues for any major changes and enhancements that you wish to make. Discuss things transparently and get community feedback.
* Keep feature versions as small as possible, preferably one new feature per version.
* Be welcoming to newcomers and encourage diverse new contributors from all backgrounds. See the [Code of Conduct](CODE_OF_CONDUCT.md).

Here are a couple of helpful tutorials:

* [Make a Pull Request](http://makeapullrequest.com/)
* [First Timers Only](http://www.firsttimersonly.com/)
* [How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github).

## Pull Request

After you've created a branch on your fork with your changes, it's time to [make a pull request][pr-link]!

Once you’ve submitted a pull request, the collaborators can review your proposed changes and decide whether or not to incorporate (pull in) your changes.

### Pull Request Pro Tips

* [Fork][fork-link] the repository and [clone][clone-link] it locally.
Connect your local repository to the original `upstream` repository by adding it as a [remote][remote-link].
Pull in changes from `upstream` often so that you stay up to date and so when you submit your pull request,
merge conflicts will be less likely. See more detailed instructions [here][syncing-link].
* Create a [branch][branch-link] for your edits.
* Contribute in the style of the project. This makes it easier for the collaborators to merge
and for others to understand and maintain in the future.
* Please try to squash all commits together before opening a pull request, but it's not currently required. If your pull request requires changes upon review, and you're already in the habit, please squash all additional commits as well. [This wiki page][squash-link] outlines the squash process.

### Open Pull Requests

Once you’ve opened a pull request, a discussion will start around your proposed changes.

Other contributors and users may chime in, but ultimately the decision is made by the collaborators.

During the discussion, you may be asked to make some changes to your pull request.

If so, add more commits to your branch and push them – they will automatically go into the existing pull request!

Opening a pull request will trigger a Github Action build to check the validity of all links in the project. After the build completes, **please ensure that the build has passed**. If the build did not pass, please view the Github Action log and correct any errors that were found in your contribution.

Thanks for being a part of this project, and we look forward to hearing from you soon! 🍻

[branch-link]: <http://guides.github.com/introduction/flow/>
[clone-link]: <https://help.github.com/articles/cloning-a-repository/>
[fork-link]: <http://guides.github.com/activities/forking/>
[oauth-link]: <https://en.wikipedia.org/wiki/OAuth>
[pr-link]: <https://help.github.com/articles/creating-a-pull-request/>
[remote-link]: <https://help.github.com/articles/configuring-a-remote-for-a-fork/>
[syncing-link]: <https://help.github.com/articles/syncing-a-fork>
[squash-link]: <https://github.com/todotxt/todo.txt-android/wiki/Squash-All-Commits-Related-to-a-Single-Issue-into-a-Single-Commit>
