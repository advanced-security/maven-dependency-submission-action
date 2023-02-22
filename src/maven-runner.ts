import * as exec from '@actions/exec';
import * as core from '@actions/core';

import * as path from 'path';
import { fileExists } from './utils/file-utils';


export type ExecResults = {
  stdout: string,
  stderr: string,
  exitCode: number
}

export type MavenRunnerConfiguration = {
  executable: string
  settingsFile?: string
  mavenArgs?: string
}

export class MavenRunner {

  private mavenExecutable: string

  private settings: string | undefined;

  private additionalArguments: string[];

  constructor(directory?: string, settingsFile?: string, ingoreWrapper: boolean = false, mavenArguments: string = '') {
    this.mavenExecutable = resolveMavenExecutable(directory, ingoreWrapper);

    if (settingsFile) {
      if (fileExists(settingsFile)) {
        this.settings = settingsFile;
      } else {
        throw new Error(`The specified settings file '${settingsFile}' does not exist`);
      }
    }

    this.additionalArguments = [];
    if (mavenArguments.trim().length > 0) {
      this.additionalArguments = mavenArguments.trim().split(' ');
    }
  }

  get configuration() {
    return {
      executable: this.mavenExecutable,
      settingsFile: this.settings
    };
  }

  async exec(cwd: string, parameters: string[]): Promise<ExecResults> {
    const commandArgs: string[] = [];

    // implictly run in batch mode, might need to make this configurable in the future
    commandArgs.push('-B');

    if (this.settings) {
      commandArgs.push('--settings')
      commandArgs.push(this.settings);
    }

    // Only append the additional arguments they are not empty values
    if (this.additionalArguments && this.additionalArguments.length > 0) {
      this.additionalArguments.forEach(arg => {
        if (arg.trim().length > 0) {
          commandArgs.push(arg);
        }
      });
    }
    Array.prototype.push.apply(commandArgs, parameters);

    let executionOutput = '';
    let executionErrors = '';

    const options = {
      cwd: cwd,
      listeners: {
        stdout: (data: Buffer) => {
          executionOutput += data.toString();
        },
        stderr: (data: Buffer) => {
          executionErrors += data.toString();
        }
      }
    };

    try {
      const exitCode = await exec.exec(this.mavenExecutable, commandArgs, options);

      return {
        stdout: executionOutput,
        stderr: executionErrors,
        exitCode: exitCode
      }
    } catch (err: any) {
      //TODO possibly throw a wrapped error here
      core.warning(`Error encountered executing maven: ${err.message}`);
      return {
        stdout: executionOutput,
        stderr: executionErrors,
        exitCode: -1
      }
    }
  }
}

function resolveMavenExecutable(directory?: string, ignoreWrapper: boolean = false): string {
  if (ignoreWrapper) {
    return getMavenExecutable();
  }

  const wrapper = getMavenWrapper(directory);
  // Return the matche maven wrapper script or otherwise fall back to mvn on the path
  return wrapper || getMavenExecutable();
}

function getMavenWrapper(directory?: string): string | undefined {
  if (!directory) {
    return undefined;
  }

  const mavenWrapperFilename = path.join(directory, getMavenWrapperExecutable());
  if (fileExists(mavenWrapperFilename)) {
    return mavenWrapperFilename;
  }

  return undefined;
}

function getMavenWrapperExecutable(): string {
  if (isWindows()) {
    return 'mvnw.cmd';
  }
  return 'mvnw';
}

function getMavenExecutable(): string {
  if (isWindows()) {
    return 'mvn.cmd';
  }
  return 'mvn';
}

function isWindows() {
  return process.platform === 'win32';
}