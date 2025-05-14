import { getMavenProjectDirectory } from './utils/test-util';
import { generateDependencyGraphs, generateSnapshot } from './snapshot-generator';
import {describe, it, expect} from 'vitest';
import { Manifest } from '@github/dependency-submission-toolkit';

describe('snapshot-generator', () => {

  describe('#generateDependencyGraph()', () => {

    it('should generate a snapshot for a simple project', async () => {
      const projectDir = getMavenProjectDirectory('simple');
      const depGraphs = await generateDependencyGraphs(projectDir);
      expect(depGraphs).toBeDefined();
      expect(depGraphs.length).toBe(1);
      const depGraph = depGraphs[0];

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

      expect(snapshot.detector.version).toBe(version);

      const bsParentManifest = snapshot.manifests['bs-parent'];
      expect(bsParentManifest).toBeDefined();
      expect(getDirectDependencyPurls(bsParentManifest)).toEqual([
        'pkg:maven/junit/junit@4.13?type=jar']);

      const bsApplicationManifest = snapshot.manifests['bs-application'];
      expect(bsApplicationManifest).toBeDefined();
      expect(getDirectDependencyPurls(bsApplicationManifest)).toEqual([
        'pkg:maven/com.github.octodemo/bs-library-web@1.0.0-SNAPSHOT?type=jar',
        'pkg:maven/junit/junit@4.13?type=jar',
        'pkg:maven/org.eclipse.jetty/jetty-server@10.0.10?type=jar',
      ]);

      const bsLibrariesManifest = snapshot.manifests['bs-libraries'];
      expect(bsLibrariesManifest).toBeDefined();
      expect(getDirectDependencyPurls(bsLibrariesManifest)).toEqual([
        'pkg:maven/junit/junit@4.13?type=jar',
        'pkg:maven/org.apache.logging.log4j/log4j-api@2.19.0?type=jar',
      ]);

      const bsOtherManifest = snapshot.manifests['bs-other'];
      expect(bsOtherManifest).toBeDefined();
      expect(getDirectDependencyPurls(bsOtherManifest)).toEqual([
        'pkg:maven/junit/junit@4.13?type=jar',
      ]);

      const bsLibraryDatabaseManifest = snapshot.manifests['bs-library-database'];
      expect(bsLibraryDatabaseManifest).toBeDefined();
      expect(getDirectDependencyPurls(bsLibraryDatabaseManifest)).toEqual([
        'pkg:maven/junit/junit@4.13?type=jar',
        'pkg:maven/org.apache.logging.log4j/log4j-api@2.19.0?type=jar',
        'pkg:maven/org.postgresql/postgresql@42.5.0?type=jar',
        'pkg:maven/org.xerial/sqlite-jdbc@3.36.0.3?type=jar',
      ]);

      const bsLibraryWebManifest = snapshot.manifests['bs-library-web'];
      expect(bsLibraryWebManifest).toBeDefined();
      expect(getDirectDependencyPurls(bsLibraryWebManifest)).toEqual([
        'pkg:maven/junit/junit@4.13?type=jar',
        'pkg:maven/org.apache.logging.log4j/log4j-api@2.19.0?type=jar',
        'pkg:maven/org.eclipse.jetty.http2/http2-http-client-transport@10.0.10?type=jar',
      ]);
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

function getDirectDependencyPurls(manifest: Manifest): string[] {
  return Object.values(manifest.resolved).filter(dep => dep.relationship === 'direct').map(dep => dep.depPackage.packageURL.toString()).sort();
}
