import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, message } from 'antd';
import esES from 'antd/locale/es_ES';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import moment from 'moment';
import 'moment/locale/es';
import { AuthProvider } from './context/AuthContext';
import { QueryProvider } from './providers/QueryProvider';
import App from './App';
import 'antd/dist/reset.css';
import './index.css';

// Configure global message settings
message.config({
  maxCount: 1,
  duration: 3,
});

// Configurar locales a español de forma global
dayjs.locale('es');
moment.locale('es');

// Mensajes de depuración solo en desarrollo
if (process.env.NODE_ENV === 'development') {
  console.log('Aplicación iniciada correctamente');
  console.log('Versión de React:', React.version);
  
  // Deshabilitar logs en producción
  if (window.console && window.console.log) {
    console.log = function() {};
    console.warn = function() {};
    console.error = function() {};
    console.info = function() {};
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConfigProvider locale={esES}>
      <QueryProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryProvider>
    </ConfigProvider>
  </React.StrictMode>
);
