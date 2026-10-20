package com.rodiejacontable.rodiejacontable.repository;

import com.rodiejacontable.database.jooq.enums.AudatexPedidosEstado;
import com.rodiejacontable.database.jooq.tables.pojos.AudatexPedidos;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.rodiejacontable.database.jooq.Tables.AUDATEX_PEDIDOS;

@Repository
public class AudatexPedidosRepository {

    @Autowired
    private DSLContext dsl;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public List<Map<String, Object>> findAllWithEmpleado() {
        String sql = "SELECT ap.*, e.nombre AS empleado_nombre " +
                     "FROM audatex_pedidos ap " +
                     "LEFT JOIN empleados e ON ap.empleado_id = e.id " +
                     "ORDER BY ap.fecha_creacion DESC";
        return jdbcTemplate.queryForList(sql);
    }

    public void updateEstadoYEmpleado(Integer id, AudatexPedidosEstado estado, Integer empleadoId, Integer porcentajeComision) {
        int pct = porcentajeComision != null ? porcentajeComision : 3;
        String sql = "UPDATE audatex_pedidos SET estado = ?, empleado_id = ?, porcentaje_comision = ?, comision_calculada = (total_pedido * ? / 100) WHERE id = ?";
        jdbcTemplate.update(sql, estado != null ? estado.getLiteral() : "Entregado", empleadoId, pct, pct, id);
    }

    public void asignarEmpleado(Integer id, Integer empleadoId, Integer porcentajeComision) {
        int pct = porcentajeComision != null ? porcentajeComision : 3;
        String sql = "UPDATE audatex_pedidos SET empleado_id = ?, porcentaje_comision = ?, comision_calculada = (total_pedido * ? / 100) WHERE id = ?";
        jdbcTemplate.update(sql, empleadoId, pct, pct, id);
    }

    public Optional<AudatexPedidos> findById(Integer id) {
        return dsl.selectFrom(AUDATEX_PEDIDOS)
                .where(AUDATEX_PEDIDOS.ID.eq(id))
                .fetchOptionalInto(AudatexPedidos.class);
    }

    public List<AudatexPedidos> findAll() {
        return dsl.selectFrom(AUDATEX_PEDIDOS)
                .orderBy(AUDATEX_PEDIDOS.FECHA_CREACION.desc())
                .fetchInto(AudatexPedidos.class);
    }

    public AudatexPedidos save(AudatexPedidos pedido) {
        return dsl.insertInto(AUDATEX_PEDIDOS)
                .set(AUDATEX_PEDIDOS.NUMERO_PEDIDO, pedido.getNumeroPedido())
                .set(AUDATEX_PEDIDOS.COTIZACION_ID, pedido.getCotizacionId())
                .set(AUDATEX_PEDIDOS.SINIESTRO, pedido.getSiniestro())
                .set(AUDATEX_PEDIDOS.ASEGURADORA, pedido.getAseguradora())
                .set(AUDATEX_PEDIDOS.VEHICULO, pedido.getVehiculo())
                .set(AUDATEX_PEDIDOS.VIN, pedido.getVin())
                .set(AUDATEX_PEDIDOS.TOTAL_PEDIDO, pedido.getTotalPedido())
                .set(AUDATEX_PEDIDOS.ESTADO, pedido.getEstado())
                .set(AUDATEX_PEDIDOS.NOTAS, pedido.getNotas())
                .returning()
                .fetchOneInto(AudatexPedidos.class);
    }

    public void updateEstado(Integer id, AudatexPedidosEstado estado) {
        dsl.update(AUDATEX_PEDIDOS)
                .set(AUDATEX_PEDIDOS.ESTADO, estado)
                .where(AUDATEX_PEDIDOS.ID.eq(id))
                .execute();
    }

    public AudatexPedidos buscarPorWan(String wan) {
        return dsl.selectFrom(AUDATEX_PEDIDOS)
                .where(AUDATEX_PEDIDOS.WAN.eq(wan))
                .fetchOptionalInto(AudatexPedidos.class)
                .orElse(null);
    }

    public AudatexPedidos insertarSync(AudatexPedidos pedido) {
        return dsl.insertInto(AUDATEX_PEDIDOS)
                .set(AUDATEX_PEDIDOS.WAN, pedido.getWan())
                .set(AUDATEX_PEDIDOS.NUMERO_PEDIDO, pedido.getNumeroPedido())
                .set(AUDATEX_PEDIDOS.COTIZACION_ID, pedido.getCotizacionId())
                .set(AUDATEX_PEDIDOS.SINIESTRO, pedido.getSiniestro())
                .set(AUDATEX_PEDIDOS.ASEGURADORA, pedido.getAseguradora())
                .set(AUDATEX_PEDIDOS.TOTAL_PEDIDO, pedido.getTotalPedido())
                .set(AUDATEX_PEDIDOS.ESTADO, pedido.getEstado())
                .set(AUDATEX_PEDIDOS.ULTIMA_VEZ_VISTO, pedido.getUltimaVezVisto())
                .set(AUDATEX_PEDIDOS.DETALLE_JSON, pedido.getDetalleJson())
                .returning()
                .fetchOneInto(AudatexPedidos.class);
    }

    public void actualizarSync(AudatexPedidos pedido) {
        dsl.update(AUDATEX_PEDIDOS)
                .set(AUDATEX_PEDIDOS.NUMERO_PEDIDO, pedido.getNumeroPedido())
                .set(AUDATEX_PEDIDOS.TOTAL_PEDIDO, pedido.getTotalPedido())
                .set(AUDATEX_PEDIDOS.ESTADO, pedido.getEstado())
                .set(AUDATEX_PEDIDOS.ULTIMA_VEZ_VISTO, pedido.getUltimaVezVisto())
                .set(AUDATEX_PEDIDOS.DETALLE_JSON, pedido.getDetalleJson())
                .set(AUDATEX_PEDIDOS.SINIESTRO, pedido.getSiniestro())
                .set(AUDATEX_PEDIDOS.ASEGURADORA, pedido.getAseguradora())
                .set(AUDATEX_PEDIDOS.COTIZACION_ID, pedido.getCotizacionId())
                .where(AUDATEX_PEDIDOS.ID.eq(pedido.getId()))
                .execute();
    }
}
