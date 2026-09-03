import { afterEach, describe, expect, it, vi } from 'vitest';
import { SNAPSHOT_EXCLUDE_FILE_NAME_WARNING, warnIfSnapshotExcludeFileNameUsed } from './deprecated-options';

describe('deprecated-options', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('warns when snapshot-exclude-file-name is provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    warnIfSnapshotExcludeFileNameUsed(true);

    expect(warn).toHaveBeenCalledWith(SNAPSHOT_EXCLUDE_FILE_NAME_WARNING);
  });

  it('does not warn when snapshot-exclude-file-name is omitted', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    warnIfSnapshotExcludeFileNameUsed(undefined);

    expect(warn).not.toHaveBeenCalled();
  });
});
