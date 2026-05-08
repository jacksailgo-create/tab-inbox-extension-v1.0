export interface ProgrammaticMoveLock {
  tabId: number;
  expiresAt: number;
}

export class ProgrammaticMoveLockStore {
  private readonly locks = new Map<number, number>();

  lock(tabIds: number[], ttlMs = 1800): void {
    const expiresAt = Date.now() + ttlMs;
    for (const tabId of tabIds) {
      this.locks.set(tabId, expiresAt);
    }
  }

  isProgrammatic(tabId: number, now = Date.now()): boolean {
    const expiresAt = this.locks.get(tabId);
    if (!expiresAt) return false;
    if (expiresAt <= now) {
      this.locks.delete(tabId);
      return false;
    }
    return true;
  }

  clearExpired(now = Date.now()): void {
    for (const [tabId, expiresAt] of this.locks.entries()) {
      if (expiresAt <= now) this.locks.delete(tabId);
    }
  }
}

export interface ManualGroupChangeEvent {
  tabId: number;
  oldGroupId: number;
  newGroupId: number;
  timestamp: number;
}

export function classifyManualGroupChange(
  event: ManualGroupChangeEvent,
  lockStore: ProgrammaticMoveLockStore
): "programmatic" | "manual_move_to_group" | "manual_remove_from_group" | "manual_group_change" {
  if (lockStore.isProgrammatic(event.tabId, event.timestamp)) return "programmatic";
  if (event.oldGroupId === -1 && event.newGroupId !== -1) return "manual_move_to_group";
  if (event.oldGroupId !== -1 && event.newGroupId === -1) return "manual_remove_from_group";
  return "manual_group_change";
}
