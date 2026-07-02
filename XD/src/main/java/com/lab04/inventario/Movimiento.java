package com.lab04.inventario;
import java.time.LocalDateTime;

public class Movimiento {

    private final TipoMovimiento tipo;
    private final int cantidad;
    private final LocalDateTime fecha;

    public Movimiento(TipoMovimiento tipo, int cantidad) {
        if (tipo == null) {
            throw new IllegalArgumentException("El tipo de movimiento no puede ser nulo");
        }

        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad del movimiento debe ser positiva");
        }

        this.tipo = tipo;
        this.cantidad = cantidad;
        this.fecha = LocalDateTime.now();
    }

    public TipoMovimiento getTipo() {
        return tipo;
    }

    public int getCantidad() {
        return cantidad;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }
}