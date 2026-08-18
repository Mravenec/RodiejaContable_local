package com.rodiejacontable.rodiejacontable.dto.roles;

import java.util.List;

public class ModuloPermisoDTO {
    private Integer id;
    private String nombre;
    private String clave;
    private String icono;
    private List<SubmoduloPermisoDTO> submodulos;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getClave() { return clave; }
    public void setClave(String clave) { this.clave = clave; }
    public String getIcono() { return icono; }
    public void setIcono(String icono) { this.icono = icono; }
    public List<SubmoduloPermisoDTO> getSubmodulos() { return submodulos; }
    public void setSubmodulos(List<SubmoduloPermisoDTO> submodulos) { this.submodulos = submodulos; }
}
