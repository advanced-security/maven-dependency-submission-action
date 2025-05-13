import * as core from '@actions/core';
import * as path from 'path';

import { Manifest, Snapshot } from '@github/dependency-submission-toolkit';
import { Depgraph, MavenDependencyGraph, parseDependencyJson } from './depgraph';
import { MavenRunner } from './maven-runner';
import { loadFileContents } from './utils/file-utils';

const packageData = require('../package.json');
const DEPGRAPH_MAVEN_PLUGIN_VERSION = '4.0.3';

export type MavenConfiguration = {
  ignoreMavenWrapper?: boolean;
  settingsFile?: string;
  mavenArgs?: string;
}

export type SnapshotConfig = {
  includeManifestFile?: boolean;
  manifestFile?: string;
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
  fileCentricManifests?: boolean;
};

export async function generateSnapshot(directory: string, mvnConfig?: MavenConfiguration, snapshotConfig?: SnapshotConfig) {
  const fileCentric = !!snapshotConfig?.fileCentricManifests;
  const detector = snapshotConfig?.detector ?? getDetector();
  const snapshot = new Snapshot(detector, snapshotConfig?.context, snapshotConfig?.job);

  if (!fileCentric) {
    // Default: aggregate mode
    const depgraph = await generateDependencyGraph(directory, mvnConfig);
    try {
      const mavenDependencies = new MavenDependencyGraph(depgraph);
      let manifest: Manifest;
      if (snapshotConfig?.includeManifestFile) {
        let pomFile;
        if (snapshotConfig?.manifestFile) {
          pomFile = snapshotConfig.manifestFile;
        } else {
          pomFile = getRepositoryRelativePath(path.join(directory, 'pom.xml'));
        }
        manifest = mavenDependencies.createManifest(pomFile);
      } else {
        manifest = mavenDependencies.createManifest();
      }
      snapshot.addManifest(manifest);
    } catch (err: any) {
      core.error(err);
      throw new Error(`Could not generate a snapshot of the dependencies; ${err.message}`);
    }
  } else {
    // File-centric mode: one manifest per pom.xml
    const depgraphs = await generateFileCentricDependencyGraphs(directory, mvnConfig);
    let manifestCount = 0;
    for (const { pomPath, depgraph } of depgraphs) {
      try {
        const mavenDependencies = new MavenDependencyGraph(depgraph);
        // Use the project root as the base for relative paths
        const relPomPath = getRepositoryRelativePath(pomPath, directory);
        const manifest = mavenDependencies.createManifest(relPomPath);
        snapshot.addManifest(manifest);
        manifestCount++;
      } catch (err: any) {
        core.warning(`Failed to process dependency graph for ${pomPath}: ${err.message}`);
      }
    }
    if (manifestCount === 0) {
      throw new Error('No valid dependency manifests could be generated.');
    }
  }

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

  return snapshot;
}

function getDetector() {
  return {
    name: packageData.name,
    url: packageData.homepage,
    version: packageData.version
  };
}


