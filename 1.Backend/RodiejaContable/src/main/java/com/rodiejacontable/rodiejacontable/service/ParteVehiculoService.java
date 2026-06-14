package com.rodiejacontable.rodiejacontable.service;

import com.rodiejacontable.database.jooq.tables.pojos.ParteVehiculo;
import com.rodiejacontable.rodiejacontable.repository.ParteVehiculoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ParteVehiculoService {

    private final ParteVehiculoRepository repository;

    @Autowired
    public ParteVehiculoService(ParteVehiculoRepository repository) {
        this.repository = repository;
    }

    public List<ParteVehiculo> obtenerTodos() {
        return repository.findAll();
    }

    public List<ParteVehiculo> obtenerTodosActivos() {
        return repository.findAllActivos();
    }

    public ParteVehiculo obtenerPorId(Integer id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalStateException("ParteVehiculo no encontrada con ID: " + id));
    }

    public ParteVehiculo crear(ParteVehiculo parteVehiculo) {
        if (parteVehiculo.getActivo() == null) {
            parteVehiculo.setActivo((byte) 1);
        }
        if (parteVehiculo.getFechaCreacion() == null) {
            parteVehiculo.setFechaCreacion(LocalDateTime.now());
        }
        return repository.save(parteVehiculo);
    }

    public ParteVehiculo actualizar(Integer id, ParteVehiculo parteVehiculoActualizada) {
        ParteVehiculo existente = obtenerPorId(id);
        if (parteVehiculoActualizada.getNombre() != null) {
            existente.setNombre(parteVehiculoActualizada.getNombre());
        }
        if (parteVehiculoActualizada.getActivo() != null) {
            existente.setActivo(parteVehiculoActualizada.getActivo());
        }
        return repository.update(existente);
    }

    public void eliminar(Integer id) {
        obtenerPorId(id); // Verificar existencia
        repository.delete(id);
    }
}
