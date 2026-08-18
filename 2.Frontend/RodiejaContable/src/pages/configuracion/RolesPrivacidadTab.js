import React, { useState, useEffect } from 'react';
import { Select, Table, Switch, message, Spin, Typography } from 'antd';
import rolesService from '../../api/roles';
import './Settings.css';

const { Option } = Select;
const { Text } = Typography;

const RolesPrivacidadTab = () => {
  const [roles, setRoles] = useState([]);
  const [selectedRol, setSelectedRol] = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingPermisos, setLoadingPermisos] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      const res = await rolesService.getRoles();
      setRoles(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedRol(res.data[0].id);
        fetchPermisos(res.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching roles", err);
      message.error("Error al cargar los roles");
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchPermisos = async (rolId) => {
    try {
      setLoadingPermisos(true);
      const res = await rolesService.getPermisosByRol(rolId);
      setPermisos(res.data || []);
    } catch (err) {
      console.error("Error fetching permisos", err);
      message.error("Error al cargar los permisos del rol");
    } finally {
      setLoadingPermisos(false);
    }
  };

  const handleRolChange = (value) => {
    setSelectedRol(value);
    fetchPermisos(value);
  };

  const handlePermisoChange = async (submoduloId, field, value) => {
    const updatedPermisos = permisos.map(mod => {
      const updatedSubmodulos = mod.submodulos.map(sub => {
        if (sub.id === submoduloId) {
          return { ...sub, [field]: value };
        }
        return sub;
      });
      return { ...mod, submodulos: updatedSubmodulos };
    });
    setPermisos(updatedPermisos);

    let currentSub = null;
    updatedPermisos.forEach(m => {
      m.submodulos.forEach(s => {
        if (s.id === submoduloId) currentSub = s;
      });
    });

    try {
      await rolesService.updatePermiso(selectedRol, submoduloId, {
        canView: currentSub.canView,
        canCreate: currentSub.canCreate,
        canEdit: currentSub.canEdit,
        canDelete: currentSub.canDelete
      });
      message.success("Permiso actualizado");
    } catch (err) {
      console.error("Error updating permiso", err);
      message.error("Error al actualizar el permiso");
    }
  };

  const tableData = [];
  permisos.forEach(mod => {
    tableData.push({
      key: `mod_${mod.id}`,
      nombre: mod.nombre,
      isModule: true
    });
    mod.submodulos.forEach(sub => {
      tableData.push({
        ...sub,
        key: `sub_${sub.id}`
      });
    });
  });

  const columns = [
    {
      title: 'Módulo / Submódulo',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (text, record) => {
        if (record.isModule) {
          return <strong style={{ fontSize: '15px', color: '#1e293b' }}>{text}</strong>;
        }
        return <span style={{ paddingLeft: 24, color: '#475569' }}>{text}</span>;
      }
    },
    {
      title: 'Ver',
      dataIndex: 'canView',
      key: 'canView',
      width: 100,
      align: 'center',
      render: (val, record) => {
        if (record.isModule) return null;
        return <Switch checked={val} onChange={(checked) => handlePermisoChange(record.id, 'canView', checked)} />;
      }
    },
    {
      title: 'Crear',
      dataIndex: 'canCreate',
      key: 'canCreate',
      width: 100,
      align: 'center',
      render: (val, record) => {
        if (record.isModule) return null;
        return <Switch checked={val} onChange={(checked) => handlePermisoChange(record.id, 'canCreate', checked)} />;
      }
    },
    {
      title: 'Editar',
      dataIndex: 'canEdit',
      key: 'canEdit',
      width: 100,
      align: 'center',
      render: (val, record) => {
        if (record.isModule) return null;
        return <Switch checked={val} onChange={(checked) => handlePermisoChange(record.id, 'canEdit', checked)} />;
      }
    },
    {
      title: 'Eliminar',
      dataIndex: 'canDelete',
      key: 'canDelete',
      width: 100,
      align: 'center',
      render: (val, record) => {
        if (record.isModule) return null;
        return <Switch checked={val} onChange={(checked) => handlePermisoChange(record.id, 'canDelete', checked)} />;
      }
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Roles y Privacidad</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Text style={{ fontWeight: 500, color: '#64748b' }}>Seleccionar Rol:</Text>
          {loadingRoles ? (
            <Spin size="small" />
          ) : (
            <Select 
              value={selectedRol} 
              onChange={handleRolChange}
              style={{ width: 200 }}
              size="large"
            >
              {roles.map(rol => (
                <Option key={rol.id} value={rol.id}>{rol.nombre}</Option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
        <Table 
          columns={columns} 
          dataSource={tableData} 
          pagination={false}
          loading={loadingPermisos}
          rowClassName={(record) => record.isModule ? 'table-row-module' : 'table-row-submodule'}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

export default RolesPrivacidadTab;
