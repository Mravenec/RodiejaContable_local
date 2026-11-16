package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.database.jooq.tables.pojos.Vehiculos;
import com.rodiejacontable.database.jooq.tables.pojos.VistaResumenGeneraciones;
import com.rodiejacontable.database.jooq.tables.pojos.VistaTransaccionesCompletas;
import com.rodiejacontable.database.jooq.tables.pojos.VistaVehiculosCompleta;
import com.rodiejacontable.rodiejacontable.repository.VehiculosRepository;
import com.rodiejacontable.rodiejacontable.repository.VistaResumenGeneracionesRepository;
import com.rodiejacontable.rodiejacontable.repository.VistaTransaccionesCompletasRepository;
import com.rodiejacontable.rodiejacontable.repository.VistaVehiculosCompletaRepository;
import com.rodiejacontable.rodiejacontable.service.reportes.ReporteExcelGeneratorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;

@RestController
@RequestMapping("/api/reportes/exportar")
public class ReportesExcelExportController {

    private static final Logger logger = LoggerFactory.getLogger(ReportesExcelExportController.class);
    private static final MediaType EXCEL_MEDIA_TYPE = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    @Autowired
    private ReporteExcelGeneratorService excelGeneratorService;

    @Autowired
    private VistaTransaccionesCompletasRepository transaccionesRepository;

    @Autowired
    private VehiculosRepository vehiculosRepository;

    @Autowired
    private VistaVehiculosCompletaRepository vistaVehiculosCompletaRepository;

    @Autowired
    private VistaResumenGeneracionesRepository generacionesRepository;

    /**
     * Exporta el Reporte de Vehículos en Excel (3 hojas: Resumen Financiero + Vehículos Vendidos + Detalle Movimientos).
     */
    @GetMapping("/vehiculos")
    public ResponseEntity<byte[]> exportarExcelVehiculos(
            @RequestParam(value = "fechaInicio", required = false) String fechaInicioStr,
            @RequestParam(value = "fechaFin", required = false) String fechaFinStr,
            @RequestParam(value = "periodo", required = false) String periodoStr,
            @RequestParam(value = "todos", required = false, defaultValue = "false") Boolean todos
    ) {
        return procesarExportacionVehiculos(null, fechaInicioStr, fechaFinStr, periodoStr, todos);
    }

    /**
     * Exporta el Reporte de Vehículos en Excel permitiendo enviar desde la UI
     * la lista exacta de vehículos vendidos filtrados.
     */
    @PostMapping("/vehiculos")
    public ResponseEntity<byte[]> exportarExcelVehiculosDesdeFrontend(
            @RequestBody(required = false) Map<String, Object> payload,
            @RequestParam(value = "fechaInicio", required = false) String fechaInicioStr,
            @RequestParam(value = "fechaFin", required = false) String fechaFinStr,
            @RequestParam(value = "periodo", required = false) String periodoStr,
            @RequestParam(value = "todos", required = false, defaultValue = "false") Boolean todos
    ) {
        return procesarExportacionVehiculos(payload, fechaInicioStr, fechaFinStr, periodoStr, todos);
    }

