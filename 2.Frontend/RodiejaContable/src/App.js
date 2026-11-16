import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from 'antd';
import { CarOutlined, ToolOutlined, DollarOutlined, BarChartOutlined } from '@ant-design/icons';

// Componentes de autenticación
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Componentes principales
import Dashboard from './pages/Dashboard';

// Componentes de vehículos
import Vehiculos from './pages/vehiculos/Vehiculos';
import VehiculosJerarquicos from './components/vehiculos/VehiculosJerarquicos';
import NuevoVehiculo from './pages/vehiculos/NuevoVehiculo';
import EditarVehiculo from './pages/vehiculos/EditarVehiculo';
import VehiculoDetalle from './pages/vehiculos/VehiculoDetalle';

// Componentes de inventario
import Inventario from './pages/inventario/Inventario';
import NuevoRepuesto from './pages/inventario/NuevoRepuesto';
import EditarRepuesto from './pages/inventario/EditarRepuesto';
import DetalleRepuesto from './pages/inventario/DetalleRepuesto';

// Componentes de finanzas
import Finanzas from './pages/finanzas/Finanzas';
import NuevaTransaccion from './pages/finanzas/NuevaTransaccion';
import EditarTransaccion from './pages/finanzas/EditarTransaccion';
import DetalleTransaccion from './pages/finanzas/DetalleTransaccion';

// Componentes de reportes
import Reportes from './pages/reportes/Reportes';
import VentasReportes from './pages/reportes/VentasReportes';
import ReporteRepuestos from './pages/reportes/ReporteRepuestos';
import ReporteVehiculos from './pages/reportes/ReporteVehiculos';

// Componentes de Audatex
import OportunidadesAudatex from './pages/audatex/OportunidadesAudatex';
import PedidosAudatex from './pages/audatex/PedidosAudatex';

// Componentes de INS (LINZ)
import InsPedidos from './pages/ins/InsPedidos';
import InsVentasEmpleados from './pages/ins/InsVentasEmpleados';

// Componentes de configuración
import Perfil from './pages/configuracion/Perfil';
import Configuracion from './pages/configuracion/Configuracion';

// Componentes de utilidad
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';

// Componente de menú lateral
import Sidebar from './layouts/Sidebar';
import Header from './layouts/Header';

