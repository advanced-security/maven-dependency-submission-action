import { Snapshot, submitSnapshot } from '@github/dependency-submission-toolkit';
import { generateSnapshot } from '../snapshot-generator';
import pkg from '../../package.json';

const { program } = require('commander');
program.name('maven-dependency-submission');
program.version(pkg.version);

program.requiredOption('-t, --token <token>', 'GitHub access token');
program.requiredOption('-r --repository <repository>', 'GitHub repository, owner/repo_name format');
program.requiredOption('-b --branch-ref <ref>', 'GitHub repository branch reference, e.g. /refs/heads/main');
program.requiredOption('-s --sha <commitSha>', 'GitHub repository commit SHA');

program.option('-d --directory <maven-project-directory>', 'the directory containing the Maven POM file', '.');
program.option('--github-api-url <url>', 'GitHub API URL', 'https://api.github.com');
program.option('-j --job-name <jobName>', 'Optional name for the activity creating and submitting the graph', 'maven-dependency-submission-cli');
program.option('-i --run-id <jobName>', 'Optional Run ID number for the activity that is providing the graph');

program.parse(process.argv);

async function execute() {
  const opts = program.opts();

  // Inject some required environment variables like the Actions INPUTs and special environment variables
  process.env['INPUT_TOKEN'] = opts.token;
  process.env['GITHUB_REPOSITORY'] = opts.repository;

  let snapshot: Snapshot | undefined;
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

    const mvnConfig = {};

    snapshot = await generateSnapshot(opts.directory, mvnConfig, context, job);

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