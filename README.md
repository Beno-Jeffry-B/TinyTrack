
# TinyTrack 🚀

A full-stack URL shortener built with scalability and analytics in mind. It takes long, ugly URLs and transforms them into neat, trackable, and manageable short links. 

This isn't just a basic URL shortener. It includes real-time analytics, user authentication, QR code generation, and is built to handle concurrent traffic spikes gracefully. 

---

#### 🔗 Live Demo : [Click me](https://tiny-track-psi.vercel.app)

---

## 🎥 Demo Video :  [Click me](https://drive.google.com/file/d/1D6RCT29BTUN80kV6f6w1dn_QSDHPiACK/view?usp=sharing)
 
---


## ✨ Features


- **Secure Authentication**: Supports **JWT authentication** and **Google OAuth** for secure user access with proper session handling.

- **URL Management**: Generates **collision-resistant short codes**, validates input URLs, and performs **low-latency redirects**.

- **Protected Dashboard**: Provides **isolated access** for authenticated users to manage their own URLs with proper data segregation.

- **One-Click Actions**: Enables instant **copy to clipboard** and **QR code generation** for easy sharing.

- **Real-Time Updates**: Streams click data using **WebSockets (Socket.io)** without requiring manual refresh.

- **Trend Analysis**: Supports **multi-range analytics** (1 day, 7 days, 1 month, long-term).

- **Device Insights**: Tracks **device types** (mobile, tablet, desktop) and **user agent data**.

- **Geographic Analytics**: Uses **IP-based tracking** to provide **country-level insights** with visual indicators.

- **Visitor Metrics**: Includes **total clicks** and **unique visitor tracking** using IP and client metadata.

---


## 🏗 System Design Overview

I didn't just start typing code; I intentionally **spent a good number of hours designing the system first**. I learned the importance of this phase during my **previous internship**, where I worked closely with the founder. He taught me that for complex projects, getting the architecture right on paper saves days of debugging later. During that rough work phase, I sketched out the DFD and ER diagrams to get the logic right. And after I used **Gemini (Nano Banana)** to help me convert those rough designs into a structured database schema and ERD. The **DFD structure basically guided the entire application architecture**, leading to a clean, modular build.

The strategy is simple but effective. This approach made my development much more meaningful. It ensures that I stay strictly within the **project scope** since the scope is defined in the DFD, I don't drag or spend time on unnecessary requirements.

> 📂 Please refer to the `Docs/Architecture_Diagrams` folder for complete references.

---

## 📊 Performance & Load Testing

-- Load testing was performed using k6 to evaluate the performance of the TinyTrack application under concurrent user traffic.  
-- The tests focused on the redirect endpoint to simulate real-world usage where multiple users access short URLs simultaneously.  
-- Performance metrics such as response time, throughput, and error rate were analyzed to identify system behavior under load.  
-- The results confirmed stable performance with improved latency after implementing Redis caching.  
-- The system demonstrated the ability to handle concurrent requests efficiently without failures.  
-- A detailed load testing report has been generated and submitted as a PDF under the `Docs/` folder.

---


## 💻 Local Setup Instructions

Want to run this locally? Here's how:

1. **Clone the repo:**
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   ```
   - Create a `.env` file (see the Environment Variables section below).
   - Run the server: `npm run dev`

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   ```
   - Create a `.env` file referencing your backend URL.
   - Start the dev server: `npm run dev`

---

## 🔑 Environment Variables

**Backend (`.env`) Example:**
```env
PORT=5000
DATABASE_URL=postgresql://user:password@endpoint.neon.tech/dbname
JWT_SECRET=super_secret_jwt_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=http://localhost:5173
```

**Frontend (`.env`) Example:**
```env
VITE_API_URL=http://localhost:5000
```

---

## 🤔 Assumptions Made

- **User Identification:**  
  Each shortened URL is strictly associated with the authenticated user who created it. Users can only view and manage their own links.

- **Unique Short Codes:**  
  Short URLs are assumed to be unique across the system. Collisions are handled at the database level using unique constraints.

- **Unique Visitor Tracking:**  
  Unique visitors are identified using a combination of IP address and user-agent. This is an approximate method and may not be 100% accurate in cases like shared networks or VPN usage.

- **Geo-location Detection:**  
  Location data is derived from IP-based lookup (geoip-lite). Accuracy depends on IP mapping and may not reflect the exact physical location of the user.

- **Click Counting Logic:**  
  Every redirect request is treated as a valid click event, including repeated clicks from the same user or browser.

- **Real-time Updates:**  
  Real-time analytics updates assume an active WebSocket connection. If the connection drops, updates may not reflect instantly until refreshed.

