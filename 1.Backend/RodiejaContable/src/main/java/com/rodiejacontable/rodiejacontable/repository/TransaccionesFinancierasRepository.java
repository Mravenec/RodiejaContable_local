package com.rodiejacontable.rodiejacontable.repository;

import static com.rodiejacontable.database.jooq.Tables.TRANSACCIONES_FINANCIERAS;
import static com.rodiejacontable.database.jooq.Tables.TIPOS_TRANSACCIONES;
import static com.rodiejacontable.database.jooq.Tables.INVENTARIO_REPUESTOS;
import static com.rodiejacontable.database.jooq.Tables.VEHICULOS;

import com.rodiejacontable.database.jooq.enums.TransaccionesFinancierasEstado;
import com.rodiejacontable.database.jooq.tables.pojos.TransaccionesFinancieras;
import com.rodiejacontable.database.jooq.tables.records.TransaccionesFinancierasRecord;
import org.jooq.Condition;
import java.util.Map;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public class TransaccionesFinancierasRepository {

    @Autowired
    private DSLContext dsl;
    
    public List<TransaccionesFinancieras> findAll() {
        return dsl.selectFrom(TRANSACCIONES_FINANCIERAS)
                 .orderBy(TRANSACCIONES_FINANCIERAS.FECHA.desc())
                 .fetchInto(TransaccionesFinancieras.class);
    }
    
    public List<TransaccionesFinancieras> findByFechaBetween(LocalDate fechaInicio, LocalDate fechaFin) {
        return dsl.selectFrom(TRANSACCIONES_FINANCIERAS)
                 .where(TRANSACCIONES_FINANCIERAS.FECHA.between(fechaInicio, fechaFin))
                 .orderBy(TRANSACCIONES_FINANCIERAS.FECHA.desc())
                 .fetchInto(TransaccionesFinancieras.class);
    }
    
    public List<TransaccionesFinancieras> findByTipoTransaccionId(Integer tipoTransaccionId) {
        return dsl.selectFrom(TRANSACCIONES_FINANCIERAS)
                 .where(TRANSACCIONES_FINANCIERAS.TIPO_TRANSACCION_ID.eq(tipoTransaccionId))
                 .orderBy(TRANSACCIONES_FINANCIERAS.FECHA.desc())
                 .fetchInto(TransaccionesFinancieras.class);
    }
    
    public List<TransaccionesFinancieras> findByVehiculoId(Integer vehiculoId) {
        return dsl.selectFrom(TRANSACCIONES_FINANCIERAS)
                 .where(TRANSACCIONES_FINANCIERAS.VEHICULO_ID.eq(vehiculoId))
                 .orderBy(TRANSACCIONES_FINANCIERAS.FECHA.desc())
                 .fetchInto(TransaccionesFinancieras.class);
    }
    
    public List<TransaccionesFinancieras> findByEmpleadoId(Integer empleadoId) {
        return dsl.selectFrom(TRANSACCIONES_FINANCIERAS)
                 .where(TRANSACCIONES_FINANCIERAS.EMPLEADO_ID.eq(empleadoId))
                 .orderBy(TRANSACCIONES_FINANCIERAS.FECHA.desc())
                 .fetchInto(TransaccionesFinancieras.class);
    }
    
    public Integer findGeneracionIdByRepuestoId(Integer repuestoId) {
        var tf = dsl.select(TRANSACCIONES_FINANCIERAS.GENERACION_ID)
                .from(TRANSACCIONES_FINANCIERAS)
                .where(TRANSACCIONES_FINANCIERAS.REPUESTO_ID.eq(repuestoId))
                .and(TRANSACCIONES_FINANCIERAS.GENERACION_ID.isNotNull())
                .orderBy(TRANSACCIONES_FINANCIERAS.ID.asc())
                .limit(1)
                .fetchOne();
        return tf != null ? tf.get(TRANSACCIONES_FINANCIERAS.GENERACION_ID) : null;
    }
    
    public Optional<TransaccionesFinancieras> findById(Integer id) {
        return dsl.selectFrom(TRANSACCIONES_FINANCIERAS)
                 .where(TRANSACCIONES_FINANCIERAS.ID.eq(id))
                 .fetchOptionalInto(TransaccionesFinancieras.class);
    }
    
    public Optional<TransaccionesFinancieras> findByCodigoTransaccion(String codigoTransaccion) {
        return dsl.selectFrom(TRANSACCIONES_FINANCIERAS)
                 .where(TRANSACCIONES_FINANCIERAS.CODIGO_TRANSACCION.eq(codigoTransaccion))
                 .fetchOptionalInto(TransaccionesFinancieras.class);
    }
    
    public boolean existsByCodigoTransaccion(String codigoTransaccion) {
        return dsl.selectCount()
                 .from(TRANSACCIONES_FINANCIERAS)
                 .where(TRANSACCIONES_FINANCIERAS.CODIGO_TRANSACCION.eq(codigoTransaccion))
                 .fetchOne(0, Integer.class) > 0;
    }
    
    public int countByTipoTransaccionId(Integer tipoTransaccionId) {
        Integer count = dsl.selectCount()
                 .from(TRANSACCIONES_FINANCIERAS)
                 .where(TRANSACCIONES_FINANCIERAS.TIPO_TRANSACCION_ID.eq(tipoTransaccionId))
                 .fetchOne(0, Integer.class);
        return count != null ? count : 0;
    }
    
    public BigDecimal getTotalMontoByTipoTransaccionAndPeriodo(Integer tipoTransaccionId, LocalDate fechaInicio, LocalDate fechaFin) {
        return dsl.select(DSL.sum(TRANSACCIONES_FINANCIERAS.MONTO))
                 .from(TRANSACCIONES_FINANCIERAS)
                 .where(TRANSACCIONES_FINANCIERAS.TIPO_TRANSACCION_ID.eq(tipoTransaccionId)
                     .and(TRANSACCIONES_FINANCIERAS.FECHA.between(fechaInicio, fechaFin)))
                 .fetchOne(0, BigDecimal.class);
    }
    
    public TransaccionesFinancieras save(TransaccionesFinancieras transaccion) {
        Integer id = dsl.insertInto(TRANSACCIONES_FINANCIERAS)
                 .set(TRANSACCIONES_FINANCIERAS.CODIGO_TRANSACCION, transaccion.getCodigoTransaccion())
                 .set(TRANSACCIONES_FINANCIERAS.FECHA, transaccion.getFecha())
                 .set(TRANSACCIONES_FINANCIERAS.TIPO_TRANSACCION_ID, transaccion.getTipoTransaccionId())
                 .set(TRANSACCIONES_FINANCIERAS.EMPLEADO_ID, transaccion.getEmpleadoId())
                 .set(TRANSACCIONES_FINANCIERAS.VEHICULO_ID, transaccion.getVehiculoId())
                 .set(TRANSACCIONES_FINANCIERAS.REPUESTO_ID, transaccion.getRepuestoId())
                 .set(TRANSACCIONES_FINANCIERAS.GENERACION_ID, transaccion.getGeneracionId())
                 .set(TRANSACCIONES_FINANCIERAS.CANTIDAD_REPUESTO, transaccion.getCantidadRepuesto() != null ? transaccion.getCantidadRepuesto() : 1)
                 .set(TRANSACCIONES_FINANCIERAS.MONTO, transaccion.getMonto())
                 .set(TRANSACCIONES_FINANCIERAS.COMISION_EMPLEADO, transaccion.getComisionEmpleado())
                 .set(TRANSACCIONES_FINANCIERAS.DESCRIPCION, transaccion.getDescripcion())
                 .set(TRANSACCIONES_FINANCIERAS.REFERENCIA, transaccion.getReferencia())
                 .set(TRANSACCIONES_FINANCIERAS.ESTADO, transaccion.getEstado())
                 .set(TRANSACCIONES_FINANCIERAS.ACTIVO, transaccion.getActivo())
                 .set(TRANSACCIONES_FINANCIERAS.FECHA_CREACION, transaccion.getFechaCreacion())
                 .set(TRANSACCIONES_FINANCIERAS.FECHA_ACTUALIZACION, transaccion.getFechaActualizacion())
                 .returning(TRANSACCIONES_FINANCIERAS.ID)
                 .fetchOne()
                 .getValue(TRANSACCIONES_FINANCIERAS.ID);
                 
        transaccion.setId(id);
        return transaccion;
    }
    
    public TransaccionesFinancieras update(TransaccionesFinancieras transaccion) {
        // Realizar la actualización
        int rowsUpdated = dsl.update(TRANSACCIONES_FINANCIERAS)
                 .set(TRANSACCIONES_FINANCIERAS.CODIGO_TRANSACCION, transaccion.getCodigoTransaccion())
                 .set(TRANSACCIONES_FINANCIERAS.FECHA, transaccion.getFecha())
                 .set(TRANSACCIONES_FINANCIERAS.TIPO_TRANSACCION_ID, transaccion.getTipoTransaccionId())
                 .set(TRANSACCIONES_FINANCIERAS.EMPLEADO_ID, transaccion.getEmpleadoId())
                 .set(TRANSACCIONES_FINANCIERAS.VEHICULO_ID, transaccion.getVehiculoId())
                 .set(TRANSACCIONES_FINANCIERAS.REPUESTO_ID, transaccion.getRepuestoId())
                 .set(TRANSACCIONES_FINANCIERAS.GENERACION_ID, transaccion.getGeneracionId())
                 .set(TRANSACCIONES_FINANCIERAS.CANTIDAD_REPUESTO, transaccion.getCantidadRepuesto() != null ? transaccion.getCantidadRepuesto() : 1)
                 .set(TRANSACCIONES_FINANCIERAS.MONTO, transaccion.getMonto())
                 .set(TRANSACCIONES_FINANCIERAS.COMISION_EMPLEADO, transaccion.getComisionEmpleado())
                 .set(TRANSACCIONES_FINANCIERAS.DESCRIPCION, transaccion.getDescripcion())
                 .set(TRANSACCIONES_FINANCIERAS.REFERENCIA, transaccion.getReferencia())
                 .set(TRANSACCIONES_FINANCIERAS.ESTADO, transaccion.getEstado())
                 .set(TRANSACCIONES_FINANCIERAS.ACTIVO, transaccion.getActivo())
                 .set(TRANSACCIONES_FINANCIERAS.FECHA_ACTUALIZACION, transaccion.getFechaActualizacion())
                 .where(TRANSACCIONES_FINANCIERAS.ID.eq(transaccion.getId()))
                 .execute();
        
        // Si no se actualizó ninguna fila, lanzar excepción
        if (rowsUpdated == 0) {
            throw new RuntimeException("No se encontró la transacción con ID: " + transaccion.getId());
        }
        
        // Devolver la transacción actualizada buscándola nuevamente
        return findById(transaccion.getId())
                 .orElseThrow(() -> new RuntimeException("No se encontró la transacción después de actualizar: " + transaccion.getId()));
    }
    
    public boolean delete(Integer id) {
        return dsl.deleteFrom(TRANSACCIONES_FINANCIERAS)
                 .where(TRANSACCIONES_FINANCIERAS.ID.eq(id))
                 .execute() > 0;
    }
    
    public void actualizarEstado(Integer id, TransaccionesFinancierasEstado estado) {
        dsl.update(TRANSACCIONES_FINANCIERAS)
           .set(TRANSACCIONES_FINANCIERAS.ESTADO, estado)
           .set(TRANSACCIONES_FINANCIERAS.FECHA_ACTUALIZACION, java.time.LocalDateTime.now())
           .where(TRANSACCIONES_FINANCIERAS.ID.eq(id))
           .execute();
    }
    
    // Métodos adicionales para comisiones
    public List<TransaccionesFinancierasRecord> findComisionesByPeriodo(Integer anio, Integer mes) {
        return dsl.selectFrom(TRANSACCIONES_FINANCIERAS)
                .where(TRANSACCIONES_FINANCIERAS.ANIO.eq(anio.shortValue()))
                .and(TRANSACCIONES_FINANCIERAS.MES.eq(mes.byteValue()))
                .and(TRANSACCIONES_FINANCIERAS.ESTADO.eq(TransaccionesFinancierasEstado.COMPLETADA))
                .and(TRANSACCIONES_FINANCIERAS.COMISION_EMPLEADO.isNotNull())
                .and(TRANSACCIONES_FINANCIERAS.COMISION_EMPLEADO.gt(BigDecimal.ZERO))
                .orderBy(TRANSACCIONES_FINANCIERAS.FECHA.desc())
                .fetch();
    }
    
    public List<TransaccionesFinancierasRecord> findComisionesByEmpleadoAndPeriodo(Integer empleadoId, Integer anio, Integer mes) {
        return dsl.selectFrom(TRANSACCIONES_FINANCIERAS)
                .where(TRANSACCIONES_FINANCIERAS.EMPLEADO_ID.eq(empleadoId))
                .and(TRANSACCIONES_FINANCIERAS.ANIO.eq(anio.shortValue()))
                .and(TRANSACCIONES_FINANCIERAS.MES.eq(mes.byteValue()))
                .and(TRANSACCIONES_FINANCIERAS.ESTADO.eq(TransaccionesFinancierasEstado.COMPLETADA))
                .and(TRANSACCIONES_FINANCIERAS.COMISION_EMPLEADO.isNotNull())
                .and(TRANSACCIONES_FINANCIERAS.COMISION_EMPLEADO.gt(BigDecimal.ZERO))
                .orderBy(TRANSACCIONES_FINANCIERAS.FECHA.desc())
                .fetch();
    }
    
    public List<Map<String, Object>> getReporteVentasRepuestosMensual(LocalDate fechaInicio, LocalDate fechaFin, Integer generacionId) {
        Condition conditions = TIPOS_TRANSACCIONES.NOMBRE.eq("Venta Repuesto")
                .and(TRANSACCIONES_FINANCIERAS.ACTIVO.eq((byte) 1));
                
        if (fechaInicio != null && fechaFin != null) {
            conditions = conditions.and(TRANSACCIONES_FINANCIERAS.FECHA.between(fechaInicio, fechaFin));
        }
        
        if (generacionId != null) {
            conditions = conditions.and(TRANSACCIONES_FINANCIERAS.GENERACION_ID.eq(generacionId));
        }
        
        return dsl.select(
                TRANSACCIONES_FINANCIERAS.ANIO.as("anio"),
                TRANSACCIONES_FINANCIERAS.MES.as("mes"),
                DSL.sum(TRANSACCIONES_FINANCIERAS.MONTO).as("totalVentas"),
                DSL.sum(INVENTARIO_REPUESTOS.PRECIO_COSTO).as("totalCostos"),
                DSL.sum(TRANSACCIONES_FINANCIERAS.COMISION_EMPLEADO).as("totalComisiones")
            )
            .from(TRANSACCIONES_FINANCIERAS)
            .join(TIPOS_TRANSACCIONES).on(TRANSACCIONES_FINANCIERAS.TIPO_TRANSACCION_ID.eq(TIPOS_TRANSACCIONES.ID))
            .join(INVENTARIO_REPUESTOS).on(TRANSACCIONES_FINANCIERAS.REPUESTO_ID.eq(INVENTARIO_REPUESTOS.ID))
            .where(conditions)
            .groupBy(TRANSACCIONES_FINANCIERAS.ANIO, TRANSACCIONES_FINANCIERAS.MES)
            .orderBy(TRANSACCIONES_FINANCIERAS.ANIO.desc(), TRANSACCIONES_FINANCIERAS.MES.desc())
            .fetchMaps();
    }
    
    public List<Map<String, Object>> getReporteVentasVehiculosMensual(LocalDate fechaInicio, LocalDate fechaFin, Integer generacionId) {
        Condition conditions = TIPOS_TRANSACCIONES.NOMBRE.eq("Venta Vehículo")
                .and(TRANSACCIONES_FINANCIERAS.ACTIVO.eq((byte) 1));
                
        if (fechaInicio != null && fechaFin != null) {
            conditions = conditions.and(TRANSACCIONES_FINANCIERAS.FECHA.between(fechaInicio, fechaFin));
        }
        
        if (generacionId != null) {
            conditions = conditions.and(TRANSACCIONES_FINANCIERAS.GENERACION_ID.eq(generacionId));
        }
        
        return dsl.select(
                TRANSACCIONES_FINANCIERAS.ANIO.as("anio"),
                TRANSACCIONES_FINANCIERAS.MES.as("mes"),
                DSL.countDistinct(VEHICULOS.ID).as("cantidadVehiculos"),
                DSL.sum(TRANSACCIONES_FINANCIERAS.MONTO).as("totalVentas"),
                DSL.sum(VEHICULOS.INVERSION_TOTAL).as("totalInversion"),
                DSL.sum(TRANSACCIONES_FINANCIERAS.COMISION_EMPLEADO).as("totalComisiones")
            )
            .from(TRANSACCIONES_FINANCIERAS)
            .join(TIPOS_TRANSACCIONES).on(TRANSACCIONES_FINANCIERAS.TIPO_TRANSACCION_ID.eq(TIPOS_TRANSACCIONES.ID))
            .join(VEHICULOS).on(TRANSACCIONES_FINANCIERAS.VEHICULO_ID.eq(VEHICULOS.ID))
            .where(conditions)
            .groupBy(TRANSACCIONES_FINANCIERAS.ANIO, TRANSACCIONES_FINANCIERAS.MES)
            .orderBy(TRANSACCIONES_FINANCIERAS.ANIO.desc(), TRANSACCIONES_FINANCIERAS.MES.desc())
            .fetchMaps();
    }
}
