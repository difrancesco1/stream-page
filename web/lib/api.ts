export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Converts a backend image path to a full URL.
 * If the path starts with /uploads, prepends API_URL.
 * If the path is already a full URL or a local path, returns as-is.
 */
export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/uploads")) return `${API_URL}${path}`;
  return path;
}

/**
 * Check if an image URL is from the backend (requires unoptimized rendering in Next.js)
 */
export function isBackendImage(path: string | null | undefined): boolean {
  if (!path) return false;
  return path.startsWith("/uploads") || path.includes(API_URL);
}

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
