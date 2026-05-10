package com.rodiejacontable.rodiejacontable.repository;

import static com.rodiejacontable.database.jooq.Tables.VEHICULOS;

import com.rodiejacontable.database.jooq.enums.VehiculosEstado;
import java.time.LocalDateTime;
import com.rodiejacontable.database.jooq.tables.pojos.Vehiculos;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Optional;
import java.util.Map;
import java.util.stream.Collectors;

import static com.rodiejacontable.database.jooq.Tables.*;

@Repository
public class VehiculosRepository {

    @Autowired
    private DSLContext dsl;
    
    public List<Vehiculos> findAll() {
        return dsl.selectFrom(VEHICULOS)
                 .orderBy(VEHICULOS.FECHA_INGRESO.desc())
                 .fetchInto(Vehiculos.class);
    }
    
    public List<Vehiculos> findByEstado(VehiculosEstado estado) {
        return dsl.selectFrom(VEHICULOS)
                 .where(VEHICULOS.ESTADO.eq(estado))
                 .orderBy(VEHICULOS.FECHA_INGRESO.desc())
                 .fetchInto(Vehiculos.class);
    }
    
    public List<Vehiculos> findByGeneracionId(Integer generacionId) {
        return dsl.selectFrom(VEHICULOS)
                 .where(VEHICULOS.GENERACION_ID.eq(generacionId))
                 .orderBy(VEHICULOS.ANIO.desc())
                 .fetchInto(Vehiculos.class);
    }
    
    public List<Vehiculos> findByAnio(Integer anio) {
        return dsl.selectFrom(VEHICULOS)
                 .where(VEHICULOS.ANIO.eq(anio))
                 .orderBy(VEHICULOS.FECHA_INGRESO.desc())
                 .fetchInto(Vehiculos.class);
    }
    
    public List<Vehiculos> findActivos() {
        return dsl.selectFrom(VEHICULOS)
                 .where(VEHICULOS.ACTIVO.eq((byte) 1))
                 .orderBy(VEHICULOS.FECHA_INGRESO.desc())
                 .fetchInto(Vehiculos.class);
    }
    
    public Optional<Vehiculos> findById(Integer id) {
        return dsl.selectFrom(VEHICULOS)
                 .where(VEHICULOS.ID.eq(id))
                 .fetchOptionalInto(Vehiculos.class);
    }
    
    public Optional<Vehiculos> findByCodigoVehiculo(String codigoVehiculo) {
        return dsl.selectFrom(VEHICULOS)
                 .where(VEHICULOS.CODIGO_VEHICULO.eq(codigoVehiculo))
                 .fetchOptionalInto(Vehiculos.class);
    }
    
    public boolean existsByCodigoVehiculo(String codigoVehiculo) {
        return dsl.selectCount()
                 .from(VEHICULOS)
                 .where(VEHICULOS.CODIGO_VEHICULO.eq(codigoVehiculo))
                 .fetchOne(0, Integer.class) > 0;
    }
    
    public Vehiculos save(Vehiculos vehiculo) {
        // Insertar el vehículo y obtener el ID generado
        Integer id = dsl.insertInto(VEHICULOS)
          .set(VEHICULOS.CODIGO_VEHICULO, vehiculo.getCodigoVehiculo())
          .set(VEHICULOS.GENERACION_ID, vehiculo.getGeneracionId())
          .set(VEHICULOS.TRACCION, vehiculo.getTraccion())
          .set(VEHICULOS.TRANSMISION, vehiculo.getTransmision())
          .set(VEHICULOS.COMBUSTIBLE, vehiculo.getCombustible())
          .set(VEHICULOS.CILINDRAJE, vehiculo.getCilindraje())
          .set(VEHICULOS.IMAGEN_URL, vehiculo.getImagenUrl())
          .set(VEHICULOS.ANIO, vehiculo.getAnio())
          .set(VEHICULOS.PRECIO_COMPRA, vehiculo.getPrecioCompra())
          .set(VEHICULOS.COSTO_GRUA, vehiculo.getCostoGrua() != null ? vehiculo.getCostoGrua() : BigDecimal.ZERO)
          .set(VEHICULOS.COMISIONES, vehiculo.getComisiones() != null ? vehiculo.getComisiones() : BigDecimal.ZERO)
          // No establecer inversion_total ya que se calcula automáticamente en la base de datos
          .set(VEHICULOS.FECHA_INGRESO, vehiculo.getFechaIngreso() != null ? vehiculo.getFechaIngreso() : LocalDate.now())
          .set(VEHICULOS.ESTADO, vehiculo.getEstado() != null ? vehiculo.getEstado() : VehiculosEstado.DISPONIBLE)
          .set(VEHICULOS.PRECIO_VENTA, vehiculo.getPrecioVenta())
          .set(VEHICULOS.FECHA_VENTA, vehiculo.getFechaVenta())
          .set(VEHICULOS.ACTIVO, vehiculo.getActivo() != null ? vehiculo.getActivo() : (byte)1)
          .set(VEHICULOS.NOTAS, vehiculo.getNotas())
          .set(VEHICULOS.FECHA_CREACION, vehiculo.getFechaCreacion() != null ? vehiculo.getFechaCreacion() : LocalDateTime.now())
          .set(VEHICULOS.FECHA_ACTUALIZACION, LocalDateTime.now())
          .returning(VEHICULOS.ID)
          .fetchOne()
          .getValue(VEHICULOS.ID);
        
        // Establecer el ID generado en el objeto vehículo
        vehiculo.setId(id);
        
        // Retornar el vehículo con el ID asignado
        return vehiculo;
    }
    
