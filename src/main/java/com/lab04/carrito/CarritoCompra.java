package com.lab04.carrito;

import com.lab04.model.ItemCarrito;
import com.lab04.model.Producto;
import com.lab04.service.ServicioPrecio;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

public class CarritoCompra {

    private final List<ItemCarrito> items;
    private final List<String> historialOperaciones;
    private final ServicioPrecio servicioPrecio;


    public CarritoCompra(ServicioPrecio servicioPrecio) {
        if (servicioPrecio == null) {
            throw new IllegalArgumentException("ServicioPrecio no puede ser nulo.");
        }
        this.servicioPrecio = servicioPrecio;
        this.items = new ArrayList<>();
        this.historialOperaciones = new ArrayList<>();
    }

    public void agregarProducto(Producto producto, int cantidad) {
        if (producto == null) {
            throw new IllegalArgumentException("El producto no puede ser nulo.");
        }
        if (!producto.isDisponible()) {
            throw new IllegalStateException(
                    "El producto '" + producto.getNombre() + "' no está disponible.");
        }
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0.");
        }

        Optional<ItemCarrito> itemExistente = buscarItem(producto.getId());

        if (itemExistente.isPresent()) {
            // Producto duplicado → actualiza cantidad
            ItemCarrito item = itemExistente.get();
            item.setCantidad(item.getCantidad() + cantidad);
            registrarOperacion("ACTUALIZAR", producto.getNombre(),
                    "cantidad actualizada a " + item.getCantidad());
        } else {
            items.add(new ItemCarrito(producto, cantidad));
            registrarOperacion("AGREGAR", producto.getNombre(),
                    "cantidad=" + cantidad);
        }
    }

    public void removerProducto(String idProducto) {
        ItemCarrito item = buscarItem(idProducto)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Producto con id '" + idProducto + "' no encontrado en el carrito."));

        items.remove(item);
        registrarOperacion("REMOVER", item.getProducto().getNombre(), "eliminado del carrito");
    }

    public void actualizarCantidad(String idProducto, int nuevaCantidad) {
        if (nuevaCantidad <= 0) {
            throw new IllegalArgumentException("La nueva cantidad debe ser mayor a 0.");
        }
        ItemCarrito item = buscarItem(idProducto)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Producto con id '" + idProducto + "' no encontrado en el carrito."));

        item.setCantidad(nuevaCantidad);
        registrarOperacion("ACTUALIZAR", item.getProducto().getNombre(),
                "nueva cantidad=" + nuevaCantidad);
    }

    public void vaciar() {
        items.clear();
        registrarOperacion("VACIAR", "todos", "carrito vaciado");
    }


    public double calcularTotal() {
        double subtotal = calcularSubtotal();
        double descuento = servicioPrecio.calcularDescuento(subtotal);
        double baseConDescuento = subtotal - descuento;
        double impuesto = servicioPrecio.calcularImpuesto(baseConDescuento);
        return baseConDescuento + impuesto;
    }
    public double calcularSubtotal() {
        return items.stream()
                .mapToDouble(ItemCarrito::getSubtotal)
                .sum();
    }

    public String obtenerResumenCompra() {
        if (items.isEmpty()) {
            return "El carrito está vacío.";
        }

        double subtotal  = calcularSubtotal();
        double descuento = servicioPrecio.calcularDescuento(subtotal);
        double base      = subtotal - descuento;
        double impuesto  = servicioPrecio.calcularImpuesto(base);
        double total     = base + impuesto;

        StringBuilder sb = new StringBuilder();
        sb.append("========== RESUMEN DE COMPRA ==========\n");
        items.forEach(item -> sb.append(String.format(
                "  %-25s x%d  S/ %.2f%n",
                item.getProducto().getNombre(),
                item.getCantidad(),
                item.getSubtotal())));
        sb.append("---------------------------------------\n");
        sb.append(String.format("  Subtotal:              S/ %.2f%n", subtotal));
        sb.append(String.format("  Descuento:           - S/ %.2f%n", descuento));
        sb.append(String.format("  Impuesto (sobre base): S/ %.2f%n", impuesto));
        sb.append("=======================================\n");
        sb.append(String.format("  TOTAL:                 S/ %.2f%n", total));
        return sb.toString();
    }

    /** Retorna la lista de ítems como vista no modificable. */
    public List<ItemCarrito> getItems() {
        return Collections.unmodifiableList(items);
    }

    /** Retorna el historial de operaciones como vista no modificable. */
    public List<String> getHistorialOperaciones() {
        return Collections.unmodifiableList(historialOperaciones);
    }

    /** Indica si el carrito está vacío. */
    public boolean estaVacio() {
        return items.isEmpty();
    }

    /** Cantidad total de ítems distintos en el carrito. */
    public int cantidadProductosDistintos() {
        return items.size();
    }


    private Optional<ItemCarrito> buscarItem(String idProducto) {
        return items.stream()
                .filter(i -> i.getProducto().getId().equals(idProducto))
                .findFirst();
    }

    private void registrarOperacion(String tipo, String producto, String detalle) {
        String entrada = String.format("[%s] %s - %s: %s",
                LocalDateTime.now(), tipo, producto, detalle);
        historialOperaciones.add(entrada);
    }
}