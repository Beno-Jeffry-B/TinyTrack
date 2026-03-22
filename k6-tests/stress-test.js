import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up load to 50 users
    { duration: '1m', target: 200 },  // Continue scaling to 200 users
    { duration: '1m', target: 400 },  // Peak Stress - 400 concurrent users
    { duration: '30s', target: 0 },   // Cool down gracefully back to 0
  ],
};

export default function () {
  // Hit the URL redirect under heavy load to measure responsiveness and scale tipping points
  const params = { redirects: 0 };
  const res = http.get(`${CONFIG.BASE_URL}/${CONFIG.TEST_SHORT_CODE}`, params);

  check(res, {
    'Load balanced (301/302)': (r) => r.status === 301 || r.status === 302,
  });

  sleep(1);
}
