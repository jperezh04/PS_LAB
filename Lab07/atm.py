from dataclasses import dataclass


@dataclass
class Cuenta:
    numero: str
    titular: str
    pin: str
    saldo: float
    estado: str
    tipo: str
    intentos_fallidos: int = 0


@dataclass
class Transaccion:
    tipo: str
    monto: float
    cuenta_origen: Cuenta
    cuenta_destino: Cuenta | None = None
    pais_operacion: str = "Perú"


def validar_cuenta(cuenta: Cuenta) -> bool:
    if not cuenta.numero or cuenta.numero.strip() == "":
        return False

    if not cuenta.titular or cuenta.titular.strip() == "":
        return False

    if cuenta.saldo < 0:
        return False

    if cuenta.estado not in ["activa", "bloqueada", "cancelada"]:
        return False

    if cuenta.tipo not in ["ahorro", "corriente", "premium"]:
        return False

    return True


def validar_pin(cuenta: Cuenta, pin_ingresado: str) -> str:
    if cuenta.estado == "bloqueada":
        return "Cuenta bloqueada"

    if cuenta.estado == "cancelada":
        return "Cuenta cancelada"

    if cuenta.intentos_fallidos >= 3:
        cuenta.estado = "bloqueada"
        return "Cuenta bloqueada"

    if pin_ingresado == cuenta.pin:
        cuenta.intentos_fallidos = 0
        return "PIN correcto"

    cuenta.intentos_fallidos += 1

    if cuenta.intentos_fallidos >= 3:
        cuenta.estado = "bloqueada"
        return "Cuenta bloqueada"

    return "PIN incorrecto"


def consultar_saldo(cuenta: Cuenta, pin_ingresado: str) -> dict:
    resultado_pin = validar_pin(cuenta, pin_ingresado)

    if resultado_pin != "PIN correcto":
        return {
            "estado": "rechazado",
            "mensaje": resultado_pin,
            "saldo": None
        }

    return {
        "estado": "aprobado",
        "mensaje": "Consulta realizada",
        "saldo": round(cuenta.saldo, 2)
    }


def calcular_comision(cuenta: Cuenta, tipo_operacion: str, pais_operacion: str) -> float:
    if cuenta.tipo == "premium":
        return 0.0

    if pais_operacion != "Perú":
        return 8.0

    if tipo_operacion == "retiro" and cuenta.tipo == "corriente":
        return 2.5

    if tipo_operacion == "transferencia":
        return 1.5

    return 0.0


def validar_monto(monto: float) -> str:
    if monto <= 0:
        return "Monto inválido"

    if monto > 3000:
        return "Monto supera el límite permitido"

    return "Monto válido"


def retirar(cuenta: Cuenta, monto: float, pin_ingresado: str, pais_operacion: str = "Perú") -> dict:
    if not validar_cuenta(cuenta):
        return {
            "estado": "rechazado",
            "mensaje": "Cuenta inválida",
            "saldo": cuenta.saldo
        }

    resultado_pin = validar_pin(cuenta, pin_ingresado)

    if resultado_pin != "PIN correcto":
        return {
            "estado": "rechazado",
            "mensaje": resultado_pin,
            "saldo": cuenta.saldo
        }

    resultado_monto = validar_monto(monto)

    if resultado_monto != "Monto válido":
        return {
            "estado": "rechazado",
            "mensaje": resultado_monto,
            "saldo": cuenta.saldo
        }

    comision = calcular_comision(cuenta, "retiro", pais_operacion)
    total_debito = monto + comision

    if cuenta.saldo < total_debito:
        return {
            "estado": "rechazado",
            "mensaje": "Saldo insuficiente",
            "saldo": cuenta.saldo
        }

    cuenta.saldo -= total_debito

    return {
        "estado": "aprobado",
        "mensaje": "Retiro exitoso",
        "monto": round(monto, 2),
        "comision": round(comision, 2),
        "saldo": round(cuenta.saldo, 2)
    }


