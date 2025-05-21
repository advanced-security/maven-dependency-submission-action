import * as core from '@actions/core';
import * as path from 'path';

import { Manifest, Snapshot } from '@github/dependency-submission-toolkit';
import { Depgraph, MavenDependencyGraph, parseDependencyJson, depgraphfilename } from './depgraph';
import { MavenRunner } from './maven-runner';
import { loadFileContents } from './utils/file-utils';
import { readdirSync } from 'fs';

const packageData = require('../package.json');
const DEPGRAPH_MAVEN_PLUGIN_VERSION = '4.0.3';

export type MavenConfiguration = {
  ignoreMavenWrapper?: boolean;
  settingsFile?: string;
  mavenArgs?: string;
}

export type SnapshotConfig = {
  context?: any;
  job?: any;
  sha?: any;
  ref?: any;
  detector?: {
    name: string;
    url: string;
    version: string;
  };
  correlator?: string;
};

export async function generateSnapshot(directory: string, mvnConfig?: MavenConfiguration, snapshotConfig?: SnapshotConfig) {
  const depgraphs = await generateDependencyGraphs(directory, mvnConfig);
  const detector = snapshotConfig?.detector ?? getDetector();
  let snapshot = new Snapshot(detector, snapshotConfig?.context, snapshotConfig?.job);

  snapshot.job.correlator = snapshotConfig?.correlator
    ? snapshotConfig.correlator
    : snapshot.job?.correlator;

  const specifiedRef = getNonEmptyValue(snapshotConfig?.ref);
  if (specifiedRef) {
    snapshot.ref = specifiedRef;
  }

  const specifiedSha = getNonEmptyValue(snapshot?.sha);
  if (specifiedSha) {
    snapshot.sha = specifiedSha;
  }

  try {
    for (const depgraph of depgraphs) {
      const mavenDependencies = new MavenDependencyGraph(depgraph);
      const pomFile = getRepositoryRelativePath(depgraph.filePath);
      const manifest = mavenDependencies.createManifest(pomFile);

      snapshot.addManifest(manifest);
    }
  } catch (err: any) {
    core.error(err);
    throw new Error(`Could not generate a snapshot of the dependencies; ${err.message}`);
  }
  return snapshot;
}

function getDetector() {
  return {
    name: packageData.name,
    url: packageData.homepage,
    version: packageData.version
  };
}

export async function generateDependencyGraphs(directory: string, config?: MavenConfiguration): Promise<Depgraph[]> {
  try {
    const mvn = new MavenRunner(directory, config?.settingsFile, config?.ignoreMavenWrapper, config?.mavenArgs);

    core.startGroup('depgraph-maven-plugin:aggregate');
    const mavenGraphArguments = [
      `com.github.ferstl:depgraph-maven-plugin:${DEPGRAPH_MAVEN_PLUGIN_VERSION}:graph`,
      '-DgraphFormat=json',
      `-DoutputFileName=${depgraphfilename}`,
    ];
    const graphResults = await mvn.exec(directory, mavenGraphArguments);

    core.info(graphResults.stdout);
    core.info(graphResults.stderr);
    core.endGroup();

    if (graphResults.exitCode !== 0) {
      throw new Error(`Failed to successfully generate dependency results with Maven, exit code: ${graphResults.exitCode}`);
    }
  } catch (err: any) {
    core.error(err);
    throw new Error(`A problem was encountered generating dependency files, please check execution logs for details; ${err.message}`);
  }

  const graphFiles = getDepgraphFiles(directory, depgraphfilename);
  let results: Depgraph[] = [];
  for (const graphFile of graphFiles) {
    core.debug(`Found depgraph file: ${graphFile}`);
    try {
      const depgraph = parseDependencyJson(graphFile);
      results.push(depgraph);
    } catch (err: any) {
      core.error(`Could not parse depgraph file, '${graphFile}': ${err.message}`);
    }
  }
  return results;
}

// TODO this is assuming the checkout was made into the base path of the workspace...
function getRepositoryRelativePath(file) {
  const workspaceDirectory = path.resolve(process.env.GITHUB_WORKSPACE || '.');
  const fileResolved = path.resolve(file);
  const fileDirectory = path.dirname(fileResolved);

  core.debug(`Workspace directory   =  ${workspaceDirectory}`);
  core.debug(`Snapshot file         =  ${fileResolved}`);
  core.debug(`Snapshot directory    =  ${fileDirectory}`);

  let result = fileResolved;
  if (fileDirectory.startsWith(workspaceDirectory)) {
    result = fileResolved.substring(workspaceDirectory.length + path.sep.length);
  }

  core.debug(`Snapshot relative file =  ${result}`);
  return result;
}

function getNonEmptyValue(str?: string) {
  if (str) {
    const trimmed = str.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return undefined;
}

// getDepgraphFiles recursively finds all files that match the filename within the directory
function getDepgraphFiles(directory: string, filename: string): string[] {
  let files: string[] = [];
  try {
    files = readdirSync(directory)
      .filter((f: string) => f === filename)
      .map((f: string) => path.join(directory, f));
  } catch (err: any) {
    core.error(`Could not read depgraphs directory: ${err.message}`);
    return [];
  }

  // recursively find all files that match the filename within the directory
  const subdirs = readdirSync(directory, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const subdir of subdirs) {
    const subdirPath = path.join(directory, subdir);
    const subdirFiles = getDepgraphFiles(subdirPath, filename);
    files = files.concat(subdirFiles);
  }

  return files;
}
