package com.rodiejacontable.rodiejacontable.service;

import com.rodiejacontable.database.jooq.enums.PagosComisionesEstado;
import com.rodiejacontable.database.jooq.tables.records.PagosComisionesRecord;
import com.rodiejacontable.database.jooq.tables.records.TransaccionesFinancierasRecord;
import com.rodiejacontable.rodiejacontable.repository.EmpleadosRepository;
import com.rodiejacontable.rodiejacontable.repository.PagosComisionesRepository;
import com.rodiejacontable.rodiejacontable.repository.TransaccionesFinancierasRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class PagosComisionesService {

    @Autowired
    private PagosComisionesRepository pagosRepository;

    @Autowired
    private TransaccionesFinancierasRepository transaccionesRepository;

    @Autowired
    private EmpleadosRepository empleadosRepository;

    public List<PagoDTO> findAll() {
        return pagosRepository.findAll().stream()
                .map(pago -> {
                    PagoDTO dto = new PagoDTO();
                    dto.setId(pago.getId());
                    dto.setEmpleadoId(pago.getEmpleadoId());
                    dto.setAnio(pago.getAnio());
                    dto.setMes(pago.getMes());
                    dto.setTotalComisiones(pago.getTotalComisiones());
                    dto.setFechaPago(pago.getFechaPago());
                    dto.setEstado(pago.getEstado().name());
                    dto.setReferenciaPago(pago.getReferenciaPago());
                    dto.setNotas(pago.getNotas());
                    dto.setFechaRegistro(pago.getFechaRegistro());
                    dto.setFechaActualizacion(pago.getFechaActualizacion());
                    return dto;
                })
                .toList();
    }

    public Optional<PagosComisionesRecord> findById(Integer id) {
        return pagosRepository.findAll().stream()
                .filter(pago -> pago.getId().equals(id))
                .findFirst();
    }

    public List<PagoDTO> findByEmpleadoId(Integer empleadoId) {
        return pagosRepository.findByEmpleadoId(empleadoId).stream()
                .map(pago -> {
                    PagoDTO dto = new PagoDTO();
                    dto.setId(pago.getId());
                    dto.setEmpleadoId(pago.getEmpleadoId());
                    dto.setAnio(pago.getAnio());
                    dto.setMes(pago.getMes());
                    dto.setTotalComisiones(pago.getTotalComisiones());
                    dto.setFechaPago(pago.getFechaPago());
                    dto.setEstado(pago.getEstado().name());
                    dto.setReferenciaPago(pago.getReferenciaPago());
                    dto.setNotas(pago.getNotas());
                    dto.setFechaRegistro(pago.getFechaRegistro());
                    dto.setFechaActualizacion(pago.getFechaActualizacion());
                    return dto;
                })
                .toList();
    }

    public List<PagoDTO> findByPeriodo(Integer anio, Integer mes) {
        List<PagosComisionesRecord> pagos = pagosRepository.findByPeriodo(anio, mes);
        return pagos.stream()
                .map(pago -> {
                    PagoDTO dto = new PagoDTO();
                    dto.setId(pago.getId());
                    dto.setEmpleadoId(pago.getEmpleadoId());
                    dto.setAnio(pago.getAnio());
                    dto.setMes(pago.getMes());
                    dto.setTotalComisiones(pago.getTotalComisiones());
                    dto.setFechaPago(pago.getFechaPago());
                    dto.setEstado(pago.getEstado().name());
                    dto.setReferenciaPago(pago.getReferenciaPago());
                    dto.setNotas(pago.getNotas());
                    dto.setFechaRegistro(pago.getFechaRegistro());
                    dto.setFechaActualizacion(pago.getFechaActualizacion());
                    return dto;
                })
                .toList();
    }

    public List<PagoDTO> findByEstado(String estado) {
        return pagosRepository.findByEstado(estado).stream()
                .map(pago -> {
                    PagoDTO dto = new PagoDTO();
                    dto.setId(pago.getId());
                    dto.setEmpleadoId(pago.getEmpleadoId());
                    dto.setAnio(pago.getAnio());
                    dto.setMes(pago.getMes());
                    dto.setTotalComisiones(pago.getTotalComisiones());
                    dto.setFechaPago(pago.getFechaPago());
                    dto.setEstado(pago.getEstado().name());
                    dto.setReferenciaPago(pago.getReferenciaPago());
                    dto.setNotas(pago.getNotas());
                    dto.setFechaRegistro(pago.getFechaRegistro());
                    dto.setFechaActualizacion(pago.getFechaActualizacion());
                    return dto;
                })
                .toList();
    }

    public List<ComisionesPendientesDTO> listarComisionesPendientes(Integer anio, Integer mes) {
        // Obtener todas las transacciones con comisiones del período
        List<TransaccionesFinancierasRecord> transacciones = transaccionesRepository.findComisionesByPeriodo(anio, mes);
        
        // Agrupar por empleado y calcular totales
        return transacciones.stream()
                .filter(tf -> tf.getComisionEmpleado() != null && tf.getComisionEmpleado().compareTo(BigDecimal.ZERO) > 0)
                .filter(tf -> tf.getEmpleadoId() != null)
                .collect(java.util.stream.Collectors.groupingBy(
                        TransaccionesFinancierasRecord::getEmpleadoId,
                        java.util.stream.Collectors.collectingAndThen(
                                java.util.stream.Collectors.toList(),
                                listaTransacciones -> {
                                    BigDecimal totalComisiones = listaTransacciones.stream()
                                            .map(TransaccionesFinancierasRecord::getComisionEmpleado)
                                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                                    
                                    BigDecimal totalVentas = listaTransacciones.stream()
                                            .map(TransaccionesFinancierasRecord::getMonto)
                                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                                    
                                    BigDecimal promedioVenta = totalVentas.divide(
                                            BigDecimal.valueOf(listaTransacciones.size()), 
                                            2, 
                                            java.math.RoundingMode.HALF_UP);
                                    
                                    BigDecimal porcentajeComision = totalVentas.compareTo(BigDecimal.ZERO) > 0 
                                            ? totalComisiones.divide(totalVentas, 4, java.math.RoundingMode.HALF_UP)
                                                    .multiply(BigDecimal.valueOf(100))
                                                    .setScale(2, java.math.RoundingMode.HALF_UP)
                                            : BigDecimal.ZERO;
                                    
                                    // Verificar si ya existe pago para este empleado en este período
                                    boolean pagoExistente = pagosRepository.existsByEmpleadoIdAndPeriodo(
                                            listaTransacciones.get(0).getEmpleadoId(), anio, mes);
                                    
                                    if (pagoExistente) {
                                        return null; // Excluir empleados con pago ya registrado
                                    }
                                    
                                    // Obtener nombre del empleado (asumimos que tenemos acceso a este dato)
                                    String nombreEmpleado = obtenerNombreEmpleado(listaTransacciones.get(0).getEmpleadoId());
                                    
                                    return new ComisionesPendientesDTO(
                                            listaTransacciones.get(0).getEmpleadoId(),
                                            nombreEmpleado,
                                            totalComisiones,
                                            listaTransacciones.size(),
                                            promedioVenta,
                                            porcentajeComision
                                    );
                                }
                        )
                ))
                .values()
                .stream()
                .filter(dto -> dto != null)
                .sorted((a, b) -> b.getTotalComisionesPendientes().compareTo(a.getTotalComisionesPendientes()))
                .toList();
    }

    public PagoComisionesDTO registrarPagoComisiones(Integer empleadoId, Integer anio, Integer mes, 
                                                  LocalDate fechaPago, String referencia, String notas) {
        try {
            // Verificar si ya existe un pago para este empleado en este período
            if (pagosRepository.existsByEmpleadoIdAndPeriodo(empleadoId, anio, mes)) {
                throw new RuntimeException("Ya existe un pago de comisiones registrado para este empleado en este período");
            }

            // Calcular total de comisiones del empleado en el período
            List<TransaccionesFinancierasRecord> transacciones = transaccionesRepository.findComisionesByEmpleadoAndPeriodo(
                    empleadoId, anio, mes);
            
            System.out.println("Transacciones encontradas para empleado " + empleadoId + ": " + transacciones.size());
            
            BigDecimal totalComisiones = transacciones.stream()
                    .map(TransaccionesFinancierasRecord::getComisionEmpleado)
                    .filter(comision -> comision != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            System.out.println("Total comisiones calculado: " + totalComisiones);

            if (totalComisiones.compareTo(BigDecimal.ZERO) == 0) {
                throw new RuntimeException("No hay comisiones pendientes para este empleado en este período. Transacciones encontradas: " + transacciones.size());
            }

            // Crear registro de pago
            PagosComisionesRecord nuevoPago = new PagosComisionesRecord();
            nuevoPago.setEmpleadoId(empleadoId);
            nuevoPago.setAnio(anio);
            nuevoPago.setMes(mes);
            nuevoPago.setTotalComisiones(totalComisiones);
            nuevoPago.setFechaPago(fechaPago);
            nuevoPago.setEstado(PagosComisionesEstado.PAGADO);
            nuevoPago.setReferenciaPago(referencia);
            nuevoPago.setNotas(notas);

            PagosComisionesRecord pagoGuardado = pagosRepository.save(nuevoPago);

            return new PagoComisionesDTO(
                    pagoGuardado.getId(),
                    "Pago registrado exitosamente",
                    totalComisiones
            );
        } catch (Exception e) {
            System.err.println("Error en registrarPagoComisiones: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error al registrar pago: " + e.getMessage());
        }
    }

    public PagoDTO updateEstado(Integer id, String estado) {
        Optional<PagosComisionesRecord> pagoOpt = findById(id);
        if (pagoOpt.isPresent()) {
            PagosComisionesRecord pago = pagoOpt.get();
            // Convertir string a enum
            PagosComisionesEstado estadoEnum = PagosComisionesEstado.valueOf(estado.toUpperCase());
            pago.setEstado(estadoEnum);
            PagosComisionesRecord pagoActualizado = pagosRepository.save(pago);
            
            // Convertir a DTO
            PagoDTO dto = new PagoDTO();
            dto.setId(pagoActualizado.getId());
            dto.setEmpleadoId(pagoActualizado.getEmpleadoId());
            dto.setAnio(pagoActualizado.getAnio());
            dto.setMes(pagoActualizado.getMes());
            dto.setTotalComisiones(pagoActualizado.getTotalComisiones());
            dto.setFechaPago(pagoActualizado.getFechaPago());
            dto.setEstado(pagoActualizado.getEstado().name());
            dto.setReferenciaPago(pagoActualizado.getReferenciaPago());
            dto.setNotas(pagoActualizado.getNotas());
            dto.setFechaRegistro(pagoActualizado.getFechaRegistro());
            dto.setFechaActualizacion(pagoActualizado.getFechaActualizacion());
            
            return dto;
        }
        throw new RuntimeException("Pago no encontrado con ID: " + id);
    }

    public void deletePago(Integer id) {
        if (!findById(id).isPresent()) {
            throw new RuntimeException("Pago no encontrado con ID: " + id);
        }
        pagosRepository.deleteById(id);
    }

    // Métodos auxiliares
    private String obtenerNombreEmpleado(Integer empleadoId) {
        try {
            var empleado = empleadosRepository.findById(empleadoId);
            if (empleado.isPresent()) {
                return empleado.get().getNombre();
            } else {
                return "Empleado " + empleadoId;
            }
        } catch (Exception e) {
            return "Empleado " + empleadoId;
        }
    }

    // DTOs
    public static class PagoDTO {
        private Integer id;
        private Integer empleadoId;
        private Integer anio;
        private Integer mes;
        private BigDecimal totalComisiones;
        private LocalDate fechaPago;
        private String estado;
        private String referenciaPago;
        private String notas;
        private java.time.LocalDateTime fechaRegistro;
        private java.time.LocalDateTime fechaActualizacion;

        // Constructor por defecto para Jackson
        public PagoDTO() {}

        // Getters y Setters
        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }
        
        public Integer getEmpleadoId() { return empleadoId; }
        public void setEmpleadoId(Integer empleadoId) { this.empleadoId = empleadoId; }
        
        public Integer getAnio() { return anio; }
        public void setAnio(Integer anio) { this.anio = anio; }
        
        public Integer getMes() { return mes; }
        public void setMes(Integer mes) { this.mes = mes; }
        
        public BigDecimal getTotalComisiones() { return totalComisiones; }
        public void setTotalComisiones(BigDecimal totalComisiones) { this.totalComisiones = totalComisiones; }
        
        public LocalDate getFechaPago() { return fechaPago; }
        public void setFechaPago(LocalDate fechaPago) { this.fechaPago = fechaPago; }
        
        public String getEstado() { return estado; }
        public void setEstado(String estado) { this.estado = estado; }
        
        public String getReferenciaPago() { return referenciaPago; }
        public void setReferenciaPago(String referenciaPago) { this.referenciaPago = referenciaPago; }
        
        public String getNotas() { return notas; }
        public void setNotas(String notas) { this.notas = notas; }
        
        public java.time.LocalDateTime getFechaRegistro() { return fechaRegistro; }
        public void setFechaRegistro(java.time.LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
        
        public java.time.LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
        public void setFechaActualizacion(java.time.LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }
    }

    public static class ComisionesPendientesDTO {
        private Integer empleadoId;
        private String nombreEmpleado;
        private BigDecimal totalComisionesPendientes;
        private Integer cantidadTransacciones;
        private BigDecimal promedioVenta;
        private BigDecimal porcentajeComision;

        // Constructor por defecto para Jackson
        public ComisionesPendientesDTO() {}

        public ComisionesPendientesDTO(Integer empleadoId, String nombreEmpleado, 
                                     BigDecimal totalComisionesPendientes, Integer cantidadTransacciones,
                                     BigDecimal promedioVenta, BigDecimal porcentajeComision) {
            this.empleadoId = empleadoId;
            this.nombreEmpleado = nombreEmpleado;
            this.totalComisionesPendientes = totalComisionesPendientes;
            this.cantidadTransacciones = cantidadTransacciones;
            this.promedioVenta = promedioVenta;
            this.porcentajeComision = porcentajeComision;
        }

        // Getters y Setters
        public Integer getEmpleadoId() { return empleadoId; }
        public void setEmpleadoId(Integer empleadoId) { this.empleadoId = empleadoId; }
        
        public String getNombreEmpleado() { return nombreEmpleado; }
        public void setNombreEmpleado(String nombreEmpleado) { this.nombreEmpleado = nombreEmpleado; }
        
        public BigDecimal getTotalComisionesPendientes() { return totalComisionesPendientes; }
        public void setTotalComisionesPendientes(BigDecimal totalComisionesPendientes) { this.totalComisionesPendientes = totalComisionesPendientes; }
        
        public Integer getCantidadTransacciones() { return cantidadTransacciones; }
        public void setCantidadTransacciones(Integer cantidadTransacciones) { this.cantidadTransacciones = cantidadTransacciones; }
        
        public BigDecimal getPromedioVenta() { return promedioVenta; }
        public void setPromedioVenta(BigDecimal promedioVenta) { this.promedioVenta = promedioVenta; }
        
        public BigDecimal getPorcentajeComision() { return porcentajeComision; }
        public void setPorcentajeComision(BigDecimal porcentajeComision) { this.porcentajeComision = porcentajeComision; }
    }

    public static class PagoComisionesDTO {
        private Integer pagoId;
        private String mensaje;
        private BigDecimal totalPagado;

        // Constructor por defecto para Jackson
        public PagoComisionesDTO() {}

        public PagoComisionesDTO(Integer pagoId, String mensaje, BigDecimal totalPagado) {
            this.pagoId = pagoId;
            this.mensaje = mensaje;
            this.totalPagado = totalPagado;
        }

        // Getters y Setters
        public Integer getPagoId() { return pagoId; }
        public void setPagoId(Integer pagoId) { this.pagoId = pagoId; }
        
        public String getMensaje() { return mensaje; }
        public void setMensaje(String mensaje) { this.mensaje = mensaje; }
        
        public BigDecimal getTotalPagado() { return totalPagado; }
        public void setTotalPagado(BigDecimal totalPagado) { this.totalPagado = totalPagado; }
    }
}
