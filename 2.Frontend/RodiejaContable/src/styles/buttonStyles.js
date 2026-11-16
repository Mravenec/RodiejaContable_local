/**
 * buttonStyles.js
 * Centralización semántica de estilos y colores de botones para Rodieja Contable.
 * Permite reutilización en línea (style={...}) y hace juego con las clases globales en utilities.css.
 */

export const BUTTON_COLORS = {
  // Acción POST / PUT / Guardar -> Verde Esmeralda Guardar
  guardar: '#059669',
  guardarHover: '#047857',
  guardarActive: '#065f46',

  // Acción Agregar secundaria (no principal) -> Azul petróleo equilibrado (#0f526e)
  agregar: '#0f526e',
  agregarHover: '#166587',
  agregarActive: '#0a3a4e',

  // Acción Enviar Correo -> Blanco
  correo: '#ffffff',
  correoBorder: '#d9d9d9',
  correoText: '#262626',
  correoHover: '#f8fafc',
  correoHoverBorder: '#1890ff',
  correoHoverText: '#1890ff',

  // Acción Liquidar Pago / Pagar -> Verde Olivo (#588157)
  liquidar: '#588157',
  liquidarHover: '#4a6f49',
  liquidarActive: '#3d5c3c',
  pagar: '#588157',
  pagarHover: '#4a6f49',
  pagarActive: '#3d5c3c',

  // Acción Excel -> Verde Excel (#52c41a)
  excel: '#52c41a',
  excelHover: '#73d13d',
  excelActive: '#389e0d'
};

export const btnGuardarStyle = {
  backgroundColor: BUTTON_COLORS.guardar,
  borderColor: BUTTON_COLORS.guardar,
  color: '#ffffff',
  fontWeight: 500,
  borderRadius: '6px'
};

export const btnAgregarStyle = {
  backgroundColor: BUTTON_COLORS.agregar,
  borderColor: BUTTON_COLORS.agregar,
  color: '#ffffff',
  fontWeight: 500,
  borderRadius: '6px'
};

export const btnCorreoStyle = {
  backgroundColor: BUTTON_COLORS.correo,
  borderColor: BUTTON_COLORS.correoBorder,
  color: BUTTON_COLORS.correoText,
  fontWeight: 500,
  borderRadius: '6px'
};

export const btnLiquidarStyle = {
  backgroundColor: BUTTON_COLORS.liquidar,
  borderColor: BUTTON_COLORS.liquidar,
  color: '#ffffff',
  fontWeight: 500,
  borderRadius: '6px'
};

export const btnPagarStyle = btnLiquidarStyle;

export const btnExcelStyle = {
  backgroundColor: BUTTON_COLORS.excel,
  borderColor: BUTTON_COLORS.excel,
  color: '#ffffff',
  fontWeight: 500,
  borderRadius: '6px'
};

const buttonStyles = {
  BUTTON_COLORS,
  btnGuardarStyle,
  btnAgregarStyle,
  btnCorreoStyle,
  btnLiquidarStyle,
  btnExcelStyle
};

export default buttonStyles;
