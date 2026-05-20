package com.lab04;

/**
 * Clase Calculadora con operaciones aritméticas básicas.
 */
public class Calculadora {

    public double sumar(double a, double b) {
        return a + b; 
    }

    public double restar(double a, double b) {
        return a - b; 
    }

    public double multiplicar(double a, double b) {
        return a * b; 
    }

    public double dividir(double a, double b) {
        if (b == 0) {
            throw new ArithmeticException("División por cero no permitida"); // [cite: 135-136]
        }
        return a / b; 
    }
}