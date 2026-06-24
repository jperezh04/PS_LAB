package com.lab04.carrito;

import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.lab04.carrito.CarritoCompra;
import com.lab04.model.ItemCarrito;
import com.lab04.model.Producto;
import com.lab04.service.ServicioPrecio;

import org.mockito.ArgumentMatchers;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias 
 */
@DisplayName("Pruebas del CarritoCompra")
class CarritoCompraTest {

    @Mock
    private ServicioPrecio servicioPrecioMock;

    private CarritoCompra carrito;
    private Producto productoA;
    private Producto productoB;
    private AutoCloseable closeable;

    @BeforeEach
    void setUp() {
        closeable        = MockitoAnnotations.openMocks(this);
        carrito          = new CarritoCompra(servicioPrecioMock);
        productoA        = new Producto("P001", "Laptop", 2500.0, true);
        productoB        = new Producto("P002", "Mouse",    80.0, true);

        // Comportamiento por defecto del mock: sin impuesto ni descuento
        lenient().when(servicioPrecioMock.calcularImpuesto(ArgumentMatchers.anyDouble())).thenReturn(0.0);
        lenient().when(servicioPrecioMock.calcularDescuento(ArgumentMatchers.anyDouble())).thenReturn(0.0);
    }

    @AfterEach
    void tearDown() throws Exception {
        closeable.close();
        System.out.println("Prueba finalizada. Items en carrito: " + carrito.cantidadProductosDistintos());
    }

    // Operaciones básicas (sin mock de cálculo)

    @Nested
    @DisplayName("Operaciones básicas del carrito")
    class OperacionesBasicas {

        @Test
        @DisplayName("Carrito inicia vacío")
        void testCarritoIniciaVacio() {
            assertTrue(carrito.estaVacio(), "El carrito debe iniciar vacío");
            assertEquals(0, carrito.cantidadProductosDistintos());
        }

        @Test
        @DisplayName("Agregar un producto al carrito")
        void testAgregarProducto() {
            carrito.agregarProducto(productoA, 1);
            assertEquals(1, carrito.cantidadProductosDistintos());
            assertEquals("Laptop", carrito.getItems().get(0).getProducto().getNombre());
        }

        @Test
        @DisplayName("Agregar dos productos distintos")
        void testAgregarDosProductos() {
            carrito.agregarProducto(productoA, 1);
            carrito.agregarProducto(productoB, 2);
            assertEquals(2, carrito.cantidadProductosDistintos());
        }

        @Test
        @DisplayName("Agregar producto duplicado actualiza la cantidad")
        void testAgregarProductoDuplicadoActualizaCantidad() {
            carrito.agregarProducto(productoA, 1);
            carrito.agregarProducto(productoA, 3);
            assertEquals(1, carrito.cantidadProductosDistintos(), "No debe haber duplicados, solo actualizar");
            assertEquals(4, carrito.getItems().get(0).getCantidad());
        }

        @Test
        @DisplayName("Remover producto existente del carrito")
        void testRemoverProducto() {
            carrito.agregarProducto(productoA, 1);
            carrito.agregarProducto(productoB, 1);
            carrito.removerProducto("P001");
            assertEquals(1, carrito.cantidadProductosDistintos());
            assertEquals("P002", carrito.getItems().get(0).getProducto().getId());
        }

        @Test
        @DisplayName("Vaciar el carrito deja sin items")
        void testVaciarCarrito() {
            carrito.agregarProducto(productoA, 2);
            carrito.agregarProducto(productoB, 1);
            carrito.vaciar();
            assertTrue(carrito.estaVacio());
            assertEquals(0, carrito.cantidadProductosDistintos());
        }

        @Test
        @DisplayName("Total de carrito vacío es cero")
        void testTotalCarritoVacio() {
            assertEquals(0.0, carrito.calcularTotal(), 0.001);
        }

        @Test
        @DisplayName("Resumen de carrito vacío muestra mensaje")
        void testResumenCarritoVacio() {
            assertEquals("El carrito está vacío.", carrito.obtenerResumenCompra());
        }

        @Test
        @DisplayName("Historial registra operaciones")
        void testHistorialRegistraOperaciones() {
            carrito.agregarProducto(productoA, 1);
            carrito.removerProducto("P001");
            carrito.vaciar();
            assertEquals(3, carrito.getHistorialOperaciones().size());
        }
    }