- **Caching Behavior (Redis):**  
  Frequently accessed short URLs are cached in Redis to optimize redirect performance. It is assumed that cache misses will fallback to the database seamlessly.

- **Authentication Flow:**  
  Users can log in either via JWT-based authentication or Google OAuth. In both cases, the email is treated as the primary identity.

- **URL Expiry Handling:**  
  Expired URLs are assumed to be inactive and should not redirect (based on backend enforcement logic).

- **Scalability Scope:**  
  The system is designed to handle moderate traffic efficiently. Advanced scaling strategies (like distributed workers, rate limiting, CDN) are considered future improvements.

- **Data Consistency:**  
  Analytics data (clicks, device, location) is recorded synchronously during redirect handling, assuming acceptable performance under current load.

---

## ⚠️ System Limitations

### 1. Database Bottleneck for Write Operations
**Limitation:**  
URL creation (`POST /api/url`) directly depends on PostgreSQL, making it a write-heavy operation.

**Justification:**  
Write operations cannot be cached like read operations. Implementing advanced solutions such as queue-based processing (e.g., background jobs) was considered but not included due to time constraints and hackathon scope prioritization.

---

### 2. Single Backend Instance (No Horizontal Scaling)
**Limitation:**  
The backend is deployed as a single instance on Render, limiting concurrent request handling capacity.

**Justification:**  
Horizontal scaling (multiple instances + load balancer) requires additional infrastructure setup and cost. For this project, focus was placed on optimizing performance at the application level (e.g., Redis caching).

---

### 3. No Load Balancer
**Limitation:**  
Incoming traffic is not distributed across multiple servers, creating a potential bottleneck under high load.

**Justification:**  
Load balancing is typically used in production-grade systems with multiple backend instances. Since this project uses a single instance deployment, a load balancer was not necessary for the current scope.

---

### 4. Redis Used Only for Read Optimization
**Limitation:**  
Redis caching is implemented only for redirect (read) operations and not for write operations.

**Justification:**  
Caching is effective for read-heavy operations where repeated data access occurs. Since URL creation generates unique data each time, caching does not provide benefits for write operations.

---

### 5. Free-Tier Infrastructure Constraints
**Limitation:**  
The application is hosted on free-tier services (Render, Neon), which have limited CPU, memory, and network performance.

**Justification:**  
The project was developed within a cost-free environment for demonstration purposes. Upgrading to higher-tier infrastructure was not prioritized, as the focus was on system design and optimization techniques.

---

## 🔮 Future Improvements : **(Bulk CSV Upload)**

-  Currently, users can **manually create short URLs one by one** by pasting long URLs. A planned improvement is to support **bulk URL creation using CSV files**, where users can upload large datasets (e.g., 200 to 100K+ URLs) with corresponding short URLs.
- Handling large CSV uploads (e.g., thousands or even lakhs of URLs) requires additional infrastructure such as background job processing, queue systems, and optimized database write strategies to avoid blocking the main request cycle.
- The system is already structurally prepared for this enhancement. The existing database schema and URL creation logic can be extended to support batch inserts. With the addition of a processing layer (e.g., job queues or worker-based architecture), bulk URL ingestion can be implemented efficiently without impacting real-time performance.
- In short, the limitation is not due to feasibility, but due to prioritizing system stability and performance under current constraints. With these improvements in place, bulk CSV upload can be seamlessly integrated into the platform.
  
## 🤖 AI Usage Explanation

AI tools were used to accelerate development while maintaining full control over the system. The process began with a **manual system design**, where a **handwritten DFD** was created and then uploaded to **Nanobanana (Gemini)** to convert it into a **digital DFD and architecture diagram**, which guided the implementation step by step. **Anti-Gravity IDE** was used for **code generation** (React components, Tailwind CSS, backend setup), with every output being **carefully reviewed and understood** before integration. AI also supported **debugging**, **refactoring**, and **tech stack research** (e.g., selecting **Neon DB** over other alternatives), as well as deployment exploration. This approach significantly improved productivity within a tight timeline, while all **core logic, architecture, and decisions** were implemented and validated manually.


## 🖼 Screenshots

All screenshots are available in the `Docs/Screenshots` folder in this repository.

### Highlights:

- 📊 Analytics Dashboard (Clicks, Trends, Real-time updates)
- 🔗 Link Creation + QR Code Generation
- 📱 Mobile Responsive View
- 🌍 Location & Device Analytics
- 📈 Interactive Graphs (1D / 7D / 1M / 5Y )

> 📂 Please refer to the `Docs/Screenshots/` directory for complete visual references.
---

This project is a part of a hackathon run by https://katomaran.com
