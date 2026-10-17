import React, { useEffect, useState } from 'react';
import { Alert, Button, Modal, Space, Typography, Upload, message, Spin } from 'antd';
import {
  DownloadOutlined,
  UploadOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import useDatabaseImportExport from '../../hooks/useDatabaseImportExport';

const { Title, Paragraph, Text } = Typography;

/**
 * ADMIN tab: Export/Import portable .sql.gz (ddev-style).
 */
const DatabaseImportExportTab = () => {
  const {
    status,
    loading,
    error,
    lastResult,
    refreshStatus,
    exportDownload,
    importSql,
  } = useDatabaseImportExport();

  const [pendingFile, setPendingFile] = useState(null);

  useEffect(() => {
    refreshStatus().catch(() => {});
  }, [refreshStatus]);

  const onExport = async () => {
    try {
      const name = await exportDownload();
      message.success(`Descargado: ${name}`);
    } catch {
      message.error('Export falló — revisa Docker SistemaPrincipal y logs del backend');
    }
  };

  const requestImport = (file) => {
    setPendingFile(file);
    return false;
  };

  const confirmImport = async () => {
    const file = pendingFile;
    setPendingFile(null);
    if (!file) return;
    try {
      await importSql(file);
      message.success('Import completado — recargando para ver datos idénticos…');
      // Full reload so every screen (vehículos, inventario, finanzas…) hits the restored DB
      window.setTimeout(() => {
        window.location.assign('/');
      }, 600);
    } catch {
      message.error('Import falló');
    }
  };

  const datosLabel = status?.datosSql?.exists
    ? `${status.datosSql.bytes} bytes`
    : 'sin sincronizar';

  return (
    <div>
      <Title level={4}>
        <DatabaseOutlined /> Base de datos — Import / Export
      </Title>
      <Paragraph type="secondary">
        Exporta un respaldo comprimido (<Text code>.sql.gz</Text>) de la BD local (schema + datos +
        triggers). Importa ese archivo para dejar otra máquina idéntica. Tras importar, la app
        recarga sola para que todas las pantallas muestren los datos restaurados.
      </Paragraph>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Spin spinning={loading}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={onExport}
              disabled={loading}
            >
              Exportar
            </Button>
            <Upload
              accept=".sql,.gz,.sql.gz"
              maxCount={1}
              beforeUpload={requestImport}
              showUploadList={false}
              disabled={loading}
            >
              <Button icon={<UploadOutlined />} disabled={loading}>
                Importar
              </Button>
            </Upload>
          </Space>

          {status?.baseDirExists && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Proyecto alineado: {datosLabel}
              {lastResult?.filename ? ` · último export: ${lastResult.filename}` : ''}
              {lastResult?.mensaje ? ` · ${lastResult.mensaje}` : ''}
            </Text>
          )}
        </Space>
      </Spin>

      <Modal
        title={
          <span>
            <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
            ¿Reemplazar la base de datos local?
          </span>
        }
        open={!!pendingFile}
        onOk={confirmImport}
        onCancel={() => setPendingFile(null)}
        okText="Importar y reemplazar"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
        confirmLoading={loading}
      >
        <p>
          Se borrará la BD <Text code>sistema_vehicular</Text> y se cargará:
        </p>
        <p>
          <Text strong>{pendingFile?.name}</Text>
        </p>
        <p>Esta acción no se puede deshacer desde la UI.</p>
      </Modal>
    </div>
  );
};

export default DatabaseImportExportTab;
