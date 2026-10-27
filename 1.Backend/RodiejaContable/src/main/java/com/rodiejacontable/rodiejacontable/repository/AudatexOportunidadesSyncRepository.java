package com.rodiejacontable.rodiejacontable.repository;

import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static com.rodiejacontable.database.jooq.Tables.AUDATEX_OPORTUNIDADES_SYNC;

@Repository
public class AudatexOportunidadesSyncRepository {

    private final DSLContext dsl;
    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public AudatexOportunidadesSyncRepository(DSLContext dsl, JdbcTemplate jdbcTemplate) {
        this.dsl = dsl;
        this.jdbcTemplate = jdbcTemplate;
    }

    public void ensureColumns() {
        try {
            jdbcTemplate.execute("ALTER TABLE audatex_oportunidades_sync ADD COLUMN IF NOT EXISTS user_id INT DEFAULT NULL");
        } catch (Exception ignored) {
        }
        try {
            jdbcTemplate.execute("ALTER TABLE audatex_oportunidades_sync ADD INDEX IF NOT EXISTS idx_oportunidades_user_id (user_id)");
        } catch (Exception ignored) {
        }
    }

    public int asignarUsuario(String wan, String cotizacionId, Integer userId) {
        ensureColumns();
        if (wan != null && !wan.trim().isEmpty()) {
            return jdbcTemplate.update("UPDATE audatex_oportunidades_sync SET user_id = ? WHERE wan = ?", userId, wan);
        } else if (cotizacionId != null && !cotizacionId.trim().isEmpty()) {
            return jdbcTemplate.update("UPDATE audatex_oportunidades_sync SET user_id = ? WHERE cotizacion_id = ?", userId, cotizacionId);
        }
        return 0;
    }

    public List<Map<String, Object>> findOportunidadesAsignadasSinPedido() {
        ensureColumns();
        String sql = "SELECT s.* " +
                     "FROM audatex_oportunidades_sync s " +
                     "LEFT JOIN audatex_pedidos p ON (s.cotizacion_id = p.cotizacion_id OR s.siniestro = p.cotizacion_id OR s.wan = p.wan) " +
                     "WHERE s.user_id IS NOT NULL " +
                     "  AND p.id IS NULL " +
                     "  AND s.estado = 'ACTIVA' " +
                     "ORDER BY s.ultima_vez_visto DESC";
        try {
            return jdbcTemplate.queryForList(sql);
        } catch (Exception e) {
            return java.util.Collections.emptyList();
        }
    }

    public List<Map<String, Object>> findCandidatasStale(LocalDateTime syncInicio) {
        return dsl.selectFrom(AUDATEX_OPORTUNIDADES_SYNC)
                .where(AUDATEX_OPORTUNIDADES_SYNC.ESTADO.eq(
                        com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.ACTIVA)
                        .and(AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO.lt(syncInicio)))
                .fetchMaps();
    }

    public int markAsClosed(String wan) {
        return dsl.update(AUDATEX_OPORTUNIDADES_SYNC)
                .set(AUDATEX_OPORTUNIDADES_SYNC.ESTADO,
                        com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.CERRADA)
                .where(AUDATEX_OPORTUNIDADES_SYNC.WAN.eq(wan))
                .execute();
    }

    public int markAsRevisada(String wan) {
        return dsl.update(AUDATEX_OPORTUNIDADES_SYNC)
                .set(AUDATEX_OPORTUNIDADES_SYNC.ESTADO_INTERACCION,
                        com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstadoInteraccion.REVISADA)
                .where(AUDATEX_OPORTUNIDADES_SYNC.WAN.eq(wan))
                .execute();
    }

    public int markStaleAsClosed(int hours) {
        return dsl.update(AUDATEX_OPORTUNIDADES_SYNC)
                .set(AUDATEX_OPORTUNIDADES_SYNC.ESTADO,
                        com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.CERRADA)
                .where(AUDATEX_OPORTUNIDADES_SYNC.ESTADO
                        .eq(com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.ACTIVA))
                .and(AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO
                        .lt(java.time.LocalDateTime.now().minusHours(hours)))
                .execute();
    }