    // GRUPO 2 — Cálculo de total con Mockito

    @Nested
    @DisplayName("Cálculo de total con ServicioPrecio mockeado")
    class CalculoTotalConMock {

        @Test
        @DisplayName("Total sin impuesto ni descuento es igual al subtotal")
        void testTotalSinImpuestoNiDescuento() {
            carrito.agregarProducto(productoA, 1); // 2500.0
            when(servicioPrecioMock.calcularDescuento(2500.0)).thenReturn(0.0);
            when(servicioPrecioMock.calcularImpuesto(2500.0)).thenReturn(0.0);

            assertEquals(2500.0, carrito.calcularTotal(), 0.001);
        }

        @Test
        @DisplayName("Total con IGV 18% se agrega correctamente")
        void testTotalConImpuesto18() {
            carrito.agregarProducto(productoA, 1); 
            when(servicioPrecioMock.calcularDescuento(2500.0)).thenReturn(0.0);
            when(servicioPrecioMock.calcularImpuesto(2500.0)).thenReturn(450.0); 

            assertEquals(2950.0, carrito.calcularTotal(), 0.001);
        }

        @Test
        @DisplayName("Total con descuento del 10% se resta correctamente")
        void testTotalConDescuento10() {
            carrito.agregarProducto(productoA, 1); 
            when(servicioPrecioMock.calcularDescuento(2500.0)).thenReturn(250.0); 
            when(servicioPrecioMock.calcularImpuesto(2250.0)).thenReturn(0.0); 

            assertEquals(2250.0, carrito.calcularTotal(), 0.001);
        }

        @Test
        @DisplayName("Total con impuesto y descuento combinados")
        void testTotalConImpuestoYDescuento() {
            carrito.agregarProducto(productoA, 1); 
            when(servicioPrecioMock.calcularDescuento(2500.0)).thenReturn(250.0); 
            when(servicioPrecioMock.calcularImpuesto(2250.0)).thenReturn(450.0);  

            assertEquals(2700.0, carrito.calcularTotal(), 0.001);
        }

        @Test
        @DisplayName("Total con múltiples productos y mock")
        void testTotalMultiplesProductosConMock() {
            carrito.agregarProducto(productoA, 1); 
            carrito.agregarProducto(productoB, 2); 
            double subtotal = 2660.0;

            when(servicioPrecioMock.calcularDescuento(subtotal)).thenReturn(266.0); 
            when(servicioPrecioMock.calcularImpuesto(2394.0)).thenReturn(478.8);   

            assertEquals(2872.8, carrito.calcularTotal(), 0.01);
        }

        @Test
        @DisplayName("Resumen contiene el total calculado con mock")
        void testResumenContieneTotal() {
            carrito.agregarProducto(productoB, 1); 
            when(servicioPrecioMock.calcularDescuento(80.0)).thenReturn(0.0);
            when(servicioPrecioMock.calcularImpuesto(80.0)).thenReturn(14.4);

            String resumen = carrito.obtenerResumenCompra();
            assertTrue(resumen.contains("Mouse"));
            assertTrue(resumen.contains("94.40") || resumen.contains("94,40"));
        }
    }

    // GRUPO 3 — Verificación de llamadas al mock (verify)

    @Nested
    @DisplayName("Verificación de interacciones con ServicioPrecio")
    class VerificacionInteracciones {

        @Test
        @DisplayName("calcularTotal llama exactamente una vez a calcularImpuesto")
        void testLlamaUnaVezImpuesto() {
            carrito.agregarProducto(productoA, 1);
            carrito.calcularTotal();
            verify(servicioPrecioMock, times(1)).calcularImpuesto(2500.0);
        }

        @Test
        @DisplayName("calcularTotal llama exactamente una vez a calcularDescuento")
        void testLlamaUnaVezDescuento() {
            carrito.agregarProducto(productoA, 1);
            carrito.calcularTotal();
            verify(servicioPrecioMock, times(1)).calcularDescuento(2500.0);
        }

