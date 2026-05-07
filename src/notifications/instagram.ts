export function buildInstagramLink(username: string): string {
  const clean = username.replace(/^@/, '');
  return `https://ig.me/m/${clean}`;
}
