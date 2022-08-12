import core from '@actions/core';
import {submitSnapshot} from '@github/dependency-submission-toolkit';
import { generateSnapshot } from './snapshot-generator';


async function run() {
  let snapshot;

  try {
    const directory = core.getInput('directory', { required: true });
    snapshot = generateSnapshot(directory);

  } catch (err: any) {
    core.error(err);
    core.setFailed(`Failed to generate a dependency snapshot, check logs for more details, ${err}`);
  }

  if (snapshot) {
    core.startGroup(`Dependency Snapshot`);
    core.info(snapshot.prettyJSON())
    core.endGroup();

    core.info(`Submitting Snapshot...`)
    await submitSnapshot(snapshot);
    core.info(`completed.`)
  }
}

run();