package com.rodiejacontable.rodiejacontable.repository;

import com.rodiejacontable.database.jooq.routines.SpInsertarRepuestoConGeneracionSinVehiculo;
import com.rodiejacontable.database.jooq.tables.pojos.InventarioRepuestos;
import com.rodiejacontable.database.jooq.enums.*;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static com.rodiejacontable.database.jooq.Tables.INVENTARIO_REPUESTOS;

@Repository
public class InventarioRepuestosRepository {

    private final DSLContext dsl;

    @Autowired
    public InventarioRepuestosRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public InventarioRepuestos save(InventarioRepuestos repuesto) {
        // Establecer valores predeterminados de ubicación si vienen null
        if (repuesto.getBodega() == null) repuesto.setBodega(InventarioRepuestosBodega._0_);
        if (repuesto.getZona() == null) repuesto.setZona(InventarioRepuestosZona._0_);
        if (repuesto.getPared() == null) repuesto.setPared(InventarioRepuestosPared._0_);
        if (repuesto.getMalla() == null) repuesto.setMalla(InventarioRepuestosMalla._0_);
        if (repuesto.getHorizontal() == null) repuesto.setHorizontal(InventarioRepuestosHorizontal._0_);
        if (repuesto.getEstante() == null) repuesto.setEstante(InventarioRepuestosEstante.E1);
        if (repuesto.getNivel() == null) repuesto.setNivel(InventarioRepuestosNivel._0_);
        if (repuesto.getPiso() == null) repuesto.setPiso(InventarioRepuestosPiso.P1_);
        
        // Plastica, Carton y Posicion pueden quedar como null en la DB, pero si requerimos 
        // el default de la BD que sea vacío o nulo, no hacemos nada.
        
        var record = dsl.newRecord(INVENTARIO_REPUESTOS, repuesto);
        dsl.attach(record);
        
        // Excluir campos generados por BD para que no se envíen en el INSERT/UPDATE
        record.changed(INVENTARIO_REPUESTOS.CODIGO_REPUESTO, false);
        record.changed(INVENTARIO_REPUESTOS.CODIGO_UBICACION, false);
        record.changed(INVENTARIO_REPUESTOS.FORMULA_15, false);
        record.changed(INVENTARIO_REPUESTOS.FORMULA_30, false);
        record.changed(INVENTARIO_REPUESTOS.ANIO_REGISTRO, false);
        record.changed(INVENTARIO_REPUESTOS.MES_REGISTRO, false);
        
        if (repuesto.getId() == null) {
            record.insert();
        } else {
            record.update();
        }
        
        // Refrescar el record para cargar los valores generados por los triggers en la BD
        record.refresh();
        
        return record.into(InventarioRepuestos.class);
    }


    public Optional<InventarioRepuestos> findById(Integer id) {
        return dsl.selectFrom(INVENTARIO_REPUESTOS)
                .where(INVENTARIO_REPUESTOS.ID.eq(id))
                .fetchOptionalInto(InventarioRepuestos.class);
    }

    public List<InventarioRepuestos> findByVehiculoOrigenId(Integer vehiculoId) {
        return dsl.selectFrom(INVENTARIO_REPUESTOS)
                .where(INVENTARIO_REPUESTOS.VEHICULO_ORIGEN_ID.eq(vehiculoId))
                .fetchInto(InventarioRepuestos.class);
    }

    public List<InventarioRepuestos> findByCodigoRepuesto(String codigoRepuesto) {
        return dsl.selectFrom(INVENTARIO_REPUESTOS)
                .where(INVENTARIO_REPUESTOS.CODIGO_REPUESTO.like("%" + codigoRepuesto + "%"))
                .fetchInto(InventarioRepuestos.class);
    }

    public List<InventarioRepuestos> findAll() {
        return dsl.selectFrom(INVENTARIO_REPUESTOS)
                .where(INVENTARIO_REPUESTOS.ACTIVO.eq((byte) 1))
                .fetchInto(InventarioRepuestos.class);
    }

    public void delete(Integer id) {
        dsl.update(INVENTARIO_REPUESTOS)
                .set(INVENTARIO_REPUESTOS.ACTIVO, (byte) 0)
                .where(INVENTARIO_REPUESTOS.ID.eq(id))
                .execute();
    }

    /**
     * Llama al stored procedure actualizado con imagen_url y cantidad
     */
    public void insertarRepuestoConGeneracionSinVehiculo(
            Integer generacionId,
            String marcaNombre,
            String parteVehiculo,
            String descripcion,
            BigDecimal precioCosto,
            BigDecimal precioVenta,
            BigDecimal precioMayoreo,
            String bodega,
            String zona,
            String pared,
            String malla,
            String estante,
            String piso,
            String estado,
            String condicion,
            String imagenUrl,
            Integer cantidad) {
        
        SpInsertarRepuestoConGeneracionSinVehiculo sp = new SpInsertarRepuestoConGeneracionSinVehiculo();
        sp.setPGeneracionId(generacionId);
        sp.setPMarcaNombre(marcaNombre);
        sp.setPParteVehiculo(parteVehiculo);
        sp.setPDescripcion(descripcion);
        sp.setPPrecioCosto(precioCosto);
        sp.setPPrecioVenta(precioVenta);
        sp.setPPrecioMayoreo(precioMayoreo);
        
        // Valores por defecto para ubicación física si vienen nulos
        sp.setPBodega(bodega != null ? bodega : InventarioRepuestosBodega._0_.getLiteral());
        sp.setPZona(zona != null ? zona : InventarioRepuestosZona._0_.getLiteral());
        sp.setPPared(pared != null ? pared : InventarioRepuestosPared._0_.getLiteral());
        sp.setPMalla(malla != null ? malla : InventarioRepuestosMalla._0_.getLiteral());
        sp.setPEstante(estante != null ? estante : InventarioRepuestosEstante.E1.getLiteral());
        sp.setPPiso(piso != null ? piso : InventarioRepuestosPiso.P1_.getLiteral());
        
        sp.setPEstado(estado);
        sp.setPCondicion(condicion);
        sp.setPImagenUrl(imagenUrl);
        sp.setPCantidad(org.jooq.types.UInteger.valueOf(cantidad != null ? cantidad : 1));
        
        sp.execute(dsl.configuration());
    }
}