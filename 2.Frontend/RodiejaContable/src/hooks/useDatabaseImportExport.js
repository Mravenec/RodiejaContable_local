import { useCallback, useState } from 'react';
import { useQueryClient } from 'react-query';
import databaseService from '../api/database';

/**
 * Hook for database export / import UI actions (ddev-style).
 */
export default function useDatabaseImportExport() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const refreshStatus = useCallback(async () => {
    setError(null);
    try {
      const res = await databaseService.getStatus();
      setStatus(res.data);
      return res.data;
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      throw e;
    }
  }, []);

  const exportDownload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { blob, filename } = await databaseService.exportDownload();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setLastResult({ action: 'export', filename });
      await refreshStatus();
      return filename;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  const importSql = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const res = await databaseService.importSql(file);
      setLastResult(res.data);
      // DROP+restore leaves React Query with stale pages — wipe and force full reload
      queryClient.clear();
      await refreshStatus();
      return res.data;
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [queryClient, refreshStatus]);

  return {
    status,
    loading,
    error,
    lastResult,
    refreshStatus,
    exportDownload,
    importSql,
  };
}