// Componente para rutas privadas
const PrivateRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();
  const location = useLocation();
  const [initialized, setInitialized] = useState(false);

  // Efecto para manejar la inicialización
  useEffect(() => {
    if (!loading) {
      setInitialized(true);
    }
  }, [loading]);

  // Mostrar pantalla de carga mientras se verifica la autenticación
  if (loading || !initialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '18px', color: '#1890ff' }}>Verificando autenticación...</div>
        <div>Cargando la aplicación, por favor espere...</div>
      </div>
    );
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated()) {
    // Guardar la ruta a la que intentó acceder para redirigir después del login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar si el usuario tiene alguno de los roles requeridos
  if (roles.length > 0 && !roles.some(role => hasRole(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Componente para proteger rutas basadas en permisos por submódulo y acción
const PermissionRoute = ({ children, submodulo, action = 'view', adminOnly = false }) => {
  const { user, isAuthenticated, loading, hasAccess } = useAuth();
  const location = useLocation();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!loading) {
      setInitialized(true);
    }
  }, [loading]);

  if (loading || !initialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '18px', color: '#1890ff' }}>Verificando autenticación y permisos...</div>
        <div>Cargando la aplicación, por favor espere...</div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = user?.rol === 'ADMIN';

  if (adminOnly && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (submodulo && !isAdmin && !hasAccess(submodulo, action)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Componente para rutas de autenticación (login, registro, etc.)
const AuthRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated()) {
    // Redirigir al dashboard si ya está autenticado
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return children;
};

// Componente de layout principal
const MainLayout = ({ children }) => {
  const LayoutWrapper = ({ children }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [collapsed, setCollapsed] = useState(window.innerWidth <= 768);
    const { user } = useAuth();

    useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth <= 768);
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const menuItems = [
      {
        key: 'vehiculos',
        icon: <CarOutlined />,
        label: 'Vehículos',
        path: '/vehiculos',
        children: [
          { key: 'nuevo-vehiculo', label: 'Nuevo Vehículo', path: '/vehiculos/nuevo' },
        ],
      },
      {
        key: 'inventario',
        icon: <ToolOutlined />,
        label: 'Inventario',
        path: '/inventario',
        children: [
          { key: 'nuevo-repuesto', label: 'Nuevo Repuesto', path: '/inventario/nuevo' },
        ],
      },
      {
        key: 'finanzas',
        icon: <DollarOutlined />,
        label: 'Finanzas',
        path: '/finanzas',
        children: [
          { key: 'nueva-transaccion', label: 'Nueva Transacción', path: '/finanzas/nueva' },
        ],
      },
      {
        key: 'reportes',
        icon: <BarChartOutlined />,
        label: 'Reportes',
        path: '/reportes',
      }
    ];

    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Sidebar menuItems={menuItems} collapsed={collapsed} isMobile={isMobile} onClose={() => setCollapsed(true)} />
        <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? '80px' : '200px'), transition: 'margin-left 0.2s' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 99, height: '64px', background: '#141414', borderBottom: '1px solid #303030' }}>
            <Header 
              collapsed={collapsed} 
              toggleCollapse={() => setCollapsed(!collapsed)} 
              user={user}
              isMobile={isMobile}
            />
          </div>
          <Layout.Content style={{ 
            margin: '24px 16px 64px', 
            padding: 24,
            minHeight: 'calc(100vh - 64px - 64px - 32px)', // 64px header + 64px footer + 32px margins
            background: '#f0f2f5',
            borderRadius: '8px 8px 0 0',
            overflow: 'auto',
            flex: '1 1 auto',
            ...(isMobile ? {
              margin: '12px 0px 56px',
              padding: '8px',
              minHeight: 'calc(100vh - 56px - 56px - 12px)'
            } : {})
          }}>
            {children}
          </Layout.Content>
          <Layout.Footer style={{ 
            textAlign: 'center',
            height: isMobile ? 'auto' : '64px',
            minHeight: isMobile ? '48px' : '64px',
            lineHeight: isMobile ? '1.4' : '64px',
            padding: isMobile ? '8px' : '0 16px',
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
            margin: 0,
            width: '100%',
            left: 0,
            right: 0,
            bottom: 0,
            position: 'fixed',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)',
            zIndex: 1,
            transition: 'all 0.2s',
            boxSizing: 'border-box'
          }}>
            <span style={{
              background: 'linear-gradient(90deg, #1890ff 0%, #096dd9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              fontWeight: 500
            }}>
              Rodieja Contable {new Date().getFullYear()} - Todos los derechos reservados
            </span>
          </Layout.Footer>
        </Layout>
      </Layout>
    );
  };

  return <LayoutWrapper>{children}</LayoutWrapper>;
};