        @Test
        @DisplayName("calcularTotal llama a ambos métodos del servicio")
        void testLlamaAmbosMétodos() {
            carrito.agregarProducto(productoB, 2); 
            carrito.calcularTotal();

            verify(servicioPrecioMock).calcularDescuento(160.0);
            verify(servicioPrecioMock).calcularImpuesto(160.0);
            verifyNoMoreInteractions(servicioPrecioMock);
        }

        @Test
        @DisplayName("Se llama al servicio con 0 si el carrito está vacío")
        void testNoLlamaServicioCarritoVacio() {
            carrito.calcularTotal();
            verify(servicioPrecioMock, times(1)).calcularDescuento(0.0);
            verify(servicioPrecioMock, times(1)).calcularImpuesto(0.0);
        }

        @Test
        @DisplayName("Varias llamadas a calcularTotal invocan el servicio cada vez")
        void testMultiplesLlamadasAlServicio() {
            carrito.agregarProducto(productoA, 1);
            carrito.calcularTotal();
            carrito.calcularTotal();
            carrito.calcularTotal();
            verify(servicioPrecioMock, times(3)).calcularDescuento(2500.0);
            verify(servicioPrecioMock, times(3)).calcularImpuesto(2500.0);
        }
    }

    // GRUPO 4 — Pruebas parametrizadas

    @Nested
    @DisplayName("Pruebas parametrizadas de montos y cantidades")
    class PruebasParametrizadas {

        @ParameterizedTest
        @DisplayName("Agregar distintas cantidades válidas del mismo producto")
        @ValueSource(ints = {1, 2, 5, 10, 50, 100})
        void testAgregarCantidadesValidas(int cantidad) {
            carrito.agregarProducto(productoB, cantidad); 
            assertEquals(cantidad, carrito.getItems().get(0).getCantidad());
        }

        @ParameterizedTest
        @DisplayName("Subtotal correcto para distintas cantidades")
        @CsvSource({
            "1,  80.0",
            "2, 160.0",
            "5, 400.0",
            "10, 800.0"
        })
        void testSubtotalSegunCantidad(int cantidad, double subtotalEsperado) {
            carrito.agregarProducto(productoB, cantidad);
            assertEquals(subtotalEsperado, carrito.getItems().get(0).getSubtotal(), 0.001);
        }

        @ParameterizedTest
        @DisplayName("Total con diferentes tasas de impuesto")
        @CsvSource({
            "0.0,   2500.0",
            "250.0, 2750.0",
            "450.0, 2950.0",
            "500.0, 3000.0"
        })
        void testTotalConDiferentesImpuestos(double impuesto, double totalEsperado) {
            carrito.agregarProducto(productoA, 1); 
            when(servicioPrecioMock.calcularDescuento(2500.0)).thenReturn(0.0);
            when(servicioPrecioMock.calcularImpuesto(2500.0)).thenReturn(impuesto);
            assertEquals(totalEsperado, carrito.calcularTotal(), 0.001);
        }

        @ParameterizedTest
        @DisplayName("Total con diferentes tasas de descuento")
        @CsvSource({
            "0.0,   2500.0",
            "125.0, 2375.0",
            "250.0, 2250.0",
            "500.0, 2000.0"
        })
        void testTotalConDiferentesDescuentos(double descuento, double totalEsperado) {
            carrito.agregarProducto(productoA, 1); 
            double baseEsperada = 2500.0 - descuento;
            when(servicioPrecioMock.calcularDescuento(2500.0)).thenReturn(descuento);
            when(servicioPrecioMock.calcularImpuesto(baseEsperada)).thenReturn(0.0);
            assertEquals(totalEsperado, carrito.calcularTotal(), 0.001);
        }
    }

    // GRUPO 5 — Validaciones y excepciones

    @Nested
    @DisplayName("Validaciones y excepciones")
    class ValidacionesYExcepciones {

        @Test
        @DisplayName("No se puede agregar producto no disponible")
        void testNoAgregarProductoNoDisponible() {
            Producto noDisponible = new Producto("P003", "Teclado", 150.0, false);
            assertThrows(IllegalStateException.class,
                () -> carrito.agregarProducto(noDisponible, 1));
        }

        @Test
        @DisplayName("No se puede agregar cantidad cero o negativa")
        void testNoAgregarCantidadNegativa() {
            assertThrows(IllegalArgumentException.class, () -> carrito.agregarProducto(productoA, 0));
            assertThrows(IllegalArgumentException.class, () -> carrito.agregarProducto(productoA, -5));
        }

