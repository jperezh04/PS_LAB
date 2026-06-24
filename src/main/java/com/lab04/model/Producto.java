package com.lab04.model;

public class Producto {

    private final String id;
    private final String nombre;
    private final double precio;
    private boolean disponible;

    public Producto(String id, String nombre, double precio, boolean disponible) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("El id del producto no puede ser vacío.");
        }
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("El nombre del producto no puede ser vacío.");
        }
        if (precio <= 0) {
            throw new IllegalArgumentException("El precio debe ser mayor a 0.");
        }
        this.id = id;
        this.nombre = nombre;
        this.precio = precio;
        this.disponible = disponible;
    }

    public String getId()          { return id; }
    public String getNombre()      { return nombre; }
    public double getPrecio()      { return precio; }
    public boolean isDisponible()  { return disponible; }

    // Setter de disponibilidad
    public void setDisponible(boolean disponible) {
        this.disponible = disponible;
    }

    @Override
    public String toString() {
        return String.format("Producto{id='%s', nombre='%s', precio=%.2f, disponible=%b}",
                id, nombre, precio, disponible);
    }
}