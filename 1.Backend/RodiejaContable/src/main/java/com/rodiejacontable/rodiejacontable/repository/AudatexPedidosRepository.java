package com.rodiejacontable.rodiejacontable.repository;

import com.rodiejacontable.database.jooq.enums.AudatexPedidosEstado;
import com.rodiejacontable.database.jooq.tables.pojos.AudatexPedidos;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.rodiejacontable.database.jooq.Tables.AUDATEX_PEDIDOS;

@Repository
public class AudatexPedidosRepository {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AudatexPedidosRepository.class);

    @Autowired
    private DSLContext dsl;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public void ensureColumns() {
        try {
            jdbcTemplate.execute(
                "ALTER TABLE audatex_pedidos " +
                "ADD COLUMN IF NOT EXISTS user_id INT DEFAULT NULL, " +
                "ADD COLUMN IF NOT EXISTS transaccion_id INT DEFAULT NULL, " +
                "ADD COLUMN IF NOT EXISTS comision_calculada DECIMAL(12,2) DEFAULT NULL, " +
                "ADD COLUMN IF NOT EXISTS porcentaje_comision TINYINT DEFAULT NULL, " +
                "ADD COLUMN IF NOT EXISTS comision_pagada TINYINT(1) DEFAULT 0, " +
                "ADD COLUMN IF NOT EXISTS fecha_pago_comision DATE DEFAULT NULL, " +
                "ADD COLUMN IF NOT EXISTS referencia_pago_comision VARCHAR(100) DEFAULT NULL, " +
                "ADD COLUMN IF NOT EXISTS notas_pago_comision TEXT DEFAULT NULL"
            );
        } catch (Exception ignored) {
        }
    }

    public void marcarComisionPagada(Integer pedidoId, java.time.LocalDate fechaPago, String referencia, String notas) {
        ensureColumns();
        String sql = "UPDATE audatex_pedidos SET comision_pagada = 1, fecha_pago_comision = ?, referencia_pago_comision = ?, notas_pago_comision = ? WHERE id = ?";
        jdbcTemplate.update(sql, fechaPago, referencia, notas, pedidoId);
    }

    public int liquidarComisionesEmpleado(Integer userId, String empleadoNombre, Integer anio, Integer mes, java.time.LocalDate fechaPago, String referencia, String notas) {
        ensureColumns();

        int anioVal = anio != null ? anio : (fechaPago != null ? fechaPago.getYear() : java.time.LocalDate.now().getYear());
        int mesVal = mes != null ? mes : (fechaPago != null ? fechaPago.getMonthValue() : java.time.LocalDate.now().getMonthValue());

        String refFinal = (referencia != null && !referencia.trim().isEmpty())
                ? referencia.trim()
                : "PAGO-COM-INS-" + (userId != null ? userId : "COL") + "-" + anioVal + "-" + mesVal;

        // 1. Calcular el total de comisiones pendientes a liquidar
        StringBuilder sumSb = new StringBuilder();
        sumSb.append("SELECT COALESCE(SUM(COALESCE(comision_calculada, (total_pedido * COALESCE(porcentaje_comision, 3) / 100))), 0) ");
        sumSb.append("FROM audatex_pedidos WHERE estado = 'Entregado' AND (comision_pagada IS NULL OR comision_pagada = 0) ");

        java.util.List<Object> sumParams = new java.util.ArrayList<>();
        if (userId != null) {
            sumSb.append("AND user_id = ? ");
            sumParams.add(userId);
        } else if (empleadoNombre != null && !empleadoNombre.trim().isEmpty()) {
            sumSb.append("AND (user_id IN (SELECT u.id FROM users u LEFT JOIN personal_data pd ON u.id = pd.user_id WHERE LOWER(COALESCE(pd.full_name, u.email)) LIKE ?)) ");
            sumParams.add("%" + empleadoNombre.trim().toLowerCase() + "%");
        }
        if (anio != null) {
            sumSb.append("AND YEAR(fecha_creacion) = ? ");
            sumParams.add(anio);
        }
        if (mes != null) {
            sumSb.append("AND MONTH(fecha_creacion) = ? ");
            sumParams.add(mes);
        }

        java.math.BigDecimal totalComisiones = java.math.BigDecimal.ZERO;
        try {
            totalComisiones = jdbcTemplate.queryForObject(sumSb.toString(), java.math.BigDecimal.class, sumParams.toArray());
        } catch (Exception e) {
            log.warn("Error sumando comisiones a liquidar: {}", e.getMessage());
        }

        // 2. Actualizar pedidos como pagados
        StringBuilder updateSb = new StringBuilder();
        updateSb.append("UPDATE audatex_pedidos SET comision_pagada = 1, fecha_pago_comision = ?, referencia_pago_comision = ?, notas_pago_comision = ? ");
        updateSb.append("WHERE estado = 'Entregado' AND (comision_pagada IS NULL OR comision_pagada = 0) ");

        java.util.List<Object> updateParams = new java.util.ArrayList<>();
        updateParams.add(fechaPago);
        updateParams.add(refFinal);
        updateParams.add(notas);

        if (userId != null) {
            updateSb.append("AND user_id = ? ");
            updateParams.add(userId);
        } else if (empleadoNombre != null && !empleadoNombre.trim().isEmpty()) {
            updateSb.append("AND (user_id IN (SELECT u.id FROM users u LEFT JOIN personal_data pd ON u.id = pd.user_id WHERE LOWER(COALESCE(pd.full_name, u.email)) LIKE ?)) ");
            updateParams.add("%" + empleadoNombre.trim().toLowerCase() + "%");
        }
        if (anio != null) {
            updateSb.append("AND YEAR(fecha_creacion) = ? ");
            updateParams.add(anio);
        }
        if (mes != null) {
            updateSb.append("AND MONTH(fecha_creacion) = ? ");
            updateParams.add(mes);
        }

        int actualizados = jdbcTemplate.update(updateSb.toString(), updateParams.toArray());

        // 3. Registrar en pagos_comisiones para disparar el trigger tr_pago_comisiones_after_insert (crea transacción EGRESO)
        if (totalComisiones != null && totalComisiones.compareTo(java.math.BigDecimal.ZERO) > 0) {
            try {
                Integer empId = null;
                String finalNombre = empleadoNombre;
                if (finalNombre == null && userId != null) {
                    try {
                        finalNombre = jdbcTemplate.queryForObject(
                            "SELECT COALESCE(pd.full_name, u.email) FROM users u LEFT JOIN personal_data pd ON u.id = pd.user_id WHERE u.id = ?",
                            String.class, userId
                        );
                    } catch (Exception ignored) {}
                }
                if (finalNombre != null) {
                    java.util.List<Integer> empIds = jdbcTemplate.queryForList(
                        "SELECT id FROM empleados WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) LIMIT 1",
                        Integer.class, finalNombre
                    );
                    if (!empIds.isEmpty()) {
                        empId = empIds.get(0);
                    } else {
                        jdbcTemplate.update("INSERT INTO empleados (nombre, activo) VALUES (?, 1)", finalNombre);
                        empId = jdbcTemplate.queryForObject(
                            "SELECT id FROM empleados WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) LIMIT 1",
                            Integer.class, finalNombre
                        );
                    }
                } else if (userId != null) {
                    java.util.List<Integer> empIds = jdbcTemplate.queryForList("SELECT id FROM empleados WHERE id = ? LIMIT 1", Integer.class, userId);
                    if (!empIds.isEmpty()) {
                        empId = empIds.get(0);
                    }
                }

                if (empId != null) {
                    int countExistente = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM pagos_comisiones WHERE empleado_id = ? AND anio = ? AND mes = ?",
                        Integer.class, empId, anioVal, mesVal
                    );
                    if (countExistente == 0) {
                        // El trigger tr_pago_comisiones_after_insert inserta automáticamente el EGRESO en transacciones_financieras
                        jdbcTemplate.update(
                            "INSERT INTO pagos_comisiones (empleado_id, anio, mes, total_comisiones, fecha_pago, estado, referencia_pago, notas) " +
                            "VALUES (?, ?, ?, ?, ?, 'PAGADO', ?, ?)",
                            empId, anioVal, mesVal, totalComisiones, fechaPago, refFinal,
                            (notas != null && !notas.isBlank() ? notas : "Liquidación comisiones INS")
                        );
                    } else {
                        jdbcTemplate.update(
                            "UPDATE pagos_comisiones SET total_comisiones = total_comisiones + ?, fecha_actualizacion = NOW() WHERE empleado_id = ? AND anio = ? AND mes = ?",
                            totalComisiones, empId, anioVal, mesVal
                        );
                        Integer tipoEgresoId = jdbcTemplate.queryForObject(
                            "SELECT id FROM tipos_transacciones WHERE nombre = 'Comisión Vendedor' OR categoria = 'EGRESO' ORDER BY (nombre = 'Comisión Vendedor') DESC LIMIT 1",
                            Integer.class
                        );
                        jdbcTemplate.update(
                            "INSERT INTO transacciones_financieras (codigo_transaccion, fecha, tipo_transaccion_id, empleado_id, monto, comision_empleado, descripcion, referencia, estado, activo, fecha_creacion, fecha_actualizacion) " +
                            "VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'COMPLETADA', 1, NOW(), NOW())",
                            "PAGO-COM-INS-" + empId + "-" + (System.currentTimeMillis() % 1000000),
                            fechaPago,
                            tipoEgresoId,
                            empId,
                            totalComisiones.negate(),
                            "Pago de comisiones INS período " + anioVal + "-" + mesVal + " para colaborador: " + (finalNombre != null ? finalNombre : "ID " + empId),
                            refFinal
                        );
                    }
                }
            } catch (Exception e) {
                log.error("Error registrando pago de comisiones y transacción de egreso: {}", e.getMessage(), e);
            }
        }

        return actualizados;
    }

    public int liquidarComisionesEmpleado(Integer userId, Integer anio, Integer mes, java.time.LocalDate fechaPago, String referencia, String notas) {
        return liquidarComisionesEmpleado(userId, null, anio, mes, fechaPago, referencia, notas);
    }

    public List<Map<String, Object>> findAllWithEmpleado() {
        String sql = "SELECT ap.*, ap.user_id, ap.user_id AS empleado_id, " +
                     "COALESCE(pd.full_name, u.email) AS empleado_nombre, " +
                     "COALESCE(pd.full_name, u.email) AS usuario_nombre " +
                     "FROM audatex_pedidos ap " +
                     "LEFT JOIN users u ON ap.user_id = u.id " +
                     "LEFT JOIN personal_data pd ON u.id = pd.user_id " +
                     "ORDER BY ap.fecha_creacion DESC";
        try {
            return jdbcTemplate.queryForList(sql);
        } catch (org.springframework.jdbc.BadSqlGrammarException e) {
            ensureColumns();
            return jdbcTemplate.queryForList(sql);
        }
    }

    public void updateEstadoYEmpleado(Integer id, AudatexPedidosEstado estado, Integer userId, Integer porcentajeComision) {
        int pct = 3;
        if (porcentajeComision != null && porcentajeComision > 0) {
            pct = porcentajeComision;
        } else {
            try {
                String detalleJson = jdbcTemplate.queryForObject("SELECT detalle_json FROM audatex_pedidos WHERE id = ?", String.class, id);
                pct = calcularPorcentajePorHorario(detalleJson);
            } catch (Exception ignored) {}
        }
        String sql = "UPDATE audatex_pedidos SET estado = ?, user_id = ?, porcentaje_comision = ?, comision_calculada = (total_pedido * ? / 100) WHERE id = ?";
        try {
            jdbcTemplate.update(sql, estado != null ? estado.getLiteral() : "Entregado", userId, pct, pct, id);
        } catch (org.springframework.jdbc.BadSqlGrammarException e) {
            ensureColumns();
            jdbcTemplate.update(sql, estado != null ? estado.getLiteral() : "Entregado", userId, pct, pct, id);
        }
    }

    public void asignarEmpleado(Integer id, Integer userId, Integer porcentajeComision) {
        int pct = 3;
        if (porcentajeComision != null && porcentajeComision > 0) {
            pct = porcentajeComision;
        } else {
            try {
                String detalleJson = jdbcTemplate.queryForObject("SELECT detalle_json FROM audatex_pedidos WHERE id = ?", String.class, id);
                pct = calcularPorcentajePorHorario(detalleJson);
            } catch (Exception ignored) {}
        }
        String sql = "UPDATE audatex_pedidos SET user_id = ?, porcentaje_comision = ?, comision_calculada = (total_pedido * ? / 100) WHERE id = ?";
        try {
            jdbcTemplate.update(sql, userId, pct, pct, id);
        } catch (org.springframework.jdbc.BadSqlGrammarException e) {
            ensureColumns();
            jdbcTemplate.update(sql, userId, pct, pct, id);
        }
    }

    public static int calcularPorcentajePorHorario(String detalleJson) {
        if (detalleJson == null || detalleJson.trim().isEmpty()) {
            return 3;
        }
        try {
            int idx = detalleJson.indexOf("\"fecha\"");
            if (idx == -1) idx = detalleJson.indexOf("'fecha'");
            if (idx != -1) {
                int colonIdx = detalleJson.indexOf(":", idx);
                if (colonIdx != -1) {
                    int firstQuote = detalleJson.indexOf("\"", colonIdx);
                    if (firstQuote != -1) {
                        int secondQuote = detalleJson.indexOf("\"", firstQuote + 1);
                        if (secondQuote != -1) {
                            String fechaStr = detalleJson.substring(firstQuote + 1, secondQuote);
                            return calcularPorcentajeDesdeFecha(fechaStr);
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return 3;
    }

    public static int calcularPorcentajeDesdeFecha(String fechaStr) {
        if (fechaStr == null || fechaStr.trim().isEmpty()) return 3;
        try {
            String timePart = null;
            if (fechaStr.contains(" ")) {
                timePart = fechaStr.split(" ")[1];
            } else if (fechaStr.contains("T")) {
                timePart = fechaStr.split("T")[1];
            }
            if (timePart != null && timePart.contains(":")) {
                String[] parts = timePart.split(":");
                int hora = Integer.parseInt(parts[0].replaceAll("[^0-9]", ""));
                int minuto = parts.length > 1 ? Integer.parseInt(parts[1].replaceAll("[^0-9]", "")) : 0;
                int minutosTotal = hora * 60 + minuto;
                // Horario regular: 08:00 (480 min) a 17:00 (1020 min) -> 3%, fuera de horario -> 5%
                if (minutosTotal >= 480 && minutosTotal <= 1020) {
                    return 3;
                } else {
                    return 5;
                }
            }
        } catch (Exception ignored) {}
        return 3;
    }

    public Optional<AudatexPedidos> findById(Integer id) {
        return dsl.selectFrom(AUDATEX_PEDIDOS)
                .where(AUDATEX_PEDIDOS.ID.eq(id))
                .fetchOptionalInto(AudatexPedidos.class);
    }

    public List<AudatexPedidos> findAll() {
        return dsl.selectFrom(AUDATEX_PEDIDOS)
                .orderBy(AUDATEX_PEDIDOS.FECHA_CREACION.desc())
                .fetchInto(AudatexPedidos.class);
    }

    public AudatexPedidos save(AudatexPedidos pedido) {
        return dsl.insertInto(AUDATEX_PEDIDOS)
                .set(AUDATEX_PEDIDOS.NUMERO_PEDIDO, pedido.getNumeroPedido())
                .set(AUDATEX_PEDIDOS.COTIZACION_ID, pedido.getCotizacionId())
                .set(AUDATEX_PEDIDOS.SINIESTRO, pedido.getSiniestro())
                .set(AUDATEX_PEDIDOS.ASEGURADORA, pedido.getAseguradora())
                .set(AUDATEX_PEDIDOS.VEHICULO, pedido.getVehiculo())
                .set(AUDATEX_PEDIDOS.VIN, pedido.getVin())
                .set(AUDATEX_PEDIDOS.TOTAL_PEDIDO, pedido.getTotalPedido())
                .set(AUDATEX_PEDIDOS.ESTADO, pedido.getEstado())
                .set(AUDATEX_PEDIDOS.NOTAS, pedido.getNotas())
                .returning()
                .fetchOneInto(AudatexPedidos.class);
    }

    public void updateEstado(Integer id, AudatexPedidosEstado estado) {
        dsl.update(AUDATEX_PEDIDOS)
                .set(AUDATEX_PEDIDOS.ESTADO, estado)
                .where(AUDATEX_PEDIDOS.ID.eq(id))
                .execute();
    }

    public AudatexPedidos buscarPorWan(String wan) {
        return dsl.selectFrom(AUDATEX_PEDIDOS)
                .where(AUDATEX_PEDIDOS.WAN.eq(wan))
                .fetchOptionalInto(AudatexPedidos.class)
                .orElse(null);
    }

    public AudatexPedidos insertarSync(AudatexPedidos pedido) {
        return insertarSync(pedido, null);
    }

    public AudatexPedidos insertarSync(AudatexPedidos pedido, Integer userId) {
        ensureColumns();
        java.math.BigDecimal total = pedido.getTotalPedido() != null ? pedido.getTotalPedido() : java.math.BigDecimal.ZERO;
        int pctInt = calcularPorcentajePorHorario(pedido.getDetalleJson());

        AudatexPedidos nuevo = dsl.insertInto(AUDATEX_PEDIDOS)
                .set(AUDATEX_PEDIDOS.WAN, pedido.getWan())
                .set(AUDATEX_PEDIDOS.NUMERO_PEDIDO, pedido.getNumeroPedido())
                .set(AUDATEX_PEDIDOS.COTIZACION_ID, pedido.getCotizacionId())
                .set(AUDATEX_PEDIDOS.SINIESTRO, pedido.getSiniestro())
                .set(AUDATEX_PEDIDOS.ASEGURADORA, pedido.getAseguradora())
                .set(AUDATEX_PEDIDOS.TOTAL_PEDIDO, total)
                .set(AUDATEX_PEDIDOS.ESTADO, pedido.getEstado())
                .set(AUDATEX_PEDIDOS.ULTIMA_VEZ_VISTO, pedido.getUltimaVezVisto())
                .set(AUDATEX_PEDIDOS.DETALLE_JSON, pedido.getDetalleJson())
                .returning()
                .fetchOneInto(AudatexPedidos.class);

        if (nuevo != null && nuevo.getId() != null) {
            try {
                jdbcTemplate.update(
                    "UPDATE audatex_pedidos SET user_id = ?, porcentaje_comision = ?, comision_calculada = (total_pedido * ? / 100) WHERE id = ?",
                    userId, pctInt, pctInt, nuevo.getId()
                );
            } catch (Exception ignored) {}
        }
        return nuevo;
    }

    public void actualizarSync(AudatexPedidos pedido) {
        dsl.update(AUDATEX_PEDIDOS)
                .set(AUDATEX_PEDIDOS.NUMERO_PEDIDO, pedido.getNumeroPedido())
                .set(AUDATEX_PEDIDOS.TOTAL_PEDIDO, pedido.getTotalPedido())
                .set(AUDATEX_PEDIDOS.ESTADO, pedido.getEstado())
                .set(AUDATEX_PEDIDOS.ULTIMA_VEZ_VISTO, pedido.getUltimaVezVisto())
                .set(AUDATEX_PEDIDOS.DETALLE_JSON, pedido.getDetalleJson())
                .set(AUDATEX_PEDIDOS.SINIESTRO, pedido.getSiniestro())
                .set(AUDATEX_PEDIDOS.ASEGURADORA, pedido.getAseguradora())
                .set(AUDATEX_PEDIDOS.COTIZACION_ID, pedido.getCotizacionId())
                .where(AUDATEX_PEDIDOS.ID.eq(pedido.getId()))
                .execute();

        try {
            int pctAuto = calcularPorcentajePorHorario(pedido.getDetalleJson());
            jdbcTemplate.update(
                "UPDATE audatex_pedidos p SET " +
                "p.total_pedido = COALESCE(NULLIF(p.total_pedido, 0), (SELECT COALESCE(SUM(i.precio_ofrecido * COALESCE(i.cantidad, 1)), 0) FROM audatex_pedido_items i WHERE i.pedido_id = p.id), 0), " +
                "p.porcentaje_comision = COALESCE(p.porcentaje_comision, ?), " +
                "p.comision_calculada = (COALESCE(NULLIF(p.total_pedido, 0), (SELECT COALESCE(SUM(i.precio_ofrecido * COALESCE(i.cantidad, 1)), 0) FROM audatex_pedido_items i WHERE i.pedido_id = p.id), 0) * COALESCE(p.porcentaje_comision, ?) / 100) " +
                "WHERE p.id = ?",
                pctAuto, pctAuto, pedido.getId()
            );
        } catch (Exception ignored) {}
    }
}
