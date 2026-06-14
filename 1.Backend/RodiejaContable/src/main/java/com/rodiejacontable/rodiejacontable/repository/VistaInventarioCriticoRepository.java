package com.rodiejacontable.rodiejacontable.repository;

import static com.rodiejacontable.database.jooq.Tables.VISTA_INVENTARIO_CRITICO;

import com.rodiejacontable.database.jooq.enums.VistaInventarioCriticoEstado;

import com.rodiejacontable.database.jooq.tables.pojos.VistaInventarioCritico;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public class VistaInventarioCriticoRepository {

    @Autowired
    private DSLContext dsl;

    public List<VistaInventarioCritico> findAll() {
        return dsl.selectFrom(VISTA_INVENTARIO_CRITICO)
                .fetchInto(VistaInventarioCritico.class);
    }

    public List<VistaInventarioCritico> findByEstado(VistaInventarioCriticoEstado estado) {
        return dsl.selectFrom(VISTA_INVENTARIO_CRITICO)
                .where(VISTA_INVENTARIO_CRITICO.ESTADO.eq(estado))
                .fetchInto(VistaInventarioCritico.class);
    }

    public List<VistaInventarioCritico> findByParteVehiculo(String parteVehiculo) {
        return dsl.selectFrom(VISTA_INVENTARIO_CRITICO)
                .where(VISTA_INVENTARIO_CRITICO.PARTE_VEHICULO.eq(parteVehiculo))
                .fetchInto(VistaInventarioCritico.class);
    }

    public List<VistaInventarioCritico> findByClasificacionMargen(String clasificacion) {
        return dsl.selectFrom(VISTA_INVENTARIO_CRITICO)
                .where(VISTA_INVENTARIO_CRITICO.CLASIFICACION_MARGEN.eq(clasificacion))
                .fetchInto(VistaInventarioCritico.class);
    }

    public List<VistaInventarioCritico> findByClasificacionRotacion(String clasificacion) {
        return dsl.selectFrom(VISTA_INVENTARIO_CRITICO)
                .where(VISTA_INVENTARIO_CRITICO.CLASIFICACION_ROTACION.eq(clasificacion))
                .fetchInto(VistaInventarioCritico.class);
    }

    public List<VistaInventarioCritico> findByDiasEnInventarioGreaterThan(Integer dias) {
        return dsl.selectFrom(VISTA_INVENTARIO_CRITICO)
                .where(VISTA_INVENTARIO_CRITICO.DIAS_EN_INVENTARIO.gt(dias))
                .fetchInto(VistaInventarioCritico.class);
    }

    public List<VistaInventarioCritico> findByVehiculoOrigen(String vehiculoOrigen) {
        return dsl.selectFrom(VISTA_INVENTARIO_CRITICO)
                .where(VISTA_INVENTARIO_CRITICO.VEHICULO_ORIGEN.eq(vehiculoOrigen))
                .fetchInto(VistaInventarioCritico.class);
    }

    public List<VistaInventarioCritico> findByAnioVehiculo(Integer anio) {
        return dsl.selectFrom(VISTA_INVENTARIO_CRITICO)
                .where(VISTA_INVENTARIO_CRITICO.ANIO_VEHICULO.eq(anio))
                .fetchInto(VistaInventarioCritico.class);
    }

    public List<String> findDistinctClasificacionesMargen() {
        return dsl.selectDistinct(VISTA_INVENTARIO_CRITICO.CLASIFICACION_MARGEN)
                .from(VISTA_INVENTARIO_CRITICO)
                .where(VISTA_INVENTARIO_CRITICO.CLASIFICACION_MARGEN.isNotNull())
                .fetch(VISTA_INVENTARIO_CRITICO.CLASIFICACION_MARGEN);
    }

    public List<String> findDistinctClasificacionesRotacion() {
        return dsl.selectDistinct(VISTA_INVENTARIO_CRITICO.CLASIFICACION_ROTACION)
                .from(VISTA_INVENTARIO_CRITICO)
                .where(VISTA_INVENTARIO_CRITICO.CLASIFICACION_ROTACION.isNotNull())
                .fetch(VISTA_INVENTARIO_CRITICO.CLASIFICACION_ROTACION);
    }

    public List<Integer> findDistinctAniosVehiculo() {
        return dsl.selectDistinct(VISTA_INVENTARIO_CRITICO.ANIO_VEHICULO)
                .from(VISTA_INVENTARIO_CRITICO)
                .where(VISTA_INVENTARIO_CRITICO.ANIO_VEHICULO.isNotNull())
                .orderBy(VISTA_INVENTARIO_CRITICO.ANIO_VEHICULO.desc())
                .fetch(VISTA_INVENTARIO_CRITICO.ANIO_VEHICULO);
    }
}
