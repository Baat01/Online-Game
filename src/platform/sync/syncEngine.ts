/**
 * Generates a deterministic checksum for a given state object.
 * Used for detecting client/server desyncs.
 */
export function generateChecksum(state: any): string {
  if (state === undefined || state === null) return '';
  
  // A simple deterministic JSON stringifier for the checksum.
  // We sort keys to ensure object key order doesn't affect the hash.
  const stringifyDeterministic = (obj: any): string => {
    if (obj === null) return 'null';
    if (Array.isArray(obj)) {
      return '[' + obj.map(stringifyDeterministic).join(',') + ']';
    }
    if (typeof obj === 'object') {
      const keys = Object.keys(obj).sort();
      return '{' + keys.map(k => `"${k}":${stringifyDeterministic(obj[k])}`).join(',') + '}';
    }
    return JSON.stringify(obj);
  };

  const str = stringifyDeterministic(state);
  
  // Simple FNV-1a hash algorithm for quick checksums
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}
