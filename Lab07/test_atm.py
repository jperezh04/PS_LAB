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


def cuenta(**kwargs):
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


@pytest.mark.parametrize(
    "cuenta_prueba, esperado",
    [
        (cuenta(), True),
        (cuenta(numero=""), False),
        (cuenta(numero="   "), False),
        (cuenta(titular=""), False),
        (cuenta(titular="   "), False),
        (cuenta(saldo=-10), False),
        (cuenta(estado="suspendida"), False),
        (cuenta(tipo="sueldo"), False),
    ],
)
def test_validar_cuenta(cuenta_prueba, esperado):
    assert validar_cuenta(cuenta_prueba) is esperado


def test_validar_pin_correcto_reinicia_intentos():
    c = cuenta(intentos_fallidos=2)
    assert validar_pin(c, "1234") == "PIN correcto"
    assert c.intentos_fallidos == 0


def test_validar_pin_cuenta_bloqueada():
    c = cuenta(estado="bloqueada")
    assert validar_pin(c, "1234") == "Cuenta bloqueada"


def test_validar_pin_cuenta_cancelada():
    c = cuenta(estado="cancelada")
    assert validar_pin(c, "1234") == "Cuenta cancelada"


def test_validar_pin_bloquea_si_ya_tiene_tres_intentos():
    c = cuenta(intentos_fallidos=3)
    assert validar_pin(c, "1234") == "Cuenta bloqueada"
    assert c.estado == "bloqueada"


def test_validar_pin_incorrecto_sin_bloquear():
    c = cuenta(intentos_fallidos=1)
    assert validar_pin(c, "0000") == "PIN incorrecto"
    assert c.intentos_fallidos == 2


def test_validar_pin_incorrecto_bloquea_al_tercer_intento():
    c = cuenta(intentos_fallidos=2)
    assert validar_pin(c, "0000") == "Cuenta bloqueada"
    assert c.estado == "bloqueada"


def test_consultar_saldo_aprobado():
    c = cuenta(saldo=520.555)
    resultado = consultar_saldo(c, "1234")

    assert resultado == {
        "estado": "aprobado",
        "mensaje": "Consulta realizada",
        "saldo": 520.55,
    }


def test_consultar_saldo_rechazado_por_pin():
    c = cuenta()
    resultado = consultar_saldo(c, "0000")

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "PIN incorrecto"
    assert resultado["saldo"] is None


@pytest.mark.parametrize(
    "cuenta_prueba, tipo_operacion, pais, esperado",
    [
        (cuenta(tipo="premium"), "retiro", "Perú", 0.0),
        (cuenta(tipo="ahorro"), "retiro", "Chile", 8.0),
        (cuenta(tipo="corriente"), "retiro", "Perú", 2.5),
        (cuenta(tipo="ahorro"), "transferencia", "Perú", 1.5),
        (cuenta(tipo="ahorro"), "consulta", "Perú", 0.0),
    ],
)
def test_calcular_comision(cuenta_prueba, tipo_operacion, pais, esperado):
    assert calcular_comision(cuenta_prueba, tipo_operacion, pais) == esperado


@pytest.mark.parametrize(
    "monto, esperado",
    [
        (0, "Monto inválido"),
        (-20, "Monto inválido"),
        (3001, "Monto supera el límite permitido"),
        (500, "Monto válido"),
    ],
)
def test_validar_monto(monto, esperado):
    assert validar_monto(monto) == esperado


def test_retirar_cuenta_invalida():
    c = cuenta(numero="")
    resultado = retirar(c, 100, "1234")

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "Cuenta inválida"


def test_retirar_pin_incorrecto():
    c = cuenta()
    resultado = retirar(c, 100, "0000")

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "PIN incorrecto"


def test_retirar_monto_invalido():
    c = cuenta()
    resultado = retirar(c, 0, "1234")

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "Monto inválido"


def test_retirar_saldo_insuficiente():
    c = cuenta(saldo=50)
    resultado = retirar(c, 100, "1234")

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "Saldo insuficiente"


def test_retirar_aprobado_con_comision_corriente():
    c = cuenta(tipo="corriente", saldo=500)
    resultado = retirar(c, 100, "1234")

    assert resultado == {
        "estado": "aprobado",
        "mensaje": "Retiro exitoso",
        "monto": 100,
        "comision": 2.5,
        "saldo": 397.5,
    }


def test_depositar_cuenta_invalida():
    c = cuenta(saldo=-1)
    resultado = depositar(c, 100)

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "Cuenta inválida"


def test_depositar_cuenta_no_activa():
    c = cuenta(estado="bloqueada")
    resultado = depositar(c, 100)

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "La cuenta no está activa"


def test_depositar_monto_invalido():
    c = cuenta()
    resultado = depositar(c, -50)

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "Monto inválido"


def test_depositar_aprobado():
    c = cuenta(saldo=200)
    resultado = depositar(c, 150)

    assert resultado == {
        "estado": "aprobado",
        "mensaje": "Depósito exitoso",
        "monto": 150,
        "saldo": 350,
    }


