## Contributing

[fork]: https://github.com/advanced-security/maven-dependency-submission-action/fork
[pr]: https://github.com/advanced-security/maven-dependency-submission-action/compare
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

Contributions to this project are [released](https://help.github.com/articles/github-terms-of-service/#6-contributions-under-repository-license) to the public under the [project's open source license](LICENSE.txt).

Please note that this project is released with a [Contributor Code of Conduct][code-of-conduct]. By participating in this project you agree to abide by its terms.

## Submitting a pull request

0. [Fork][fork] and clone the repository
0. Create a new branch: `git checkout -b my-branch-name`
0. Make your change, add tests, and make sure the tests still pass
0. Push to your fork and [submit a pull request][pr]
0. Pat your self on the back and wait for your pull request to be reviewed and merged.

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Write tests.
- Keep your change as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them as separate pull requests.
- Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).

## Cutting a new release

<details>

_Note: these instructions are for maintainers_

1. Update the version number in [package.json](https://github.com/advanced-security/maven-dependency-submission-action/blob/main/package.json) and run `npm i` to update the lockfile. This is also a good time to make sure that the `dist/index.js` file is up to date by running `npm run build`.
2. Go to [Draft a new
   release](https://github.com/advanced-security/maven-dependency-submission-action/releases/new)
   in the Releases page.
3. Make sure that the `Publish this Action to the GitHub Marketplace`
   checkbox is enabled

<img width="481" alt="Screenshot 2022-06-15 at 12 08 19" src="https://user-images.githubusercontent.com/2161/173822484-4b60d8b4-c674-4bff-b5ff-b0c4a3650ab7.png">

4. Click "Choose a tag" and then "Create new tag", where the tag name
   will be your version prefixed by a `v` (e.g. `v4.1.2`).
5. Use a version number for the release title (e.g. "4.1.2").

<img width="700" alt="Screenshot 2022-06-15 at 12 08 36" src="https://user-images.githubusercontent.com/2161/173822548-33ab3432-d679-4dc1-adf8-b50fdaf47de3.png">

6. Add your release notes. If this is a major version make sure to
   include a small description of the biggest changes in the new version.
7. Build the release executables by manually triggering [this action](https://github.com/advanced-security/maven-dependency-submission-action/actions/workflows/publish_executables.yml). The output of this action will be a zip file that you should download, extract, and drag into the binaries section. There should be three files there: ending in `-linux`, `-macos`, and `-win.exe`.
8. Click "Publish Release".

You now have a tag and release using the semver version you used
above. The last remaining thing to do is to move the dynamic version
identifier to match the current SHA. This allows users to adopt a
major version number (e.g. `v1`) in their workflows while
automatically getting all the
minor/patch updates.

To do this just checkout `main`, force-create a new annotated tag, and push it:

```
git tag -fa v4 -m "Updating v4 to 4.1.2"
git push origin v4 --force
```
</details>

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)
