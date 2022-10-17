import * as path from 'path';
import {generateDependencyGraph, generateSnapshot} from './snapshot-generator';

describe('snapshot-generator', () => {

  jest.setTimeout(20000);

  describe('#generateDependencyGraph()', () => {

    it('should generate dependency graph for a simple project', async () => {
      const projectDir = getMavenProjectDirectory('simple');
      const depGraph = await generateDependencyGraph(projectDir);
      expect(depGraph.dependencies.length).toBe(20);
    });

    it('should generate dependency graph for a multi-module project', async () => {
      const projectDir = getMavenProjectDirectory('parent-project');
      const depGraph = await generateDependencyGraph(projectDir);
      expect(depGraph.dependencies.length).toBe(6);
    })
  });

  describe('#generateSnapshot()', () => {

    const version = require('../package.json')['version'];

    it('should generate a snapshot for a simple project', async () => {
      const projectDir = getMavenProjectDirectory('simple');
      const snapshot = await generateSnapshot(projectDir);

      expect(snapshot.manifests['bookstore-v3']).toBeDefined();
      expect(snapshot.detector.version).toBe(version);
    });

    it('should generate a snapshot for a multi-module project', async () => {
      const projectDir = getMavenProjectDirectory('parent-project');
      const snapshot = await generateSnapshot(projectDir);

      expect(snapshot.manifests['parent-project']).toBeDefined();
      expect(snapshot.detector.version).toBe(version);
    });
  });
});

function getMavenProjectDirectory(name: string): string {
  return path.join(__dirname, '..', 'test-data', 'maven', name);
}
