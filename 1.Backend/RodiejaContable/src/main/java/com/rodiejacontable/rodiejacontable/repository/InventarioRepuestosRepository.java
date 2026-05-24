package com.rodiejacontable.rodiejacontable.repository;

import com.rodiejacontable.database.jooq.routines.SpInsertarRepuestoConGeneracionSinVehiculo;
import com.rodiejacontable.database.jooq.tables.pojos.InventarioRepuestos;
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
                .fetchInto(InventarioRepuestos.class);
    }

    public void delete(Integer id) {
        dsl.deleteFrom(INVENTARIO_REPUESTOS)
                .where(INVENTARIO_REPUESTOS.ID.eq(id))
                .execute();
    }

    /**
     * Llama al stored procedure actualizado con imagen_url
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
            String imagenUrl) {
        
        SpInsertarRepuestoConGeneracionSinVehiculo sp = new SpInsertarRepuestoConGeneracionSinVehiculo();
        sp.setPGeneracionId(generacionId);
        sp.setPMarcaNombre(marcaNombre);
        sp.setPParteVehiculo(parteVehiculo);
        sp.setPDescripcion(descripcion);
        sp.setPPrecioCosto(precioCosto);
        sp.setPPrecioVenta(precioVenta);
        sp.setPPrecioMayoreo(precioMayoreo);
        sp.setPBodega(bodega);
        sp.setPZona(zona);
        sp.setPPared(pared);
        sp.setPMalla(malla);
        sp.setPEstante(estante);
        sp.setPPiso(piso);
        sp.setPEstado(estado);
        sp.setPCondicion(condicion);
        sp.setPImagenUrl(imagenUrl); // ✅ Nuevo parámetro
        
        sp.execute(dsl.configuration());
    }
}