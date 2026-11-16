import React from 'react';
import { formatDate } from './dateUtils';

export { formatDate };

// Format currency (CRC - Costa Rican Colones)
export const formatCurrency = (amount, decimals = 0) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₡0';
  const numDecimals = typeof decimals === 'number' ? decimals : 0;
  return `₡${Number(amount).toLocaleString('es-CR', {
    minimumFractionDigits: numDecimals,
    maximumFractionDigits: numDecimals
  })}`;
};

// Alias formatColones para compatibilidad total con módulos de INS y Audatex
export const formatColones = (val, decimals = 0) => formatCurrency(val, decimals);

/**
 * Formatea moneda con color semántico (+ verde para ingresos / - rojo para egresos)
 */
export const formatCurrencyWithColor = (amount, tipo) => {
  const formattedAmount = formatCurrency(amount, 0);

  if (tipo !== undefined) {
    const isIngreso = tipo === 'INGRESO' || tipo === 'VENTA' || (typeof tipo === 'boolean' && tipo);
    return (
      <span style={{ color: isIngreso ? '#52c41a' : '#f5222d', fontWeight: 500 }}>
        {isIngreso ? '+' : '-'} {formattedAmount}
      </span>
    );
  }

  return formattedAmount;
};

// Format number with thousands separator
export const formatNumber = (number) => {
  if (number === null || number === undefined) return '0';
  return new Intl.NumberFormat('es-MX').format(number);
};

// Format percentage
export const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0%';
  return new Intl.NumberFormat('es-MX', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

/**
 * Calcula porcentajes relativos para listas de ventas/empleados sobre el total acumulado
 */
export const calcularPorcentajes = (empleados) => {
  if (!Array.isArray(empleados) || empleados.length === 0) {
    return [];
  }

  const totalVentas = empleados.reduce((total, emp) => {
    return total + (emp.totalTransacciones || emp.transaccionesVenta || 0);
  }, 0);

  return empleados.map(emp => {
    const ventasEmpleado = emp.totalTransacciones || emp.transaccionesVenta || 0;
    const porcentaje = totalVentas > 0 ? Math.round((ventasEmpleado / totalVentas) * 100) : 0;

    return {
      ...emp,
      porcentaje: porcentaje
    };
  });
};

// Format phone number
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};
