package com.rodiejacontable.rodiejacontable.repository;

import com.rodiejacontable.rodiejacontable.dto.InsPedidoDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class InsPedidosRepuestosRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final RowMapper<InsPedidoDTO> rowMapper = new RowMapper<InsPedidoDTO>() {
        @Override
        public InsPedidoDTO mapRow(ResultSet rs, int rowNum) throws SQLException {
            InsPedidoDTO dto = new InsPedidoDTO();
            dto.setId(rs.getInt("id"));
            dto.setNumeroPedido(rs.getString("numero_pedido"));
            dto.setRepuesto(rs.getString("repuesto"));
            dto.setTipoVehiculo(rs.getString("tipo_vehiculo"));
            dto.setAnioVehiculo(rs.getObject("anio_vehiculo", Integer.class));
            dto.setPrecioCompra(rs.getBigDecimal("precio_compra"));
            dto.setPrecioVenta(rs.getBigDecimal("precio_venta"));
            dto.setEstado(rs.getString("estado"));
            dto.setFechaEntrega(rs.getTimestamp("fecha_entrega") != null ?
                rs.getTimestamp("fecha_entrega").toLocalDateTime() : null);
            dto.setEmpleadoId(rs.getObject("empleado_id", Integer.class));
            dto.setEmpleadoNombre(rs.getString("empleado_nombre"));
            dto.setHoraSolicitud(rs.getTime("hora_solicitud") != null ?
                rs.getTime("hora_solicitud").toLocalTime() : null);
            dto.setFechaSolicitud(rs.getDate("fecha_solicitud") != null ?
                rs.getDate("fecha_solicitud").toLocalDate() : null);
            dto.setNotas(rs.getString("notas"));
            dto.setFechaCreacion(rs.getTimestamp("fecha_creacion").toLocalDateTime());
            dto.setFechaActualizacion(rs.getTimestamp("fecha_actualizacion").toLocalDateTime());
            return dto;
        }
    };

    public List<InsPedidoDTO> findAll() {
        String sql = "SELECT ipr.*, e.nombre as empleado_nombre " +
                     "FROM ins_pedidos_repuestos ipr " +
                     "LEFT JOIN empleados e ON ipr.empleado_id = e.id " +
                     "ORDER BY ipr.fecha_creacion DESC";
        return jdbcTemplate.query(sql, rowMapper);
    }

    public Optional<InsPedidoDTO> findById(Integer id) {
        String sql = "SELECT ipr.*, e.nombre as empleado_nombre " +
                     "FROM ins_pedidos_repuestos ipr " +
                     "LEFT JOIN empleados e ON ipr.empleado_id = e.id " +
                     "WHERE ipr.id = ?";
        List<InsPedidoDTO> results = jdbcTemplate.query(sql, rowMapper, id);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    public InsPedidoDTO save(InsPedidoDTO dto) {
        String sql = "INSERT INTO ins_pedidos_repuestos " +
                     "(numero_pedido, repuesto, tipo_vehiculo, anio_vehiculo, " +
                     "precio_compra, precio_venta, estado, empleado_id, " +
                     "hora_solicitud, fecha_solicitud, notas) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        jdbcTemplate.update(sql,
            dto.getNumeroPedido(),
            dto.getRepuesto(),
            dto.getTipoVehiculo(),
            dto.getAnioVehiculo(),
            dto.getPrecioCompra(),
            dto.getPrecioVenta(),
            dto.getEstado() != null ? dto.getEstado() : "PENDIENTE_ENTREGA",
            dto.getEmpleadoId(),
            dto.getHoraSolicitud(),
            dto.getFechaSolicitud(),
            dto.getNotas()
        );

        // Return the saved record
        String selectSql = "SELECT ipr.*, e.nombre as empleado_nombre " +
                          "FROM ins_pedidos_repuestos ipr " +
                          "LEFT JOIN empleados e ON ipr.empleado_id = e.id " +
                          "WHERE ipr.numero_pedido = ? ORDER BY ipr.id DESC LIMIT 1";
        List<InsPedidoDTO> results = jdbcTemplate.query(selectSql, rowMapper, dto.getNumeroPedido());
        return results.isEmpty() ? null : results.get(0);
    }

    public void update(InsPedidoDTO dto) {
        String sql = "UPDATE ins_pedidos_repuestos SET " +
                     "numero_pedido = ?, repuesto = ?, tipo_vehiculo = ?, anio_vehiculo = ?, " +
                     "precio_compra = ?, precio_venta = ?, estado = ?, empleado_id = ?, " +
                     "hora_solicitud = ?, fecha_solicitud = ?, notas = ? " +
                     "WHERE id = ?";

        jdbcTemplate.update(sql,
            dto.getNumeroPedido(),
            dto.getRepuesto(),
            dto.getTipoVehiculo(),
            dto.getAnioVehiculo(),
            dto.getPrecioCompra(),
            dto.getPrecioVenta(),
            dto.getEstado(),
            dto.getEmpleadoId(),
            dto.getHoraSolicitud(),
            dto.getFechaSolicitud(),
            dto.getNotas(),
            dto.getId()
        );
    }

    public void marcarEntregado(Integer id) {
        String sql = "UPDATE ins_pedidos_repuestos " +
                     "SET estado = 'ENTREGADO', fecha_entrega = NOW() " +
                     "WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    public List<InsPedidoDTO> findByEstado(String estado) {
        String sql = "SELECT ipr.*, e.nombre as empleado_nombre " +
                     "FROM ins_pedidos_repuestos ipr " +
                     "LEFT JOIN empleados e ON ipr.empleado_id = e.id " +
                     "WHERE ipr.estado = ? " +
                     "ORDER BY ipr.fecha_creacion DESC";
        return jdbcTemplate.query(sql, rowMapper, estado);
    }

    public List<InsPedidoDTO> findByEmpleadoId(Integer empleadoId) {
        String sql = "SELECT ipr.*, e.nombre as empleado_nombre " +
                     "FROM ins_pedidos_repuestos ipr " +
                     "LEFT JOIN empleados e ON ipr.empleado_id = e.id " +
                     "WHERE ipr.empleado_id = ? " +
                     "ORDER BY ipr.fecha_creacion DESC";
        return jdbcTemplate.query(sql, rowMapper, empleadoId);
    }

    public List<Map<String, Object>> getComisionesPorEmpleado(Integer anio, Integer mes) {
        String sql = "SELECT " +
                     "e.id AS empleado_id, " +
                     "e.nombre AS empleado, " +
                     "COUNT(ap.id) AS total_pedidos, " +
                     "COALESCE(SUM(ap.total_pedido), 0) AS total_utilidad, " +
                     "COALESCE(SUM(CASE " +
                     "    WHEN ap.comision_calculada IS NOT NULL THEN ap.comision_calculada " +
                     "    WHEN ap.porcentaje_comision IS NOT NULL THEN (ap.total_pedido * ap.porcentaje_comision / 100.0) " +
                     "    WHEN TIME(ap.fecha_creacion) BETWEEN '08:00:00' AND '17:00:00' THEN (ap.total_pedido * 0.03) " +
                     "    ELSE (ap.total_pedido * 0.05) " +
                     "END), 0) AS total_comision, " +
                     "GROUP_CONCAT(COALESCE(ap.numero_pedido, ap.id) ORDER BY ap.fecha_creacion SEPARATOR ', ') AS pedidos " +
                     "FROM audatex_pedidos ap " +
                     "JOIN empleados e ON ap.empleado_id = e.id " +
                     "WHERE (ap.estado IS NULL OR ap.estado != 'Cancelado') ";

        if (anio != null) {
            sql += "AND YEAR(ap.fecha_creacion) = ? ";
        }
        if (mes != null) {
            sql += "AND MONTH(ap.fecha_creacion) = ? ";
        }

        sql += "GROUP BY e.id, e.nombre " +
               "ORDER BY total_comision DESC";

        if (anio != null && mes != null) {
            return jdbcTemplate.queryForList(sql, anio, mes);
        } else if (anio != null) {
            return jdbcTemplate.queryForList(sql, anio);
        } else {
            return jdbcTemplate.queryForList(sql);
        }
    }
}
