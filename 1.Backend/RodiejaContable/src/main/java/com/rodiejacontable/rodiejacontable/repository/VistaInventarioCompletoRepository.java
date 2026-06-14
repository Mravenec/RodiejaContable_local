package com.rodiejacontable.rodiejacontable.repository;

import static com.rodiejacontable.database.jooq.Tables.VISTA_INVENTARIO_COMPLETO;

import com.rodiejacontable.database.jooq.enums.VistaInventarioCompletoEstado;

import com.rodiejacontable.database.jooq.tables.pojos.VistaInventarioCompleto;
import com.rodiejacontable.database.jooq.tables.records.VistaInventarioCompletoRecord;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public class VistaInventarioCompletoRepository {

    @Autowired
    private DSLContext dsl;

    public List<VistaInventarioCompleto> findAll() {
        return dsl.selectFrom(VISTA_INVENTARIO_COMPLETO)
                .fetchInto(VistaInventarioCompleto.class);
    }

    public Optional<VistaInventarioCompleto> findById(Integer id) {
        return dsl.selectFrom(VISTA_INVENTARIO_COMPLETO)
                .where(VISTA_INVENTARIO_COMPLETO.ID.eq(id))
                .fetchOptionalInto(VistaInventarioCompleto.class);
    }

    public List<VistaInventarioCompleto> findByEstado(VistaInventarioCompletoEstado estado) {
        return dsl.selectFrom(VISTA_INVENTARIO_COMPLETO)
                .where(VISTA_INVENTARIO_COMPLETO.ESTADO.eq(estado))
                .fetchInto(VistaInventarioCompleto.class);
    }

    public List<VistaInventarioCompleto> findByParteVehiculo(String parteVehiculo) {
        return dsl.selectFrom(VISTA_INVENTARIO_COMPLETO)
                .where(VISTA_INVENTARIO_COMPLETO.PARTE_VEHICULO.eq(parteVehiculo))
                .fetchInto(VistaInventarioCompleto.class);
    }

    public List<VistaInventarioCompleto> findByMarca(String marca) {
        return dsl.selectFrom(VISTA_INVENTARIO_COMPLETO)
                .where(VISTA_INVENTARIO_COMPLETO.MARCA.eq(marca))
                .fetchInto(VistaInventarioCompleto.class);
    }

    public List<VistaInventarioCompleto> findByModelo(String modelo) {
        return dsl.selectFrom(VISTA_INVENTARIO_COMPLETO)
                .where(VISTA_INVENTARIO_COMPLETO.MODELO.eq(modelo))
                .fetchInto(VistaInventarioCompleto.class);
    }

    public List<VistaInventarioCompleto> findByAnioVehiculo(Integer anioVehiculo) {
        return dsl.selectFrom(VISTA_INVENTARIO_COMPLETO)
                .where(VISTA_INVENTARIO_COMPLETO.ANIO_VEHICULO.eq(anioVehiculo))
                .fetchInto(VistaInventarioCompleto.class);
    }

    public List<VistaInventarioCompleto> findByRangoPrecio(BigDecimal precioMin, BigDecimal precioMax) {
        return dsl.selectFrom(VISTA_INVENTARIO_COMPLETO)
                .where(VISTA_INVENTARIO_COMPLETO.PRECIO_VENTA.between(precioMin, precioMax))
                .fetchInto(VistaInventarioCompleto.class);
    }

    public List<VistaInventarioCompleto> buscarPorCodigoODescripcion(String termino) {
        String likeTerm = "%" + termino + "%";
        return dsl.selectFrom(VISTA_INVENTARIO_COMPLETO)
                .where(VISTA_INVENTARIO_COMPLETO.CODIGO_REPUESTO.likeIgnoreCase(likeTerm)
                        .or(VISTA_INVENTARIO_COMPLETO.DESCRIPCION.likeIgnoreCase(likeTerm)))
                .fetchInto(VistaInventarioCompleto.class);
    }

    public List<String> findDistinctMarcas() {
        return dsl.selectDistinct(VISTA_INVENTARIO_COMPLETO.MARCA)
                .from(VISTA_INVENTARIO_COMPLETO)
                .where(VISTA_INVENTARIO_COMPLETO.MARCA.isNotNull())
                .fetch(VISTA_INVENTARIO_COMPLETO.MARCA);
    }

    public List<String> findDistinctModelos() {
        return dsl.selectDistinct(VISTA_INVENTARIO_COMPLETO.MODELO)
                .from(VISTA_INVENTARIO_COMPLETO)
                .where(VISTA_INVENTARIO_COMPLETO.MODELO.isNotNull())
                .fetch(VISTA_INVENTARIO_COMPLETO.MODELO);
    }

    public List<Integer> findDistinctAnios() {
        return dsl.selectDistinct(VISTA_INVENTARIO_COMPLETO.ANIO_VEHICULO)
                .from(VISTA_INVENTARIO_COMPLETO)
                .where(VISTA_INVENTARIO_COMPLETO.ANIO_VEHICULO.isNotNull())
                .fetch(VISTA_INVENTARIO_COMPLETO.ANIO_VEHICULO);
    }
}
