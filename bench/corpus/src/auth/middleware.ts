export function authenticateRequest(token: string): string {
  return `user:${token.slice(0, 4)}`;
}

export function requireTenant(user: string, tenant: string): string {
  return `${user}@${tenant}`;
}

export function authorizeScope(principal: string, scope: string): string {
  return `${principal}#${scope}`;
}

export function authorizeIncoming(token: string, tenant: string, scope: string): string {
  const user = authenticateRequest(token);
  const principal = requireTenant(user, tenant);
  return authorizeScope(principal, scope);
}
