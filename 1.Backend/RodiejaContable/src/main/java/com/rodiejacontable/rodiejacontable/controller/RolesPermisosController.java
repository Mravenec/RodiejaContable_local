package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.rodiejacontable.dto.roles.ModuloPermisoDTO;
import com.rodiejacontable.rodiejacontable.dto.roles.PermisoUpdateRequest;
import com.rodiejacontable.rodiejacontable.dto.roles.RoleDTO;
import com.rodiejacontable.rodiejacontable.service.RolesPermisosService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
public class RolesPermisosController {

    @Autowired
    private RolesPermisosService rolesPermisosService;

    @GetMapping
    public ResponseEntity<List<RoleDTO>> getRoles() {
        return ResponseEntity.ok(rolesPermisosService.getRoles());
    }

    @GetMapping("/{rolId}/permisos")
    public ResponseEntity<List<ModuloPermisoDTO>> getPermisosByRol(@PathVariable Integer rolId) {
        return ResponseEntity.ok(rolesPermisosService.getPermisosByRol(rolId));
    }

    @PutMapping("/{rolId}/permisos/{submoduloId}")
    public ResponseEntity<Void> updatePermiso(
            @PathVariable Integer rolId,
            @PathVariable Integer submoduloId,
            @RequestBody PermisoUpdateRequest request) {
        
        rolesPermisosService.updatePermiso(rolId, submoduloId, request);
        return ResponseEntity.ok().build();
    }
}
