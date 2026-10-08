/** Return only ticket IDs that have appeared since the queue was last seen. */
export function getNewTicketIds(
  previouslySeen: ReadonlySet<string> | null,
  currentIds: readonly string[],
): string[] {
  if (!previouslySeen) return []
  const fresh: string[] = []
  const returned = new Set<string>()
  for (const id of currentIds) {
    if (!previouslySeen.has(id) && !returned.has(id)) {
      fresh.push(id)
      returned.add(id)
    }
  }
  return fresh
}
