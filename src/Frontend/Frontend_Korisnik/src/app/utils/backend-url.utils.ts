import { environment } from '../../environments/environment';

function getBackendBaseUrl(): string {
  const apiUrl = environment.apiUrl.replace(/\/+$/, '');
  return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
}

export function resolveBackendAssetUrl(path?: string | null, fallback = ''): string {
  if (!path) {
    return fallback;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.replace(/^\/+/, '');
  return `${getBackendBaseUrl()}/${normalizedPath}`;
}
