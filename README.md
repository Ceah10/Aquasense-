# AquaSense — Water Intelligence Platform

**A simulation-first water monitoring and decision-support platform for Embu County, Kenya.**

[![Live Application](https://img.shields.io/badge/Live%20Application-Visit%20AquaSense-0A8F6E?style=for-the-badge)](https://aquasense-hazel.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend-API%20Documentation-blue?style=for-the-badge)](https://aquasense-api-z7s6.onrender.com/docs)

## Overview

AquaSense is a web-based water intelligence platform designed to support water resource monitoring, shortage awareness, and distribution analysis.

The project uses simulated water data to demonstrate how digital technology can help communities and water management teams understand reservoir conditions, identify potential supply risks, and explore better water management decisions.

The initial pilot focuses on Embu County, Kenya, with a design that can be extended to other regions and eventually connected to real water monitoring sensors.

## The Problem

Water resource managers need reliable information to understand:

- Available water storage.
- Changes in water demand and supply.
- Areas that may face water shortages.
- Unusual differences between recorded water inflows and outflows.
- Historical water storage patterns.

AquaSense explores how a centralized digital platform can bring these insights together.

## Key Features

- **Water storage monitoring:** View reservoir storage levels and capacity.
- **Shortage intelligence:** Monitor water availability and potential shortage risks.
- **Historical records:** Explore changes in water storage over time.
- **Simulation engine:** Advance simulated water conditions to explore possible scenarios.
- **Flow anomaly screening:** Highlight unusual inflow and outflow differences for further investigation.
- **Geographical monitoring:** View approximate pilot service-area locations on an Embu County map.
- **Distribution analysis:** Examine water supply and demand information.
- **Reservoir management:** Manage reservoir records through the application.
- **CSV reporting:** Export available monitoring data for further analysis.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Development and build | Vite |
| Backend | Python, FastAPI |
| Mapping | Leaflet, React Leaflet |
| Data visualization | Recharts |
| Database | SQLite |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Version control | Git and GitHub |

## System Architecture

AquaSense uses a frontend-backend architecture:

1. The React frontend presents the dashboard, maps, charts, and monitoring tools.
2. The FastAPI backend provides API endpoints and application logic.
3. The database supports application data storage.
4. The frontend communicates with the deployed backend through HTTP API requests.

## Live Demonstration

- **Application:** https://aquasense-hazel.vercel.app
- **Backend API:** https://aquasense-api-z7s6.onrender.com
- **Interactive API documentation:** https://aquasense-api-z7s6.onrender.com/docs
- **API health check:** https://aquasense-api-z7s6.onrender.com/api/health

## Running the Project Locally

### Requirements

- Python
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Ceah10/Aquasense-.git
cd Aquasense-
```

### 2. Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

The backend should be available at:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs

### 3. Start the frontend

Open another terminal in the project directory:

```powershell
cd frontend
npm install
```

Create a `.env.local` file inside the frontend folder with:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Then start the frontend:

```powershell
npm run dev
```

The frontend should be available at:

http://localhost:5173

## Current Data Status and Limitations

**Current status: Simulation-based prototype.**

AquaSense currently uses simulated water data to demonstrate its monitoring and analytical capabilities.

- It is not yet connected to physical water sensors.
- Map locations represent approximate pilot service areas, not verified infrastructure coordinates.
- Anomaly screening identifies unusual flow differences; it does not independently confirm water leaks.
- Shortage forecasts are based on the assumptions and values used in the simulation.

The application is a prototype for demonstrating a possible water intelligence solution, not an operational water authority monitoring system.

## Future Development Roadmap

- Integration with IoT water-level and flow sensors.
- Real-time water monitoring.
- Improved predictive analytics.
- More advanced anomaly detection.
- User authentication and access management.
- Additional counties and water service areas.
- Improved reporting and decision-support capabilities.

## Project Vision

The long-term vision of AquaSense is to develop a scalable water intelligence platform that combines monitoring, analytics, geographical information, and predictive insights to support more informed water resource management.

**Built as a technology project focused on exploring practical solutions to water management challenges in Kenya.**