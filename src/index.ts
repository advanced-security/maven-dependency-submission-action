import * as core from '@actions/core';
import * as github from '@actions/github';
import { Snapshot, submitSnapshot } from '@github/dependency-submission-toolkit';
import { generateSnapshot } from './snapshot-generator';

async function run() {
  let snapshot: Snapshot | undefined;
  let context: any | undefined;

  try {
    core.startGroup("Inputs");
    const directory = core.getInput('directory', { required: true });
    const mavenConfig = {
      ignoreMavenWrapper: core.getBooleanInput('ignore-maven-wrapper'),
      settingsFile: core.getInput('settings-file'),
      mavenArgs: core.getInput('maven-args') || '',
    }
    core.info(`mavenConfig: ${JSON.stringify(mavenConfig)}`);
    const includeFilename = core.getBooleanInput('snapshot-include-file-name');
    const manifestFilename = core.getInput('snapshot-dependency-file-name');

    const syntheticSha = core.getInput('sha');
    const syntheticRef = core.getInput('ref');

    core.info(`Testing sha & ref: ${syntheticSha} ${syntheticRef}`);

    if (syntheticSha || syntheticRef) {
      // build synthetic context when sha and ref are provided
      if (!syntheticSha) {
        throw ('sha is required when providing ref');
      }
      if (!syntheticRef) {
        throw ('ref is required when providing sha');
      }

      context = {
        repo: github.context.repo,
        sha: syntheticSha,
        ref: syntheticRef,
        eventName: '' // usually github.context.eventName, let it empty so the sdk uses the provided sha and ref
      }
      core.info(`Using synthetic context: ${JSON.stringify(context)}`);
    }

    snapshot = await generateSnapshot(directory, mavenConfig, { includeManifestFile: includeFilename, manifestFile: manifestFilename, context: context });
  } catch (err: any) {
    core.error(err);
    core.setFailed(`Failed to generate a dependency snapshot, check logs for more details, ${err}`);
  } finally {
    core.endGroup();
  }

  if (snapshot) {
    core.startGroup(`Dependency Snapshot`);
    core.info(snapshot.prettyJSON())
    core.endGroup();

    core.info(`Submitting Snapshot... ${JSON.stringify(context)}`)
    await submitSnapshot(snapshot, context);
    core.info(`completed.`)
  }
}

run();