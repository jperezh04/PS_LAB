import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 20,
    duration: '30s',
};

export default function () {

    const res = http.get('http://127.0.0.1:5000/conciertos');

    check(res, {
        'status 200': (r) => r.status === 200,
        'respuesta menor a 500 ms': (r) => r.timings.duration < 500,
    });

    sleep(1);
}