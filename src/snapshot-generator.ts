import * as exec from '@actions/exec';
import * as core from '@actions/core';

import * as path from 'path';
import * as fs from 'fs';

import { Snapshot } from '@github/dependency-submission-toolkit';
import { MavenDependencyGraph, parseDependencyJson } from './depgraph';

const version = require('../package.json')['version'];

const DEPGRAPH_MAVEN_PLUGIN_VERSION = '4.0.2';

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

    core.startGroup('depgraph-maven-plugin:reactor');
    const mavenReactorArguments = [
      `com.github.ferstl:depgraph-maven-plugin:${DEPGRAPH_MAVEN_PLUGIN_VERSION}:reactor`,
      '-DgraphFormat=json',
      '-DoutputFileName=reactor.json'
    ];
    await exec.exec('mvn', mavenReactorArguments, options);

    core.info(executionOutput);
    core.info(errors);
    core.endGroup();

    core.startGroup('depgraph-maven-plugin:aggregate');
    const mavenAggregateArguments = [
      `com.github.ferstl:depgraph-maven-plugin:${DEPGRAPH_MAVEN_PLUGIN_VERSION}:aggregate`,
      '-DgraphFormat=json',
      '-DoutputFileName=aggregate-depgraph.json'
    ];
    await exec.exec('mvn', mavenAggregateArguments, options);

    core.info(executionOutput);
    core.info(errors);
    core.endGroup();
  } catch (err: any) {
    core.error(err);
    throw new Error(`A problem was encountered generating dependency files, please check execution logs for details; ${err.message}`);
  }

  const targetPath = path.join(directory, 'target');
  const isMultiModule = checkForMultiModule(path.join(targetPath, 'reactor.json'));

  // Now we have the aggregate dependency graph file to process
  const file = path.join(targetPath, 'aggregate-depgraph.json');
  try {
    return parseDependencyJson(file, isMultiModule);
  } catch (err: any) {
    core.error(err);
    throw new Error(`Could not parse maven dependency file, '${file}': ${err.message}`);
  }
}

function checkForMultiModule(reactorJsonFile) {
  try {
    const data: Buffer = fs.readFileSync(reactorJsonFile);
    try {
      const reactor = JSON.parse(data.toString('utf-8'));
      // The reactor file will have an array of artifacts making up the parent and child modules if it is a multi module project
      return reactor.artifacts && reactor.artifacts.length > 0;
    } catch (err: any) {
      throw new Error(`Failed to parse reactor JSON payload: ${err.message}`);
    }
  } catch (err: any) {
    throw new Error(`Failed to load file ${reactorJsonFile}: ${err}`);
  }
}