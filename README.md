![Version](https://img.shields.io/badge/Version-1.2.0--Stable-blueviolet)
![Build](https://img.shields.io/badge/Build-Operational-green)
![Security](https://img.shields.io/badge/Security-Protected-red)# 🌌 NEBULA | Influencer-to-Brand Bridge

**Nebula** is a high-performance Agency Operating System designed to scale influencer marketing through data-driven talent scouting and automated campaign management.

---

## 🚀 The Business Stack
Nebula operates on five core pillars to ensure maximum ROI for brands:
* **The Closer:** Value-based sales focusing on ROI over vanity metrics.
* **The A&R:** Proprietary talent scouting for "Hidden Gem" creators.
* **The Architect:** Standardized content briefs and project management.
* **The Connector:** Strategic networking within the brand ecosystem.
* **The Treasurer:** Strict 40% profit margin management.

## 🛠️ Technical Architecture
* **Core:** Node.js / Express.js
* **Database:** MongoDB (Dual-Collection: Roster Logs & NebulaOS Assets)
* **Communication:** Gmail API (OAuth2) for automated transmission synchronization.
* **Security:** Multi-layer Basic Auth with a protected `/private/` administration core.

## 📂 Project Structure
```text
├── private/            # Secure Admin Portal (Nebula OS)
├── public/             # Assets & Client-facing styles
├── index.html          # Main Lead Generation Gateway
├── server.js           # The Nebula Brain (API & Logic)
└── .env                # [RESTRICTED] System Credentials