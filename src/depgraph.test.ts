import { expect } from 'chai';
import { parseDependencyJson, MavenDependencyGraph } from './depgraph';
import * as path from 'path';
import {describe, it, beforeAll} from 'vitest';

describe('depgraph', () => {

  it('should load a dependency JSON file', () => {
    const depGraph = parseDependencyJson(getTestDataFile('maven-plugin'));

    expect(depGraph.artifacts).to.have.length(96);
    expect(depGraph.dependencies).to.have.length(95);

    const artifact = depGraph.artifacts[0];
    expect(artifact.groupId).to.equal('org.apache.maven.plugins');
    expect(artifact.artifactId).to.equal('maven-dependency-plugin');
    expect(artifact.version).to.equal('4.0.0-SNAPSHOT');
    expect(artifact.id).to.equal('org.apache.maven.plugins:maven-dependency-plugin:maven-plugin');

    const dependency = depGraph.dependencies[0];
    expect(dependency.resolution).to.equal('INCLUDED');
    expect(dependency.from).to.equal('org.apache.maven.plugins:maven-dependency-plugin:maven-plugin');
    expect(dependency.to).to.equal('org.apache.maven:maven-artifact:jar');
  });

  describe('parseDependencies', () => {

    describe('maven-plugin', () => {

      let depGraph;

      beforeAll(() => {
        depGraph = parseDependencyJson(getTestDataFile('maven-plugin'));
      });

      it('should parse out the top level dependencies', () => {
        const mavenDependencies = new MavenDependencyGraph(depGraph);
        const topLevelDependencies = mavenDependencies.getDirectDependencies();

        expect(mavenDependencies.getPackageCount()).to.equal(96);

        const names = topLevelDependencies.map(pkg => pkg.packageID());
        expect(names).to.have.members([
          "pkg:maven/org.apache.maven/maven-artifact@3.1.1?type=jar",
          "pkg:maven/org.apache.maven/maven-plugin-api@3.1.1?type=jar",
          "pkg:maven/org.apache.maven/maven-model@3.1.1?type=jar",
          "pkg:maven/org.apache.maven/maven-core@3.1.1?type=jar",
          "pkg:maven/org.apache.maven/maven-repository-metadata@3.1.1?type=jar",
          "pkg:maven/org.apache.maven/maven-settings@3.1.1?type=jar",
          "pkg:maven/org.apache.maven/maven-aether-provider@3.1.1?type=jar",
          "pkg:maven/org.apache.maven.reporting/maven-reporting-impl@3.1.0?type=jar",
          "pkg:maven/commons-io/commons-io@2.11.0?type=jar",
          "pkg:maven/org.codehaus.plexus/plexus-archiver@4.2.2?type=jar",
          "pkg:maven/org.codehaus.plexus/plexus-utils@3.4.1?type=jar",
          "pkg:maven/org.codehaus.plexus/plexus-io@3.2.0?type=jar",
          "pkg:maven/org.apache.maven.shared/maven-dependency-analyzer@1.12.0?type=jar",
          "pkg:maven/org.apache.maven.shared/maven-dependency-tree@3.1.0?type=jar",
          "pkg:maven/org.apache.maven.shared/maven-common-artifact-filters@3.2.0?type=jar",
          "pkg:maven/org.apache.maven.shared/maven-artifact-transfer@0.13.1?type=jar",
          "pkg:maven/org.apache.maven.shared/maven-shared-utils@3.3.4?type=jar",
          "pkg:maven/org.apache.commons/commons-lang3@3.12.0?type=jar",
          "pkg:maven/org.apache.commons/commons-collections4@4.2?type=jar",
          "pkg:maven/org.apache.maven.plugin-tools/maven-plugin-annotations@3.6.4?type=jar",
          "pkg:maven/org.eclipse.aether/aether-api@0.9.0.M2?type=jar",
          "pkg:maven/org.eclipse.aether/aether-util@0.9.0.M2?type=jar",
          "pkg:maven/org.eclipse.aether/aether-connector-wagon@0.9.0.M2?type=jar",
          "pkg:maven/org.apache.maven.wagon/wagon-http-lightweight@3.4.0?type=jar",
          "pkg:maven/junit/junit@4.13.2?type=jar",
          "pkg:maven/org.apache.maven.plugin-testing/maven-plugin-testing-tools@3.1.0?type=jar",
          "pkg:maven/org.apache.maven.plugin-testing/maven-plugin-testing-harness@3.1.0?type=jar",
          "pkg:maven/org.mockito/mockito-core@4.3.1?type=jar",
          "pkg:maven/org.codehaus.plexus/plexus-interpolation@1.26?type=jar",
          "pkg:maven/org.apache.maven/maven-compat@3.1.1?type=jar",
          "pkg:maven/org.eclipse.jetty/jetty-server@9.4.45.v20220203?type=jar",
          "pkg:maven/org.eclipse.jetty/jetty-util@9.4.45.v20220203?type=jar",
          "pkg:maven/org.eclipse.jetty/jetty-security@9.4.45.v20220203?type=jar",
          "pkg:maven/org.slf4j/slf4j-simple@1.7.36?type=jar",
          "pkg:maven/commons-beanutils/commons-beanutils@1.9.4?type=jar"
        ]);
      });

      it('should provide a manifest', () => {
        const mavenDependencies = new MavenDependencyGraph(depGraph);
        const manifest = mavenDependencies.createManifest();

        expect(manifest.name).to.equal('maven-dependency-plugin');
        expect(manifest.countDependencies()).to.equal(95);
      });
    });


    describe('bookstore-v3', () => {

      let depGraph;

      beforeAll(() => {
        depGraph = parseDependencyJson(getTestDataFile('bookstore-v3'));
      });

      it('should parse out the top level dependencies', () => {
        const mavenDependencies = new MavenDependencyGraph(depGraph);
        const topLevelDependencies = mavenDependencies.getDirectDependencies();

        expect(mavenDependencies.getPackageCount()).to.equal(21);

        const names = topLevelDependencies.map(pkg => pkg.packageID());
        expect(names).to.have.members([
          "pkg:maven/org.eclipse.jetty/jetty-server@10.0.0?type=jar",
          "pkg:maven/org.eclipse.jetty/jetty-servlet@10.0.0?type=jar",
          "pkg:maven/org.thymeleaf/thymeleaf@3.0.12.RELEASE?type=jar",
          "pkg:maven/org.json/json@20210307?type=jar",
          "pkg:maven/org.xerial/sqlite-jdbc@3.32.3.2?type=jar",
          "pkg:maven/org.apache.logging.log4j/log4j-slf4j18-impl@2.17.2?type=jar",
          "pkg:maven/junit/junit@4.13?type=jar"
        ]);
      });
    });

    describe('cycle-tree', () => {
      let depGraph;
      beforeAll(() => {
        depGraph = parseDependencyJson(getTestDataFile("cycle-tree"));
      });

      it('should parse out the top level dependencies', () => {
        const mavenDependencies = new MavenDependencyGraph(depGraph);
        expect(mavenDependencies.getPackageCount()).to.equal(3);
      });

      it('should be able to generate a manifest despite having a cycle', () => {
        const mavenDependencies = new MavenDependencyGraph(depGraph);
        const manifest = mavenDependencies.createManifest();

        expect(manifest.name).to.equal('hadoop-main');
        expect(manifest.countDependencies()).to.equal(2);
      })
    });

    describe('bs-parent-dep-tree', () => {

      let depGraph;

      beforeAll(() => {
        depGraph = parseDependencyJson(getTestDataFile('bs-parent-dep-tree'));
      });

      it('should parse out the top level dependencies', () => {
        const mavenDependencies = new MavenDependencyGraph(depGraph);
        const topLevelDependencies = mavenDependencies.getDirectDependencies();

        expect(mavenDependencies.getPackageCount()).to.equal(19);

        const topLevelNames = topLevelDependencies.map(pkg => pkg.packageID());
        expect(topLevelNames).to.have.members([
          "pkg:maven/org.eclipse.jetty/jetty-server@10.0.10?type=jar",
          "pkg:maven/com.github.octodemo/bs-library@1.0.0-SNAPSHOT?type=jar",
          "pkg:maven/junit/junit@4.13?type=jar"
        ]);
      });
    });
  });
});

function getTestDataFile(name: string) {
  return path.join(__dirname, '..', 'test-data', 'dependency-trees', `${name}.json`);
}