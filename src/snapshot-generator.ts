import * as exec from '@actions/exec';
import * as core from '@actions/core';

import * as path from 'path';

import { Snapshot } from '@github/dependency-submission-toolkit';
import { MavenDependencyGraph, parseDependencyJson } from './depgraph';

const version = require('../package.json')['version'];

export async function generateSnapshot(directory: string, context?: any, job?: any) {
  const depgraph = await generateDependencyGraph(directory);

  try {
    const mavenDependencies = new MavenDependencyGraph(depgraph);
    const manifest = mavenDependencies.createManifest(path.join(directory, 'pom.xml'));
    const snapshot = new Snapshot(getDetector(), context, job);
    snapshot.addManifest(manifest);

    return snapshot;
  } catch (err: any) {
    core.error(err);
    throw new Error(`Could not generate a snapshot of the dependencies; ${err.message}`);
  }
}

function getDetector() {
  return {
    name: 'maven-dependency-tree-action',
    url: 'https://github.com/advanced-security/maven-dependency-tree-action',
    version: version
  };
}

export async function generateDependencyGraph(directory: string) {
  try {
    let executionOutput = '';
    let errors = '';

    const options = {
      cwd: directory,
      listeners: {
        stdout: (data: Buffer) => {
          executionOutput += data.toString();
        },
        stderr: (data: Buffer) => {
          errors += data.toString();
        }
      }
    };

    const mavenArguments = [
      'com.github.ferstl:depgraph-maven-plugin:4.0.2:aggregate',
      '-DgraphFormat=json',
    ];

    core.startGroup('depgraph-maven-plugin');
    await exec.exec('mvn', mavenArguments, options);

    core.info(executionOutput);
    core.info(errors);
    core.endGroup();
  } catch (err: any) {
    core.error(err);
    throw new Error(`A problem was encountered generating dependency files, please check execution logs for details; ${err.message}`);
  }

  // Now we have the target/dependency-graph.json file to process
  const file = path.join(directory, 'target', 'dependency-graph.json');
  try {
    return parseDependencyJson(file);
  } catch (err: any) {
    core.error(err);
    throw new Error(`Could not parse maven dependency file, '${file}': ${err.message}`);
  }
}
