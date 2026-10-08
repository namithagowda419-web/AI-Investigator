/**
 * TraceShield – API Client
 * All backend calls go through this module.
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000, // 90s for AI inference
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor – normalize errors
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    let detail = err.response?.data?.detail || err.message || 'Unknown error';
    if (Array.isArray(detail)) {
      detail = detail.map((d) => (d && d.msg) ? d.msg : JSON.stringify(d)).join(', ');
    } else if (typeof detail === 'object' && detail !== null) {
      detail = detail.msg || detail.message || JSON.stringify(detail);
    }
    return Promise.reject(new Error(String(detail)));
  }
);

// ── Health ────────────────────────────────────────────────────────────────────
export const getHealth = () => api.get('/api/health');

// ── Scam Detection ────────────────────────────────────────────────────────────
export const analyzeScam = (message) => api.post('/api/scam/analyze', { message });

// ── Investigation ─────────────────────────────────────────────────────────────
export const createCase = (data) => api.post('/api/investigation/create', data);
export const analyzeCase = (case_id) => api.post('/api/investigation/analyze', { case_id });
export const listCases = () => api.get('/api/investigation/list');
export const getCase = (id) => api.get(`/api/investigation/${id}`);
export const extractEntities = (text) => api.post('/api/entities/extract', { text });

// ── Search & Intelligence ─────────────────────────────────────────────────────
export const webSearch = (query, max_results = 8) =>
  api.post('/api/search', { query, max_results });

export const intelligenceSearch = (query, entity_type = 'general') =>
  api.post('/api/intelligence', { query, entity_type });

export default api;
