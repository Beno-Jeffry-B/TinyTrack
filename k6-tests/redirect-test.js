import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from './config.js';


export const options = {
  vus: 100,
  duration: '30s',
  insecureSkipTLSVerify: true,
};

export default function () {
  const res = http.get(`${CONFIG.BASE_URL}/${CONFIG.TEST_SHORT_CODE}`, {
    redirects: 0,
  });

  console.log(`Status: ${res.status}`);

  check(res, {
    'status is 301': (r) => r.status === 301,
  });

  sleep(1);
}