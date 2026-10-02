export function authorizeHold(holdId: string, minor: number): string {
  return `authorized:${holdId}:${minor}`;
}

export function captureHold(holdId: string, minor: number): string {
  return `captured:${holdId}:${minor}`;
}

export function captureAuthorizedHold(holdId: string, minor: number): string {
  authorizeHold(holdId, minor);
  return captureHold(holdId, minor);
}