function App() {
  return (
    <Routes>
      {/* Rutas de autenticación */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />
      <Route
        path="/registro"
        element={
          <AuthRoute>
            <Register />
          </AuthRoute>
        }
      />
      <Route
        path="/olvide-contrasena"
        element={
          <AuthRoute>
            <ForgotPassword />
          </AuthRoute>
        }
      />
      <Route
        path="/restablecer-contrasena/:token"
        element={
          <AuthRoute>
            <ResetPassword />
          </AuthRoute>
        }
      />
      <Route
        path="/restablecer-contrasena"
        element={
          <AuthRoute>
            <ResetPassword />
          </AuthRoute>
        }
      />

      {/* Rutas protegidas con control de submódulo y acción */}
      <Route
        path="/"
        element={
          <PermissionRoute submodulo="inicio_dashboard">
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </PermissionRoute>
        }
      />

      {/* Rutas de vehículos */}
      <Route
        path="/vehiculos"
        element={
          <PermissionRoute submodulo="vehiculos_lista">
            <MainLayout>
              <Vehiculos />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/vehiculos/jerarquia"
        element={
          <PermissionRoute submodulo="vehiculos_jerarquia">
            <MainLayout>
              <VehiculosJerarquicos />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/vehiculos/nuevo"
        element={
          <PermissionRoute submodulo="vehiculos_lista" action="create">
            <MainLayout>
              <NuevoVehiculo />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/vehiculos/editar/:id"
        element={
          <PermissionRoute submodulo="vehiculos_lista" action="edit">
            <MainLayout>
              <EditarVehiculo />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/vehiculos/:id"
        element={
          <PermissionRoute submodulo="vehiculos_lista">
            <MainLayout>
              <VehiculoDetalle />
            </MainLayout>
          </PermissionRoute>
        }
      />

      {/* Rutas de inventario */}
      <Route
        path="/inventario"
        element={
          <PermissionRoute submodulo="inventario_lista">
            <MainLayout>
              <Inventario />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/inventario/nuevo"
        element={
          <PermissionRoute submodulo="inventario_lista" action="create">
            <MainLayout>
              <NuevoRepuesto />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/inventario/editar/:id"
        element={
          <PermissionRoute submodulo="inventario_lista" action="edit">
            <MainLayout>
              <EditarRepuesto />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/inventario/:id"
        element={
          <PermissionRoute submodulo="inventario_lista">
            <MainLayout>
              <DetalleRepuesto />
            </MainLayout>
          </PermissionRoute>
        }
      />

      {/* Rutas de finanzas */}
      <Route
        path="/finanzas"
        element={
          <PermissionRoute submodulo="finanzas_lista">
            <MainLayout>
              <Finanzas />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/finanzas/nueva"
        element={
          <PermissionRoute submodulo="finanzas_lista" action="create">
            <MainLayout>
              <NuevaTransaccion />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/finanzas/editar/:id"
        element={
          <PermissionRoute submodulo="finanzas_lista" action="edit">
            <MainLayout>
              <EditarTransaccion />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/finanzas/:id"
        element={
          <PermissionRoute submodulo="finanzas_lista">
            <MainLayout>
              <DetalleTransaccion />
            </MainLayout>
          </PermissionRoute>
        }
      />

      {/* Rutas de reportes */}
      <Route
        path="/reportes"
        element={
          <PermissionRoute submodulo="reportes_general">
            <MainLayout>
              <Reportes />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/reportes/ventas"
        element={
          <PermissionRoute submodulo="reportes_ventas">
            <MainLayout>
              <VentasReportes />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/reportes/repuestos"
        element={
          <PermissionRoute submodulo="reportes_repuestos">
            <MainLayout>
              <ReporteRepuestos />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route 
        path="/reportes/vehiculos" 
        element={
          <PermissionRoute submodulo="reportes_vehiculos">
            <MainLayout>
              <ReporteVehiculos />
            </MainLayout>
          </PermissionRoute>
        } 
      />

      {/* Rutas de Audatex */}
      <Route
        path="/audatex/oportunidades"
        element={
          <PermissionRoute submodulo="audatex_oportunidades">
            <MainLayout>
              <OportunidadesAudatex />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/audatex/jerarquia"
        element={<Navigate to="/audatex/oportunidades" replace />}
      />
      <Route
        path="/audatex/pedidos"
        element={
          <PermissionRoute submodulo="audatex_pedidos">
            <MainLayout>
              <PedidosAudatex />
            </MainLayout>
          </PermissionRoute>
        }
      />

      {/* Rutas de INS (LINZ) */}
      <Route
        path="/ins/pedidos"
        element={
          <PermissionRoute submodulo="ins_pedidos">
            <MainLayout>
              <InsPedidos />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/ins/ventas-empleados"
        element={
          <PermissionRoute submodulo="ins_ventas_empleados">
            <MainLayout>
              <InsVentasEmpleados />
            </MainLayout>
          </PermissionRoute>
        }
      />

      {/* Rutas de configuración */}
      <Route
        path="/configuracion/perfil"
        element={
          <PrivateRoute>
            <MainLayout>
              <Perfil />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/configuracion"
        element={
          <PermissionRoute adminOnly>
            <MainLayout>
              <Configuracion />
            </MainLayout>
          </PermissionRoute>
        }
      />
      <Route
        path="/configuracion/ajustes"
        element={
          <PermissionRoute adminOnly>
            <MainLayout>
              <Configuracion />
            </MainLayout>
          </PermissionRoute>
        }
      />

      {/* Rutas de utilidad */}
      <Route
        path="/unauthorized"
        element={
          <MainLayout>
            <Unauthorized />
          </MainLayout>
        }
      />
      <Route
        path="*"
        element={
          <MainLayout>
            <NotFound />
          </MainLayout>
        }
      />
    </Routes>
  );
}

export default App;