import pkg from '../../package.json';
import { program } from 'commander';

program.name(pkg.name);
program.version(pkg.version);

program.requiredOption('-t, --token <token>', 'GitHub access token');
program.requiredOption('-r --repository <repository>', 'GitHub repository, owner/repo_name format');
program.requiredOption('-b --branch-ref <ref>', 'GitHub repository branch reference, e.g. refs/heads/main');
program.requiredOption('-s --sha <commitSha>', 'GitHub repository commit SHA');

program.option('-d --directory <maven-project-directory>', 'the directory containing the Maven POM file', '.');
program.option('--settings-file <settings-file>', 'path to the Maven settings file');
program.option('--ignore-maven-wrapper', 'ingore Maven wrappers, if present, and use Maven from the PATH');
program.option('--maven-args <maven-args>', 'additional arguments to pass to Maven');
program.option('--github-api-url <url>', 'GitHub API URL', 'https://api.github.com');
program.option('-j --job-name <jobName>', 'Optional name for the activity creating and submitting the graph', 'maven-dependency-submission-cli');
program.option('-i --run-id <jobName>', 'Optional Run ID number for the activity that is providing the graph');

program.option('--snapshot-exclude-file-name', 'exclude the file name in the dependency snapshot report. If false the name of the artifactor from the POM will be used, but any links in GitHub will not work.');

program.option('--detector-name <detectorName>', 'optional name of the detector that generated the snapshot');
program.option('--detector-url <detectorUrl>', 'optional URL of the detector that generated the snapshot, but not optional if you specify an detector-name');
program.option('--detector-version <detectorVersion>', 'optional version of the detector that generated the snapshot, but not optional if you specify an detector-name');

program.parse(process.argv);

const opts = program.opts();

// Inject some required environment variables like the Actions INPUTs and special environment variables
process.env['INPUT_TOKEN'] = opts.token;
process.env['GITHUB_REPOSITORY'] = opts.repository;
process.env['GITHUB_API_URL'] = opts.githubApiUrl;

// The above injection of environment variables is required before the submission APIs are imported
import { Snapshot, submitSnapshot } from '@github/dependency-submission-toolkit';
import { SnapshotConfig, generateSnapshot } from '../snapshot-generator';

async function execute() {
  let snapshot: Snapshot | undefined;

  // The dependency submission API requires a formatted ref reference so check early fo now
  if (/^refs\//.exec(opts.branchRef) === null) {
    console.error(`Branch reference must be in path form, e.g. 'refs/heads/main' for the 'main' branch.`);
    console.error(`  provided value was: '${opts.branchRef}'`);
    program.help({ error: true });
    process.exit(1);
  }

  // If the detector-name is provided, then the other detector options become mandatory, check these early
  let detector;
  if (opts.detectorName) {
    if (!opts.detectorUrl) {
      console.error(`Error: detector-url is required when detector-name is provided\n`);
      program.help({ error: true });
    }

    if (!opts.detectorVersion) {
      console.error(`Error: detector-version is required when detector-name is provided\n`);
      program.help({ error: true });
    }
    detector = {
      name: opts.detectorName,
      url: opts.detectorUrl,
      version: opts.detectorVersion,
    }
  }

  try {
    // Build a fake GitHub Actions context so that values for the submission APIs can be retrieved
    const context = {
      sha: opts.sha,
      ref: opts.branchRef,
    };

    const job = {
      correlator: opts.jobName,
      id: `${opts.runId || Date.now()}`
    };

    const mvnConfig = {
      directory: opts.directory,
      settingsFile: opts.settingsFile,
      ignoreMavenWrapper: opts.ignoreMavenWrapper,
      mavenArgs: opts.mavenArgs
    };

    const snapshotConfig: SnapshotConfig = {
      context,
      job,
      sha: opts.sha,
      ref: opts.branchRef,

      detector: detector
    }




    snapshot = await generateSnapshot(opts.directory, mvnConfig, snapshotConfig);

  } catch (err: any) {
    console.error(`Failed to generate a dependency snapshot, check logs for more details, ${err}`);
    console.log(err.stack);
    console.error(err.message);
    program.help({ error: true });
    process.exit(1);
  }

  if (snapshot) {
    console.log(`Submitting Snapshot...`);
    try {
      await submitSnapshot(snapshot);
      console.log(`completed.`)
    } catch (err: any) {
      console.error(`Failed to submit the dependency snapshot, check logs for more details, ${err}`);
      console.log(err.stack);
      console.error(err.message);
      program.help({ error: true });
      process.exit(1);
    }
  }
}

execute();