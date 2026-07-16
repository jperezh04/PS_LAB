import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://localhost:5000/conciertos');
  check(res, {
    'estado 200': (r) => r.status === 200,
    'respuesta JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
  });
}
