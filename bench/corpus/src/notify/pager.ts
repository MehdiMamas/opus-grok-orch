export const PAGER_ROUTING_KEY = "harbor-oncall-primary";

export function pageOncall(incidentId: string): string {
  return `${PAGER_ROUTING_KEY}:${incidentId}`;
}
