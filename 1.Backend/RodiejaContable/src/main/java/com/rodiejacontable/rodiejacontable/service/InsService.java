package com.rodiejacontable.rodiejacontable.service;

import com.rodiejacontable.rodiejacontable.dto.InsPedidoDTO;
import com.rodiejacontable.rodiejacontable.repository.InsPedidosRepuestosRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class InsService {

    @Autowired
    private InsPedidosRepuestosRepository repository;

    /**
     * Calcular comisión basado en la hora de solicitud
     * Horario laboral (7:30 AM - 5:00 PM) = 3%
     * Fuera de horario = 5%
     */
    public BigDecimal calcularComision(BigDecimal utilidad, LocalTime horaSolicitud) {
        if (utilidad == null || utilidad.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        if (horaSolicitud == null) {
            // Si no hay hora, asumir horario laboral (3%)
            return utilidad.multiply(new BigDecimal("0.03")).setScale(2, RoundingMode.HALF_UP);
        }

        // Horario laboral: 7:30 AM - 5:00 PM
        LocalTime inicioLaboral = LocalTime.of(7, 30);
        LocalTime finLaboral = LocalTime.of(17, 0);

        if (!horaSolicitud.isBefore(inicioLaboral) && horaSolicitud.isBefore(finLaboral)) {
            // Dentro de horario laboral: 3%
            return utilidad.multiply(new BigDecimal("0.03")).setScale(2, RoundingMode.HALF_UP);
        } else {
            // Fuera de horario laboral: 5%
            return utilidad.multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP);
        }
    }

    public List<InsPedidoDTO> obtenerTodosLosPedidos() {
        return repository.findAll();
    }

    public Optional<InsPedidoDTO> obtenerPedidoPorId(Integer id) {
        return repository.findById(id);
    }

    @Transactional
    public InsPedidoDTO crearPedido(InsPedidoDTO dto) {
        if (dto.getEstado() == null) {
            dto.setEstado("PENDIENTE_ENTREGA");
        }
        return repository.save(dto);
    }

    @Transactional
    public InsPedidoDTO actualizarPedido(InsPedidoDTO dto) {
        repository.update(dto);
        return repository.findById(dto.getId()).orElse(null);
    }

    @Transactional
    public InsPedidoDTO marcarComoEntregado(Integer id) {
        repository.marcarEntregado(id);
        return repository.findById(id).orElse(null);
    }

    public List<InsPedidoDTO> obtenerPedidosPorEstado(String estado) {
        return repository.findByEstado(estado);
    }

    public List<InsPedidoDTO> obtenerPedidosPorEmpleado(Integer empleadoId) {
        return repository.findByEmpleadoId(empleadoId);
    }

    public List<Map<String, Object>> obtenerComisionesPorEmpleado(Integer anio, Integer mes) {
        return repository.getComisionesPorEmpleado(anio, mes);
    }

    /**
     * Calcular estadísticas generales de comisiones
     */
    public Map<String, Object> obtenerEstadisticasGenerales(Integer anio, Integer mes) {
        List<Map<String, Object>> comisiones = obtenerComisionesPorEmpleado(anio, mes);

        BigDecimal totalComisiones = BigDecimal.ZERO;
        BigDecimal totalUtilidad = BigDecimal.ZERO;
        int totalPedidos = 0;

        for (Map<String, Object> comision : comisiones) {
            BigDecimal comisionEmp = (BigDecimal) comision.get("total_comision");
            BigDecimal utilidad = (BigDecimal) comision.get("total_utilidad");
            Long pedidos = ((Number) comision.get("total_pedidos")).longValue();

            if (comisionEmp != null) {
                totalComisiones = totalComisiones.add(comisionEmp);
            }
            if (utilidad != null) {
                totalUtilidad = totalUtilidad.add(utilidad);
            }
            totalPedidos += pedidos;
        }

        return Map.of(
            "totalComisiones", totalComisiones,
            "totalUtilidad", totalUtilidad,
            "totalPedidos", totalPedidos,
            "totalEmpleados", comisiones.size()
        );
    }
}
