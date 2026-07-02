package com.lab04.inventario;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Pruebas unitarias para Gestor de Inventario")
class ProductoTest {

    private Producto producto;

    @BeforeEach
    void setUp() {
        producto = new Producto("P001", "Laptop", 2500.00, 10);
    }

    @Test
    @DisplayName("Debe crear un producto válido correctamente")
    void debeCrearProductoValido() {
        assertAll(
                () -> assertEquals("P001", producto.getCodigo()),
                () -> assertEquals("Laptop", producto.getNombre()),
                () -> assertEquals(2500.00, producto.getPrecio()),
                () -> assertEquals(10, producto.consultarStock()),
                () -> assertTrue(producto.getMovimientos().isEmpty())
        );
    }

    @Nested
    @DisplayName("Validaciones del constructor")
    class ConstructorTests {

        @Test
        @DisplayName("Debe lanzar excepción si el código es nulo")
        void debeLanzarExcepcionSiCodigoEsNulo() {
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> new Producto(null, "Laptop", 2500.00, 10)
            );

            assertEquals("El código del producto no puede estar vacío", exception.getMessage());
        }

        @Test
        @DisplayName("Debe lanzar excepción si el código está vacío")
        void debeLanzarExcepcionSiCodigoEstaVacio() {
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> new Producto("   ", "Laptop", 2500.00, 10)
            );

