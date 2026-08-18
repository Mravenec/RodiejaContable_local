package com.rodiejacontable.rodiejacontable.service;

import com.rodiejacontable.rodiejacontable.dto.roles.ModuloPermisoDTO;
import com.rodiejacontable.rodiejacontable.dto.roles.PermisoUpdateRequest;
import com.rodiejacontable.rodiejacontable.dto.roles.RoleDTO;
import com.rodiejacontable.rodiejacontable.dto.roles.SubmoduloPermisoDTO;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.rodiejacontable.database.jooq.Tables.*;

@Service
public class RolesPermisosService {

    @Autowired
    private DSLContext dsl;

    public List<RoleDTO> getRoles() {
        return dsl.selectFrom(ROLES)
                .fetchInto(RoleDTO.class);
    }

    public List<ModuloPermisoDTO> getPermisosByRol(Integer rolId) {
        // Fetch all modules
        List<ModuloPermisoDTO> modulos = dsl.selectFrom(MODULOS)
                .fetchInto(ModuloPermisoDTO.class);

        // Fetch all submodules with their permissions for this role
        var submodulosResult = dsl.select(
                    SUBMODULOS.ID,
                    SUBMODULOS.NOMBRE,
                    SUBMODULOS.CLAVE,
                    SUBMODULOS.MODULO_ID,
                    ROL_PERMISOS.ID.as("permisoId"),
                    ROL_PERMISOS.CAN_VIEW,
                    ROL_PERMISOS.CAN_CREATE,
                    ROL_PERMISOS.CAN_EDIT,
                    ROL_PERMISOS.CAN_DELETE
                )
                .from(SUBMODULOS)
                .leftJoin(ROL_PERMISOS)
                    .on(SUBMODULOS.ID.eq(ROL_PERMISOS.SUBMODULO_ID).and(ROL_PERMISOS.ROL_ID.eq(rolId)))
                .fetch();

        // Group submodules by modulo_id
        Map<Integer, List<SubmoduloPermisoDTO>> submodulosMap = submodulosResult.stream()
                .collect(Collectors.groupingBy(
                        record -> record.get(SUBMODULOS.MODULO_ID),
                        Collectors.mapping(record -> {
                            SubmoduloPermisoDTO dto = new SubmoduloPermisoDTO();
                            dto.setId(record.get(SUBMODULOS.ID));
                            dto.setNombre(record.get(SUBMODULOS.NOMBRE));
                            dto.setClave(record.get(SUBMODULOS.CLAVE));
                            dto.setPermisoId(record.get("permisoId", Integer.class));
                            
                            // Si no hay registro de permiso, asumir falso
                            Byte view = record.get(ROL_PERMISOS.CAN_VIEW);
                            Byte create = record.get(ROL_PERMISOS.CAN_CREATE);
                            Byte edit = record.get(ROL_PERMISOS.CAN_EDIT);
                            Byte delete = record.get(ROL_PERMISOS.CAN_DELETE);
                            
                            dto.setCanView(view != null && view == 1);
                            dto.setCanCreate(create != null && create == 1);
                            dto.setCanEdit(edit != null && edit == 1);
                            dto.setCanDelete(delete != null && delete == 1);
                            return dto;
                        }, Collectors.toList())
                ));

        // Assign submodules to their modules
        for (ModuloPermisoDTO modulo : modulos) {
            modulo.setSubmodulos(submodulosMap.getOrDefault(modulo.getId(), List.of()));
        }

        return modulos;
    }

    @Transactional
    public void updatePermiso(Integer rolId, Integer submoduloId, PermisoUpdateRequest request) {
        // Upsert permission
        boolean exists = dsl.fetchExists(
            dsl.selectFrom(ROL_PERMISOS)
               .where(ROL_PERMISOS.ROL_ID.eq(rolId))
               .and(ROL_PERMISOS.SUBMODULO_ID.eq(submoduloId))
        );

        Byte view = request.getCanView() != null && request.getCanView() ? (byte) 1 : (byte) 0;
        Byte create = request.getCanCreate() != null && request.getCanCreate() ? (byte) 1 : (byte) 0;
        Byte edit = request.getCanEdit() != null && request.getCanEdit() ? (byte) 1 : (byte) 0;
        Byte delete = request.getCanDelete() != null && request.getCanDelete() ? (byte) 1 : (byte) 0;

        if (exists) {
            dsl.update(ROL_PERMISOS)
               .set(ROL_PERMISOS.CAN_VIEW, view)
               .set(ROL_PERMISOS.CAN_CREATE, create)
               .set(ROL_PERMISOS.CAN_EDIT, edit)
               .set(ROL_PERMISOS.CAN_DELETE, delete)
               .where(ROL_PERMISOS.ROL_ID.eq(rolId))
               .and(ROL_PERMISOS.SUBMODULO_ID.eq(submoduloId))
               .execute();
        } else {
            dsl.insertInto(ROL_PERMISOS)
               .set(ROL_PERMISOS.ROL_ID, rolId)
               .set(ROL_PERMISOS.SUBMODULO_ID, submoduloId)
               .set(ROL_PERMISOS.CAN_VIEW, view)
               .set(ROL_PERMISOS.CAN_CREATE, create)
               .set(ROL_PERMISOS.CAN_EDIT, edit)
               .set(ROL_PERMISOS.CAN_DELETE, delete)
               .execute();
        }
    }
}
