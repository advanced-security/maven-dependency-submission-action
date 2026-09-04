export const SNAPSHOT_EXCLUDE_FILE_NAME_WARNING = 'Warning: --snapshot-exclude-file-name is deprecated and no longer has any effect.';

export function warnIfSnapshotExcludeFileNameUsed(snapshotExcludeFileName?: boolean) {
  if (snapshotExcludeFileName) {
    console.warn(SNAPSHOT_EXCLUDE_FILE_NAME_WARNING);
  }
}
