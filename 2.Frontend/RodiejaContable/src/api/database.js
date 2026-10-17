import api from './axios';
import { API_BASE_URL } from './config';

/**
 * Database import/export API (ADMIN) — portable .sql.gz like ddev import-db.
 */
const databaseService = {
  getStatus() {
    return api.get('/database/status');
  },

  /** Export live DB and download .sql.gz blob. */
  async exportDownload() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/database/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const text = await response.text();
        if (text) detail = text.slice(0, 400);
      } catch {
        // ignore
      }
      throw new Error(`Export failed: ${detail}`);
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : 'sistema_vehicular.sql.gz';
    return { blob, filename };
  },

  /**
   * Import .sql or .sql.gz (full DROP + restore).
   * @param {File} file
   */
  importSql(file) {
    const form = new FormData();
    form.append('file', file);
    return api.post('/database/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
    });
  },
};

export default databaseService;
