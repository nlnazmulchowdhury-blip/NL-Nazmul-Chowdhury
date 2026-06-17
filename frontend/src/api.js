import axios from 'axios';

// ─── IMPORTANT: Vercel + Render Deployment ─────────────────────────────
//
// The frontend (Vercel) calls the backend (Render) API via VITE_API_URL.
//
// ⚠️  If VITE_API_URL is NOT set in Vercel Dashboard → Settings →
//     Environment Variables, the fallback is '' (empty string), which
//     means ALL API calls go to https://nl-nazmul-chowdhury.vercel.app/api/...
//     — your own Vercel domain — NOT the Render backend! This causes
//     500 errors and the "All Tools" page to appear empty.
//
// ✅  SOLUTION: Go to https://vercel.com → Your Project → Settings →
//     Environment Variables → Add VITE_API_URL with value:
//       https://proconverterbd-api.onrender.com
//
//     Then Redeploy or Vercel will auto-deploy on the next push to GitHub.
//

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Accept': 'application/json',
  },
  withCredentials: true,
  // 30-second timeout for all requests
  timeout: 30000,
});

// ─── Response interceptor for better error handling ───────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with an error status
      console.error(
        `API Error [${error.response.status}]:`,
        error.response.config?.url,
        error.response.data
      );
    } else if (error.request) {
      // Request was made but no response received (CORS / network / wrong URL)
      console.error(
        'API Network Error: No response received.',
        'Check that VITE_API_URL is set correctly.',
        `Current API_BASE_URL: "${API_BASE_URL}"`,
        error.message
      );
    } else {
      console.error('API Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Add CSRF token to unsafe requests for session-based auth
api.interceptors.request.use((config) => {
  if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
    const csrfCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
    if (csrfCookie) {
      config.headers['X-CSRFToken'] = csrfCookie;
    }
  }
  return config;
});

export const getCategories = async () => {
  const { data } = await api.get('/categories/');
  return data;
};

export const getTools = async (categorySlug = null) => {
  const params = categorySlug ? { category: categorySlug } : {};
  const { data } = await api.get('/tools/', { params });
  return data;
};

export const getTool = async (slug) => {
  const { data } = await api.get(`/tools/${slug}/`);
  return data;
};

export const convertFile = async (toolSlug, file, options = {}) => {
  const formData = new FormData();
  formData.append('tool_slug', toolSlug);
  formData.append('file', file);

  if (Object.keys(options).length > 0) {
    formData.append('options', JSON.stringify(options));
  }

  const { data } = await api.post('/convert/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return data;
};

export const generateQR = async (text, options = {}) => {
  const formData = new FormData();
  formData.append('text', text);
  Object.entries(options).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const { data } = await api.post('/generate-qr/', formData, {
    timeout: 30000,
  });
  return data;
};

export const formatJSON = async (text, mode = 'format', indent = 2) => {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('mode', mode);
  formData.append('indent', indent.toString());

  const { data } = await api.post('/format-json/', formData, {
    timeout: 30000,
  });
  return data;
};

export const getHistory = async () => {
  const { data } = await api.get('/history/');
  return data;
};

// ─── Admin API ──────────────────────────────────────────────────────────

export const adminLogin = async (username, password) => {
  const { data } = await api.post('/admin/login/', { username, password });
  return data;
};

export const adminLogout = async () => {
  const { data } = await api.post('/admin/logout/');
  return data;
};

export const adminCheckAuth = async () => {
  const { data } = await api.get('/admin/check-auth/');
  return data;
};

export const getAdminDashboard = async () => {
  const { data } = await api.get('/admin/dashboard/');
  return data;
};

export const getAdminTools = async () => {
  const { data } = await api.get('/admin/tools/');
  return data;
};

export const getAdminTool = async (id) => {
  const { data } = await api.get(`/admin/tools/${id}/`);
  return data;
};

export const createAdminTool = async (toolData) => {
  const { data } = await api.post('/admin/tools/', toolData);
  return data;
};

export const updateAdminTool = async (id, toolData) => {
  const { data } = await api.put(`/admin/tools/${id}/`, toolData);
  return data;
};

export const deleteAdminTool = async (id) => {
  await api.delete(`/admin/tools/${id}/`);
};

export const getAdminUsers = async () => {
  const { data } = await api.get('/admin/users/');
  return data;
};

export const getAdminCategories = async () => {
  const { data } = await api.get('/admin/categories/');
  return data;
};

export const createAdminCategory = async (catData) => {
  const { data } = await api.post('/admin/categories/', catData);
  return data;
};

export const updateAdminCategory = async (id, catData) => {
  const { data } = await api.put(`/admin/categories/${id}/`, catData);
  return data;
};

export const deleteAdminCategory = async (id) => {
  await api.delete(`/admin/categories/${id}/`);
};

export const getAdminSettings = async () => {
  const { data } = await api.get('/admin/settings/');
  return data;
};

export const updateAdminSettings = async (settings) => {
  const { data } = await api.put('/admin/settings/', settings);
  return data;
};

// ─── 2FA API ────────────────────────────────────────────────────────────

export const complete2FALogin = async (tempToken, code) => {
  const { data } = await api.post('/admin/2fa/complete-login/', { temp_token: tempToken, code });
  return data;
};

export const setup2FA = async () => {
  const { data } = await api.post('/admin/2fa/setup/');
  return data;
};

export const verify2FA = async (code) => {
  const { data } = await api.post('/admin/2fa/verify/', { code });
  return data;
};

export const disable2FA = async (code) => {
  const { data } = await api.post('/admin/2fa/disable/', { code });
  return data;
};

export const get2FAStatus = async () => {
  const { data } = await api.get('/admin/2fa/status/');
  return data;
};

export const regenerateBackupCodes = async () => {
  const { data } = await api.post('/admin/2fa/regenerate-codes/');
  return data;
};

export const mandatory2FASetup = async (tempToken) => {
  const { data } = await api.post('/admin/2fa/mandatory-setup/', { temp_token: tempToken });
  return data;
};

export const mandatory2FAVerify = async (tempToken, code) => {
  const { data } = await api.post('/admin/2fa/mandatory-verify/', { temp_token: tempToken, code });
  return data;
};

export const getAdminConversions = async (params = {}) => {
  const { data } = await api.get('/admin/conversions/', { params });
  return data;
};

export default api;
