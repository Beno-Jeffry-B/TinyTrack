import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from './config.js';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CONFIG.TEST_TOKEN}`,
  };

  // 1. Test POST /api/url (Create a new short URL)
  const payload = JSON.stringify({
    // Adding a random parameter so they don't immediately trigger duplicate blocking
    original_url: `https://example.com/k6-test-url?id=${Math.floor(Math.random() * 10000)}`,
  });

  const createRes = http.post(`${CONFIG.BASE_URL}/api/url`, payload, { headers });

  check(createRes, {
    'URL created successfully (201)': (r) => r.status === 201,
  });

  // 2. Test GET /api/url/:id/analytics (Get analytics for a URL)
  const analyticsRes = http.get(`${CONFIG.BASE_URL}/api/url/${CONFIG.TEST_URL_ID}/analytics?range=7d`, { headers });

  check(analyticsRes, {
    'Analytics fetched successfully (200)': (r) => r.status === 200,
  });

  sleep(1);
}
