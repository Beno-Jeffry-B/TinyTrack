import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from './config.js';

// Options define how the test runs
export const options = {
  vus: 1, // 1 Virtual User
  duration: '10s', // Run for 10 seconds
};

// The default function exported represents what each Virtual User will execute
export default function () {
  // Simple GET request to the health check endpoint
  const res = http.get(`${CONFIG.BASE_URL}/api/health`);

  // Verify the status is 200
  check(res, {
    'Health check passes (status is 200)': (r) => r.status === 200,
  });

  // Pause for 1 second between iterations to simulate real user pacing
  sleep(1);
}
