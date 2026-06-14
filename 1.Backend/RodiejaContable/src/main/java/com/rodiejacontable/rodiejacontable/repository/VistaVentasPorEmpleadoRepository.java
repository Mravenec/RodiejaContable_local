package com.rodiejacontable.rodiejacontable.repository;

import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.Result;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;


import com.rodiejacontable.database.jooq.enums.TiposTransaccionesCategoria;

import static com.rodiejacontable.database.jooq.Tables.EMPLEADOS;
import static com.rodiejacontable.database.jooq.Tables.TRANSACCIONES_FINANCIERAS;
import static com.rodiejacontable.database.jooq.Tables.TIPOS_TRANSACCIONES;
import static com.rodiejacontable.database.jooq.Tables.VISTA_VENTAS_POR_EMPLEADO;
import static com.rodiejacontable.database.jooq.Tables.VEHICULOS;
import static com.rodiejacontable.database.jooq.Tables.INVENTARIO_REPUESTOS;

@Repository
public class VistaVentasPorEmpleadoRepository {

    private final DSLContext dsl;

    public VistaVentasPorEmpleadoRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado> findAll() {
        return dsl.selectFrom(VISTA_VENTAS_POR_EMPLEADO)
                .orderBy(VISTA_VENTAS_POR_EMPLEADO.TOTAL_VENTAS.desc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado.class);
    }

