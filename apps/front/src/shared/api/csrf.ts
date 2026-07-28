const CSRF_COOKIE_NAME = 'lg_csrf';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

export function readCsrfToken(): string | undefined {
  const prefix = `${CSRF_COOKIE_NAME}=`;
  const match = document.cookie.split('; ').find((entry) => entry.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined;
}

export function csrfHeader(): Record<string, string> {
  const token = readCsrfToken();
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}
