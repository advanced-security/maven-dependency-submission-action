# maven-dependency-submission-action

This is a GitHub Action that will generate a complete dependency graph for a Maven project and submit the graph to the GitHub repository so that the graph is complete and includes all the transitive dependencies.

The action will invoke maven using the `com.github.ferstl:depgraph-maven-plugin:4.0.1` plugin to generate JSON output of the complete dependency graph, which is then processed and submitted using the [Dependency Submission Toolkit](https://github.com/github/dependency-submission-toolkit) to the GitHub repository.

> **Warning** The dependency submission APIs and toolkit are still currently in beta and as such subject to changes in future releases.


## Usage

### Pre-requisites
For this action to work properly, you must have the Maven available on PATH (`mvn`) and configured to be able to access and pull your dependencies from whatever sources you have defined (i.e. a properly configured settings.xml or all details provided in the POM).

### Inputs

* `directory` - The directory that contains the `pom.xml` that will be used to generate the dependency graph from. Defaults to the `github.workspace` which is where the source will check out to by default when using `actions/checkout` .

* `token` - The GitHub token that will be used to submit the generated dependency snapshot to the repository. Defaults to the `github.token` from the actions environment.


## Examples

Generating and submitting a dependency snapshot using the defaults:

```
- name: Submit Dependency Snapshot
  uses: advanced-security/maven-dependency-submission-action@v1
```

Upon success it will generate a snapshot captured from Maven POM like;
![Screenshot 2022-08-15 at 09 33 47](https://user-images.githubusercontent.com/681306/184603264-3cd69fda-75ff-4a46-b014-630acab60fab.png)


## Limitations

Currently the action is limited to single module Maven projects, with a future update that will add support for multi-module based projects.


## Development

To develop on this project, a Codespace has been provided that will provide all the necessary tools and installation of a JDK and Maven for the test suite to pass. Just opne a Codespace and you can start to develop in the quickest possible timeframe.

The codebase is in TypeScript to make it easier for maintenance.

The source code lives under `src` and the Action is provided in the `src/index.ts` file.

To build the software `npm` has been configured with scripts for `test` and `build` script to validate any work before publishing the action code.