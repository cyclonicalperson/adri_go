import { environment } from '../../environments/environment';

export const DEFAULT_LOCATION_IMAGE = 'assets/placeholder.jpg';

function getBackendBaseUrl(): string {
  const apiUrl = environment.apiUrl.replace(/\/+$/, '');
  return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
}

export function resolveBackendAssetUrl(path?: string | null, fallback = ''): string {
  if (!path) {
    return fallback;
  }

  if (path === DEFAULT_LOCATION_IMAGE || path.endsWith('/assets/placeholder.jpg')) {
    return DEFAULT_LOCATION_IMAGE;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.replace(/^\/+/, '');
  if (normalizedPath.startsWith('assets/') || normalizedPath.startsWith('favicon')) {
    return normalizedPath;
  }

  return `${getBackendBaseUrl()}/${normalizedPath}`;
}