    public Optional<com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado> findByEmpleado(String empleado) {
        String normalizedEmpleado = empleado.trim().toUpperCase();
        return dsl.selectFrom(VISTA_VENTAS_POR_EMPLEADO)
                .where(VISTA_VENTAS_POR_EMPLEADO.EMPLEADO.upper().eq(normalizedEmpleado))
                .fetchOptionalInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado.class);
    }

    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado> findTopNVentas(int limit) {
        return dsl.selectFrom(VISTA_VENTAS_POR_EMPLEADO)
                .orderBy(VISTA_VENTAS_POR_EMPLEADO.TOTAL_VENTAS.desc())
                .limit(limit)
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado.class);
    }

    public List<String> findAllEmpleados() {
        return dsl.selectDistinct(VISTA_VENTAS_POR_EMPLEADO.EMPLEADO)
                .from(VISTA_VENTAS_POR_EMPLEADO)
                .orderBy(VISTA_VENTAS_POR_EMPLEADO.EMPLEADO.asc())
                .fetch(VISTA_VENTAS_POR_EMPLEADO.EMPLEADO);
    }
    
    /**
     * Encuentra las ventas para múltiples empleados en un rango de fechas específico
     * @param empleados Lista de nombres de empleados a buscar
     * @param fechaInicio Fecha de inicio del rango
     * @param fechaFin Fecha de fin del rango
     * @return Lista de ventas por empleado en el rango de fechas
     */
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado> findVentasComparativas(
            List<String> empleados, LocalDate fechaInicio, LocalDate fechaFin) {
        
        if (empleados == null || empleados.isEmpty()) {
            throw new IllegalArgumentException("La lista de empleados no puede estar vacía");
        }
        
        var tf = TRANSACCIONES_FINANCIERAS.as("tf");
        var tt = TIPOS_TRANSACCIONES.as("tt");
        var e = EMPLEADOS.as("e");
        
        // Calculate end date (exclusive)
        LocalDate endDate = fechaFin.plusDays(1);
        
        // Create zero decimal value
        java.math.BigDecimal zeroDecimal = java.math.BigDecimal.ZERO;
        
        // Normalizar nombres de empleados a mayúsculas
        List<String> empleadosNormalizados = empleados.stream()
                .map(String::toUpperCase)
                .toList();
        
        return dsl.select(
                    e.NOMBRE.as("empleado"),
                    DSL.countDistinct(tf.ID).as("total_transacciones"),
                    DSL.countDistinct(
                        DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.ID)
                    ).as("transacciones_venta"),
                    DSL.coalesce(
                        DSL.sum(DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)),
                        zeroDecimal
                    ).as("total_ventas"),
                    DSL.coalesce(DSL.sum(tf.COMISION_EMPLEADO), zeroDecimal).as("total_comisiones"),
                    DSL.coalesce(
                        DSL.avg(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ),
                        zeroDecimal
                    ).as("promedio_venta"),
                    DSL.case_()
                        .when(DSL.sum(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ).isNull().or(DSL.sum(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ).eq(zeroDecimal)), zeroDecimal)
                        .otherwise(
                            DSL.round(
                                DSL.sum(tf.COMISION_EMPLEADO)
                                    .div(DSL.sum(
                                        DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                                    ))
                                    .multiply(DSL.val(100))
                                , 2)
                        ).as("porcentaje_comision")
                )
                .from(e)
                .innerJoin(tf).on(e.ID.eq(tf.EMPLEADO_ID))
                .innerJoin(tt).on(tf.TIPO_TRANSACCION_ID.eq(tt.ID))
                .where(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO)
                    .and(e.NOMBRE.upper().in(empleadosNormalizados))
                    .and(tf.FECHA.between(fechaInicio, fechaFin)))
                .groupBy(e.ID, e.NOMBRE)
                .orderBy(e.NOMBRE.asc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado.class);
    }
    
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado> findByEmpleadoAndRangoFechas(
            String empleado, LocalDate fechaInicio, LocalDate fechaFin) {
        String normalizedEmpleado = empleado.trim().toUpperCase();
        
        var tf = TRANSACCIONES_FINANCIERAS.as("tf");
        var tt = TIPOS_TRANSACCIONES.as("tt");
        var e = EMPLEADOS.as("e");
        
        // Calculate end date (exclusive)
        LocalDate endDate = fechaFin.plusDays(1);
        
        // Create zero decimal value
        java.math.BigDecimal zeroDecimal = java.math.BigDecimal.ZERO;
        
        return dsl.select(
                    e.NOMBRE.as("empleado"),
                    DSL.countDistinct(tf.ID).as("total_transacciones"),
                    DSL.countDistinct(
                        DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.ID)
                    ).as("transacciones_venta"),
                    DSL.coalesce(
                        DSL.sum(DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)),
                        zeroDecimal
                    ).as("total_ventas"),
                    DSL.coalesce(DSL.sum(tf.COMISION_EMPLEADO), zeroDecimal).as("total_comisiones"),
                    DSL.coalesce(
                        DSL.avg(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ),
                        zeroDecimal
                    ).as("promedio_venta"),
                    DSL.case_()
                        .when(DSL.sum(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ).isNull().or(DSL.sum(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ).eq(zeroDecimal)), zeroDecimal)
                        .otherwise(
                            DSL.round(
                                DSL.sum(tf.COMISION_EMPLEADO)
                                    .div(DSL.sum(
                                        DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                                    ))
                                    .multiply(DSL.val(100))
                                , 2)
                        ).as("porcentaje_comision")
                )
                .from(e)
                .leftJoin(tf).on(e.ID.eq(tf.EMPLEADO_ID))
                .leftJoin(tt).on(tf.TIPO_TRANSACCION_ID.eq(tt.ID))
                .where(e.NOMBRE.eq(normalizedEmpleado)
                    .and(tf.FECHA.ge(fechaInicio))
                    .and(tf.FECHA.lt(endDate)))
                .groupBy(e.NOMBRE)
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado.class);
    }
    
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado> findByRangoFechas(
            LocalDate fechaInicio, LocalDate fechaFin) {
        var tf = TRANSACCIONES_FINANCIERAS.as("tf");
        var tt = TIPOS_TRANSACCIONES.as("tt");
        var e = EMPLEADOS.as("e");
        
        // Calculate end date (exclusive)
        LocalDate endDate = fechaFin.plusDays(1);
        
        // Create zero decimal value
        java.math.BigDecimal zeroDecimal = java.math.BigDecimal.ZERO;
        
        return dsl.select(
                    e.NOMBRE.as("empleado"),
                    DSL.countDistinct(tf.ID).as("total_transacciones"),
                    DSL.countDistinct(
                        DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.ID)
                    ).as("transacciones_venta"),
                    DSL.coalesce(
                        DSL.sum(DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)),
                        zeroDecimal
                    ).as("total_ventas"),
                    DSL.coalesce(DSL.sum(tf.COMISION_EMPLEADO), zeroDecimal).as("total_comisiones"),
                    DSL.coalesce(
                        DSL.avg(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ),
                        zeroDecimal
                    ).as("promedio_venta"),
                    DSL.case_()
                        .when(DSL.sum(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ).isNull().or(DSL.sum(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ).eq(zeroDecimal)), zeroDecimal)
                        .otherwise(
                            DSL.round(
                                DSL.sum(tf.COMISION_EMPLEADO)
                                    .div(DSL.sum(
                                        DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                                    ))
                                    .multiply(DSL.val(100))
                                , 2)
                        ).as("porcentaje_comision")
                )
                .from(e)
                .leftJoin(tf).on(e.ID.eq(tf.EMPLEADO_ID))
                .leftJoin(tt).on(tf.TIPO_TRANSACCION_ID.eq(tt.ID))
                .where(tf.FECHA.ge(fechaInicio)
                    .and(tf.FECHA.lt(endDate)))
                .groupBy(e.ID, e.NOMBRE)
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado.class);
    }
    
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado> findByTipoProducto(String tipoProducto) {
        var tf = TRANSACCIONES_FINANCIERAS.as("tf");
        var tt = TIPOS_TRANSACCIONES.as("tt");
        var e = EMPLEADOS.as("e");
        var v = VEHICULOS.as("v");
        var ir = INVENTARIO_REPUESTOS.as("ir");
        
        // Convert string to ID
        Integer tipoProductoId;
        try {
            tipoProductoId = Integer.parseInt(tipoProducto);
        } catch (NumberFormatException ex) {
            // If the string doesn't match an ID, return empty list
            return Collections.emptyList();
        }
        
        // Create zero decimal value
        java.math.BigDecimal zeroDecimal = java.math.BigDecimal.ZERO;
        
        return dsl.select(
                    e.NOMBRE.as("empleado"),
                    DSL.countDistinct(tf.ID).as("total_transacciones"),
                    DSL.countDistinct(
                        DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.ID)
                    ).as("transacciones_venta"),
                    DSL.coalesce(
                        DSL.sum(DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)),
                        zeroDecimal
                    ).as("total_ventas"),
                    DSL.coalesce(DSL.sum(tf.COMISION_EMPLEADO), zeroDecimal).as("total_comisiones"),
                    DSL.coalesce(
                        DSL.avg(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ),
                        zeroDecimal
                    ).as("promedio_venta"),
                    DSL.case_()
                        .when(DSL.sum(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ).isNull().or(DSL.sum(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ).eq(zeroDecimal)), zeroDecimal)
                        .otherwise(
                            DSL.round(
                                DSL.sum(tf.COMISION_EMPLEADO)
                                    .div(DSL.sum(
                                        DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                                    ))
                                    .multiply(DSL.val(100))
                                , 2)
                        ).as("porcentaje_comision")
                )
                .from(e)
                .leftJoin(tf).on(e.ID.eq(tf.EMPLEADO_ID))
                .leftJoin(tt).on(tf.TIPO_TRANSACCION_ID.eq(tt.ID))
                .leftJoin(v).on(tf.VEHICULO_ID.eq(v.ID))
                .leftJoin(ir).on(tf.REPUESTO_ID.eq(ir.ID))
                .where(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO)
                    .and(ir.PARTE_VEHICULO_ID.eq(tipoProductoId).or(v.ID.isNotNull()))) // Use the ID value here
                .groupBy(e.ID, e.NOMBRE)
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado.class);
    }
    
    public List<com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado> findVentasMensualesPorEmpleado(int year) {
        var tf = TRANSACCIONES_FINANCIERAS.as("tf");
        var tt = TIPOS_TRANSACCIONES.as("tt");
        var e = EMPLEADOS.as("e");
        
        // Create zero decimal value
        java.math.BigDecimal zeroDecimal = java.math.BigDecimal.ZERO;
        
        return dsl.select(
                    e.NOMBRE.as("empleado"),
                    DSL.month(tf.FECHA).as("mes"),
                    DSL.countDistinct(tf.ID).as("total_transacciones"),
                    DSL.countDistinct(
                        DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.ID)
                    ).as("transacciones_venta"),
                    DSL.coalesce(
                        DSL.sum(DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)),
                        zeroDecimal
                    ).as("total_ventas"),
                    DSL.coalesce(DSL.sum(tf.COMISION_EMPLEADO), zeroDecimal).as("total_comisiones"),
                    DSL.coalesce(
                        DSL.avg(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ),
                        zeroDecimal
                    ).as("promedio_venta"),
                    DSL.case_()
                        .when(DSL.sum(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ).isNull().or(DSL.sum(
                            DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                        ).eq(zeroDecimal)), zeroDecimal)
                        .otherwise(
                            DSL.round(
                                DSL.sum(tf.COMISION_EMPLEADO)
                                    .div(DSL.sum(
                                        DSL.when(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO), tf.MONTO)
                                    ))
                                    .multiply(DSL.val(100))
                                , 2)
                        ).as("porcentaje_comision")
                )
                .from(e)
                .leftJoin(tf).on(e.ID.eq(tf.EMPLEADO_ID))
                .leftJoin(tt).on(tf.TIPO_TRANSACCION_ID.eq(tt.ID))
                .where(tt.CATEGORIA.eq(TiposTransaccionesCategoria.INGRESO)
                    .and(DSL.year(tf.FECHA).eq(year)))
                .groupBy(e.ID, e.NOMBRE, DSL.month(tf.FECHA))
                .orderBy(e.NOMBRE.asc(), DSL.month(tf.FECHA).asc())
                .fetchInto(com.rodiejacontable.database.jooq.tables.pojos.VistaVentasPorEmpleado.class);
    }
}
