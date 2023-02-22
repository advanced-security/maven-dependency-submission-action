import { getMavenProjectDirectory } from './utils/test-util';
import { generateDependencyGraph, generateSnapshot } from './snapshot-generator';

describe('snapshot-generator', () => {

  jest.setTimeout(20000);

  describe('#generateDependencyGraph()', () => {

    it('should generate a snapshot for a simple project', async () => {
      const projectDir = getMavenProjectDirectory('simple');
      const depGraph = await generateDependencyGraph(projectDir);
      expect(depGraph.dependencies.length).toBe(20);
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

    it('should generate a snapshot for a multi-module project', async () => {
      const projectDir = getMavenProjectDirectory('multi-module');
      const snapshot = await generateSnapshot(projectDir);

      expect(snapshot.manifests['bs-parent']).toBeDefined();
      expect(snapshot.detector.version).toBe(version);
    });

    it('should generate a snapshot for a multi-module-multi-branch project', async () => {
      const projectDir = getMavenProjectDirectory('multi-module-multi-branch');
      const snapshot = await generateSnapshot(projectDir);

      expect(snapshot.manifests['bs-parent']).toBeDefined();
      expect(snapshot.detector.version).toBe(version);
      expect(snapshot.manifests['bs-parent'].countDependencies()).toBe(20);
    });

    it('should generate a snapshot for a maven-wrapper project', async () => {
      const projectDir = getMavenProjectDirectory('maven-wrapper');
      const snapshot = await generateSnapshot(projectDir);

      expect(snapshot.manifests['maven-wrapper-test']).toBeDefined();
      expect(snapshot.detector.version).toBe(version);
      expect(snapshot.manifests['maven-wrapper-test'].countDependencies()).toBe(0);
    });

    it('should generate a snapshot for an artifact with classifiers project', async () => {
      const projectDir = getMavenProjectDirectory('artifact-with-classifiers');
      const snapshot = await generateSnapshot(projectDir);

      expect(snapshot.manifests['artifact-with-classifiers']).toBeDefined();
      expect(snapshot.detector.version).toBe(version);
      expect(snapshot.manifests['artifact-with-classifiers'].countDependencies()).toBe(7);
    });
  });
});