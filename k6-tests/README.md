# TinyTrack k6 Performance Testing

This folder contains a complete, beginner-friendly k6 performance testing suite evaluating the availability, capacity, and scalability of the TinyTrack URL shortener.

## Folder Structure
```text
tinytrack/
└── k6-tests/
    ├── config.js           # Global config variables (Base URL, auth tokens)
    ├── smoke-test.js       # Basic availability and health check running on 1 user
    ├── redirect-test.js    # Load tests 50 concurrent users evaluating the Short URL redirection system
    ├── api-test.js         # API tests ensuring JWT authentication and DB insertions hold up
    ├── stress-test.js      # Ramp-up testing scaling from 50 to 400 live users to find breaking points
    └── README.md           # You are here!
```

## 1. How to Install k6
You can install k6 locally based on your Operating System:

* **Windows**: `winget install k6` or download the installer from the [k6 website](https://k6.io/docs/get-started/installation/)
* **Mac**: `brew install k6`
* **Linux**: `sudo apt-get install k6`

## 2. Setting Up Configuration (IMPORTANT)
Before running the tests, open `config.js` and modify these:
* `TEST_SHORT_CODE`: Replace with an existing short code you want to flood inside your database.
* `TEST_TOKEN`: Open your React App, log in, open DevTools -> Application -> Local Storage, and copy the `"token"` string. Paste it here to test Protected APIs!
* `TEST_URL_ID`: Provide a valid Database ID of a URL to run the analytics tests.

## 3. How to Execute Tests
Open your terminal inside the `k6-tests/` directory and run any of the following commands:

**Smoke Test (Did everything connect?)**
```bash
k6 run smoke-test.js
```

**Redirect Test (Can we handle 50 concurrent clicks?)**
```bash
k6 run redirect-test.js
```

**API Test (Can we handle 10 concurrent creators securely?)**
```bash
k6 run api-test.js
```

**Stress Test (At what point does Render crash/bottleneck?)**
```bash
k6 run stress-test.js
```

## 4. How to Interpret the Results & Take Screenshots
When the test finishes, k6 prints a large summary with colorful indicators to your terminal!  

**Key metrics to screenshot for the Hackathon:**
* `http_req_duration`: How fast was the server responding? (Average, p90, p95). Under 300ms is excellent!
* `http_req_failed`: If this is `0.00%`, your backend remained 100% stable under pressure!
* `iterations`: How many total clicks/requests were processed successfully.
* `checks`: These are the custom verified validations (e.g. `Redirect successful (301 or 302)`). If checks are 100%, the logic performed beautifully.

Take clear screenshots of your terminal right after `k6 run stress-test.js` concludes and feature its `http_req_failed: 0.00%` proudly in your submission!
