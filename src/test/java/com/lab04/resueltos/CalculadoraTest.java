package com.lab04.resueltos;

import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Pruebas de la clase Calculadora") 
class CalculadoraTest {
    private Calculadora calculadora;

    @BeforeEach
    void setUp() {
        calculadora = new Calculadora(); 
    }

    @Test
    @DisplayName("Suma de dos positivos")
    void testSumarPositivos() {
        double resultado = calculadora.sumar(3.0, 4.0); 
        assertEquals(7.0, resultado, "3.0 + 4.0 debe ser 7.0"); 
    }

    @Test
    @DisplayName("Resta de dos números")
    void testRestar() {
        assertEquals(2.0, calculadora.restar(5.0, 3.0));
    }

    @Test
    @DisplayName("Multiplicación de dos números")
    void testMultiplicar() {
        assertEquals(12.0, calculadora.multiplicar(3.0, 4.0));
    }

    @Test
    @DisplayName("División normal sin cero")
    void testDividir() {
        assertEquals(2.5, calculadora.dividir(5.0, 2.0));
    }

    @Test
    @DisplayName("División por cero lanza ArithmeticException")
    void testDividirPorCero() {
        assertThrows(ArithmeticException.class, () -> {
            calculadora.dividir(10.0, 0.0);
        }, "Dividir por cero debe lanzar ArithmeticException");
    }
}