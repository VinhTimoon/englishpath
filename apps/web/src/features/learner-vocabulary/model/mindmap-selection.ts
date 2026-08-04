export function selectionUrl(nodeId: string, currentSearch: string) {
  const params = new URLSearchParams(currentSearch);
  params.set("rootId", nodeId);
  return `?${params.toString()}`;
}
