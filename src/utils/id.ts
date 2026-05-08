export function makeId(prefix: string, now = Date.now()): string {
  return `${prefix}_${now.toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
