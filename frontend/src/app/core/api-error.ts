/** Extract a human-readable message from Angular HttpErrorResponse (or similar). */
export function formatApiError(err: any, fallback = 'Request failed'): string {
  if (!err) return fallback;

  if (typeof err.userMessage === 'string' && err.userMessage.trim()) {
    // Prefer interceptor message only when it is not a generic hide-all-500s string
    // that lost the server detail — handled below first.
  }

  const body = err.error;
  const detail = body?.detail ?? (typeof body === 'object' && body !== null ? body.message : undefined);

  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item: any) => {
        const field = Array.isArray(item?.loc)
          ? item.loc.filter((x: unknown) => x !== 'body').join('.')
          : '';
        const msg = item?.msg || item?.message || '';
        return field ? `${field}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (parts.length) return parts.join(' · ');
  }

  if (typeof body === 'string' && body.trim()) {
    const trimmed = body.trim();
    // Avoid dumping full HTML error pages
    if (trimmed.startsWith('<')) {
      return statusHint(err.status, fallback);
    }
    return trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed;
  }

  if (typeof err.userMessage === 'string' && err.userMessage.trim()) {
    return err.userMessage.trim();
  }

  if (err.status === 0) {
    return 'Cannot reach CareConnect API. Check connection or server deploy.';
  }

  return statusHint(err.status, fallback);
}

function statusHint(status: number | undefined, fallback: string): string {
  if (status === 401) return 'Please login again.';
  if (status === 403) return 'You do not have permission for this action.';
  if (status === 404) return 'API endpoint or resource not found.';
  if (status === 409) return 'Already exists. Try a different mobile/email or login.';
  if (status === 422) return 'Invalid form data. Check all fields and try again.';
  if (status === 429) return 'Too many requests. Wait a moment and try again.';
  if (typeof status === 'number' && status >= 500) {
    return `Server error (${status}). Roles/DB may not be seeded — check Vercel logs.`;
  }
  if (typeof status === 'number' && status > 0) {
    return `${fallback} (HTTP ${status})`;
  }
  return fallback;
}
