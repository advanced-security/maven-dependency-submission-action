import * as fs from 'fs';
import * as core from '@actions/core';


export type MavenScope = 'provided' | 'compile' | 'test'

export type MavenArtifactType = 'jar' | 'pom' | 'test' | 'sources' | 'test-sources' | 'war' | 'maven-plugin'

export type MavenArtifact = {
  groupId: string
  artifactId: string
  version: string
  dependencies?: MavenArtifact[]
  scope: MavenScope
  type: MavenArtifactType
}

export function parseDependencyTree(file: string): MavenArtifact | undefined {
  const lines = loadFileContents(file);
  if (!lines) {
    return;
  }

  let rootArtifact: MavenArtifact | undefined;
  const artifactStack: MavenArtifact[] = [];

  lines.forEach(line => {
    const parsed = parseDependencyLine(line);
    if (!parsed) {
      return;
    }

    const { artifact, depth } = parsed;
    if (depth === 0) {
      rootArtifact = artifact;
      artifactStack.length = 0;
      artifactStack[0] = artifact;
      return;
    }

    const parentArtifact = artifactStack[depth - 1];
    if (!parentArtifact) {
      return;
    }

    if (!parentArtifact.dependencies) {
      parentArtifact.dependencies = [];
    }
    parentArtifact.dependencies.push(artifact);

    artifactStack[depth] = artifact;
    artifactStack.length = depth + 1;
  });

  return rootArtifact;
}

function parseDependencyLine(line: string): { artifact: MavenArtifact, depth: number } | undefined {
  const strippedPrefixLine = line.replace(/^\[INFO\] /, '');
  const match = /^(?:((?:\|  |   )*)(\+- |\\- ))?(\S+)(?:\s.*)?$/.exec(strippedPrefixLine);
  if (!match) {
    return undefined;
  }

  const coordinates = match[3].split(':');
  if (coordinates.length !== 4 && coordinates.length !== 5 && coordinates.length !== 6) {
    return undefined;
  }

  let groupId = '';
  let artifactId = '';
  let type = '';
  let version = '';
  let scope = '';

  if (coordinates.length === 4) {
    [groupId, artifactId, type, version] = coordinates;
  } else if (coordinates.length === 5) {
    [groupId, artifactId, type, version, scope] = coordinates;
  } else {
    [groupId, artifactId, type, , version, scope] = coordinates;
  }

  if (!groupId || !artifactId || !version || !type) {
    return undefined;
  }

  const prefix = match[1] || '';
  const connector = match[2];
  const depth = (prefix.match(/(\|  |   )/g)?.length || 0) + (connector ? 1 : 0);

  return {
    artifact: {
      groupId,
      artifactId,
      version,
      scope: parseScope(scope),
      type: parseArtifactType(type)
    },
    depth
  };
}

function parseScope(scope: string): MavenScope {
  if (scope === 'provided' || scope === 'compile' || scope === 'test') {
    return scope;
  }
  return 'compile';
}

function parseArtifactType(type: string): MavenArtifactType {
  if (type === 'jar' || type === 'pom' || type === 'test' || type === 'sources' || type === 'test-sources' || type === 'war' || type === 'maven-plugin') {
    return type;
  }
  return 'jar';
}

function loadFileContents(file: string): string[] | undefined {
  const exists = fs.existsSync(file);
  if (exists) {
    const fileStats = fs.statSync(file);
    if (fileStats.isFile()) {
      const contents = fs.readFileSync(file, {encoding: 'utf-8'});
      return contents.split(/\r?\n/);
    } else {
      core.setFailed(`Dependency file was not a file; '${file}'.`);
    }
  } else {
    core.setFailed(`Dependency file was not found; '${file}'.`);
  }
  return undefined;
}