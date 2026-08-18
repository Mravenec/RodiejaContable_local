package com.rodiejacontable.rodiejacontable.dto;

public class UserListDTO {
    private Integer id;
    private String nombre;
    private String email;
    private String rol;
    private Boolean activo;
    private String ultimoAcceso;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public String getUltimoAcceso() { return ultimoAcceso; }
    public void setUltimoAcceso(String ultimoAcceso) { this.ultimoAcceso = ultimoAcceso; }
}
