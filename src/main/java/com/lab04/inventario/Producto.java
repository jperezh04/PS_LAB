package com.lab04.inventario;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Producto {

    private final String codigo;
    private final String nombre;
    private double precio;
    private int cantidad;
    private final List<Movimiento> movimientos;

    public Producto(String codigo, String nombre, double precio, int cantidad) {
        validarCodigo(codigo);
        validarNombre(nombre);
        validarPrecio(precio);
        validarCantidadInicial(cantidad);

        this.codigo = codigo;
        this.nombre = nombre;
        this.precio = precio;
        this.cantidad = cantidad;
        this.movimientos = new ArrayList<>();
    }

    public void agregarStock(int cantidad) {
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad a agregar debe ser positiva");
        }

        this.cantidad += cantidad;
        movimientos.add(new Movimiento(TipoMovimiento.ENTRADA, cantidad));
    }

    public void extraerStock(int cantidad) {
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad a extraer debe ser positiva");
        }

        if (cantidad > this.cantidad) {
            throw new IllegalArgumentException("No hay stock suficiente para realizar la salida");
        }

        this.cantidad -= cantidad;
        movimientos.add(new Movimiento(TipoMovimiento.SALIDA, cantidad));
    }

    public int consultarStock() {
        return cantidad;
    }

    public double obtenerValorTotal() {
        return precio * cantidad;
    }

    public String getCodigo() {
        return codigo;
    }

    public String getNombre() {
        return nombre;
    }

    public double getPrecio() {
        return precio;
    }

    public List<Movimiento> getMovimientos() {
        return Collections.unmodifiableList(movimientos);
    }

    private void validarCodigo(String codigo) {
        if (codigo == null || codigo.trim().isEmpty()) {
            throw new IllegalArgumentException("El código del producto no puede estar vacío");
        }
    }

    private void validarNombre(String nombre) {
        if (nombre == null || nombre.trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del producto no puede estar vacío");
        }
    }

    private void validarPrecio(double precio) {
        if (precio <= 0) {
            throw new IllegalArgumentException("El precio del producto debe ser positivo");
        }
    }

    private void validarCantidadInicial(int cantidad) {
        if (cantidad < 0) {
            throw new IllegalArgumentException("La cantidad inicial no puede ser negativa");
        }
    }
}