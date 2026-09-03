import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {describe, it, expect} from 'vitest';
import { parseDependencyTree } from './maven-dependencies';

describe('maven-dependencies', () => {
  it('parses a maven dependency tree into nested artifacts', () => {
    const dependencyTreeContents = [
      '[INFO] com.example:app:jar:1.0.0',
      '[INFO] +- org.foo:foo-lib:jar:2.0.0:compile',
      '[INFO] |  \\- org.bar:bar-lib:pom:3.1.0:test',
      '[INFO] \\- org.baz:baz-lib:war:4.0.0:provided',
      '[INFO] BUILD SUCCESS'
    ].join('\n');

    const filePath = writeTempTreeFile(dependencyTreeContents);
    const root = parseDependencyTree(filePath);

    expect(root).toBeDefined();
    expect(root?.groupId).toBe('com.example');
    expect(root?.artifactId).toBe('app');
    expect(root?.version).toBe('1.0.0');
    expect(root?.dependencies).toHaveLength(2);
    expect(root?.dependencies?.[0].artifactId).toBe('foo-lib');
    expect(root?.dependencies?.[0].dependencies?.[0].artifactId).toBe('bar-lib');
    expect(root?.dependencies?.[0].dependencies?.[0].scope).toBe('test');
    expect(root?.dependencies?.[1].artifactId).toBe('baz-lib');
    expect(root?.dependencies?.[1].scope).toBe('provided');
  });

  it('parses classifier coordinates and defaults unsupported scopes to compile', () => {
    const dependencyTreeContents = [
      '[INFO] com.example:app:jar:1.0.0',
      '[INFO] \\- org.slf4j:slf4j-api:jar:sources:2.0.16:runtime'
    ].join('\n');

    const filePath = writeTempTreeFile(dependencyTreeContents);
    const root = parseDependencyTree(filePath);

    expect(root?.dependencies).toHaveLength(1);
    expect(root?.dependencies?.[0].artifactId).toBe('slf4j-api');
    expect(root?.dependencies?.[0].version).toBe('2.0.16');
    expect(root?.dependencies?.[0].type).toBe('jar');
    expect(root?.dependencies?.[0].scope).toBe('compile');
  });
});

function writeTempTreeFile(contents: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maven-dependency-tree-'));
  const filePath = path.join(tempDir, 'tree.txt');
  fs.writeFileSync(filePath, contents, {encoding: 'utf-8'});
  return filePath;
}
