package com.rodiejacontable.rodiejacontable.repository;

import com.rodiejacontable.database.jooq.enums.VistaVehiculosCompletaEstado;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.rodiejacontable.database.jooq.Tables.VISTA_VEHICULOS_COMPLETA;

@Repository
public class VistaVehiculosCompletaRepository {

    private final DSLContext dsl;

    public VistaVehiculosCompletaRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findAll() {
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .orderBy(VISTA_VEHICULOS_COMPLETA.FECHA_INGRESO.desc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }

    public Optional<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findById(Integer id) {
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.ID.eq(id))
                .fetchOptionalInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findActivos() {
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.ACTIVO.eq((byte) 1))
                .orderBy(VISTA_VEHICULOS_COMPLETA.FECHA_INGRESO.desc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findVehiculosParaEgreso() {
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.ACTIVO.eq((byte) 1))
                .and(VISTA_VEHICULOS_COMPLETA.ESTADO.eq(VistaVehiculosCompletaEstado.REPARACION)
                    .or(VISTA_VEHICULOS_COMPLETA.ESTADO.eq(VistaVehiculosCompletaEstado.DISPONIBLE)))
                .orderBy(VISTA_VEHICULOS_COMPLETA.FECHA_INGRESO.desc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByEstado(VistaVehiculosCompletaEstado estado) {
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.ESTADO.eq(estado))
                .orderBy(VISTA_VEHICULOS_COMPLETA.FECHA_INGRESO.desc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByMarca(String marca) {
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.MARCA.eq(marca))
                .orderBy(VISTA_VEHICULOS_COMPLETA.MODELO.asc(), VISTA_VEHICULOS_COMPLETA.ANIO.desc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByModelo(String modelo) {
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.MODELO.eq(modelo))
                .orderBy(VISTA_VEHICULOS_COMPLETA.ANIO.desc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByAnio(Integer anio) {
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.ANIO.eq(anio))
                .orderBy(VISTA_VEHICULOS_COMPLETA.MARCA.asc(), VISTA_VEHICULOS_COMPLETA.MODELO.asc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByRangoFechasIngreso(LocalDate fechaInicio, LocalDate fechaFin) {
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.FECHA_INGRESO.between(fechaInicio, fechaFin))
                .orderBy(VISTA_VEHICULOS_COMPLETA.FECHA_INGRESO.desc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findVehiculosVendidos() {
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.ESTADO.eq(VistaVehiculosCompletaEstado.VENDIDO))
                .orderBy(VISTA_VEHICULOS_COMPLETA.FECHA_VENTA.desc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findVehiculosEnInventario() {
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.ESTADO.eq(VistaVehiculosCompletaEstado.DISPONIBLE))
                .orderBy(VISTA_VEHICULOS_COMPLETA.FECHA_INGRESO.desc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }

    public List<String> findDistinctMarcas() {
        return dsl.selectDistinct(VISTA_VEHICULOS_COMPLETA.MARCA)
                .from(VISTA_VEHICULOS_COMPLETA)
                .orderBy(VISTA_VEHICULOS_COMPLETA.MARCA.asc())
                .fetch(VISTA_VEHICULOS_COMPLETA.MARCA);
    }

    public List<String> findDistinctModelos() {
        return dsl.selectDistinct(VISTA_VEHICULOS_COMPLETA.MODELO)
                .from(VISTA_VEHICULOS_COMPLETA)
                .orderBy(VISTA_VEHICULOS_COMPLETA.MODELO.asc())
                .fetch(VISTA_VEHICULOS_COMPLETA.MODELO);
    }

    public List<Integer> findDistinctAnios() {
        return dsl.selectDistinct(VISTA_VEHICULOS_COMPLETA.ANIO)
                .from(VISTA_VEHICULOS_COMPLETA)
                .orderBy(VISTA_VEHICULOS_COMPLETA.ANIO.desc())
                .fetch(VISTA_VEHICULOS_COMPLETA.ANIO);
    }
    
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByTipoTransmision(String transmision) {
        // Buscar en modelo o generación que contengan el tipo de transmisión
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.MODELO.likeIgnoreCase("%" + transmision + "%")
                    .or(VISTA_VEHICULOS_COMPLETA.GENERACION.likeIgnoreCase("%" + transmision + "%")))
                .orderBy(VISTA_VEHICULOS_COMPLETA.MARCA.asc(), VISTA_VEHICULOS_COMPLETA.MODELO.asc(), VISTA_VEHICULOS_COMPLETA.ANIO.desc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByTipoVehiculo(String tipo) {
        // Buscar por modelo ya que no existe un campo tipo_vehiculo
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.MODELO.likeIgnoreCase("%" + tipo + "%")
                    .or(VISTA_VEHICULOS_COMPLETA.GENERACION.likeIgnoreCase("%" + tipo + "%")))
                .orderBy(VISTA_VEHICULOS_COMPLETA.MARCA.asc(), VISTA_VEHICULOS_COMPLETA.MODELO.asc(), VISTA_VEHICULOS_COMPLETA.ANIO.desc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }
    
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta> findByPrecioVentaBetween(BigDecimal minPrecio, BigDecimal maxPrecio) {
        return dsl.selectFrom(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.PRECIO_VENTA.between(minPrecio, maxPrecio))
                .orderBy(VISTA_VEHICULOS_COMPLETA.PRECIO_VENTA.asc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta.class);
    }

    public Map<String, Object> getEstadisticasGenerales() {
        BigDecimal inversionTotal = dsl.select(DSL.coalesce(DSL.sum(VISTA_VEHICULOS_COMPLETA.INVERSION_TOTAL), BigDecimal.ZERO))
                .from(VISTA_VEHICULOS_COMPLETA)
                .fetchOneInto(BigDecimal.class);

        BigDecimal ventasTotales = dsl.select(DSL.coalesce(DSL.sum(VISTA_VEHICULOS_COMPLETA.PRECIO_VENTA), BigDecimal.ZERO))
                .from(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.ESTADO.eq(VistaVehiculosCompletaEstado.VENDIDO))
                .fetchOneInto(BigDecimal.class);

        Long totalVehiculos = dsl.selectCount()
                .from(VISTA_VEHICULOS_COMPLETA)
                .fetchOneInto(Long.class);

        Long vehiculosVendidos = dsl.selectCount()
                .from(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.ESTADO.eq(VistaVehiculosCompletaEstado.VENDIDO))
                .fetchOneInto(Long.class);

        Long vehiculosEnInventario = dsl.selectCount()
                .from(VISTA_VEHICULOS_COMPLETA)
                .where(VISTA_VEHICULOS_COMPLETA.ESTADO.eq(VistaVehiculosCompletaEstado.DISPONIBLE))
                .fetchOneInto(Long.class);

        return Map.of(
                "inversionTotal", inversionTotal,
                "ventasTotales", ventasTotales,
                "gananciaNeta", ventasTotales.subtract(inversionTotal),
                "totalVehiculos", totalVehiculos,
                "vehiculosVendidos", vehiculosVendidos,
                "vehiculosEnInventario", vehiculosEnInventario
        );
    }
}