def test_transferir_cuenta_origen_invalida():
    origen = cuenta(numero="")
    destino = cuenta(numero="002")
    resultado = transferir(origen, destino, 100, "1234")

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "Cuenta origen inválida"


def test_transferir_cuenta_destino_invalida():
    origen = cuenta()
    destino = cuenta(numero="")
    resultado = transferir(origen, destino, 100, "1234")

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "Cuenta destino inválida"


def test_transferir_misma_cuenta():
    origen = cuenta(numero="001")
    destino = cuenta(numero="001")
    resultado = transferir(origen, destino, 100, "1234")

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "No se puede transferir a la misma cuenta"


def test_transferir_pin_incorrecto():
    origen = cuenta()
    destino = cuenta(numero="002")
    resultado = transferir(origen, destino, 100, "0000")

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "PIN incorrecto"


def test_transferir_monto_invalido():
    origen = cuenta()
    destino = cuenta(numero="002")
    resultado = transferir(origen, destino, 0, "1234")

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "Monto inválido"


def test_transferir_saldo_insuficiente():
    origen = cuenta(saldo=50)
    destino = cuenta(numero="002")
    resultado = transferir(origen, destino, 100, "1234")

    assert resultado["estado"] == "rechazado"
    assert resultado["mensaje"] == "Saldo insuficiente"


def test_transferir_aprobado():
    origen = cuenta(saldo=500)
    destino = cuenta(numero="002", saldo=100)
    resultado = transferir(origen, destino, 100, "1234")

    assert resultado == {
        "estado": "aprobado",
        "mensaje": "Transferencia exitosa",
        "monto": 100,
        "comision": 1.5,
        "saldo_origen": 398.5,
        "saldo_destino": 200,
    }


@pytest.mark.parametrize(
    "monto, pais, tipo, esperado",
    [
        (2000, "Chile", "retiro", "Operación de alto riesgo"),
        (2000, "Perú", "retiro", "Operación monitoreada"),
        (500, "Perú", "transferencia", "Operación monitoreada"),
        (50, "Perú", "retiro", "Operación pequeña"),
        (500, "Perú", "retiro", "Operación normal"),
    ],
)
def test_clasificar_operacion(monto, pais, tipo, esperado):
    assert clasificar_operacion(monto, pais, tipo) == esperado


def test_procesar_transaccion_consulta():
    origen = cuenta(saldo=700)
    t = Transaccion(tipo="consulta", monto=0, cuenta_origen=origen)

    resultado = procesar_transaccion(t, "1234")

    assert resultado["estado"] == "aprobado"
    assert resultado["saldo"] == 700


def test_procesar_transaccion_retiro_aprobado_agrega_clasificacion():
    origen = cuenta(saldo=1000)
    t = Transaccion(tipo="retiro", monto=50, cuenta_origen=origen)

    resultado = procesar_transaccion(t, "1234")

    assert resultado["estado"] == "aprobado"
    assert resultado["clasificacion"] == "Operación pequeña"


def test_procesar_transaccion_deposito_aprobado_agrega_clasificacion():
    origen = cuenta(saldo=100)
    t = Transaccion(tipo="deposito", monto=300, cuenta_origen=origen)

    resultado = procesar_transaccion(t, "1234")

    assert resultado["estado"] == "aprobado"
    assert resultado["clasificacion"] == "Operación normal"


def test_procesar_transaccion_transferencia_sin_destino():
    origen = cuenta()
    t = Transaccion(tipo="transferencia", monto=100, cuenta_origen=origen)

    resultado = procesar_transaccion(t, "1234")

    assert resultado == {
        "estado": "rechazado",
        "mensaje": "Cuenta destino requerida",
    }


def test_procesar_transaccion_transferencia_aprobada():
    origen = cuenta(saldo=1000)
    destino = cuenta(numero="002", saldo=100)
    t = Transaccion(
        tipo="transferencia",
        monto=100,
        cuenta_origen=origen,
        cuenta_destino=destino,
    )

    resultado = procesar_transaccion(t, "1234")

    assert resultado["estado"] == "aprobado"
    assert resultado["clasificacion"] == "Operación monitoreada"


def test_procesar_transaccion_tipo_invalido():
    origen = cuenta()
    t = Transaccion(tipo="pago_servicio", monto=100, cuenta_origen=origen)

    resultado = procesar_transaccion(t, "1234")

    assert resultado == {
        "estado": "rechazado",
        "mensaje": "Tipo de transacción inválido",
    }


def test_procesar_transaccion_rechazada_no_agrega_clasificacion():
    origen = cuenta(saldo=50)
    t = Transaccion(tipo="retiro", monto=100, cuenta_origen=origen)

    resultado = procesar_transaccion(t, "1234")

    assert resultado["estado"] == "rechazado"
    assert "clasificacion" not in resultado