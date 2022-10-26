import * as core from '@actions/core';
import * as path from 'path';

import { Snapshot } from '@github/dependency-submission-toolkit';
import { Depgraph, MavenDependencyGraph, parseDependencyJson } from './depgraph';
import { MavenRunner } from './maven-runner';
import { loadFileContents } from './utils/file-utils';

const version = require('../package.json')['version'];

const DEPGRAPH_MAVEN_PLUGIN_VERSION = '4.0.2';

export type MavenConfiguration = {
  ignoreMavenWrapper?: boolean;
  settingsFile?: string;
  mavenArgs?: string;
}

export async function generateSnapshot(directory: string, mvnConfig?: MavenConfiguration, context?: any, job?: any) {
  const depgraph = await generateDependencyGraph(directory, mvnConfig);

  try {
    const mavenDependencies = new MavenDependencyGraph(depgraph);
    // The filepath to the POM needs to be relative to the root of the GitHub repository for the links to work once uploaded
    const pomFile = getRepositoryRelativePath(path.join(directory, 'pom.xml'));
    const manifest = mavenDependencies.createManifest(pomFile);
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

export async function generateDependencyGraph(directory: string, config?: MavenConfiguration): Promise<Depgraph> {
  try {
    const mvn = new MavenRunner(directory, config?.settingsFile, config?.ignoreMavenWrapper);

    core.startGroup('depgraph-maven-plugin:reactor');
    const mavenReactorArguments = [
      `com.github.ferstl:depgraph-maven-plugin:${DEPGRAPH_MAVEN_PLUGIN_VERSION}:reactor`,
      '-DgraphFormat=json',
      '-DoutputFileName=reactor.json'
    ];
    const reactorResults = await mvn.exec(directory, mavenReactorArguments);

    core.info(reactorResults.stdout);
    core.info(reactorResults.stderr);
    core.endGroup();

    if (reactorResults.exitCode !== 0) {
      throw new Error(`Failed to successfully generate reactor results with Maven, exit code: ${reactorResults.exitCode}`);
    }

    core.startGroup('depgraph-maven-plugin:aggregate');
    const mavenAggregateArguments = [
      `com.github.ferstl:depgraph-maven-plugin:${DEPGRAPH_MAVEN_PLUGIN_VERSION}:aggregate`,
      '-DgraphFormat=json',
      '-DoutputFileName=aggregate-depgraph.json'
    ];
    const aggregateResults = await mvn.exec(directory, mavenAggregateArguments);

    core.info(aggregateResults.stdout);
    core.info(aggregateResults.stderr);
    core.endGroup();

    if (aggregateResults.exitCode !== 0) {
      throw new Error(`Failed to successfully dependency results with Maven, exit code: ${aggregateResults.exitCode}`);
    }
  } catch (err: any) {
    core.error(err);
    throw new Error(`A problem was encountered generating dependency files, please check execution logs for details; ${err.message}`);
  }

  const targetPath = path.join(directory, 'target');
  const isMultiModule = checkForMultiModule(path.join(targetPath, 'reactor.json'));

  // Now we have the aggregate dependency graph file to process
  const aggregateGraphFile = path.join(targetPath, 'aggregate-depgraph.json');
  try {
    return parseDependencyJson(aggregateGraphFile, isMultiModule);
  } catch (err: any) {
    core.error(err);
    throw new Error(`Could not parse maven dependency file, '${aggregateGraphFile}': ${err.message}`);
  }
}

function checkForMultiModule(reactorJsonFile): boolean {
  const data = loadFileContents(reactorJsonFile);

  if (data) {
    try {
      const reactor = JSON.parse(data);
      // The reactor file will have an array of artifacts making up the parent and child modules if it is a multi module project
      return reactor.artifacts && reactor.artifacts.length > 0;
    } catch (err: any) {
      throw new Error(`Failed to parse reactor JSON payload: ${err.message}`);
    }
  }

  // If no data report that it is not a multi module project
  return false;
}

// TODO this is assuming the checkout was made into the base path of the workspace...
function getRepositoryRelativePath(file) {
  const workspaceDirectory = path.resolve(process.env.GITHUB_WORKSPACE || '.');
  const fileResolved = path.resolve(file);
  const fileDirectory = path.dirname(fileResolved);

  if (fileDirectory.startsWith(workspaceDirectory)) {
    return fileResolved.substring(workspaceDirectory.length + path.sep.length);
  } else {
    return path.resolve(file);
  }
}