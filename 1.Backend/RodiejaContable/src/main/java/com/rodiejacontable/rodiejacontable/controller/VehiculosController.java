package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.database.jooq.enums.VehiculosEstado;
import com.rodiejacontable.database.jooq.enums.VehiculosTraccion;
import com.rodiejacontable.database.jooq.enums.VehiculosTransmision;
import com.rodiejacontable.database.jooq.enums.VehiculosCombustible;
import com.rodiejacontable.database.jooq.tables.pojos.Vehiculos;
import com.rodiejacontable.rodiejacontable.service.VehiculosService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vehiculos")
public class VehiculosController {

    @Autowired
    private VehiculosService vehiculosService;
    
    @GetMapping
    public ResponseEntity<List<Vehiculos>> getAll(
            @RequestParam(required = false) VehiculosEstado estado,
            @RequestParam(required = false) Integer generacionId,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Boolean activos) {
        
        List<Vehiculos> vehiculos;
        
        // Apply filters based on provided parameters
        if (estado != null) {
            vehiculos = vehiculosService.findByEstado(estado);
        } else if (generacionId != null) {
            vehiculos = vehiculosService.findByGeneracionId(generacionId);
        } else if (anio != null) {
            vehiculos = vehiculosService.findByAnio(anio);
        } else if (Boolean.TRUE.equals(activos)) {
            vehiculos = vehiculosService.findActivos();
        } else {
            vehiculos = vehiculosService.findAll();
        }
        
        return new ResponseEntity<>(vehiculos, HttpStatus.OK);
    }
    
    @GetMapping("/estado/{estado}")
    public ResponseEntity<List<Vehiculos>> getByEstado(@PathVariable VehiculosEstado estado) {
        List<Vehiculos> vehiculos = vehiculosService.findByEstado(estado);
        return new ResponseEntity<>(vehiculos, HttpStatus.OK);
    }
    
    @GetMapping("/generacion/{generacionId}")
    public ResponseEntity<List<Vehiculos>> getByGeneracionId(@PathVariable Integer generacionId) {
        List<Vehiculos> vehiculos = vehiculosService.findByGeneracionId(generacionId);
        return new ResponseEntity<>(vehiculos, HttpStatus.OK);
    }
    
    @GetMapping("/anio/{anio}")
    public ResponseEntity<List<Vehiculos>> getByAnio(@PathVariable Integer anio) {
        List<Vehiculos> vehiculos = vehiculosService.findByAnio(anio);
        return new ResponseEntity<>(vehiculos, HttpStatus.OK);
    }
    
    @GetMapping("/activos")
    public ResponseEntity<List<Vehiculos>> getActivos() {
        List<Vehiculos> vehiculos = vehiculosService.findActivos();
        return new ResponseEntity<>(vehiculos, HttpStatus.OK);
    }
    
    @GetMapping("/para-egreso")
    public ResponseEntity<List<Vehiculos>> getVehiculosParaEgreso() {
        List<Vehiculos> vehiculos = vehiculosService.findVehiculosParaEgreso();
        return new ResponseEntity<>(vehiculos, HttpStatus.OK);
    }
    