        @Test
        @DisplayName("No se puede agregar producto nulo")
        void testNoAgregarProductoNulo() {
            assertThrows(IllegalArgumentException.class, () -> carrito.agregarProducto(null, 1));
        }

        @Test
        @DisplayName("Remover producto que no existe lanza excepción")
        void testRemoverProductoInexistente() {
            carrito.agregarProducto(productoA, 1);
            assertThrows(IllegalArgumentException.class, () -> carrito.removerProducto("ID_INEXISTENTE"));
        }

        @Test
        @DisplayName("Remover con ID nulo lanza excepción")
        void testRemoverIdNulo() {
            assertThrows(IllegalArgumentException.class, () -> carrito.removerProducto(null));
        }

        @Test
        @DisplayName("Crear carrito con ServicioPrecio nulo lanza excepción")
        void testCarritoSinServicioLanzaExcepcion() {
            assertThrows(IllegalArgumentException.class, () -> new CarritoCompra(null));
        }

        @Test
        @DisplayName("Mensaje de excepción al agregar producto no disponible es descriptivo")
        void testMensajeExcepcionProductoNoDisponible() {
            Producto noDisponible = new Producto("P099", "Monitor", 900.0, false);
            IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> carrito.agregarProducto(noDisponible, 1));
            assertTrue(ex.getMessage().contains("Monitor"));
        }
    }


    // GRUPO 6 — Casos límite

    @Nested
    @DisplayName("Casos límite")
    class CasosLimite {

        @Test
        @DisplayName("Carrito con exactamente 1 producto calcula total correctamente")
        void testCarritoUnProducto() {
            carrito.agregarProducto(productoB, 1); 
            when(servicioPrecioMock.calcularDescuento(80.0)).thenReturn(0.0);
            when(servicioPrecioMock.calcularImpuesto(80.0)).thenReturn(14.4);
            assertEquals(94.4, carrito.calcularTotal(), 0.001);
        }

        @Test
        @DisplayName("Carrito con 100 productos distintos calcula cantidad correctamente")
        void testCarritoCienProductos() {
            for (int i = 1; i <= 100; i++) {
                Producto p = new Producto("P" + i, "Producto " + i, 10.0, true);
                carrito.agregarProducto(p, 1);
            }
            assertEquals(100, carrito.cantidadProductosDistintos());
        }

        @Test
        @DisplayName("Subtotal de 100 productos de S/10 es S/1000")
        void testSubtotalCienProductos() {
            for (int i = 1; i <= 100; i++) {
                Producto p = new Producto("P" + i, "Producto " + i, 10.0, true);
                carrito.agregarProducto(p, 1);
            }
            when(servicioPrecioMock.calcularDescuento(1000.0)).thenReturn(0.0);
            when(servicioPrecioMock.calcularImpuesto(1000.0)).thenReturn(0.0);
            assertEquals(1000.0, carrito.calcularTotal(), 0.001);
        }

        @Test
        @DisplayName("Vaciar y volver a agregar funciona correctamente")
        void testVaciarYReagregar() {
            carrito.agregarProducto(productoA, 1);
            carrito.vaciar();
            assertTrue(carrito.estaVacio());
            carrito.agregarProducto(productoB, 2);
            assertEquals(1, carrito.cantidadProductosDistintos());
            assertEquals(160.0, carrito.getItems().get(0).getSubtotal(), 0.001);
        }

        @Test
        @DisplayName("Remover todos los productos deja carrito vacío")
        void testRemoverTodosLosProductos() {
            carrito.agregarProducto(productoA, 1);
            carrito.agregarProducto(productoB, 1);
            carrito.removerProducto("P001");
            carrito.removerProducto("P002");
            assertTrue(carrito.estaVacio());
        }

        @Test
        @DisplayName("Descuento mayor que subtotal puede resultar en total negativo o cero")
        void testDescuentoMayorQueSubtotal() {
            carrito.agregarProducto(productoB, 1); 
            when(servicioPrecioMock.calcularDescuento(80.0)).thenReturn(100.0);
            when(servicioPrecioMock.calcularImpuesto(-20.0)).thenReturn(0.0); 
            assertEquals(-20.0, carrito.calcularTotal(), 0.001);
        }

    }
}