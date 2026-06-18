/**
 * Frontend API Adapter — Pro Converter BD
 *
 * Points to the Next.js API routes running on the same origin.
 * Replaces the previous Django + axios-based adapter.
 *
 * ✅ /api/categories     — GET categories with embedded tools
 * ✅ /api/tools/:slug    — GET single tool detail with category info
 * 🔄 /api/tools          — derived from categories response (flat tool list)
 * ⏳ convert / admin / 2FA — not yet migrated to Next.js
 */

// ─── Helper: fetch wrapper ────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return null;

  return res.json();
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Fetch all conversion categories with their tools embedded.
 * GET /api/categories
 */
export const getCategories = async () => {
  return apiFetch("/api/categories");
};

/**
 * Fetch tools, optionally filtered by category slug.
 *
 * Uses the categories endpoint (which includes embedded tools) and
 * flattens the tool lists. This avoids needing a separate /api/tools
 * route for listing, though one can be added later.
 */
export const getTools = async (categorySlug = null) => {
  const categories = await apiFetch("/api/categories");

  const allTools = categories.flatMap((cat) =>
    cat.tools.map((tool) => ({
      ...tool,
      category_slug: cat.slug,
    }))
  );

  if (categorySlug) {
    return allTools.filter((t) => t.category_slug === categorySlug);
  }

  return allTools;
};

/**
 * Fetch a single tool detail by slug, including its category info.
 * GET /api/tools/:slug
 */
export const getTool = async (slug) => {
  return apiFetch(`/api/tools/${slug}`);
};

// ─── Conversion / Utility Endpoints (not yet migrated to Next.js) ──────

/**
 * Convert a file using a backend tool (e.g., background-remove).
 *
 * ⏳ This endpoint is not yet implemented in Next.js.
 * Until migration, client-side tools (image-to-jpg, pdf-to-jpg, etc.)
 * are handled locally via src/utils/clientConverters.js.
 */
export const convertFile = async (_toolSlug, _file, _options = {}) => {
  throw new Error(
    "Server-side conversion is not yet available in Next.js. " +
      "For now, client-side conversions (image-to-jpg, pdf-to-jpg, etc.) " +
      "are handled in-browser via clientConverters.js."
  );
};

export const generateQR = async () => {
  throw new Error(
    "QR generation endpoint not yet migrated. " +
      "Use client-side utils/clientConverters.js#generateQRCode instead."
  );
};

export const formatJSON = async () => {
  throw new Error(
    "JSON formatting endpoint not yet migrated. " +
      "Use client-side utils/clientConverters.js#formatJSON instead."
  );
};

export const getHistory = async () => {
  throw new Error("Conversion history endpoint not yet migrated to Next.js.");
};

// ─── Admin API (not yet migrated to Next.js) ──────────────────────────

export const adminLogin = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const adminLogout = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const adminCheckAuth = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const getAdminDashboard = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const getAdminTools = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const getAdminTool = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const createAdminTool = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const updateAdminTool = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const deleteAdminTool = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const getAdminUsers = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const getAdminCategories = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const createAdminCategory = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const updateAdminCategory = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const deleteAdminCategory = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const getAdminSettings = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export const updateAdminSettings = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

// ─── 2FA API (not yet migrated to Next.js) ────────────────────────────

export const complete2FALogin = async () => {
  throw new Error("2FA API not yet migrated to Next.js.");
};

export const setup2FA = async () => {
  throw new Error("2FA API not yet migrated to Next.js.");
};

export const verify2FA = async () => {
  throw new Error("2FA API not yet migrated to Next.js.");
};

export const disable2FA = async () => {
  throw new Error("2FA API not yet migrated to Next.js.");
};

export const get2FAStatus = async () => {
  throw new Error("2FA API not yet migrated to Next.js.");
};

export const regenerateBackupCodes = async () => {
  throw new Error("2FA API not yet migrated to Next.js.");
};

export const mandatory2FASetup = async () => {
  throw new Error("2FA API not yet migrated to Next.js.");
};

export const mandatory2FAVerify = async () => {
  throw new Error("2FA API not yet migrated to Next.js.");
};

export const getAdminConversions = async () => {
  throw new Error("Admin API not yet migrated to Next.js.");
};

export default apiFetch;