    public int upsertOportunidad(
            String wan, String armadora, String aseguradora, String cotizacionId,
            String taller, String poliza, String siniestro, String matricula,
            String modelo, String anio, String fechaCotizacion, Integer pendientes,
            String repuestosJson) {

        var estado = (pendientes != null && pendientes == 0)
                ? com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.CERRADA
                : com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.ACTIVA;

        return dsl.insertInto(AUDATEX_OPORTUNIDADES_SYNC)
                .set(AUDATEX_OPORTUNIDADES_SYNC.WAN, wan)
                .set(AUDATEX_OPORTUNIDADES_SYNC.ASEGURADORA, aseguradora)
                .set(AUDATEX_OPORTUNIDADES_SYNC.COTIZACION_ID, cotizacionId)
                .set(AUDATEX_OPORTUNIDADES_SYNC.TALLER, taller)
                .set(AUDATEX_OPORTUNIDADES_SYNC.POLIZA, poliza)
                .set(AUDATEX_OPORTUNIDADES_SYNC.SINIESTRO, siniestro)
                .set(AUDATEX_OPORTUNIDADES_SYNC.MATRICULA, matricula)
                .set(AUDATEX_OPORTUNIDADES_SYNC.ARMADORA, armadora)
                .set(AUDATEX_OPORTUNIDADES_SYNC.MODELO, modelo)
                .set(AUDATEX_OPORTUNIDADES_SYNC.ANIO, anio)
                .set(AUDATEX_OPORTUNIDADES_SYNC.FECHA_COTIZACION, fechaCotizacion)
                .set(AUDATEX_OPORTUNIDADES_SYNC.PENDIENTES, pendientes)
                .set(AUDATEX_OPORTUNIDADES_SYNC.ESTADO, estado)
                .set(AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO, java.time.LocalDateTime.now())
                .set(AUDATEX_OPORTUNIDADES_SYNC.DETALLE_JSON, repuestosJson)
                .onDuplicateKeyUpdate()
                .set(AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO, java.time.LocalDateTime.now())
                .set(AUDATEX_OPORTUNIDADES_SYNC.PENDIENTES, pendientes)
                .set(AUDATEX_OPORTUNIDADES_SYNC.DETALLE_JSON, repuestosJson)
                .set(AUDATEX_OPORTUNIDADES_SYNC.MODELO, org.jooq.impl.DSL.coalesce(org.jooq.impl.DSL.val(modelo), AUDATEX_OPORTUNIDADES_SYNC.MODELO))
                .set(AUDATEX_OPORTUNIDADES_SYNC.ANIO, org.jooq.impl.DSL.coalesce(org.jooq.impl.DSL.val(anio), AUDATEX_OPORTUNIDADES_SYNC.ANIO))
                .set(AUDATEX_OPORTUNIDADES_SYNC.ESTADO, estado)
                .execute();
    }

    public List<Map<String, Object>> getOportunidadesActivas(String armadora, String aseguradora, Integer minPendientes) {
        ensureColumns();
        StringBuilder sql = new StringBuilder(
            "SELECT s.*, p.id AS pedido_id, p.numero_pedido, p.estado AS pedido_estado, " +
            "COALESCE(NULLIF(p.total_pedido, 0), (SELECT SUM(i.precio_ofrecido * COALESCE(i.cantidad, 1)) FROM audatex_pedido_items i WHERE i.pedido_id = p.id), 0) AS total_pedido, " +
            "COALESCE(NULLIF(p.comision_calculada, 0), (COALESCE(NULLIF(p.total_pedido, 0), (SELECT SUM(i.precio_ofrecido * COALESCE(i.cantidad, 1)) FROM audatex_pedido_items i WHERE i.pedido_id = p.id), 0) * COALESCE(p.porcentaje_comision, 3) / 100), 0) AS comision_calculada, " +
            "COALESCE(p.porcentaje_comision, 3) AS porcentaje_comision, " +
            "COALESCE(p.user_id, s.user_id) AS user_id, " +
            "COALESCE(p.user_id, s.user_id) AS empleado_id, " +
            "COALESCE(pd.full_name, u.email) AS empleado_nombre, " +
            "COALESCE(pd.full_name, u.email) AS usuario_nombre " +
            "FROM audatex_oportunidades_sync s " +
            "LEFT JOIN audatex_pedidos p ON (s.cotizacion_id = p.cotizacion_id OR s.siniestro = p.cotizacion_id OR s.wan = p.wan) " +
            "LEFT JOIN users u ON COALESCE(p.user_id, s.user_id) = u.id " +
            "LEFT JOIN personal_data pd ON u.id = pd.user_id " +
            "WHERE (s.estado = 'ACTIVA' OR (s.estado = 'CERRADA' AND (p.id IS NOT NULL OR p.numero_pedido IS NOT NULL))) "
        );

        List<Object> params = new java.util.ArrayList<>();

        if (aseguradora != null && !aseguradora.trim().isEmpty()) {
            sql.append("AND LOWER(s.aseguradora) LIKE ? ");
            params.add("%" + aseguradora.trim().toLowerCase() + "%");
        }
        if (armadora != null && !armadora.trim().isEmpty()) {
            sql.append("AND LOWER(s.armadora) LIKE ? ");
            params.add("%" + armadora.trim().toLowerCase() + "%");
        }
        if (minPendientes != null) {
            sql.append("AND (p.id IS NOT NULL OR s.pendientes >= ?) ");
            params.add(minPendientes);
        }

        sql.append("ORDER BY s.ultima_vez_visto DESC");

        try {
            return jdbcTemplate.queryForList(sql.toString(), params.toArray());
        } catch (org.springframework.jdbc.BadSqlGrammarException e) {
            try {
                jdbcTemplate.execute(
                    "ALTER TABLE audatex_pedidos " +
                    "ADD COLUMN IF NOT EXISTS user_id INT DEFAULT NULL, " +
                    "ADD COLUMN IF NOT EXISTS transaccion_id INT DEFAULT NULL, " +
                    "ADD COLUMN IF NOT EXISTS comision_calculada DECIMAL(12,2) DEFAULT NULL, " +
                    "ADD COLUMN IF NOT EXISTS porcentaje_comision TINYINT DEFAULT NULL"
                );
            } catch (Exception ignored) {
            }
            return jdbcTemplate.queryForList(sql.toString(), params.toArray());
        }
    }
}
