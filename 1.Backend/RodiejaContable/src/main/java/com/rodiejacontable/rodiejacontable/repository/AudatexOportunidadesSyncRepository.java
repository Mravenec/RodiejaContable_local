package com.rodiejacontable.rodiejacontable.repository;

import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static com.rodiejacontable.database.jooq.Tables.AUDATEX_OPORTUNIDADES_SYNC;

@Repository
public class AudatexOportunidadesSyncRepository {

    private final DSLContext dsl;

    @Autowired
    public AudatexOportunidadesSyncRepository(DSLContext dsl) {
        this.dsl = dsl;
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
        var query = dsl.selectFrom(AUDATEX_OPORTUNIDADES_SYNC)
                .where(AUDATEX_OPORTUNIDADES_SYNC.ESTADO.eq(
                        com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.ACTIVA));

        if (aseguradora != null && !aseguradora.trim().isEmpty()) {
            query = query.and(AUDATEX_OPORTUNIDADES_SYNC.ASEGURADORA.containsIgnoreCase(aseguradora.trim()));
        }
        if (armadora != null && !armadora.trim().isEmpty()) {
            query = query.and(AUDATEX_OPORTUNIDADES_SYNC.ARMADORA.containsIgnoreCase(armadora.trim()));
        }
        if (minPendientes != null) {
            query = query.and(AUDATEX_OPORTUNIDADES_SYNC.PENDIENTES.ge(minPendientes));
        }

        return query.orderBy(AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO.desc()).fetchMaps();
    }
}
