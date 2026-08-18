package com.rodiejacontable.rodiejacontable.dto.roles;

public class SubmoduloPermisoDTO {
    private Integer id;
    private String nombre;
    private String clave;
    private Integer permisoId;
    private Boolean canView;
    private Boolean canCreate;
    private Boolean canEdit;
    private Boolean canDelete;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getClave() { return clave; }
    public void setClave(String clave) { this.clave = clave; }
    public Integer getPermisoId() { return permisoId; }
    public void setPermisoId(Integer permisoId) { this.permisoId = permisoId; }
    public Boolean getCanView() { return canView; }
    public void setCanView(Boolean canView) { this.canView = canView; }
    public Boolean getCanCreate() { return canCreate; }
    public void setCanCreate(Boolean canCreate) { this.canCreate = canCreate; }
    public Boolean getCanEdit() { return canEdit; }
    public void setCanEdit(Boolean canEdit) { this.canEdit = canEdit; }
    public Boolean getCanDelete() { return canDelete; }
    public void setCanDelete(Boolean canDelete) { this.canDelete = canDelete; }
}
