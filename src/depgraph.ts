import { PackageURL } from 'packageurl-js'
import { PackageCache, Package, Manifest } from '@github/dependency-submission-toolkit';
import { DependencyScope } from '@github/dependency-submission-toolkit';
import { loadFileContents } from './utils/file-utils';

export type Depgraph = {
  graphName: string,
  artifacts: DepgraphArtifact[],
  dependencies: DepgraphDependency[],
  isMultiModule: boolean,
}

export type DepgraphArtifact = {
  id: string,
  numericId: number,
  groupId: string,
  artifactId: string,
  version: string,
  optional?: boolean,
  scopes?: string[],
  types?: string[],
  classifiers?: string[],
}

export type DepgraphDependency = {
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

  createManifest(filePath?: string): Manifest {
    let manifest: Manifest;
    if (filePath) {
      manifest = new Manifest(this.getProjectName(), filePath);
    } else {
      manifest = new Manifest(this.getProjectName());
    }

    const packageUrlToArtifact = this.packageUrlToArtifact;

    this.directDependencies.forEach(depPackage => {
      const artifact = this.packageUrlToArtifact[depPackage.packageURL.toString()];

      let scope = getDependencyScopeForMavenScope(artifact.scopes);
      manifest.addDirectDependency(depPackage, scope);

      function addTransitiveDeps(dependencies, seen: Set<string> = new Set()) {
        if (dependencies) {
          dependencies.forEach(transitiveDep => {
            let purl = transitiveDep.packageURL.toString();
            if (seen.has(purl)) {
              // we're in a cycle! skip this one.
              return;
            }
            const transitiveDepArtifact = packageUrlToArtifact[purl];
            const transitiveDepScope = getDependencyScopeForMavenScope(transitiveDepArtifact.scopes);
            manifest.addIndirectDependency(transitiveDep, transitiveDepScope);
            seen.add(purl);
            addTransitiveDeps(transitiveDep.dependencies, seen);
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

    const dependencies = graph.dependencies || [];

    const rootArtifactIds: string[] = [];
    const dependencyIdMap = dependencyMap(dependencies);
    const dependencyArtifactIdsWithParents = extractDependencyArtifactIdsWithParents(dependencies);
    const idToPackageCachePackage: Map<string, Package> = new Map<string, Package>();

    // Create the packages for all known artifacts
    graph.artifacts.forEach((artifact: DepgraphArtifact) => {
      const artifactUrl: PackageURL = artifactToPackageURL(artifact);
      const pkg = cache.package(artifactUrl);

      idToPackageCachePackage[artifact.id] = pkg;
      // Store a reference from the package URL to the original artifact as the artifact has extra metadata we need later for scopes and optionality
      this.packageUrlToArtifact[artifactUrl.toString()] = artifact;

      if (dependencyArtifactIdsWithParents.indexOf(artifact.id) === -1) {
        rootArtifactIds.push(artifact.id);
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

    const uniqueRootArtifactDependencies: string[] = [];
    rootArtifactIds.forEach(rootArtifactId => {
      const dependencyIds = getDirectDependencies(rootArtifactId, dependencies);
      if (dependencyIds) {
        dependencyIds.forEach(dependencyId => {
          if (uniqueRootArtifactDependencies.indexOf(dependencyId) === -1) {
            uniqueRootArtifactDependencies.push(dependencyId);
          }
        })
      }
    });

    this.directDependencies = uniqueRootArtifactDependencies.map(depId => idToPackageCachePackage[depId]);
  }
}

export function parseDependencyJson(file: string, isMultiModule: boolean = false): Depgraph {
  const data = loadFileContents(file);

  if (!data) {
    return {
      graphName: 'empty',
      artifacts: [],
      dependencies: [],
      isMultiModule: isMultiModule
    };
  }

  try {
    const depGraph: Depgraph = JSON.parse(data);
    depGraph.isMultiModule = isMultiModule;
    return depGraph;
  } catch (err: any) {
    throw new Error(`Failed to parse JSON dependency data: ${err.message}`);
  }
}

export function artifactToPackageURL(artifact: DepgraphArtifact): PackageURL {
  const qualifiers = getArtifactQualifiers(artifact);
  return new PackageURL(
    'maven',
    artifact.groupId,
    artifact.artifactId,
    artifact.version,
    qualifiers,
    undefined
  );
}

function getArtifactQualifiers(artifact: DepgraphArtifact): { [key: string]: string; } | undefined {
  let qualifiers: { [key: string]: string; } | undefined = undefined;

  if (artifact.types && artifact.types.length > 0) {
    if (!qualifiers) {
      qualifiers = {};
    }
    qualifiers['type'] = artifact.types[0];
  }

  if (artifact.classifiers && artifact.classifiers.length > 0) {
    if (!qualifiers) {
      qualifiers = {};
    }
    qualifiers['classifier'] = artifact.classifiers[0];
  }

  return qualifiers;
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

function extractDependencyArtifactIdsWithParents(dependencies: DepgraphDependency[]): string[] {
  if (dependencies) {
    return dependencies.map(dependency => { return dependency.to; })
  }
  return [];
}

function dependencyMap(dependencies: DepgraphDependency[]): Map<string, string[] | undefined> {
  const map = new Map<string, string[]>();

  if (dependencies) {
    dependencies.forEach(dependency => {
      const fromUrl = dependency.from;

      let deps = map[fromUrl];
      if (!deps) {
        deps = [];
        map[fromUrl] = deps;
      }

      deps.push(dependency.to);
    });
  }

  return map;
}

function getDirectDependencies(artifactId: string, dependencies: DepgraphDependency[]): string[] {
  const topLevel = dependencies.filter(dependency => { return dependency.from === artifactId; });
  return topLevel.map(dep => { return dep.to; });
}