            assertEquals("El código del producto no puede estar vacío", exception.getMessage());
        }

        @Test
        @DisplayName("Debe lanzar excepción si el nombre es nulo")
        void debeLanzarExcepcionSiNombreEsNulo() {
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> new Producto("P001", null, 2500.00, 10)
            );

            assertEquals("El nombre del producto no puede estar vacío", exception.getMessage());
        }

        @Test
        @DisplayName("Debe lanzar excepción si el nombre está vacío")
        void debeLanzarExcepcionSiNombreEstaVacio() {
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> new Producto("P001", "   ", 2500.00, 10)
            );

            assertEquals("El nombre del producto no puede estar vacío", exception.getMessage());
        }

        @ParameterizedTest
        @ValueSource(doubles = {0.0, -10.5, -100.0})
        @DisplayName("Debe lanzar excepción si el precio no es positivo")
        void debeLanzarExcepcionSiPrecioNoEsPositivo(double precioInvalido) {
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> new Producto("P001", "Laptop", precioInvalido, 10)
            );

            assertEquals("El precio del producto debe ser positivo", exception.getMessage());
        }

        @Test
        @DisplayName("Debe lanzar excepción si la cantidad inicial es negativa")
        void debeLanzarExcepcionSiCantidadInicialEsNegativa() {
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> new Producto("P001", "Laptop", 2500.00, -1)
            );

            assertEquals("La cantidad inicial no puede ser negativa", exception.getMessage());
        }
    }

    @Nested
    @DisplayName("Operaciones de stock")
    class StockTests {

        @Test
        @DisplayName("Debe agregar stock correctamente")
        void debeAgregarStockCorrectamente() {
            producto.agregarStock(5);

            assertEquals(15, producto.consultarStock());
        }

        @Test
        @DisplayName("Debe registrar movimiento de entrada al agregar stock")
        void debeRegistrarMovimientoEntrada() {
            producto.agregarStock(5);

            List<Movimiento> movimientos = producto.getMovimientos();

            assertAll(
                    () -> assertEquals(1, movimientos.size()),
                    () -> assertEquals(TipoMovimiento.ENTRADA, movimientos.get(0).getTipo()),
                    () -> assertEquals(5, movimientos.get(0).getCantidad()),
                    () -> assertNotNull(movimientos.get(0).getFecha())
            );
        }

        @ParameterizedTest
        @ValueSource(ints = {0, -1, -50})
        @DisplayName("Debe lanzar excepción al agregar cantidad no positiva")
        void debeLanzarExcepcionAlAgregarCantidadNoPositiva(int cantidadInvalida) {
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> producto.agregarStock(cantidadInvalida)
            );

            assertEquals("La cantidad a agregar debe ser positiva", exception.getMessage());
        }

        @Test
        @DisplayName("Debe extraer stock correctamente")
        void debeExtraerStockCorrectamente() {
            producto.extraerStock(4);

            assertEquals(6, producto.consultarStock());
        }

        @Test
        @DisplayName("Debe permitir extraer exactamente todo el stock disponible")
        void debePermitirExtraerTodoElStockDisponible() {
            producto.extraerStock(10);

            assertAll(
                    () -> assertEquals(0, producto.consultarStock()),
                    () -> assertEquals(1, producto.getMovimientos().size()),
                    () -> assertEquals(
                            TipoMovimiento.SALIDA,
                            producto.getMovimientos().get(0).getTipo()
                    )
            );
        }

        @Test
        @DisplayName("Debe registrar movimiento de salida al extraer stock")
        void debeRegistrarMovimientoSalida() {
            producto.extraerStock(3);

            List<Movimiento> movimientos = producto.getMovimientos();

            assertAll(
                    () -> assertEquals(1, movimientos.size()),
                    () -> assertEquals(TipoMovimiento.SALIDA, movimientos.get(0).getTipo()),
                    () -> assertEquals(3, movimientos.get(0).getCantidad()),
                    () -> assertNotNull(movimientos.get(0).getFecha())
            );
        }

        @Test
        @DisplayName("Debe registrar múltiples movimientos correctamente")
        void debeRegistrarMultiplesMovimientosCorrectamente() {

            producto.agregarStock(5);   // stock: 15
            producto.extraerStock(3);   // stock: 12
            producto.agregarStock(2);   // stock: 14

            List<Movimiento> movimientos = producto.getMovimientos();

            assertAll(
                    () -> assertEquals(3, movimientos.size()),

                    () -> assertEquals(
                            TipoMovimiento.ENTRADA,
                            movimientos.get(0).getTipo()
                    ),

                    () -> assertEquals(
                            TipoMovimiento.SALIDA,
                            movimientos.get(1).getTipo()
                    ),

                    () -> assertEquals(
                            TipoMovimiento.ENTRADA,
                            movimientos.get(2).getTipo()
                    ),

                    () -> assertEquals(14, producto.consultarStock())
            );
        }

        @ParameterizedTest
        @ValueSource(ints = {0, -2, -100})
        @DisplayName("Debe lanzar excepción al extraer cantidad no positiva")
        void debeLanzarExcepcionAlExtraerCantidadNoPositiva(int cantidadInvalida) {
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> producto.extraerStock(cantidadInvalida)
            );

            assertEquals("La cantidad a extraer debe ser positiva", exception.getMessage());
        }

        @Test
        @DisplayName("Debe lanzar excepción cuando no hay stock suficiente")
        void debeLanzarExcepcionCuandoNoHayStockSuficiente() {
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> producto.extraerStock(20)
            );

            assertEquals("No hay stock suficiente para realizar la salida", exception.getMessage());
        }
    }

    @Nested
    @DisplayName("Consultas del producto")
    class ConsultaTests {

        @Test
        @DisplayName("Debe consultar el stock disponible")
        void debeConsultarStockDisponible() {
            assertEquals(10, producto.consultarStock());
        }

        @Test
        @DisplayName("Debe calcular el valor total del inventario")
        void debeCalcularValorTotal() {
            assertEquals(25000.00, producto.obtenerValorTotal());
        }

        @Test
        @DisplayName("Debe calcular valor total actualizado después de modificar stock")
        void debeCalcularValorTotalActualizado() {
            producto.agregarStock(2);
            producto.extraerStock(4);

            assertEquals(20000.00, producto.obtenerValorTotal());
        }

        @Test
        @DisplayName("No debe permitir modificar directamente la lista de movimientos")
        void noDebePermitirModificarListaMovimientos() {
            producto.agregarStock(5);

            assertThrows(
                    UnsupportedOperationException.class,
                    () -> producto.getMovimientos().add(new Movimiento(TipoMovimiento.ENTRADA, 1))
            );
        }
    }

    @Nested
    @DisplayName("Validaciones de Movimiento")
    class MovimientoTests {

        @Test
        @DisplayName("Debe crear un movimiento válido")
        void debeCrearMovimientoValido() {
            Movimiento movimiento = new Movimiento(TipoMovimiento.ENTRADA, 5);

            assertAll(
                    () -> assertEquals(TipoMovimiento.ENTRADA, movimiento.getTipo()),
                    () -> assertEquals(5, movimiento.getCantidad()),
                    () -> assertNotNull(movimiento.getFecha())
            );
        }

        @Test
        @DisplayName("Debe lanzar excepción si el tipo de movimiento es nulo")
        void debeLanzarExcepcionSiTipoMovimientoEsNulo() {
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> new Movimiento(null, 5)
            );

            assertEquals("El tipo de movimiento no puede ser nulo", exception.getMessage());
        }

        @ParameterizedTest
        @ValueSource(ints = {0, -1, -10})
        @DisplayName("Debe lanzar excepción si la cantidad del movimiento no es positiva")
        void debeLanzarExcepcionSiCantidadMovimientoNoEsPositiva(int cantidadInvalida) {
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> new Movimiento(TipoMovimiento.ENTRADA, cantidadInvalida)
            );

            assertEquals("La cantidad del movimiento debe ser positiva", exception.getMessage());
        }
    }
}