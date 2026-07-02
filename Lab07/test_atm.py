import pytest

from atm import (
    Cuenta,
    Transaccion,
    validar_cuenta,
    validar_pin,
    consultar_saldo,
    calcular_comision,
    validar_monto,
    retirar,
    depositar,
    transferir,
    clasificar_operacion,
    procesar_transaccion,
)


def crear_cuenta(**kwargs):
    datos = {
        "numero": "001",
        "titular": "Jeremy Perez",
        "pin": "1234",
        "saldo": 1000.0,
        "estado": "activa",
        "tipo": "ahorro",
        "intentos_fallidos": 0,
    }
    datos.update(kwargs)
    return Cuenta(**datos)

# =========================================================
# 2. STATEMENT TESTING
# =========================================================


@pytest.mark.parametrize(
    "cuenta_prueba, esperado",
    [
        (crear_cuenta(numero=""), False),
        (crear_cuenta(numero="   "), False),
        (crear_cuenta(titular=""), False),
        (crear_cuenta(titular="   "), False),
        (crear_cuenta(saldo=-10), False),
        (crear_cuenta(estado="suspendida"), False),
        (crear_cuenta(tipo="sueldo"), False),
    ],
)
def test_statement_validar_cuenta(cuenta_prueba, esperado):
    resultado = validar_cuenta(cuenta_prueba)

    assert resultado is esperado

# =========================================================
# 2. BRANCH TESTING
# =========================================================



@pytest.mark.parametrize(
    "cuenta_prueba, pin, esperado, estado_esperado",
    [
        (crear_cuenta(intentos_fallidos=2), "0000", "Cuenta bloqueada", "bloqueada"),
        (crear_cuenta(estado="bloqueada"), "1234", "Cuenta bloqueada", "bloqueada"),
        (crear_cuenta(estado="cancelada"), "1234", "Cuenta cancelada", "cancelada"),
        (crear_cuenta(intentos_fallidos=3), "1234", "Cuenta bloqueada", "bloqueada"),
    ],
)
def test_branch_validar_pin(cuenta_prueba, pin, esperado, estado_esperado):
    resultado = validar_pin(cuenta_prueba, pin)

    assert resultado == esperado
    assert cuenta_prueba.estado == estado_esperado


def test_branch_consultar_saldo_rechazada_por_pin():
    cuenta = crear_cuenta()

    resultado = consultar_saldo(cuenta, "0000")

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "PIN incorrecto"
    assert resultado["saldo"] is None


def test_branch_validar_monto_supera_limite():
    resultado = validar_monto(3001)

    assert resultado == "Monto supera el límite permitido"


@pytest.mark.parametrize(
    "cuenta_prueba, tipo_operacion, pais, esperado",
    [
        (crear_cuenta(tipo="premium"), "retiro", "Perú", 0.0),
        (crear_cuenta(tipo="ahorro"), "retiro", "Chile", 8.0),
        (crear_cuenta(tipo="corriente"), "retiro", "Perú", 2.5),
    ],
)
def test_branch_calcular_comision(cuenta_prueba, tipo_operacion, pais, esperado):
    resultado = calcular_comision(cuenta_prueba, tipo_operacion, pais)

    assert resultado == esperado


@pytest.mark.parametrize(
    "cuenta_prueba, monto, pin, esperado",
    [
        (crear_cuenta(numero=""), 100, "1234", "Cuenta inválida"),
        (crear_cuenta(), 100, "0000", "PIN incorrecto"),
        (crear_cuenta(), 0, "1234", "Monto inválido"),
        (crear_cuenta(saldo=50), 100, "1234", "Saldo insuficiente"),
    ],
)
def test_branch_retirar_rechazado(cuenta_prueba, monto, pin, esperado):
    resultado = retirar(cuenta_prueba, monto, pin)

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == esperado


@pytest.mark.parametrize(
    "cuenta_prueba, monto, esperado",
    [
        (crear_cuenta(saldo=-1), 100, "Cuenta inválida"),
        (crear_cuenta(estado="bloqueada"), 100, "La cuenta no está activa"),
        (crear_cuenta(), -50, "Monto inválido"),
    ],
)
def test_branch_depositar_rechazado(cuenta_prueba, monto, esperado):
    resultado = depositar(cuenta_prueba, monto)

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == esperado