export async function generateDependencyGraph(directory: string, config?: MavenConfiguration): Promise<Depgraph> {
  // Default: aggregate mode
  try {
    const mvn = new MavenRunner(directory, config?.settingsFile, config?.ignoreMavenWrapper, config?.mavenArgs);

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
      '-DoutputDirectory=target',
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

// File-centric: run depgraph-maven-plugin:graph and collect all resulting graphs
export async function generateFileCentricDependencyGraphs(directory: string, config?: MavenConfiguration): Promise<Array<{ pomPath: string, depgraph: Depgraph }>> {
  const mvn = new MavenRunner(directory, config?.settingsFile, config?.ignoreMavenWrapper, config?.mavenArgs);
  core.startGroup('depgraph-maven-plugin:graph');
  const mavenGraphArguments = [
    `com.github.ferstl:depgraph-maven-plugin:${DEPGRAPH_MAVEN_PLUGIN_VERSION}:graph`,
    '-DgraphFormat=json',
    '-DoutputDirectory=target/depgraphs',
    '-DoutputFileName=depgraph'
  ];
  const graphResults = await mvn.exec(directory, mavenGraphArguments);
  core.info(graphResults.stdout);
  core.info(graphResults.stderr);
  core.endGroup();
  if (graphResults.exitCode !== 0) {
    throw new Error(`Failed to generate per-module dependency graphs with Maven, exit code: ${graphResults.exitCode}`);
  }

  // Find all depgraph-*.json files in target/depgraphs
  const fs = require('fs');
  const depgraphsDir = path.join(directory, 'target', 'depgraphs');
  let files: string[] = [];
  try {
    files = fs.readdirSync(depgraphsDir)
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => path.join(depgraphsDir, f));
  } catch (err: any) {
    core.error(`Could not read depgraphs directory: ${err.message}`);
    return [];
  }

  // Parse all pom.xml files and build a map of {artifactId, groupId} => pomPath
  const allPoms = findPomFiles(directory);
  const pomInfo: Array<{ pomPath: string, artifactId: string, groupId: string }> = [];
  const xml2js = require('xml2js');
  for (const pomPath of allPoms) {
    try {
      const pomContent = fs.readFileSync(pomPath, 'utf8');
      let artifactId = '';
      let groupId = '';
      await xml2js.parseStringPromise(pomContent).then((result: any) => {
        // artifactId is always present
        artifactId = result.project.artifactId && result.project.artifactId[0];
        // groupId may be present or inherited from parent
        if (result.project.groupId) {
          groupId = result.project.groupId[0];
        } else if (result.project.parent && result.project.parent[0] && result.project.parent[0].groupId) {
          groupId = result.project.parent[0].groupId[0];
        }
      });
      if (artifactId && groupId) {
        pomInfo.push({ pomPath, artifactId, groupId });
      }
    } catch (err: any) {
      core.warning(`Failed to parse pom.xml ${pomPath}: ${err.message}`);
    }
  }


  // Build a map from normalized directory path to pom.xml path for fast lookup
  const pomDirMap = new Map<string, string>();
  for (const pomPath of allPoms) {
    const dir = path.dirname(path.resolve(pomPath));
    pomDirMap.set(dir, pomPath);
  }

  const results: Array<{ pomPath: string, depgraph: Depgraph }> = [];
  for (const file of files) {
    try {
      const depgraph = parseDependencyJson(file);
      // Try to match depgraph file to pom.xml by directory structure
      const depgraphDir = path.dirname(path.resolve(file));
      // depgraphDir will be .../target/depgraphs[/submodule/...], so walk up to find a pom.xml
      let candidateDir = depgraphDir;
      let foundPom: string | undefined = undefined;
      while (candidateDir && candidateDir !== directory && candidateDir !== path.parse(candidateDir).root) {
        // Look for pom.xml in the parent directory of the depgraph file
        if (pomDirMap.has(candidateDir.replace(/[/\\]target[/\\]depgraphs.*/, ''))) {
          foundPom = pomDirMap.get(candidateDir.replace(/[/\\]target[/\\]depgraphs.*/, ''));
          break;
        }
        // If not found, try the parent directory
        candidateDir = path.dirname(candidateDir);
      }
      // Fallback: try to match by artifactId/groupId if directory match fails
      if (!foundPom && depgraph.artifacts && depgraph.artifacts.length > 0) {
        const artifactId = depgraph.artifacts[0].artifactId;
        const groupId = depgraph.artifacts[0].groupId;
        const match = pomInfo.find(p => p.artifactId === artifactId && p.groupId === groupId);
        if (match) {
          foundPom = match.pomPath;
        }
      }
      // Fallback: root pom.xml
      if (!foundPom) {
        foundPom = path.join(directory, 'pom.xml');
      }
      results.push({ pomPath: foundPom, depgraph });
    } catch (err: any) {
      core.warning(`Failed to parse depgraph file ${file}: ${err.message}`);
    }
  }

  // Also ensure every pom.xml gets a manifest, even if no depgraph was found (empty manifest)
  for (const pomPath of allPoms) {
    if (!results.some(r => getRepositoryRelativePath(r.pomPath, directory) === getRepositoryRelativePath(pomPath, directory))) {
      // Add empty manifest
      try {
        const emptyDepgraph: Depgraph = { graphName: path.basename(pomPath, '.xml'), artifacts: [], dependencies: [], isMultiModule: false };
        results.push({ pomPath, depgraph: emptyDepgraph });
      } catch (err: any) {
        core.warning(`Failed to create empty manifest for ${pomPath}: ${err.message}`);
      }
    }
  }
  return results;
}

// Recursively find all pom.xml files under a directory
function findPomFiles(dir: string): string[] {
  const fs = require('fs');
  const results: string[] = [];
  function recurse(current: string) {
    if (fs.existsSync(current)) {
      if (fs.statSync(current).isDirectory()) {
        for (const entry of fs.readdirSync(current)) {
          recurse(path.join(current, entry));
        }
      } else if (path.basename(current) === 'pom.xml') {
        results.push(current);
      }
    }
  }
  recurse(dir);
  return results;
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

// Returns the path to 'file' relative to 'baseDir'. Defaults to workspace root if not provided.
function getRepositoryRelativePath(file: string, baseDir?: string) {
  const base = path.resolve(baseDir || process.env.GITHUB_WORKSPACE || '.');
  const fileResolved = path.resolve(file);
  let result = fileResolved;
  if (fileResolved.startsWith(base + path.sep)) {
    result = fileResolved.substring(base.length + 1);
  }
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
