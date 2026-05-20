package com.lab04;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Representa una transacción bancaria.
 */
class Transaccion {
    public enum Tipo { DEPOSITO, RETIRO }
    
    private Tipo tipo;
    private double monto;
    private LocalDateTime fecha;
    
    public Transaccion(Tipo tipo, double monto) {
        this.tipo = tipo;
        this.monto = monto;
        this.fecha = LocalDateTime.now();
    }
    
    public Tipo getTipo() { return tipo; }
    public double getMonto() { return monto; }
    public LocalDateTime getFecha() { return fecha; }
}

/**
 * Gestiona una cuenta bancaria con operaciones y transacciones.
 */
public class CuentaBancaria {
    private String numero;
    private String titular;
    private double saldo;
    private List<Transaccion> transacciones;
    
    public CuentaBancaria(String numero, String titular, double saldoInicial) {
        if (numero == null || numero.isEmpty()) {
            throw new IllegalArgumentException("Número de cuenta no válido");
        }
        if (saldoInicial < 0) {
            throw new IllegalArgumentException("Saldo inicial no puede ser negativo");
        }
        
        this.numero = numero;
        this.titular = titular;
        this.saldo = saldoInicial;
        this.transacciones = new ArrayList<>();
    }
    
    public void depositar(double monto) {
        if (monto <= 0) {
            throw new IllegalArgumentException("Monto debe ser positivo");
        }
        
        this.saldo += monto;
        transacciones.add(new Transaccion(Transaccion.Tipo.DEPOSITO, monto));
    }
    
    public void retirar(double monto) {
        if (monto <= 0) {
            throw new IllegalArgumentException("Monto debe ser positivo");
        }
        if (monto > saldo) {
            throw new IllegalArgumentException("Saldo insuficiente");
        }
        
        this.saldo -= monto;
        transacciones.add(new Transaccion(Transaccion.Tipo.RETIRO, monto));
    }
    
    public double obtenerSaldo() {
        return saldo;
    }
    
    public String getNumero() { return numero; }
    public String getTitular() { return titular; }
    public List<Transaccion> getTransacciones() { return transacciones; }
}
