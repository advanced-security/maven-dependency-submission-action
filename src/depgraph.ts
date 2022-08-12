import * as fs from 'fs';

import { PackageURL } from 'packageurl-js'
import { PackageCache, Package, Manifest } from '@github/dependency-submission-toolkit';
import { DependencyScope } from '@github/dependency-submission-toolkit/dist/manifest';

type Depgraph = {
  graphName: string,
  artifacts: DepgraphArtifact[],
  dependencies: DepgraphDependency[],
}

type DepgraphArtifact = {
  id: string,
  numericId: number,
  groupId: string,
  artifactId: string,
  version: string,
  optional?: boolean,
  scopes?: string[],
  types?: string[],
}

type DepgraphDependency = {
  from: string,
  to: string,
  numericFrom: number,
  numericTo: number,
  resolution: string,
}

export class MavenDependencyGraph {

  private depGraph: Depgraph;

  private packageUrlToArtifact: Map<string, DepgraphArtifact>;

  private cache: PackageCache;

  private directDependencies: Array<Package>;

  // //@ ts-ignore
  // private rootPackage: DepgraphArtifact;

  constructor(graph: Depgraph) {
    this.depGraph = graph;
    this.cache = new PackageCache();
    this.packageUrlToArtifact = new Map();
    this.directDependencies = [];

    this.parseDependencies();
  }

  getProjectName() {
    return this.depGraph.graphName;
  }

  getAllPackageUrls() {
    return Object.keys(this.packageUrlToArtifact);
  }

  getArtifactForPackageUrl(packageUrl: string) {
    return this.packageUrlToArtifact[packageUrl];
  }

  getDirectDependencies() {
    return this.directDependencies;
  }

  getPackageCount() {
    return this.cache.countPackages();
  }

  createManifest(): Manifest {
    const manifest = new Manifest(this.getProjectName());

    const packageUrlToArtifact = this.packageUrlToArtifact;

    this.directDependencies.forEach(depPackage => {
      const artifact = this.packageUrlToArtifact[depPackage.packageURL.toString()];

      let scope = getDependencyScopeForMavenScope(artifact.scopes);
      manifest.addDirectDependency(depPackage, scope);

      function addTransitiveDeps(dependencies) {
        if (dependencies) {
          dependencies.forEach(transitiveDep => {
            const transitiveDepArtifact = packageUrlToArtifact[transitiveDep.packageURL.toString()];
            const transitiveDepScope = getDependencyScopeForMavenScope(transitiveDepArtifact.scopes);
            manifest.addIndirectDependency(transitiveDep, transitiveDepScope);
            addTransitiveDeps(transitiveDep.dependencies);
          });
        }
      }

      addTransitiveDeps(depPackage.dependencies);
    });

    return manifest;
  }

  private parseDependencies() {
    const graph = this.depGraph;
    const cache = this.cache;

    const rootPackageArtifactId = graph.graphName;
    let rootPackageNumericId = 0;

    const dependencyIdMap = dependencyMap(graph.dependencies);
    const idToPackageCachePackage : Map<string, Package> = new Map<string, Package>();

    // Create the packages for all known artifacts
    graph.artifacts.forEach((artifact: DepgraphArtifact) => {
      const artifactUrl: PackageURL = artifactToPackageURL(artifact);
      const pkg = cache.package(artifactUrl);

      idToPackageCachePackage[artifact.id] = pkg;
      // Store a reference from the package URL to the original artifact as the artifact has extra metadata we need later for scopes and optionality
      this.packageUrlToArtifact[artifactUrl.toString()] = artifact;

      if (artifact.artifactId === rootPackageArtifactId) {
        rootPackageNumericId = artifact.numericId - 1;
      }
    });

    // Now that all packages are known, process the dependencies for each and link them
    Object.keys(dependencyIdMap).forEach(fromId => {
      const pkg: Package = idToPackageCachePackage[fromId];

      if (!pkg) {
        throw new Error(`Package '${fromId}' was not found in the cache.`);
      }

      const deps = dependencyIdMap[fromId];
      if (deps) {
        // Process each dependency id and link to the package in the cache
        deps.forEach(dependencyId => {
          const dependencyPkg = idToPackageCachePackage[dependencyId];

          if (!dependencyPkg) {
            throw new Error(`Failed to find a dependency package for '${dependencyId}'`);
          }
          pkg.dependsOn(dependencyPkg);
        });
      }
    });
    this.directDependencies = getDirectDependencies(rootPackageNumericId, graph.dependencies).map(id => {return idToPackageCachePackage[id]});
  }
}

export function parseDependencyJson(file: string): Depgraph {
  try {
    const data: Buffer = fs.readFileSync(file);
    try {
      const depGraph: Depgraph = JSON.parse(data.toString('utf-8'));
      return depGraph;
    } catch(err: any) {
      throw new Error(`Failed to parse JSON payload: ${err.message}`);
    }
  } catch(err: any) {
    throw new Error(`Failed to load file ${file}: ${err}`);
  }
}

export function artifactToPackageURL(artifact: DepgraphArtifact): PackageURL {
  return new PackageURL(
    'maven',
    artifact.groupId,
    artifact.artifactId,
    artifact.version,
    undefined,
    undefined
  );
}

function getDependencyScopeForMavenScope(mavenScopes: string[] | undefined | null): DependencyScope {
  // Once the API scopes are improved and expanded we should be able to perform better mapping here from Maven to cater for
  // provided, runtime, compile, test, system, etc... in the future.
  if (mavenScopes) {
    if (mavenScopes.includes('test')) {
      return 'development';
    }
  }

  // The default scope for now as we only have runtime and development currently
  return 'runtime';
}

function dependencyMap(dependencies: DepgraphDependency[]): Map<string, string[] | undefined> {
  const map = new Map<string, string[]>();

  dependencies.forEach(dependency => {
    const fromUrl = dependency.from;

    let deps = map[fromUrl];
    if (!deps) {
      deps = [];
      map[fromUrl] = deps;
    }

    deps.push(dependency.to);
  });

  return map;
}

function getDirectDependencies(rootPackageNumericId: number, dependencies: DepgraphDependency[]): string[] {
  const topLevel = dependencies.filter(dependency => { return dependency.numericFrom === rootPackageNumericId; });
  return topLevel.map(dep => { return dep.to; });
}