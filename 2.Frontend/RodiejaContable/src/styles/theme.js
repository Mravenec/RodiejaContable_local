// theme.js
// Archivo base para la configuración del tema de Ant Design (v5)

const theme = {
  token: {
    // Colores principales
    colorPrimary: '#1890ff',
    colorInfo: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',

    // Tipografía
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    fontSizeBase: 14,
    
    // Bordes y contenedores
    borderRadius: 8,           // Radio de borde base (tarjetas, modales)
    colorBgContainer: '#ffffff', // Fondo de contenedores principales
    
    // Texto
    colorTextBase: 'rgba(0, 0, 0, 0.85)',
  },
  components: {
    // Sobrescrituras específicas para componentes de Ant Design
    Button: {
      borderRadius: 4, // Los botones mantienen un borde más pequeño
      fontWeight: 500,
    },
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#f0f2f5',
    },
    Card: {
      // Configuraciones base para tarjetas
    },
    Table: {
      headerBg: '#fafafa',
    }
  }
};

export default theme;
