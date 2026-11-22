# AquaSense — Water Intelligence Platform

**A simulation-first water monitoring, shortage prediction and distribution intelligence platform for Embu County, Kenya.**

## 1. Project Overview

AquaSense is a water intelligence platform designed to support better water resource monitoring and management.

The platform brings together water storage monitoring, shortage intelligence, flow anomaly screening, geographical monitoring and distribution analysis in one dashboard.

The initial implementation focuses on an Embu County pilot using simulated water data. The architecture is intended to support future integration with real water sensors and monitoring infrastructure.

## 2. Problem Statement

Water resource managers and communities need better visibility into water availability, changing storage levels, possible shortages and distribution challenges.

Without accessible monitoring and analysis tools, identifying potential shortages and responding early can be difficult.

AquaSense explores how software-based intelligence can help address these challenges.

## 3. Main Features

- **Water monitoring:** View reservoir capacity, current volume, inflow and demand.
- **Shortage intelligence:** Estimate water availability and identify potential shortage risks.
- **Water simulation:** Advance simulated reservoir conditions over time.
- **Historical analysis:** Store and visualize historical reservoir readings.
- **Flow anomaly screening:** Compare recorded outflow with expected demand to flag unusual differences for investigation.
- **Geographical monitoring:** Display approximate Embu County pilot locations on an interactive map.
- **Distribution analysis:** Compare water inflow and demand across monitored areas.
- **Reservoir management:** Add, edit and delete reservoir records.
- **Reporting:** Export reservoir information in CSV format.

## 4. Technology Stack

### Frontend
- React
- Vite
- JavaScript
- Recharts
- Leaflet
- React Leaflet
- CSS

### Backend
- Python
- FastAPI
- Uvicorn
- SQLite
- Pydantic

## 5. System Architecture

AquaSense uses a frontend-backend architecture.

1. The React frontend displays the dashboard and visualizations.
2. The FastAPI backend provides API endpoints and processes water intelligence calculations.
3. SQLite stores reservoir information and historical simulation records.
4. The frontend retrieves data from the backend through HTTP requests.

## 6. Project Structure

```text
WATERMIND_MVP_Starter_Project/
│
├── backend/
│   └── app/
│       ├── main.py
│       └── aquasense.db
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── EmbuMap.jsx
│   │   ├── App.jsx
│   │   └── style.css
│   ├── package.json
│   └── index.html
│
└── README.md
```

## 7. Running the Application

### Backend

Open PowerShell:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

Backend address:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### Frontend

Open a second terminal:

```powershell
cd frontend
npm run dev
```

Frontend address:

`http://localhost:5173`

## 8. Data and Limitations

The current MVP uses simulated water data. It does not currently represent live measurements from physical water infrastructure.

Map locations are approximate pilot-area locations, not verified reservoir or pipeline coordinates.

Flow anomaly screening identifies unusual differences for further investigation. It does not independently confirm a physical leak.

Shortage forecasts are estimates based on the simulation inputs and assumptions.

## 9. Future Development

- Integration with real water-level sensors.
- Real-time monitoring and automated data collection.
- More advanced predictive analytics.
- Improved geographical infrastructure mapping.
- User authentication and role-based access.
- Expansion to additional counties and water service areas.

## 10. Project Vision

AquaSense aims to demonstrate how software engineering, data analysis and intelligent monitoring can contribute to more informed water resource management.

**Project:** AquaSense  
**Pilot location:** Embu County, Kenya  
**Development approach:** Simulation-first, with future sensor integration  
**Status:** MVP development and presentation preparation