    private ResponseEntity<byte[]> procesarExportacionVehiculos(
            Map<String, Object> payload,
            String fechaInicioStr,
            String fechaFinStr,
            String periodoStr,
            Boolean todos
    ) {
        try {
            boolean esTodos = Boolean.TRUE.equals(todos)
                    || (payload != null && Boolean.TRUE.equals(payload.get("todos")))
                    || (payload != null && "true".equalsIgnoreCase(String.valueOf(payload.get("todos"))));

            LocalDate inicio = null;
            LocalDate fin = null;
            String periodoNombre;
            String filename;

            List<VistaTransaccionesCompletas> transacciones;

            if (esTodos) {
                periodoNombre = "Histórico Completo";
                filename = "Reporte_Vehiculos_Historico_Completo.xlsx";
                transacciones = transaccionesRepository.findAll();
            } else {
                if (fechaInicioStr != null && !fechaInicioStr.isBlank() && fechaFinStr != null && !fechaFinStr.isBlank()) {
                    inicio = LocalDate.parse(fechaInicioStr.trim());
                    fin = LocalDate.parse(fechaFinStr.trim());
                } else if (periodoStr != null && !periodoStr.isBlank()) {
                    YearMonth ym = YearMonth.parse(periodoStr.trim());
                    inicio = ym.atDay(1);
                    fin = ym.atEndOfMonth();
                } else {
                    YearMonth actual = YearMonth.now();
                    inicio = actual.atDay(1);
                    fin = actual.atEndOfMonth();
                }

                boolean esAnioCompleto = (inicio.getMonthValue() == 1 && inicio.getDayOfMonth() == 1
                        && fin.getMonthValue() == 12 && fin.getDayOfMonth() == 31
                        && inicio.getYear() == fin.getYear());

                if (esAnioCompleto) {
                    periodoNombre = "Año " + inicio.getYear();
                    filename = "Reporte_Vehiculos_Anio_" + inicio.getYear() + ".xlsx";
                } else {
                    periodoNombre = formatPeriodoNombre(inicio, fin);
                    filename = "Reporte_Vehiculos_" + formatMesAnioArchivo(inicio) + ".xlsx";
                }
                transacciones = transaccionesRepository.findByFechaBetween(inicio, fin);
            }

            List<VistaTransaccionesCompletas> vehiculosMovimientos = new ArrayList<>();

            // 1. Obtener vehículos que NO sean desarmados
            List<Vehiculos> vehiculosNoDesarmados = vehiculosRepository.findAll();
            Set<String> vehiculosCodigosValidos = new HashSet<>();
            for (Vehiculos v : vehiculosNoDesarmados) {
                if (v.getCodigoVehiculo() != null && !v.getCodigoVehiculo().trim().isEmpty()) {
                    vehiculosCodigosValidos.add(v.getCodigoVehiculo().trim().toUpperCase());
                }
            }

            double ingresos = 0.0;
            double egresos = 0.0;
            double comisiones = 0.0;

            for (VistaTransaccionesCompletas t : transacciones) {
                String codVeh = t.getCodigoVehiculo() != null ? t.getCodigoVehiculo().trim().toUpperCase() : "";
                if (codVeh.isEmpty() || !vehiculosCodigosValidos.contains(codVeh)) {
                    continue; // EXCLUIR transacciones de repuestos o vehículos DESARMADOS
                }

                vehiculosMovimientos.add(t);

                double monto = t.getMonto() != null ? t.getMonto().doubleValue() : 0.0;
                boolean isIngreso = (t.getCategoria() != null)
                        ? "INGRESO".equalsIgnoreCase(t.getCategoria().name())
                        : ("INGRESO".equalsIgnoreCase(t.getTipoTransaccion()) || "VENTA".equalsIgnoreCase(t.getTipoTransaccion()));

                boolean comPagada = t.getComisionPagada() != null && t.getComisionPagada() > 0;
                double com = (comPagada && t.getComisionEmpleado() != null) ? t.getComisionEmpleado().doubleValue() : 0.0;

                if (isIngreso) {
                    ingresos += monto;
                } else {
                    egresos += monto;
                }
                comisiones += com;
            }

            double balanceNeto = ingresos - egresos - comisiones;

            // 2. Determinar lista de vehículos vendidos
            List<?> vehiculosVendidosAExportar;
            if (payload != null && payload.get("vehiculosVendidos") instanceof List<?> list && !list.isEmpty()) {
                vehiculosVendidosAExportar = list;
            } else {
                List<VistaVehiculosCompleta> todosVehiculos = vistaVehiculosCompletaRepository.findAll();
                List<VistaVehiculosCompleta> vendidosPeriodo = new ArrayList<>();
                for (VistaVehiculosCompleta v : todosVehiculos) {
                    if (v.getEstado() != null && "VENDIDO".equalsIgnoreCase(v.getEstado().name())) {
                        if (esTodos) {
                            vendidosPeriodo.add(v);
                        } else {
                            LocalDate fVenta = v.getFechaVenta();
                            if (fVenta != null) {
                                if (inicio != null && fin != null && !fVenta.isBefore(inicio) && !fVenta.isAfter(fin)) {
                                    vendidosPeriodo.add(v);
                                }
                            } else {
                                boolean tieneTrxEnPeriodo = transacciones.stream().anyMatch(t ->
                                        t.getCodigoVehiculo() != null && t.getCodigoVehiculo().equalsIgnoreCase(v.getCodigoVehiculo())
                                );
                                if (tieneTrxEnPeriodo) {
                                    vendidosPeriodo.add(v);
                                }
                            }
                        }
                    }
                }
                vehiculosVendidosAExportar = vendidosPeriodo;
            }

            byte[] bytes = excelGeneratorService.generarExcelVehiculos(
                    periodoNombre, ingresos, egresos, comisiones, balanceNeto, vehiculosMovimientos, vehiculosVendidosAExportar
            );

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(EXCEL_MEDIA_TYPE)
                    .body(bytes);

        } catch (Exception e) {
            logger.error("Error al exportar Excel de vehículos: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Exporta el Reporte de Repuestos en Excel (Resumen Financiero + Detalle Movimientos).
     */
    @GetMapping("/repuestos")
    public ResponseEntity<byte[]> exportarExcelRepuestos(
            @RequestParam(value = "fechaInicio", required = false) String fechaInicioStr,
            @RequestParam(value = "fechaFin", required = false) String fechaFinStr,
            @RequestParam(value = "periodo", required = false) String periodoStr,
            @RequestParam(value = "todos", required = false, defaultValue = "false") Boolean todos
    ) {
        return procesarExportacionRepuestos(null, fechaInicioStr, fechaFinStr, periodoStr, todos);
    }

    @PostMapping("/repuestos")
    public ResponseEntity<byte[]> exportarExcelRepuestosPost(
            @RequestParam(value = "todos", required = false, defaultValue = "false") Boolean todos,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        String fechaInicioStr = payload != null ? (String) payload.get("fechaInicio") : null;
        String fechaFinStr = payload != null ? (String) payload.get("fechaFin") : null;
        String periodoStr = payload != null ? (String) payload.get("periodo") : null;
        return procesarExportacionRepuestos(payload, fechaInicioStr, fechaFinStr, periodoStr, todos);
    }

    private ResponseEntity<byte[]> procesarExportacionRepuestos(
            Map<String, Object> payload,
            String fechaInicioStr,
            String fechaFinStr,
            String periodoStr,
            Boolean todos
    ) {
        try {
            boolean esTodos = Boolean.TRUE.equals(todos)
                    || (payload != null && Boolean.TRUE.equals(payload.get("todos")))
                    || (payload != null && "true".equalsIgnoreCase(String.valueOf(payload.get("todos"))));

            LocalDate inicio = null;
            LocalDate fin = null;
            String periodoNombre;
            String filename;
            List<VistaTransaccionesCompletas> transacciones;

            if (esTodos) {
                periodoNombre = "Histórico Completo";
                filename = "Reporte_Repuestos_Historico_Completo.xlsx";
                transacciones = transaccionesRepository.findAll();
            } else {
                if (fechaInicioStr != null && !fechaInicioStr.isBlank() && fechaFinStr != null && !fechaFinStr.isBlank()) {
                    inicio = LocalDate.parse(fechaInicioStr.trim());
                    fin = LocalDate.parse(fechaFinStr.trim());
                } else if (periodoStr != null && !periodoStr.isBlank()) {
                    YearMonth ym = YearMonth.parse(periodoStr.trim());
                    inicio = ym.atDay(1);
                    fin = ym.atEndOfMonth();
                } else {
                    YearMonth actual = YearMonth.now();
                    inicio = actual.atDay(1);
                    fin = actual.atEndOfMonth();
                }

                boolean esAnioCompleto = (inicio.getMonthValue() == 1 && inicio.getDayOfMonth() == 1
                        && fin.getMonthValue() == 12 && fin.getDayOfMonth() == 31
                        && inicio.getYear() == fin.getYear());

                if (esAnioCompleto) {
                    periodoNombre = "Año " + inicio.getYear();
                    filename = "Reporte_Repuestos_Anio_" + inicio.getYear() + ".xlsx";
                } else {
                    periodoNombre = formatPeriodoNombre(inicio, fin);
                    filename = "Reporte_Repuestos_" + formatMesAnioArchivo(inicio) + ".xlsx";
                }
                transacciones = transaccionesRepository.findByFechaBetween(inicio, fin);
            }

            List<VistaTransaccionesCompletas> repuestosMovimientos = new ArrayList<>();

            double ingresos = 0.0;
            double egresos = 0.0;
            double comisiones = 0.0;

            for (VistaTransaccionesCompletas t : transacciones) {
                String tipoLower = (t.getTipoTransaccion() != null ? t.getTipoTransaccion() : "").toLowerCase();
                boolean esMantenimiento = tipoLower.contains("mantenimiento");
                boolean esServiciosPublicos = tipoLower.contains("servicio") && (tipoLower.contains("public") || tipoLower.contains("públic"));
                boolean esSalario = tipoLower.contains("salario");
                boolean esGastoOperativo = esMantenimiento || esServiciosPublicos || esSalario;

                boolean esRepuesto = tipoLower.contains("repuesto") || tipoLower.contains("mayoreo")
                        || (t.getCodigoRepuesto() != null && !tipoLower.contains("veh"));

                if (!esRepuesto && !esGastoOperativo) {
                    continue;
                }

                repuestosMovimientos.add(t);

                double monto = t.getMonto() != null ? t.getMonto().doubleValue() : 0.0;
                String cat = t.getCategoria() != null ? t.getCategoria().name().toUpperCase() : "";

                boolean comPagada = t.getComisionPagada() != null && t.getComisionPagada() > 0;
                double com = (comPagada && t.getComisionEmpleado() != null) ? t.getComisionEmpleado().doubleValue() : 0.0;

                if ("INGRESO".equals(cat) || "VENTA".equals(cat)) {
                    ingresos += monto;
                } else if ("EGRESO".equals(cat) || "GASTO".equals(cat)) {
                    egresos += monto;
                }
                comisiones += com;
            }

            double balanceNeto = ingresos - egresos - comisiones;

            byte[] bytes = excelGeneratorService.generarExcelRepuestos(
                    periodoNombre, ingresos, egresos, comisiones, balanceNeto, repuestosMovimientos
            );

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(EXCEL_MEDIA_TYPE)
                    .body(bytes);

        } catch (Exception e) {
            logger.error("Error al exportar Excel de repuestos: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Exporta el Reporte de Ventas por Empleado en Excel (Resumen Empleados + Detalle Ventas).
     */
    @GetMapping("/ventas")
    public ResponseEntity<byte[]> exportarExcelVentas(
            @RequestParam(value = "fechaInicio", required = false) String fechaInicioStr,
            @RequestParam(value = "fechaFin", required = false) String fechaFinStr,
            @RequestParam(value = "periodo", required = false) String periodoStr
    ) {
        try {
            LocalDate inicio;
            LocalDate fin;

            if (fechaInicioStr != null && !fechaInicioStr.isBlank() && fechaFinStr != null && !fechaFinStr.isBlank()) {
                inicio = LocalDate.parse(fechaInicioStr.trim());
                fin = LocalDate.parse(fechaFinStr.trim());
            } else if (periodoStr != null && !periodoStr.isBlank()) {
                YearMonth ym = YearMonth.parse(periodoStr.trim());
                inicio = ym.atDay(1);
                fin = ym.atEndOfMonth();
            } else {
                YearMonth actual = YearMonth.now();
                inicio = actual.atDay(1);
                fin = actual.atEndOfMonth();
            }

            String periodoNombre = formatPeriodoNombre(inicio, fin);
            List<VistaTransaccionesCompletas> transacciones = transaccionesRepository.findByFechaBetween(inicio, fin);
            List<VistaTransaccionesCompletas> ventasFiltradas = new ArrayList<>();
            Map<String, Map<String, Object>> ventasPorEmpleado = new LinkedHashMap<>();

            for (VistaTransaccionesCompletas t : transacciones) {
                String cat = t.getCategoria() != null ? t.getCategoria().name().toUpperCase() : "";
                boolean esIngreso = "INGRESO".equals(cat) || "VENTA".equals(cat);
                boolean tieneEmpleado = t.getEmpleado() != null && !t.getEmpleado().trim().isEmpty();

                if (!esIngreso || !tieneEmpleado) {
                    continue;
                }

                ventasFiltradas.add(t);

                double monto = t.getMonto() != null ? t.getMonto().doubleValue() : 0.0;
                double com = t.getComisionEmpleado() != null ? t.getComisionEmpleado().doubleValue() : 0.0;

                String emp = t.getEmpleado().trim();
                ventasPorEmpleado.putIfAbsent(emp, new HashMap<>());
                Map<String, Object> mapEmp = ventasPorEmpleado.get(emp);
                mapEmp.put("empleado", emp);
                mapEmp.put("cantidadVentas", ((int) mapEmp.getOrDefault("cantidadVentas", 0)) + 1);
                mapEmp.put("totalVentas", ((double) mapEmp.getOrDefault("totalVentas", 0.0)) + monto);
                mapEmp.put("totalComisiones", ((double) mapEmp.getOrDefault("totalComisiones", 0.0)) + com);
            }

            List<Map<String, Object>> listaResumenVentas = new ArrayList<>(ventasPorEmpleado.values());

            byte[] bytes = excelGeneratorService.generarExcelVentas(
                    periodoNombre, listaResumenVentas, ventasFiltradas
            );

            String filename = "Reporte_Ventas_" + formatMesAnioArchivo(inicio) + ".xlsx";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(EXCEL_MEDIA_TYPE)
                    .body(bytes);

        } catch (Exception e) {
            logger.error("Error al exportar Excel de ventas: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Exporta el Reporte Jerárquico en Excel (Resumen Marca + Jerarquía Detallada con colapsables).
     */
    @GetMapping("/jerarquia")
    public ResponseEntity<byte[]> exportarExcelJerarquia(
            @RequestParam(value = "periodo", required = false) String periodoStr
    ) {
        try {
            YearMonth ym = (periodoStr != null && !periodoStr.isBlank())
                    ? YearMonth.parse(periodoStr.trim())
                    : YearMonth.now();

            String nombreMes = ym.getMonth().getDisplayName(TextStyle.FULL, new Locale("es", "CR"));
            nombreMes = nombreMes.substring(0, 1).toUpperCase() + nombreMes.substring(1);
            String periodoNombre = nombreMes + " " + ym.getYear();

            List<VistaResumenGeneraciones> generaciones = generacionesRepository.findAll();
            generaciones.sort(Comparator
                    .comparing((VistaResumenGeneraciones g) -> g.getMarca() != null ? g.getMarca() : "")
                    .thenComparing(g -> g.getModelo() != null ? g.getModelo() : "")
                    .thenComparing(g -> g.getGeneracion() != null ? g.getGeneracion() : "")
            );

            byte[] bytes = excelGeneratorService.generarExcelJerarquia(periodoNombre, generaciones);

            String filename = "Reporte_Jerarquia_Vehiculos_" + formatMesAnioArchivo(LocalDate.now()) + ".xlsx";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(EXCEL_MEDIA_TYPE)
                    .body(bytes);

        } catch (Exception e) {
            logger.error("Error al exportar Excel jerárquico: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Exporta el Reporte Jerárquico oficial generado en Backend con Apache POI
     * a partir del árbol consolidado enviado desde la interfaz de usuario.
     */
    @PostMapping("/jerarquia")
    public ResponseEntity<byte[]> exportarExcelJerarquiaDesdeFrontend(
            @RequestBody(required = false) List<Map<String, Object>> marcasTree,
            @RequestParam(value = "periodo", required = false) String periodoStr
    ) {
        try {
            YearMonth ym = (periodoStr != null && !periodoStr.isBlank())
                    ? YearMonth.parse(periodoStr.trim())
                    : YearMonth.now();

            String nombreMes = ym.getMonth().getDisplayName(TextStyle.FULL, new Locale("es", "CR"));
            nombreMes = nombreMes.substring(0, 1).toUpperCase() + nombreMes.substring(1);
            String periodoNombre = nombreMes + " " + ym.getYear();

            byte[] bytes;
            if (marcasTree != null && !marcasTree.isEmpty()) {
                bytes = excelGeneratorService.generarExcelJerarquiaDesdeArbol(periodoNombre, marcasTree);
            } else {
                List<VistaResumenGeneraciones> generaciones = generacionesRepository.findAll();
                generaciones.sort(Comparator
                        .comparing((VistaResumenGeneraciones g) -> g.getMarca() != null ? g.getMarca() : "")
                        .thenComparing(g -> g.getModelo() != null ? g.getModelo() : "")
                        .thenComparing(g -> g.getGeneracion() != null ? g.getGeneracion() : "")
                );
                bytes = excelGeneratorService.generarExcelJerarquia(periodoNombre, generaciones);
            }

            String filename = "Reporte_Jerarquia_Vehiculos_" + formatMesAnioArchivo(LocalDate.now()) + ".xlsx";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(EXCEL_MEDIA_TYPE)
                    .body(bytes);

        } catch (Exception e) {
            logger.error("Error al exportar Excel jerárquico desde frontend: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String formatMesAnioArchivo(LocalDate fecha) {
        LocalDate ref = (fecha != null) ? fecha : LocalDate.now();
        String mes = ref.getMonth().getDisplayName(TextStyle.FULL, new Locale("es", "CR"));
        mes = mes.substring(0, 1).toUpperCase() + mes.substring(1).toLowerCase();
        return mes + "_" + ref.getYear();
    }

    private String formatPeriodoNombre(LocalDate inicio, LocalDate fin) {
        if (inicio.getMonth() == fin.getMonth() && inicio.getYear() == fin.getYear()) {
            String mes = inicio.getMonth().getDisplayName(TextStyle.FULL, new Locale("es", "CR"));
            return mes.substring(0, 1).toUpperCase() + mes.substring(1) + " " + inicio.getYear();
        }
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        return inicio.format(fmt) + " - " + fin.format(fmt);
    }
}
