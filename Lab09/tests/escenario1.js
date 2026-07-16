import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 20,
    duration: '30s',
};

export default function () {

    const payload = JSON.stringify({
        concierto_id: 1,
        comprador: "Usuario K6",
        correo: "usuario@test.com",
        cantidad: 1,
        metodo_pago: "Tarjeta"
    });

    const params = {
        headers: {
            "Content-Type": "application/json",
        },
    };

    const res = http.post(
        "http://127.0.0.1:5000/ventas",
        payload,
        params
    );

    check(res, {
        "status 201": (r) => r.status === 201,
        "respuesta menor a 500 ms": (r) => r.timings.duration < 500,
    });

    sleep(1);
}