def depositar(cuenta: Cuenta, monto: float) -> dict:
    if not validar_cuenta(cuenta):
        return {
            "estado": "rechazado",
            "mensaje": "Cuenta inválida",
            "saldo": cuenta.saldo
        }

    if cuenta.estado != "activa":
        return {
            "estado": "rechazado",
            "mensaje": "La cuenta no está activa",
            "saldo": cuenta.saldo
        }

    resultado_monto = validar_monto(monto)

    if resultado_monto != "Monto válido":
        return {
            "estado": "rechazado",
            "mensaje": resultado_monto,
            "saldo": cuenta.saldo
        }

    cuenta.saldo += monto

    return {
        "estado": "aprobado",
        "mensaje": "Depósito exitoso",
        "monto": round(monto, 2),
        "saldo": round(cuenta.saldo, 2)
    }


def transferir(
    cuenta_origen: Cuenta,
    cuenta_destino: Cuenta,
    monto: float,
    pin_ingresado: str,
    pais_operacion: str = "Perú"
) -> dict:
    if not validar_cuenta(cuenta_origen):
        return {
            "estado": "rechazado",
            "mensaje": "Cuenta origen inválida",
            "saldo_origen": cuenta_origen.saldo
        }

    if not validar_cuenta(cuenta_destino):
        return {
            "estado": "rechazado",
            "mensaje": "Cuenta destino inválida",
            "saldo_origen": cuenta_origen.saldo
        }

    if cuenta_origen.numero == cuenta_destino.numero:
        return {
            "estado": "rechazado",
            "mensaje": "No se puede transferir a la misma cuenta",
            "saldo_origen": cuenta_origen.saldo
        }

    resultado_pin = validar_pin(cuenta_origen, pin_ingresado)

    if resultado_pin != "PIN correcto":
        return {
            "estado": "rechazado",
            "mensaje": resultado_pin,
            "saldo_origen": cuenta_origen.saldo
        }

    resultado_monto = validar_monto(monto)

    if resultado_monto != "Monto válido":
        return {
            "estado": "rechazado",
            "mensaje": resultado_monto,
            "saldo_origen": cuenta_origen.saldo
        }

    comision = calcular_comision(cuenta_origen, "transferencia", pais_operacion)
    total_debito = monto + comision

    if cuenta_origen.saldo < total_debito:
        return {
            "estado": "rechazado",
            "mensaje": "Saldo insuficiente",
            "saldo_origen": cuenta_origen.saldo
        }

    cuenta_origen.saldo -= total_debito
    cuenta_destino.saldo += monto

    return {
        "estado": "aprobado",
        "mensaje": "Transferencia exitosa",
        "monto": round(monto, 2),
        "comision": round(comision, 2),
        "saldo_origen": round(cuenta_origen.saldo, 2),
        "saldo_destino": round(cuenta_destino.saldo, 2)
    }


def clasificar_operacion(monto: float, pais_operacion: str, tipo_operacion: str) -> str:
    if monto >= 2000 and pais_operacion != "Perú":
        return "Operación de alto riesgo"

    if monto >= 2000 or tipo_operacion == "transferencia":
        return "Operación monitoreada"

    if monto < 100:
        return "Operación pequeña"

    return "Operación normal"


def procesar_transaccion(transaccion: Transaccion, pin_ingresado: str) -> dict:
    if transaccion.tipo == "consulta":
        return consultar_saldo(transaccion.cuenta_origen, pin_ingresado)

    if transaccion.tipo == "retiro":
        resultado = retirar(
            transaccion.cuenta_origen,
            transaccion.monto,
            pin_ingresado,
            transaccion.pais_operacion
        )
    elif transaccion.tipo == "deposito":
        resultado = depositar(
            transaccion.cuenta_origen,
            transaccion.monto
        )
    elif transaccion.tipo == "transferencia":
        if transaccion.cuenta_destino is None:
            return {
                "estado": "rechazado",
                "mensaje": "Cuenta destino requerida"
            }

        resultado = transferir(
            transaccion.cuenta_origen,
            transaccion.cuenta_destino,
            transaccion.monto,
            pin_ingresado,
            transaccion.pais_operacion
        )
    else:
        return {
            "estado": "rechazado",
            "mensaje": "Tipo de transacción inválido"
        }

    if resultado["estado"] == "aprobado":
        resultado["clasificacion"] = clasificar_operacion(
            transaccion.monto,
            transaccion.pais_operacion,
            transaccion.tipo
        )

    return resultado