    /**
     * Obtiene la estructura jerárquica completa de vehículos agrupados por marca > modelo > generación > vehículo
     * @return Estructura jerárquica de vehículos
     */
    @GetMapping("/jerarquia")
    public ResponseEntity<Map<String, Object>> getVehiculosJerarquia() {
        Map<String, Object> hierarchy = vehiculosService.getVehiculosHierarchy();
        return new ResponseEntity<>(hierarchy, HttpStatus.OK);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Vehiculos> getById(@PathVariable Integer id) {
        Vehiculos vehiculo = vehiculosService.findById(id);
        return new ResponseEntity<>(vehiculo, HttpStatus.OK);
    }
    
    @PostMapping
    public ResponseEntity<Vehiculos> create(@RequestBody Map<String, Object> vehiculoData) {
        // Validar que se proporcione un vehículo
        if (vehiculoData == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        
        // Log para depuración
        System.out.println("Datos recibidos en la solicitud: " + vehiculoData);
        
        // Validar campos obligatorios
        if (vehiculoData.get("generacionId") == null || vehiculoData.get("anio") == null || 
            vehiculoData.get("precioCompra") == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        
        // Crear un nuevo objeto Vehiculos
        Vehiculos vehiculo = new Vehiculos();
        
        // Mapear los campos del JSON al objeto Vehiculos
        vehiculo.setGeneracionId(Integer.valueOf(vehiculoData.get("generacionId").toString()));
        vehiculo.setAnio(Integer.valueOf(vehiculoData.get("anio").toString()));
        vehiculo.setPrecioCompra(new BigDecimal(vehiculoData.get("precioCompra").toString()));
        
        // Manejar el estado
        if (vehiculoData.containsKey("estado") && vehiculoData.get("estado") != null) {
            try {
                String estadoStr = vehiculoData.get("estado").toString();
                System.out.println("Estado recibido: " + estadoStr);
                VehiculosEstado estado = VehiculosEstado.valueOf(estadoStr);
                System.out.println("Estado convertido a enum: " + estado);
                vehiculo.setEstado(estado);
                System.out.println("Estado asignado al vehículo: " + vehiculo.getEstado());
            } catch (IllegalArgumentException e) {
                // Si el valor no coincide con ningún enum, se deja el valor por defecto
                System.out.println("Error al convertir el estado: " + e.getMessage());
                vehiculo.setEstado(VehiculosEstado.DISPONIBLE);
            }
        }
        
        // Manejar los nuevos campos enum
        if (vehiculoData.containsKey("traccion") && vehiculoData.get("traccion") != null) {
            try {
                String traccionStr = vehiculoData.get("traccion").toString();
                System.out.println("Tracción recibida: " + traccionStr);
                VehiculosTraccion traccion = VehiculosTraccion.lookupLiteral(traccionStr);
                System.out.println("Tracción convertida a enum: " + traccion);
                vehiculo.setTraccion(traccion);
            } catch (Exception e) {
                System.out.println("Error al convertir la tracción: " + e.getMessage());
            }
        }
        
        if (vehiculoData.containsKey("transmision") && vehiculoData.get("transmision") != null) {
            try {
                String transmisionStr = vehiculoData.get("transmision").toString();
                System.out.println("Transmisión recibida: " + transmisionStr);
                VehiculosTransmision transmision = VehiculosTransmision.lookupLiteral(transmisionStr);
                System.out.println("Transmisión convertida a enum: " + transmision);
                vehiculo.setTransmision(transmision);
            } catch (Exception e) {
                System.out.println("Error al convertir la transmisión: " + e.getMessage());
            }
        }
        
        if (vehiculoData.containsKey("combustible") && vehiculoData.get("combustible") != null) {
            try {
                String combustibleStr = vehiculoData.get("combustible").toString();
                System.out.println("Combustible recibido: " + combustibleStr);
                VehiculosCombustible combustible = VehiculosCombustible.lookupLiteral(combustibleStr);
                System.out.println("Combustible convertido a enum: " + combustible);
                vehiculo.setCombustible(combustible);
            } catch (Exception e) {
                System.out.println("Error al convertir el combustible: " + e.getMessage());
            }
        }
        
        // Establecer valores por defecto para campos opcionales
        if (vehiculoData.containsKey("costoGrua") && vehiculoData.get("costoGrua") != null) {
            vehiculo.setCostoGrua(new BigDecimal(vehiculoData.get("costoGrua").toString()));
        } else {
            vehiculo.setCostoGrua(BigDecimal.ZERO);
        }
        
        if (vehiculoData.containsKey("comisiones") && vehiculoData.get("comisiones") != null) {
            vehiculo.setComisiones(new BigDecimal(vehiculoData.get("comisiones").toString()));
        } else {
            vehiculo.setComisiones(BigDecimal.ZERO);
        }
        
        if (vehiculoData.containsKey("fechaIngreso") && vehiculoData.get("fechaIngreso") != null) {
            vehiculo.setFechaIngreso(LocalDate.parse(vehiculoData.get("fechaIngreso").toString()));
        } else {
            vehiculo.setFechaIngreso(LocalDate.now());
        }
        
        if (vehiculoData.containsKey("imagenUrl") && vehiculoData.get("imagenUrl") != null) {
            vehiculo.setImagenUrl(vehiculoData.get("imagenUrl").toString());
        }
        
        if (vehiculoData.containsKey("precioVenta") && vehiculoData.get("precioVenta") != null) {
            vehiculo.setPrecioVenta(new BigDecimal(vehiculoData.get("precioVenta").toString()));
        }
        
        if (vehiculoData.containsKey("fechaVenta") && vehiculoData.get("fechaVenta") != null) {
            vehiculo.setFechaVenta(LocalDate.parse(vehiculoData.get("fechaVenta").toString()));
        }
        
        if (vehiculoData.containsKey("notas") && vehiculoData.get("notas") != null) {
            vehiculo.setNotas(vehiculoData.get("notas").toString());
        }
        
        if (vehiculoData.containsKey("cilindraje") && vehiculoData.get("cilindraje") != null) {
            vehiculo.setCilindraje(vehiculoData.get("cilindraje").toString());
        }
        
        System.out.println("Vehículo antes de guardar: " + vehiculo);
        Vehiculos nuevoVehiculo = vehiculosService.create(vehiculo);
        System.out.println("Vehículo después de guardar: " + nuevoVehiculo);
        return new ResponseEntity<>(nuevoVehiculo, HttpStatus.CREATED);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Vehiculos> update(
            @PathVariable Integer id, 
            @RequestBody Map<String, Object> vehiculoData) {
        
        // Validar que se proporcione un vehículo
        if (vehiculoData == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        
        // Log para depuración
        System.out.println("Datos recibidos en la actualización: " + vehiculoData);
        
        // Validar que el vehículo exista
        Vehiculos existente = vehiculosService.findById(id);
        if (existente == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        
        // Actualizar campos si se proporcionan en el mapa
        if (vehiculoData.containsKey("generacionId") && vehiculoData.get("generacionId") != null) {
            existente.setGeneracionId(Integer.valueOf(vehiculoData.get("generacionId").toString()));
        }
        
        if (vehiculoData.containsKey("anio") && vehiculoData.get("anio") != null) {
            existente.setAnio(Integer.valueOf(vehiculoData.get("anio").toString()));
        }
        
        if (vehiculoData.containsKey("precioCompra") && vehiculoData.get("precioCompra") != null) {
            existente.setPrecioCompra(new BigDecimal(vehiculoData.get("precioCompra").toString()));
        }
        
        if (vehiculoData.containsKey("costoGrua") && vehiculoData.get("costoGrua") != null) {
            existente.setCostoGrua(new BigDecimal(vehiculoData.get("costoGrua").toString()));
        }
        
        if (vehiculoData.containsKey("comisiones") && vehiculoData.get("comisiones") != null) {
            existente.setComisiones(new BigDecimal(vehiculoData.get("comisiones").toString()));
        }
        
        if (vehiculoData.containsKey("fechaIngreso") && vehiculoData.get("fechaIngreso") != null) {
            existente.setFechaIngreso(LocalDate.parse(vehiculoData.get("fechaIngreso").toString()));
        }
        
        if (vehiculoData.containsKey("imagenUrl") && vehiculoData.get("imagenUrl") != null) {
            existente.setImagenUrl(vehiculoData.get("imagenUrl").toString());
        }
        
        if (vehiculoData.containsKey("precioVenta") && vehiculoData.get("precioVenta") != null) {
            existente.setPrecioVenta(new BigDecimal(vehiculoData.get("precioVenta").toString()));
        }
        
        if (vehiculoData.containsKey("fechaVenta") && vehiculoData.get("fechaVenta") != null) {
            existente.setFechaVenta(LocalDate.parse(vehiculoData.get("fechaVenta").toString()));
        }
        
        // Manejar el estado
        if (vehiculoData.containsKey("estado") && vehiculoData.get("estado") != null) {
            try {
                String estadoStr = vehiculoData.get("estado").toString();
                VehiculosEstado estado = VehiculosEstado.valueOf(estadoStr);
                existente.setEstado(estado);
            } catch (IllegalArgumentException e) {
                System.out.println("Error al convertir el estado: " + e.getMessage());
                // No cambiar el estado si es inválido
            }
        }
        
        // Manejar los nuevos campos enum
        if (vehiculoData.containsKey("traccion") && vehiculoData.get("traccion") != null) {
            try {
                String traccionStr = vehiculoData.get("traccion").toString();
                VehiculosTraccion traccion = VehiculosTraccion.lookupLiteral(traccionStr);
                existente.setTraccion(traccion);
            } catch (Exception e) {
                System.out.println("Error al convertir la tracción: " + e.getMessage());
            }
        }
        
        if (vehiculoData.containsKey("transmision") && vehiculoData.get("transmision") != null) {
            try {
                String transmisionStr = vehiculoData.get("transmision").toString();
                VehiculosTransmision transmision = VehiculosTransmision.lookupLiteral(transmisionStr);
                existente.setTransmision(transmision);
            } catch (Exception e) {
                System.out.println("Error al convertir la transmisión: " + e.getMessage());
            }
        }
        
        if (vehiculoData.containsKey("combustible") && vehiculoData.get("combustible") != null) {
            try {
                String combustibleStr = vehiculoData.get("combustible").toString();
                VehiculosCombustible combustible = VehiculosCombustible.lookupLiteral(combustibleStr);
                existente.setCombustible(combustible);
            } catch (Exception e) {
                System.out.println("Error al convertir el combustible: " + e.getMessage());
            }
        }
        
        if (vehiculoData.containsKey("notas") && vehiculoData.get("notas") != null) {
            existente.setNotas(vehiculoData.get("notas").toString());
        }
        
        if (vehiculoData.containsKey("cilindraje") && vehiculoData.get("cilindraje") != null) {
            existente.setCilindraje(vehiculoData.get("cilindraje").toString());
        }
        
        System.out.println("Vehículo antes de actualizar: " + existente);
        Vehiculos vehiculoActualizado = vehiculosService.update(id, existente);
        System.out.println("Vehículo después de actualizar: " + vehiculoActualizado);
        return new ResponseEntity<>(vehiculoActualizado, HttpStatus.OK);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        vehiculosService.delete(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
    
    @PutMapping("/{id}/estado")
    public ResponseEntity<Void> updateEstado(
            @PathVariable Integer id,
            @RequestParam VehiculosEstado estado) {
        
        vehiculosService.actualizarEstado(id, estado);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
    
    @PostMapping("/{id}/vender")
    public ResponseEntity<Void> marcarComoVendido(
            @PathVariable Integer id,
            @RequestParam BigDecimal precioVenta,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaVenta) {
        
        if (fechaVenta == null) {
            fechaVenta = LocalDate.now();
        }
        
        vehiculosService.marcarComoVendido(id, precioVenta, fechaVenta);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
    
    @GetMapping("/resumen-inventario")
    public ResponseEntity<ResumenInventario> getResumenInventario() {
        List<Vehiculos> vehiculos = vehiculosService.findActivos();
        
        ResumenInventario resumen = new ResumenInventario();
        resumen.setTotalVehiculos(vehiculos.size());
        
        BigDecimal inversionTotal = vehiculos.stream()
                .map(Vehiculos::getInversionTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        resumen.setInversionTotal(inversionTotal);
        
        long disponibles = vehiculos.stream()
                .filter(v -> v.getEstado() == VehiculosEstado.DISPONIBLE)
                .count();
        resumen.setDisponibles((int) disponibles);
        
        long enReparacion = vehiculos.stream()
                .filter(v -> v.getEstado() == VehiculosEstado.REPARACION)
                .count();
        resumen.setEnReparacion((int) enReparacion);
        
        long vendidos = vehiculos.stream()
                .filter(v -> v.getEstado() == VehiculosEstado.VENDIDO)
                .count();
        resumen.setVendidos((int) vendidos);
        
        long desarmados = vehiculos.stream()
                .filter(v -> v.getEstado() == VehiculosEstado.DESARMADO)
                .count();
        resumen.setDesarmados((int) desarmados);
        
        return new ResponseEntity<>(resumen, HttpStatus.OK);
    }
    
    // Clase interna para el resumen de inventario
    public static class ResumenInventario {
        private int totalVehiculos;
        private BigDecimal inversionTotal;
        private int disponibles;
        private int enReparacion;
        private int vendidos;
        private int desarmados;
        
        // Getters y setters
        public int getTotalVehiculos() { return totalVehiculos; }
        public void setTotalVehiculos(int totalVehiculos) { this.totalVehiculos = totalVehiculos; }
        
        public BigDecimal getInversionTotal() { return inversionTotal; }
        public void setInversionTotal(BigDecimal inversionTotal) { this.inversionTotal = inversionTotal; }
        
        public int getDisponibles() { return disponibles; }
        public void setDisponibles(int disponibles) { this.disponibles = disponibles; }
        
        public int getEnReparacion() { return enReparacion; }
        public void setEnReparacion(int enReparacion) { this.enReparacion = enReparacion; }
        
        public int getVendidos() { return vendidos; }
        public void setVendidos(int vendidos) { this.vendidos = vendidos; }
        
        public int getDesarmados() { return desarmados; }
        public void setDesarmados(int desarmados) { this.desarmados = desarmados; }
    }
}
