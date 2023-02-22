import * as path from 'path';

function getTestDataDirectory() {
  return path.join(__dirname, '..', '..', 'test-data');
}

export function getMavenProjectDirectory(name: string): string {
  return path.join(getTestDataDirectory(), 'maven', name);
}

export function getMavenSettingsFile(): string {
  return path.join(getTestDataDirectory(), 'maven', 'settings.xml');
}