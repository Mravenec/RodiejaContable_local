package com.rodiejacontable.rodiejacontable.dto.roles;

public class PermisoUpdateRequest {
    private Boolean canView;
    private Boolean canCreate;
    private Boolean canEdit;
    private Boolean canDelete;

    public Boolean getCanView() { return canView; }
    public void setCanView(Boolean canView) { this.canView = canView; }
    public Boolean getCanCreate() { return canCreate; }
    public void setCanCreate(Boolean canCreate) { this.canCreate = canCreate; }
    public Boolean getCanEdit() { return canEdit; }
    public void setCanEdit(Boolean canEdit) { this.canEdit = canEdit; }
    public Boolean getCanDelete() { return canDelete; }
    public void setCanDelete(Boolean canDelete) { this.canDelete = canDelete; }
}
