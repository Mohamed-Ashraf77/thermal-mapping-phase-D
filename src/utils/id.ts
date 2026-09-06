let counter = 0;

/** Small dependency-free unique id generator (sufficient for client-only state). */
export function createId(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}
