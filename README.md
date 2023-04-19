# maven-dependency-submission-action

This is a GitHub Action that will generate a complete dependency graph for a Maven project and submit the graph to the GitHub repository so that the graph is complete and includes all the transitive dependencies.

The action will invoke maven using the `com.github.ferstl:depgraph-maven-plugin:4.0.2` plugin to generate JSON output of the complete dependency graph, which is then processed and submitted using the [Dependency Submission Toolkit](https://github.com/github/dependency-submission-toolkit) to the GitHub repository.

> **Warning** The dependency submission APIs and toolkit are still currently in beta and as such subject to changes in future releases.


## Usage

As of version `3.0.0` this action now support Maven multi-module projects as well as additional Maven configuration parameters.


### Pre-requisites
For this action to work properly, you must have the Maven available on PATH (`mvn`) or using a `mvnw` Maven wrapper in your maven project directory. Maven will need to be configured to be able to access and pull your dependencies from whatever sources you have defined (i.e. a properly configured `settings.xml` or all details provided in the POM).

Custom maven `settings.xml` can now be specified as an input parameter to the action.

This action writes informations in the repository dependency graph, so if you are using the default token, you need to set the `contents: write` permission to the workflow or job. If you are using a personal access token, this token must have the `repo` scope. ([API used by this action](https://docs.github.com/en/rest/dependency-graph/dependency-submission#create-a-snapshot-of-dependencies-for-a-repository))

### Inputs

* `directory` - The directory that contains the `pom.xml` that will be used to generate the dependency graph from. Defaults to the `github.workspace` which is where the source will check out to by default when using `actions/checkout` .

* `token` - The GitHub token that will be used to submit the generated dependency snapshot to the repository. Defaults to the `github.token` from the actions environment.

* `settings-file` - An optional path to a Maven settings.xml file that you want to use to provide additional configuration to Maven.

* `ingore-maven-wrapper` - An optional `true`/`false` flag parameter to ignore the Maven wrapper (if present) in the maven project directory and instead use the version of Maven from the `PATH`. This is set to `false` by default to use the wrapper if one is present.

* `maven-args` - An optional string value (space separated) options to pass to the maven command line when generating the dependency snapshot. This is empty by default.

* `snapshot-include-file-name`: Optional flag to control whether or no the path and file name of the pom.xml is provided with the snapshot submission. Defaults to `true` so as to create a link to the repository file from the dependency tree view, but at the cost of losing the POM `artifactId` when it renders.

* `snapshot-dependency-file-name`: An optional user control file path to the POM file, requires `snapshot-include-file-name` to be `true` for the value to be submitted.


## Examples

Generating and submitting a dependency snapshot using the defaults:

```
- name: Submit Dependency Snapshot
  uses: advanced-security/maven-dependency-submission-action@v3
```

Upon success it will generate a snapshot captured from Maven POM like;
![Screenshot 2022-08-15 at 09 33 47](https://user-images.githubusercontent.com/681306/184603264-3cd69fda-75ff-4a46-b014-630acab60fab.png)



## Command Line Usage

There are experimental command line clients, Linux only for now that will provide the same functionality as the GitHub Action but can be embedded into your existing CI tooling and invoked from the commandline to upload a dependency snapshot.

You can obtain the executables from the latest actions workflow run https://github.com/advanced-security/maven-dependency-submission-action/actions/workflows/publish_executables.yml.

### Parameters

Run the command line tool with the `--help` option to display all the possible configuration options;

```
Usage: maven-dependency-submission [options]

Options:
  -V, --version                             output the version number
  -t, --token <token>                       GitHub access token
  -r --repository <repository>              GitHub repository, owner/repo_name format
  -b --branch-ref <ref>                     GitHub repository branch reference
  -s --sha <commitSha>                      GitHub repository commit SHA
  -d --directory <maven-project-directory>  the directory containing the Maven POM file (default: ".")
  --github-api-url <url>                    GitHub API URL (default: "https://api.github.com")
  -j --job-name <jobName>                   Optional name for the activity creating and submitting the graph (default: "maven-dependency-submission-cli")
  -i --run-id <jobName>                     Optional Run ID number for the activity that is providing the graph
  -h, --help                                display help for command
```


## Development

To develop on this project, a Codespace has been provided that will provide all the necessary tools and installation of a JDK and Maven for the test suite to pass. Just open a Codespace and you can start to develop in the quickest possible timeframe.

The codebase is in TypeScript to make it easier for maintenance.

The source code lives under `src` and the Action is provided in the `src/index.ts` file.

To build the software `npm` has been configured with scripts for `test` and `build` script to validate any work before publishing the action code.