    public Vehiculos update(Vehiculos vehiculo) {
        // Actualizar todos los campos que el Service configura
        dsl.update(VEHICULOS)
           .set(VEHICULOS.GENERACION_ID, vehiculo.getGeneracionId())
           .set(VEHICULOS.ANIO, vehiculo.getAnio())
           .set(VEHICULOS.TRACCION, vehiculo.getTraccion())
           .set(VEHICULOS.TRANSMISION, vehiculo.getTransmision())
           .set(VEHICULOS.COMBUSTIBLE, vehiculo.getCombustible())
           .set(VEHICULOS.CILINDRAJE, vehiculo.getCilindraje())
           .set(VEHICULOS.PRECIO_COMPRA, vehiculo.getPrecioCompra())
           .set(VEHICULOS.COSTO_GRUA, vehiculo.getCostoGrua())
           .set(VEHICULOS.COMISIONES, vehiculo.getComisiones())
           .set(VEHICULOS.PRECIO_VENTA, vehiculo.getPrecioVenta())
           .set(VEHICULOS.IMAGEN_URL, vehiculo.getImagenUrl())
           .set(VEHICULOS.FECHA_INGRESO, vehiculo.getFechaIngreso())
           .set(VEHICULOS.FECHA_VENTA, vehiculo.getFechaVenta())
           .set(VEHICULOS.ESTADO, vehiculo.getEstado())
           .set(VEHICULOS.NOTAS, vehiculo.getNotas())
           .where(VEHICULOS.ID.eq(vehiculo.getId()))
           .execute();
           
        // Retornar el vehículo actualizado
        return findById(vehiculo.getId()).orElse(null);
    }
    
    public boolean delete(Integer id) {
        return dsl.deleteFrom(VEHICULOS)
                 .where(VEHICULOS.ID.eq(id))
                 .execute() > 0;
    }
    
    public void actualizarEstado(Integer id, VehiculosEstado estado) {
        dsl.update(VEHICULOS)
           .set(VEHICULOS.ESTADO, estado)
           .where(VEHICULOS.ID.eq(id))
           .execute();
    }
    
    /**
     * Obtiene la estructura jerárquica de vehículos agrupados por marca > modelo > generación
     * @return Mapa con la estructura jerárquica
     */
    public Map<String, Object> findHierarchicalVehicles() {
        // Obtener todas las marcas con sus modelos, generaciones y vehículos
        Map<String, Object> result = new LinkedHashMap<>();
        
        // Obtener marcas
        dsl.selectFrom(MARCAS)
           .orderBy(MARCAS.NOMBRE.asc())
           .fetch()
           .forEach(marca -> {
               Map<String, Object> marcaMap = new LinkedHashMap<>();
               result.put(marca.getNombre(), marcaMap);
               
               // Obtener modelos para esta marca
               dsl.selectFrom(MODELOS)
                  .where(MODELOS.MARCA_ID.eq(marca.getId()))
                  .orderBy(MODELOS.NOMBRE.asc())
                  .fetch()
                  .forEach(modelo -> {
                      Map<String, Object> modeloMap = new LinkedHashMap<>();
                      marcaMap.put(modelo.getNombre(), modeloMap);
                      
                      // Obtener generaciones para este modelo
                      dsl.selectFrom(GENERACIONES)
                         .where(GENERACIONES.MODELO_ID.eq(modelo.getId()))
                         .orderBy(GENERACIONES.ANIO_INICIO.asc())
                         .fetch()
                         .forEach(generacion -> {
                             // Obtener vehículos para esta generación
                             List<Vehiculos> vehiculos = dsl.selectFrom(VEHICULOS)
                                                         .where(VEHICULOS.GENERACION_ID.eq(generacion.getId()))
                                                         .orderBy(VEHICULOS.ANIO.asc())
                                                         .fetchInto(Vehiculos.class);
                                                         
                             if (!vehiculos.isEmpty()) {
                                 String key = String.format("%s (%d-%d)", 
                                     generacion.getNombre(), 
                                     generacion.getAnioInicio(), 
                                     generacion.getAnioFin() != null ? generacion.getAnioFin() : "Actual");
                                 modeloMap.put(key, vehiculos);
                             }
                         });
                  });
           });
           
        return result;
    }
    
    public void marcarComoVendido(Integer id, BigDecimal precioVenta, LocalDate fechaVenta) {
        dsl.update(VEHICULOS)
           .set(VEHICULOS.ESTADO, VehiculosEstado.VENDIDO)
           .set(VEHICULOS.PRECIO_VENTA, precioVenta)
           .set(VEHICULOS.FECHA_VENTA, fechaVenta)
           .set(VEHICULOS.FECHA_ACTUALIZACION, java.time.LocalDateTime.now())
           .where(VEHICULOS.ID.eq(id))
           .execute();
    }
}
