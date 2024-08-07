import { getMavenProjectDirectory } from './utils/test-util';
import { generateDependencyGraph, generateSnapshot } from './snapshot-generator';
import {describe, it, expect} from 'vitest';

describe('snapshot-generator', () => {

  describe('#generateDependencyGraph()', () => {

    it('should generate a snapshot for a simple project', async () => {
      const projectDir = getMavenProjectDirectory('simple');
      const depGraph = await generateDependencyGraph(projectDir);
      expect(depGraph.dependencies.length).toBe(20);
    }, 20000);
  });

  describe('#generateSnapshot()', () => {

    const version = require('../package.json')['version'];

    it('should generate a snapshot for a simple project', async () => {
      const projectDir = getMavenProjectDirectory('simple');
      const snapshot = await generateSnapshot(projectDir);

      expect(snapshot.manifests['bookstore-v3']).toBeDefined();
      expect(snapshot.detector.version).toBe(version);
    }, 20000);

    it('should generate a snapshot for a multi-module project', async () => {
      const projectDir = getMavenProjectDirectory('multi-module');
      const snapshot = await generateSnapshot(projectDir);

      expect(snapshot.manifests['bs-parent']).toBeDefined();
      expect(snapshot.detector.version).toBe(version);
    }, 20000);

    it('should generate a snapshot for a multi-module-multi-branch project', async () => {
      const projectDir = getMavenProjectDirectory('multi-module-multi-branch');
      const snapshot = await generateSnapshot(projectDir);

      expect(snapshot.manifests['bs-parent']).toBeDefined();
      expect(snapshot.detector.version).toBe(version);
      expect(snapshot.manifests['bs-parent'].countDependencies()).toBe(20);
    }, 20000);

    it('should generate a snapshot for a maven-wrapper project', async () => {
      const projectDir = getMavenProjectDirectory('maven-wrapper');
      const snapshot = await generateSnapshot(projectDir);

      expect(snapshot.manifests['maven-wrapper-test']).toBeDefined();
      expect(snapshot.detector.version).toBe(version);
      expect(snapshot.manifests['maven-wrapper-test'].countDependencies()).toBe(0);
    }, 20000);

    it('should generate a snapshot for an artifact with classifiers project', async () => {
      const projectDir = getMavenProjectDirectory('artifact-with-classifiers');
      const snapshot = await generateSnapshot(projectDir);

      expect(snapshot.manifests['artifact-with-classifiers']).toBeDefined();
      expect(snapshot.detector.version).toBe(version);
      expect(snapshot.manifests['artifact-with-classifiers'].countDependencies()).toBe(7);
    }, 20000);

    it('should process a problematic dependecy-tree 2602', async() => {
      const projectDir = getMavenProjectDirectory('dependency-graph-2602');
      const snapshot = await generateSnapshot(projectDir);

      expect(snapshot.manifests['problem-dependency-graph-2602']).toBeDefined();
      expect(snapshot.detector.version).toBe(version);
      expect(snapshot.manifests['problem-dependency-graph-2602'].countDependencies()).toBe(230);
    }, 40000);

    it('should use correlator from snapshotConfig if it exists', async() => {
      const projectDir = getMavenProjectDirectory('simple');
      const snapshotConfig = {
        correlator: 'configCorrelator',
        job: {
          correlator: 'jobCorrelator'
        }
      };
      const snapshot = await generateSnapshot(projectDir, undefined, snapshotConfig);

      expect(snapshot.job.correlator).toBe('configCorrelator');
    }, 20000);

    it('should use a default job correlator when not specified', async() => {
      const projectDir = getMavenProjectDirectory('simple');
      const snapshotConfig = {
        job: {
          correlator: 'jobCorrelator'
        }
      };
      const snapshot = await generateSnapshot(projectDir, undefined, snapshotConfig);

      expect(snapshot.job.correlator).toBe('jobCorrelator');
    }, 20000);
  });
});