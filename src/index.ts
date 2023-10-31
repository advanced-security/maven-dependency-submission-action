import * as core from '@actions/core';
import * as github from '@actions/github';
import { Snapshot, submitSnapshot } from '@github/dependency-submission-toolkit';
import { generateSnapshot } from './snapshot-generator';

async function run() {
  let snapshot: Snapshot | undefined;
  let context: any | undefined;

  try {
    const directory = core.getInput('directory', { required: true });
    const mavenConfig = {
      ignoreMavenWrapper: core.getBooleanInput('ignore-maven-wrapper'),
      settingsFile: core.getInput('settings-file'),
      mavenArgs: core.getInput('maven-args') || '',
    }
    const includeFilename = core.getBooleanInput('snapshot-include-file-name');
    const manifestFilename = core.getInput('snapshot-dependency-file-name');

    const syntheticSha = core.getInput('sha');
    const syntheticRef = core.getInput('ref');

    core.debug(`Testing sha & ref: ${syntheticSha} ${syntheticRef}`);

    if (syntheticSha || syntheticRef) {
      // build synthetic context when sha and ref are provided
      if (!syntheticSha) {
        throw ('sha is required when providing ref');
      }
      if (!syntheticRef) {
        throw ('ref is required when providing sha');
      }

      // create a deep clone of the context object
      context = JSON.parse(JSON.stringify(github.context)) as typeof github.context;

      context.sha = syntheticSha;
      context.ref = syntheticRef;
      context.eventName = '' // left empty so the sdk uses the provided sha and ref

      core.debug(`Using synthetic context ${JSON.stringify(context)}`);
    }

    snapshot = await generateSnapshot(directory, mavenConfig, { includeManifestFile: includeFilename, manifestFile: manifestFilename, context: context });
  } catch (err: any) {
    core.error(err);
    core.setFailed(`Failed to generate a dependency snapshot, check logs for more details, ${err}`);
  }

  if (snapshot) {
    core.startGroup(`Dependency Snapshot`);
    core.info(snapshot.prettyJSON())
    core.endGroup();

    core.info(`Submitting Snapshot...`);
    core.debug(`with context: ${JSON.stringify(context)}`);
    await submitSnapshot(snapshot, context);
    core.info(`completed.`)
  }
}

run();