import * as path from 'path';
import { getMavenProjectDirectory, getMavenSettingsFile } from './utils/test-util';
import { MavenRunner } from './maven-runner';

describe('maven-runner', () => {

  jest.setTimeout(20000);

  describe('create', () => {

    it('should create a runner without a wrapper', async () => {
      const projectDir = getMavenProjectDirectory('simple');

      const runner = new MavenRunner(projectDir);

      expect(runner.configuration.executable).toBeDefined();
      expect(runner.configuration.executable).toBe('mvn');
      expect(runner.configuration.settingsFile).toBeUndefined();
    });

    it('should create a runner with wrapper', async () => {
      const projectDir = getMavenProjectDirectory('maven-wrapper');

      const runner = new MavenRunner(projectDir);

      expect(runner.configuration.executable).toBeDefined();
      expect(runner.configuration.executable).toBe(path.join(projectDir, 'mvnw'));
      expect(runner.configuration.settingsFile).toBeUndefined();
    });

    describe('with settings', () => {

      it('should create a runner without a wrapper', async () => {
        const projectDir = getMavenProjectDirectory('simple');
        const settings = getMavenSettingsFile();

        const runner = new MavenRunner(projectDir, settings);

        expect(runner.configuration.executable).toBeDefined();
        expect(runner.configuration.executable).toBe('mvn');
        expect(runner.configuration.settingsFile).toBe(settings);
      });

    })
  });

  describe('#exec()', () => {

    it('should run path provided maven', async () => {
      const projectDir = getMavenProjectDirectory('simple');
      const runner = new MavenRunner(projectDir);

      const results = await runner.exec(projectDir, ['--version']);
      expect(results.exitCode).toBe(0);
      expect(results.stdout).toContain('Apache Maven');
    });

    it('should run wrapper provided maven', async () => {
      const projectDir = getMavenProjectDirectory('maven-wrapper');
      const runner = new MavenRunner(projectDir);

      const results = await runner.exec(projectDir, ['--version']);
      expect(results.exitCode).toBe(0);
      expect(results.stdout).toContain('Apache Maven');
      expect(results.stdout).toContain('3.8.6');
    });

    it('should run wrapper provided maven with validate phase', async () => {
      const projectDir = getMavenProjectDirectory('maven-wrapper');
      const runner = new MavenRunner(projectDir);

      const results = await runner.exec(projectDir, ['validate']);
      expect(results.exitCode).toBe(0);
    });

    describe('with additional arguments', () => {

      it('should run path provided maven with additional arguments', async () => {
        const projectDir = getMavenProjectDirectory('simple');
        const additionalMavenArgs = ' -DskipTests  -q';
        const runner = new MavenRunner(projectDir, undefined, false, additionalMavenArgs);

        const results = await runner.exec(projectDir, ['validate']);
        expect(results.exitCode).toBe(0);
        // by running with quiet mode there should be no output
        expect(results.stdout.length).toBe(0);
      });

      it('should run path provided maven with additional arguments', async () => {
        const projectDir = getMavenProjectDirectory('simple');
        const additionalMavenArgs = ' -X -B -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn';
        const runner = new MavenRunner(projectDir, undefined, false, additionalMavenArgs);

        const results = await runner.exec(projectDir, ['validate']);
        expect(results.exitCode).toBe(0);
        expect(results.stdout.length).toBe(7851);
      });
    });

    describe('with settings', () => {

      it('should run path provided maven with settings file', async () => {
        const projectDir = getMavenProjectDirectory('simple');
        const settingsFile = getMavenSettingsFile();

        const runner = new MavenRunner(projectDir, settingsFile);

        const results = await runner.exec(projectDir, ['-X', 'validate']);
        expect(results.exitCode).toBe(0);
        // When running in debug mode the settings files that are loaded are displayed in the stdout
        expect(results.stdout).toContain(`Reading user settings from ${path.resolve(settingsFile)}`);
      });

      it('should run wrapper provided maven with settings file', async () => {
        const projectDir = getMavenProjectDirectory('maven-wrapper');
        const settingsFile = getMavenSettingsFile();

        const runner = new MavenRunner(projectDir, settingsFile);

        const results = await runner.exec(projectDir, ['-X', 'validate']);
        expect(results.exitCode).toBe(0);
        // When running in debug mode the settings files that are loaded are displayed in the stdout
        expect(results.stdout).toContain(`Reading user settings from ${path.resolve(settingsFile)}`);
      });
    });
  });
});