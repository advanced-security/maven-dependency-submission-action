import { spawnSync } from 'child_process';
import { describe, expect, it } from 'vitest';

describe('dist action entrypoint', () => {
  it('loads under the action Node runtime module format', () => {
    const result = spawnSync(process.execPath, ['dist/index.js'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      env: {
        ...process.env,
        INPUT_DIRECTORY: '',
      },
    });

    const output = `${result.stdout}${result.stderr}`;
    expect(output).not.toContain('require is not defined');
    expect(output).toContain('Input required and not supplied: directory');
    expect(result.status).toBe(1);
  });
});
