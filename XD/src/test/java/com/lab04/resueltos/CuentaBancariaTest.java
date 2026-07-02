package com.lab04.resueltos;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.CsvSource;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Pruebas de CuentaBancaria")
class CuentaBancariaTest {
    
    private CuentaBancaria cuenta;
    
    @BeforeEach
    void setup() {
        // Se ejecuta antes de cada prueba
        cuenta = new CuentaBancaria("1234567890", "Juan Pérez", 1000.0);
    }
    
    @AfterEach
    void teardown() {
        // Se ejecuta después de cada prueba
        System.out.println("Prueba finalizada. Saldo final: " + 
                          cuenta.obtenerSaldo());
        cuenta = null;
    }
    
    // ========== PRUEBAS BÁSICAS ==========
    
    @Test
    @DisplayName("Crear cuenta con saldo inicial")
    void testCrearCuenta() {
        assertEquals(1000.0, cuenta.obtenerSaldo());
        assertEquals("Juan Pérez", cuenta.getTitular());
    }
    
    @Test
    @DisplayName("No permitir número de cuenta vacío")
    void testCuentaNumeroVacio() {
        assertThrows(IllegalArgumentException.class, () -> {
            new CuentaBancaria("", "Juan", 1000);
        });
    }
    
    @Test
    @DisplayName("No permitir saldo inicial negativo")
    void testSaldoNegativo() {
        assertThrows(IllegalArgumentException.class, () -> {
            new CuentaBancaria("1234", "Juan", -100);
        });
    }
    
    // ========== PRUEBAS DE DEPÓSITO ==========
    
    @Test
    @DisplayName("Depositar dinero válido")
    void testDepositar() {
        cuenta.depositar(500.0);
        assertEquals(1500.0, cuenta.obtenerSaldo());
    }
    
    @ParameterizedTest
    @DisplayName("Depositar múltiples montos válidos")
    @ValueSource(doubles = { 100.0, 250.5, 1000.0, 2500.0 })
    void testDepositarMultiples(double monto) {
        double saldoAnterior = cuenta.obtenerSaldo();
        cuenta.depositar(monto);
        assertEquals(saldoAnterior + monto, cuenta.obtenerSaldo(),
                     "El saldo debe incrementarse por " + monto);
    }
    
    @Test
    @DisplayName("No depositar cantidad negativa")
    void testDepositarNegativo() {
        assertThrows(IllegalArgumentException.class, () -> {
            cuenta.depositar(-100);
        });
    }
    
    @Test
    @DisplayName("No depositar cero")
    void testDepositarCero() {
        assertThrows(IllegalArgumentException.class, () -> {
            cuenta.depositar(0);
        });
    }
    
    // ========== PRUEBAS DE RETIRO ==========
    
    @Test
    @DisplayName("Retirar dinero válido")
    void testRetirar() {
        cuenta.retirar(300.0);
        assertEquals(700.0, cuenta.obtenerSaldo());
    }
    
    @ParameterizedTest
    @DisplayName("Retirar múltiples montos")
    @CsvSource({
        "100.0, 900.0",
        "500.0, 500.0",
        "1000.0, 0.0"
    })
    void testRetirarMultiples(double monto, double saldoEsperado) {
        cuenta.retirar(monto);
        assertEquals(saldoEsperado, cuenta.obtenerSaldo());
    }
    
    @Test
    @DisplayName("No retirar saldo insuficiente")
    void testRetirarInsuficiente() {
        assertThrows(IllegalArgumentException.class, () -> {
            cuenta.retirar(2000.0);
        });
    }
    
    @Test
    @DisplayName("Registrar transacciones")
    void testRegistroTransacciones() {
        cuenta.depositar(100);
        cuenta.retirar(50);
        
        assertEquals(2, cuenta.getTransacciones().size());
    }
}
