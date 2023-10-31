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

    if (core.getInput('sha') || core.getInput('ref')) {
      // build synthetic context when sha and ref are provided
      if (!core.getInput('sha')) {
        throw ('sha is required when providing ref');
      }
      if (!core.getInput('ref')) {
        throw ('ref is required when providing sha');
      }

      context = {
        repo: github.context.repo,
        sha: core.getInput('sha'),
        ref: core.getInput('ref'),
        eventName: '' // usually github.context.eventName, let it empty so the sdk uses the provided sha and ref
      }
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

    core.info(`Submitting Snapshot...`)
    await submitSnapshot(snapshot, context);
    core.info(`completed.`)
  }
}

run();