import React, { useState, useEffect } from 'react';
import { Select, Table, Switch, message, Spin, Typography } from 'antd';
import { useRoles, usePermisosByRol, useUpdatePermiso } from '../../hooks';
import './Settings.css';

const { Option } = Select;
const { Text } = Typography;

const RolesPrivacidadTab = () => {
  const { data: roles = [], isLoading: loadingRoles } = useRoles();
  const [selectedRol, setSelectedRol] = useState(null);
  const { data: permisosData = [], isLoading: loadingPermisos } = usePermisosByRol(selectedRol);
  const [permisos, setPermisos] = useState([]);
  const updatePermisoMutation = useUpdatePermiso();

  useEffect(() => {
    if (roles.length > 0 && !selectedRol) {
      setSelectedRol(roles[0].id);
    }
  }, [roles, selectedRol]);

  useEffect(() => {
    setPermisos(permisosData);
  }, [permisosData]);

  const handleRolChange = (value) => {
    setSelectedRol(value);
  };

  const handlePermisoChange = async (submoduloId, field, value) => {
    let currentSub = null;

    const updatedPermisos = permisos.map(mod => {
      const updatedSubmodulos = mod.submodulos.map(sub => {
        if (sub.id === submoduloId) {
          let updatedSub = { ...sub, [field]: value };
          
          if (field === 'canView' && !value) {
            updatedSub.canCreate = false;
            updatedSub.canEdit = false;
            updatedSub.canDelete = false;
          }
          
          if (['canCreate', 'canEdit', 'canDelete'].includes(field) && value) {
            updatedSub.canView = true;
          }

          currentSub = updatedSub;
          return updatedSub;
        }
        return sub;
      });
      return { ...mod, submodulos: updatedSubmodulos };
    });
    
    setPermisos(updatedPermisos);

    if (currentSub) {
      try {
        await updatePermisoMutation.mutateAsync({
          rolId: selectedRol,
          submoduloId,
          permisosData: {
            canView: currentSub.canView,
            canCreate: currentSub.canCreate,
            canEdit: currentSub.canEdit,
            canDelete: currentSub.canDelete
          }
        });
        message.success("Permiso actualizado");
      } catch (err) {
        console.error("Error updating permiso", err);
        message.error("Error al actualizar el permiso");
      }
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
        if (!record.canView) return <span style={{ color: '#cbd5e1' }}>-</span>;
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
        if (!record.canView) return <span style={{ color: '#cbd5e1' }}>-</span>;
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
        if (!record.canView) return <span style={{ color: '#cbd5e1' }}>-</span>;
        return <Switch checked={val} onChange={(checked) => handlePermisoChange(record.id, 'canDelete', checked)} />;
      }
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Roles y Privacidad</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Text style={{ fontWeight: 500, color: '#64748b' }}>Seleccionar Rol:</Text>
          {loadingRoles ? (
            <Spin size="small" />
          ) : (
            <Select 
              value={selectedRol} 
              onChange={handleRolChange}
              style={{ minWidth: 160, width: 200 }}
              size="middle"
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
          scroll={{ x: 600 }}
          rowClassName={(record) => record.isModule ? 'table-row-module' : 'table-row-submodule'}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

export default RolesPrivacidadTab;
