package com.lab04.service;
public interface ServicioPrecio {

    /**
     * Calcula el descuento aplicable sobre un monto base.
     *
     * @param montoBase monto bruto del carrito
     * @return monto de descuento (valor positivo que se restará)
     */
    double calcularDescuento(double montoBase);

    /**
     * Calcula el impuesto aplicable sobre un monto base.
     *
     * @param montoBase monto bruto del carrito (después de descuentos)
     * @return monto de impuesto (valor positivo que se sumará)
     */
    double calcularImpuesto(double montoBase);
}