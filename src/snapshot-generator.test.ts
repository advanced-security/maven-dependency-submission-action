import * as path from 'path';
import {generateDependencyGraph, generateSnapshot} from './snapshot-generator';

describe('snapshot-generator', () => {

  jest.setTimeout(20000);

  describe('#generateDependencyGraph()', () => {

    it('should generate a snapshot for a simple project', async () => {
      const projectDir = getMavenProjectDirectory('simple');
      const depGraph = await generateDependencyGraph(projectDir);
      expect(depGraph.dependencies.length).toBe(27);
    });
  });

  describe('#generateSnapshot()', () => {

    const version = require('../package.json')['version'];

    it('should generate a snapshot for a simple project', async () => {
      const projectDir = getMavenProjectDirectory('simple');
      const snapshot = await generateSnapshot(projectDir);

      expect(snapshot.manifests['bookstore-v3']).toBeDefined();
      expect(snapshot.detector.version).toBe(version);
    });
  });
});

function getMavenProjectDirectory(name: string): string {
  return path.join(__dirname, '..', 'test-data', 'maven', name);
}