@pytest.mark.parametrize(
    "origen, destino, monto, pin, esperado",
    [
        (
            crear_cuenta(numero=""),
            crear_cuenta(numero="002"),
            100,
            "1234",
            "Cuenta origen inválida",
        ),
        (
            crear_cuenta(),
            crear_cuenta(numero=""),
            100,
            "1234",
            "Cuenta destino inválida",
        ),
        (
            crear_cuenta(numero="001"),
            crear_cuenta(numero="001"),
            100,
            "1234",
            "No se puede transferir a la misma cuenta",
        ),
        (
            crear_cuenta(),
            crear_cuenta(numero="002"),
            100,
            "0000",
            "PIN incorrecto",
        ),
        (
            crear_cuenta(),
            crear_cuenta(numero="002"),
            0,
            "1234",
            "Monto inválido",
        ),
        (
            crear_cuenta(saldo=50),
            crear_cuenta(numero="002"),
            100,
            "1234",
            "Saldo insuficiente",
        ),
    ],
)
def test_branch_transferir_rechazado(origen, destino, monto, pin, esperado):
    resultado = transferir(origen, destino, monto, pin)

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == esperado


# =========================================================
# 3. BRANCH CONDITION COMBINATION TESTING
# =========================================================

@pytest.mark.parametrize(
    "monto, pais_operacion, tipo_operacion, esperado, tabla_verdad",
    [
        (2000, "Chile", "transferencia", "Operación de alto riesgo", "V-V-V"),
        (2000, "Chile", "retiro", "Operación de alto riesgo", "V-V-F"),
        (2000, "Perú", "transferencia", "Operación monitoreada", "V-F-V"),
        (2000, "Perú", "retiro", "Operación monitoreada", "V-F-F"),
        (500, "Chile", "transferencia", "Operación monitoreada", "F-V-V"),
        (500, "Chile", "retiro", "Operación normal", "F-V-F"),
        (500, "Perú", "transferencia", "Operación monitoreada", "F-F-V"),
        (500, "Perú", "retiro", "Operación normal", "F-F-F"),
    ],
)
def test_branch_condition_combination_clasificar_operacion(
    monto,
    pais_operacion,
    tipo_operacion,
    esperado,
    tabla_verdad,
):
    resultado = clasificar_operacion(monto, pais_operacion, tipo_operacion)

    assert resultado == esperado


def test_branch_condition_operacion_pequena():
    resultado = clasificar_operacion(
        monto=50,
        pais_operacion="Perú",
        tipo_operacion="retiro",
    )

    assert resultado == "Operación pequeña"


# =========================================================
# 4. FLUJO GENERAL DEL ATM / STATEMENT TESTING
# =========================================================

def test_procesar_transaccion_consulta():
    origen = crear_cuenta(saldo=700)
    transaccion = Transaccion(tipo="consulta", monto=0, cuenta_origen=origen)

    resultado = procesar_transaccion(transaccion, "1234")

    assert resultado["estado"] == "aprobado"
    assert resultado["saldo"] == 700


def test_procesar_transaccion_retiro_aprobado_agrega_clasificacion():
    origen = crear_cuenta(saldo=1000)
    transaccion = Transaccion(tipo="retiro", monto=50, cuenta_origen=origen)

    resultado = procesar_transaccion(transaccion, "1234")

    assert resultado["estado"] == "aprobado"
    assert resultado["clasificacion"] == "Operación pequeña"


def test_procesar_transaccion_deposito_aprobado_agrega_clasificacion():
    origen = crear_cuenta(saldo=100)
    transaccion = Transaccion(tipo="deposito", monto=300, cuenta_origen=origen)

    resultado = procesar_transaccion(transaccion, "1234")

    assert resultado["estado"] == "aprobado"
    assert resultado["clasificacion"] == "Operación normal"


def test_procesar_transaccion_transferencia_sin_destino():
    origen = crear_cuenta()
    transaccion = Transaccion(
        tipo="transferencia",
        monto=100,
        cuenta_origen=origen,
    )

    resultado = procesar_transaccion(transaccion, "1234")

    assert resultado == {
        "estado": "rechazado",
        "mensaje": "Cuenta destino requerida",
    }


def test_procesar_transaccion_transferencia_aprobada():
    origen = crear_cuenta(saldo=1000)
    destino = crear_cuenta(numero="002", saldo=100)
    transaccion = Transaccion(
        tipo="transferencia",
        monto=100,
        cuenta_origen=origen,
        cuenta_destino=destino,
    )

    resultado = procesar_transaccion(transaccion, "1234")

    assert resultado["estado"] == "aprobado"
    assert resultado["clasificacion"] == "Operación monitoreada"


def test_procesar_transaccion_tipo_invalido():
    origen = crear_cuenta()
    transaccion = Transaccion(
        tipo="pago_servicio",
        monto=100,
        cuenta_origen=origen,
    )

    resultado = procesar_transaccion(transaccion, "1234")

    assert resultado == {
        "estado": "rechazado",
        "mensaje": "Tipo de transacción inválido",
    }


def test_procesar_transaccion_rechazada_no_agrega_clasificacion():
    origen = crear_cuenta(saldo=50)
    transaccion = Transaccion(tipo="retiro", monto=100, cuenta_origen=origen)

    resultado = procesar_transaccion(transaccion, "1234")

    assert resultado["estado"] == "rechazado"
    assert "clasificacion" not in resultado