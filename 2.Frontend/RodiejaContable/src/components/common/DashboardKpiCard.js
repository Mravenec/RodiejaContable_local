import React from 'react';
import { Card } from 'antd';

/**
 * Componente maestro y reutilizable para tarjetas métricas de dashboards.
 * Implementa el sistema de diseño centralizado en src/styles/dashboard.css.
 */
const DashboardKpiCard = ({
  title,
  value,
  isCurrency = true,
  currencySymbol = '₡',
  showSign = false,
  type = 'info', // 'success' | 'danger' | 'warning' | 'info' | 'orange' | 'featured-orange' | 'featured-green'
  icon,
  tag,
  footer,
  children,
  suffix = '',
  loading = false,
  className = '',
  style = {}
}) => {
  // Resolver clase de modificador de tarjeta
  let cardModifierClass = '';
  if (type === 'featured-orange') {
    cardModifierClass = 'dashboard-kpi-card--featured-orange';
  } else if (type === 'featured-green') {
    cardModifierClass = 'dashboard-kpi-card--featured-green';
  } else if (type === 'featured-blue') {
    cardModifierClass = 'dashboard-kpi-card--featured-blue';
  } else if (type === 'featured-purple') {
    cardModifierClass = 'dashboard-kpi-card--featured-purple';
  }

  // Resolver color del título
  let titleModifierClass = '';
  if (type === 'featured-orange' || type === 'orange') {
    titleModifierClass = 'dashboard-kpi-title--orange';
  } else if (type === 'featured-green') {
    titleModifierClass = 'dashboard-kpi-title--green';
  } else if (type === 'featured-blue') {
    titleModifierClass = 'dashboard-kpi-title--blue';
  } else if (type === 'featured-purple' || type === 'purple') {
    titleModifierClass = 'dashboard-kpi-title--purple';
  }

  // Resolver clase del icono
  const iconClassMap = {
    success: 'dashboard-kpi-icon-badge--success',
    danger: 'dashboard-kpi-icon-badge--danger',
    warning: 'dashboard-kpi-icon-badge--warning',
    info: 'dashboard-kpi-icon-badge--info',
    purple: 'dashboard-kpi-icon-badge--purple',
    orange: 'dashboard-kpi-icon-badge--warning',
    'featured-orange': 'dashboard-kpi-icon-badge--warning',
    'featured-green': 'dashboard-kpi-icon-badge--success',
    'featured-blue': 'dashboard-kpi-icon-badge--info',
    'featured-purple': 'dashboard-kpi-icon-badge--purple'
  };
  const iconBadgeClass = iconClassMap[type] || 'dashboard-kpi-icon-badge--info';

  // Resolver clase del valor
  const valueClassMap = {
    success: 'dashboard-kpi-value--success',
    danger: 'dashboard-kpi-value--danger',
    warning: 'dashboard-kpi-value--warning',
    orange: 'dashboard-kpi-value--orange',
    purple: 'dashboard-kpi-value--purple',
    info: 'dashboard-kpi-value--primary',
    'featured-orange': 'dashboard-kpi-value--orange',
    'featured-green': 'dashboard-kpi-value--success',
    'featured-blue': 'dashboard-kpi-value--primary',
    'featured-purple': 'dashboard-kpi-value--purple'
  };
  const valueColorClass = valueClassMap[type] || '';

  // Formatear valor
  let valorFormateado = value;
  if (typeof value === 'number') {
    const isNegative = value < 0;
    const absVal = Math.abs(value).toLocaleString('es-CR');
    const signPrefix = showSign ? (isNegative ? '-' : '+') : (isNegative ? '-' : '');
    valorFormateado = isCurrency ? `${signPrefix}${currencySymbol}${absVal}` : `${signPrefix}${absVal}`;
  }
  if (suffix && valorFormateado !== null && valorFormateado !== undefined) {
    valorFormateado = `${valorFormateado}${suffix}`;
  }

  return (
    <Card
      bordered={false}
      loading={loading}
      className={`dashboard-kpi-card ${cardModifierClass} ${className}`.trim()}
      style={style}
    >
      <div>
        {/* Cabecera: Título y Chip de Icono o Tag */}
        <div className="dashboard-kpi-header">
          <span className={`dashboard-kpi-title ${titleModifierClass}`.trim()}>
            {title}
          </span>
          {tag ? (
            tag
          ) : icon ? (
            <div className={`dashboard-kpi-icon-badge ${iconBadgeClass}`}>
              {icon}
            </div>
          ) : null}
        </div>

        {/* Métrica Central */}
        <div className={`dashboard-kpi-value ${valueColorClass}`}>
          {valorFormateado}
        </div>
      </div>

      {/* Pie / Contexto o Contenido adicional */}
      {children ? (
        children
      ) : footer ? (
        <div className="dashboard-kpi-footer">
          {footer}
        </div>
      ) : null}
    </Card>
  );
};

export default DashboardKpiCard;
