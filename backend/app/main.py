
from datetime import datetime, timedelta
from pathlib import Path
import csv
import io
import sqlite3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field


# --------------------------------------------------
# AQUASENSE CONFIGURATION
# --------------------------------------------------

APP_DIR = Path(__file__).resolve().parent
DATABASE_PATH = APP_DIR / "aquasense.db"

app = FastAPI(
    title="AquaSense API",
    description="Simulation-first water security and intelligence platform for Embu County.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# DATABASE
# --------------------------------------------------

def connect_db():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with connect_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS reservoirs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                community TEXT NOT NULL,
                name TEXT NOT NULL,
                capacity_m3 REAL NOT NULL,
                current_volume_m3 REAL NOT NULL,
                inflow_m3_day REAL NOT NULL,
                demand_m3_day REAL NOT NULL,
                outflow_m3_day REAL NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        db.execute("""
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reservoir_id INTEGER NOT NULL,
                community TEXT NOT NULL,
                storage_m3 REAL NOT NULL,
                storage_percent REAL NOT NULL,
                recorded_at TEXT NOT NULL,
                FOREIGN KEY (reservoir_id) REFERENCES reservoirs(id)
            )
        """)

        count = db.execute(
            "SELECT COUNT(*) AS total FROM reservoirs"
        ).fetchone()["total"]

        if count == 0:
            now = datetime.now().isoformat(timespec="seconds")

            demo_reservoirs = [
                (
                    "Embu Town",
                    "Embu Town Demo Reservoir",
                    10000,
                    6200,
                    850,
                    1100,
                    1120,
                    now,
                    now,
                ),
                (
                    "Runyenjes",
                    "Runyenjes Demo Storage",
                    5000,
                    3900,
                    700,
                    520,
                    530,
                    now,
                    now,
                ),
                (
                    "Siakago",
                    "Siakago Demo Reservoir",
                    8000,
                    2100,
                    300,
                    650,
                    670,
                    now,
                    now,
                ),
            ]

            db.executemany("""
                INSERT INTO reservoirs (
                    community, name, capacity_m3, current_volume_m3,
                    inflow_m3_day, demand_m3_day, outflow_m3_day,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, demo_reservoirs)

            rows = db.execute(
                "SELECT * FROM reservoirs"
            ).fetchall()

            for row in rows:
                save_history(db, row)

        db.commit()


def save_history(db, reservoir):
    capacity = float(reservoir["capacity_m3"])
    volume = float(reservoir["current_volume_m3"])
    percentage = volume / capacity * 100 if capacity else 0

    db.execute("""
        INSERT INTO history (
            reservoir_id, community, storage_m3,
            storage_percent, recorded_at
        )
        VALUES (?, ?, ?, ?, ?)
    """, (
        reservoir["id"],
        reservoir["community"],
        volume,
        percentage,
        datetime.now().isoformat(timespec="seconds"),
    ))


initialize_database()


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class ReservoirCreate(BaseModel):
    community: str = Field(min_length=2, max_length=100)
    name: str = Field(min_length=2, max_length=150)
    capacity_m3: float = Field(gt=0)
    current_volume_m3: float = Field(ge=0)
    inflow_m3_day: float = Field(ge=0)
    demand_m3_day: float = Field(ge=0)
    outflow_m3_day: float = Field(ge=0)


class ReservoirUpdate(BaseModel):
    community: str | None = Field(default=None, min_length=2, max_length=100)
    name: str | None = Field(default=None, min_length=2, max_length=150)
    capacity_m3: float | None = Field(default=None, gt=0)
    current_volume_m3: float | None = Field(default=None, ge=0)
    inflow_m3_day: float | None = Field(default=None, ge=0)
    demand_m3_day: float | None = Field(default=None, ge=0)
    outflow_m3_day: float | None = Field(default=None, ge=0)


class SimulationRequest(BaseModel):
    days: int = Field(default=1, ge=1, le=30)


# --------------------------------------------------
# DATA HELPERS
# --------------------------------------------------

def get_reservoir_or_404(db, reservoir_id):
    row = db.execute(
        "SELECT * FROM reservoirs WHERE id = ?",
        (reservoir_id,),
    ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Reservoir not found.")

    return row


def calculate_intelligence(reservoir):
    capacity = float(reservoir["capacity_m3"])
    volume = float(reservoir["current_volume_m3"])
    inflow = float(reservoir["inflow_m3_day"])
    demand = float(reservoir["demand_m3_day"])
    outflow = float(reservoir["outflow_m3_day"])

    storage_percent = volume / capacity * 100 if capacity else 0
    net_daily_change = inflow - demand

    if net_daily_change < 0:
        days_to_empty = volume / abs(net_daily_change) if volume > 0 else 0
    else:
        days_to_empty = None

    projected_7 = max(
        0,
        min(capacity, volume + net_daily_change * 7),
    )

    projected_14 = max(
        0,
        min(capacity, volume + net_daily_change * 14),
    )

    if storage_percent < 30 or (
        days_to_empty is not None and days_to_empty <= 7
    ):
        shortage_risk = "HIGH"
        risk_explanation = (
            "High shortage risk. Storage is low or the estimated "
            "depletion period is short."
        )
    elif storage_percent < 50 or (
        days_to_empty is not None and days_to_empty <= 14
    ):
        shortage_risk = "WATCH"
        risk_explanation = (
            "Monitor storage and review supply and demand conditions."
        )
    else:
        shortage_risk = "LOW"
        risk_explanation = (
            "Current simulated storage indicators are relatively stable."
        )

    flow_gap = abs(outflow - demand)
    flow_anomaly = flow_gap > 100

    if flow_anomaly:
        anomaly_explanation = (
            "The difference between outflow and demand exceeds the "
            "configured screening threshold. Investigate the readings."
        )
    else:
        anomaly_explanation = (
            "No unusually large outflow-demand difference was detected "
            "by this preliminary screening rule."
        )

    shortage_date = None

    if days_to_empty is not None:
        shortage_date = (
            datetime.now() + timedelta(days=days_to_empty)
        ).date().isoformat()

    return {
        "reservoir_id": reservoir["id"],
        "community": reservoir["community"],
        "name": reservoir["name"],
        "capacity_m3": capacity,
        "current_storage_m3": volume,
        "storage_percent": round(storage_percent, 2),
        "current_volume_m3": volume,
        "inflow_m3_day": inflow,
        "demand_m3_day": demand,
        "outflow_m3_day": outflow,
        "net_daily_change_m3": net_daily_change,
        "days_to_empty_estimate": (
            round(days_to_empty, 1)
            if days_to_empty is not None
            else None
        ),
        "estimated_shortage_date": shortage_date,
        "projected_storage_7_days_m3": round(projected_7, 2),
        "projected_storage_14_days_m3": round(projected_14, 2),
        "shortage_risk": shortage_risk,
        "risk_explanation": risk_explanation,
        "flow_gap_m3_day": round(flow_gap, 2),
        "flow_anomaly": flow_anomaly,
        "anomaly_explanation": anomaly_explanation,
        "forecast_method": "Constant daily inflow and demand simulation",
        "data_status": "SIMULATED",
    }


def get_all_intelligence(db):
    rows = db.execute(
        "SELECT * FROM reservoirs ORDER BY id"
    ).fetchall()

    return [calculate_intelligence(row) for row in rows]


# --------------------------------------------------
# GENERAL ENDPOINTS
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to AquaSense API",
        "version": "2.0.0",
        "data_status": "SIMULATED",
        "documentation": "/docs",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "database": "connected",
        "data_status": "SIMULATED",
    }


# --------------------------------------------------
# DASHBOARD
# --------------------------------------------------

@app.get("/api/dashboard")
def dashboard():
    with connect_db() as db:
        rows = db.execute(
            "SELECT * FROM reservoirs ORDER BY id"
        ).fetchall()

        reservoirs = [dict(row) for row in rows]
        total_capacity = sum(r["capacity_m3"] for r in reservoirs)
        total_volume = sum(r["current_volume_m3"] for r in reservoirs)
        total_demand = sum(r["demand_m3_day"] for r in reservoirs)

        storage_percent = (
            total_volume / total_capacity * 100
            if total_capacity
            else 0
        )

        return {
            "data_status": "SIMULATED",
            "reservoir_count": len(reservoirs),
            "total_capacity_m3": total_capacity,
            "total_volume_m3": total_volume,
            "storage_percent": round(storage_percent, 2),
            "daily_demand_m3": total_demand,
            "reservoirs": reservoirs,
        }


# --------------------------------------------------
# RESERVOIR INTELLIGENCE
# --------------------------------------------------

@app.get("/api/intelligence")
def intelligence():
    with connect_db() as db:
        return get_all_intelligence(db)


# --------------------------------------------------
# RESERVOIR MANAGEMENT
# --------------------------------------------------

@app.get("/api/reservoirs")
def list_reservoirs():
    with connect_db() as db:
        rows = db.execute(
            "SELECT * FROM reservoirs ORDER BY id"
        ).fetchall()

        return [dict(row) for row in rows]


@app.post("/api/reservoirs", status_code=201)
def create_reservoir(payload: ReservoirCreate):
    if payload.current_volume_m3 > payload.capacity_m3:
        raise HTTPException(
            status_code=400,
            detail="Current volume cannot exceed reservoir capacity.",
        )

    now = datetime.now().isoformat(timespec="seconds")

    with connect_db() as db:
        cursor = db.execute("""
            INSERT INTO reservoirs (
                community, name, capacity_m3, current_volume_m3,
                inflow_m3_day, demand_m3_day, outflow_m3_day,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            payload.community,
            payload.name,
            payload.capacity_m3,
            payload.current_volume_m3,
            payload.inflow_m3_day,
            payload.demand_m3_day,
            payload.outflow_m3_day,
            now,
            now,
        ))

        reservoir = get_reservoir_or_404(db, cursor.lastrowid)
        save_history(db, reservoir)
        db.commit()

        return calculate_intelligence(reservoir)


@app.put("/api/reservoirs/{reservoir_id}")
def update_reservoir(reservoir_id: int, payload: ReservoirUpdate):
    changes = payload.model_dump(exclude_unset=True, exclude_none=True)

    if not changes:
        raise HTTPException(
            status_code=400,
            detail="No changes were provided.",
        )

    allowed_fields = {
        "community",
        "name",
        "capacity_m3",
        "current_volume_m3",
        "inflow_m3_day",
        "demand_m3_day",
        "outflow_m3_day",
    }

    if not set(changes).issubset(allowed_fields):
        raise HTTPException(status_code=400, detail="Invalid fields.")

    with connect_db() as db:
        existing = dict(get_reservoir_or_404(db, reservoir_id))
        updated = {**existing, **changes}

        if updated["current_volume_m3"] > updated["capacity_m3"]:
            raise HTTPException(
                status_code=400,
                detail="Current volume cannot exceed reservoir capacity.",
            )

        changes["updated_at"] = datetime.now().isoformat(timespec="seconds")

        assignments = ", ".join(
            f"{field} = ?" for field in changes
        )

        values = list(changes.values()) + [reservoir_id]

        db.execute(
            f"UPDATE reservoirs SET {assignments} WHERE id = ?",
            values,
        )

        reservoir = get_reservoir_or_404(db, reservoir_id)
        save_history(db, reservoir)
        db.commit()

        return calculate_intelligence(reservoir)


@app.delete("/api/reservoirs/{reservoir_id}")
def delete_reservoir(reservoir_id: int):
    with connect_db() as db:
        get_reservoir_or_404(db, reservoir_id)

        db.execute(
            "DELETE FROM history WHERE reservoir_id = ?",
            (reservoir_id,),
        )
        db.execute(
            "DELETE FROM reservoirs WHERE id = ?",
            (reservoir_id,),
        )
        db.commit()

        return {
            "message": "Reservoir deleted successfully.",
            "reservoir_id": reservoir_id,
        }


# --------------------------------------------------
# SIMULATION ENGINE
# --------------------------------------------------

@app.post("/api/simulation/step")
def run_simulation(payload: SimulationRequest):
    updated = []

    with connect_db() as db:
        rows = db.execute(
            "SELECT * FROM reservoirs ORDER BY id"
        ).fetchall()

        for row in rows:
            reservoir = dict(row)

            daily_change = (
                float(reservoir["inflow_m3_day"])
                - float(reservoir["demand_m3_day"])
            )

            new_volume = (
                float(reservoir["current_volume_m3"])
                + daily_change * payload.days
            )

            new_volume = max(
                0,
                min(float(reservoir["capacity_m3"]), new_volume),
            )

            db.execute("""
                UPDATE reservoirs
                SET current_volume_m3 = ?, updated_at = ?
                WHERE id = ?
            """, (
                new_volume,
                datetime.now().isoformat(timespec="seconds"),
                reservoir["id"],
            ))

            updated_row = get_reservoir_or_404(db, reservoir["id"])
            save_history(db, updated_row)
            updated.append(calculate_intelligence(updated_row))

        db.commit()

    return {
        "message": f"Simulation advanced by {payload.days} day(s).",
        "data_status": "SIMULATED",
        "updated_reservoirs": updated,
    }


# --------------------------------------------------
# HISTORICAL RECORDS
# --------------------------------------------------

@app.get("/api/history")
def get_history(reservoir_id: int | None = None, limit: int = 100):
    limit = max(1, min(limit, 1000))

    with connect_db() as db:
        if reservoir_id is not None:
            get_reservoir_or_404(db, reservoir_id)

            rows = db.execute("""
                SELECT * FROM history
                WHERE reservoir_id = ?
                ORDER BY id DESC
                LIMIT ?
            """, (reservoir_id, limit)).fetchall()
        else:
            rows = db.execute("""
                SELECT * FROM history
                ORDER BY id DESC
                LIMIT ?
            """, (limit,)).fetchall()

        records = [dict(row) for row in reversed(rows)]

        return {
            "data_status": "SIMULATED",
            "count": len(records),
            "records": records,
        }


# --------------------------------------------------
# ALERTS
# --------------------------------------------------

@app.get("/api/alerts")
def get_alerts():
    with connect_db() as db:
        intelligence_data = get_all_intelligence(db)

    alerts = []

    for item in intelligence_data:
        if item["shortage_risk"] == "HIGH":
            alerts.append({
                "id": f"shortage-{item['reservoir_id']}",
                "reservoir_id": item["reservoir_id"],
                "community": item["community"],
                "type": "SHORTAGE",
                "severity": "CRITICAL",
                "message": item["risk_explanation"],
                "storage_percent": item["storage_percent"],
            })

        elif item["shortage_risk"] == "WATCH":
            alerts.append({
                "id": f"shortage-{item['reservoir_id']}",
                "reservoir_id": item["reservoir_id"],
                "community": item["community"],
                "type": "SHORTAGE",
                "severity": "WARNING",
                "message": item["risk_explanation"],
                "storage_percent": item["storage_percent"],
            })

        if item["flow_anomaly"]:
            alerts.append({
                "id": f"flow-{item['reservoir_id']}",
                "reservoir_id": item["reservoir_id"],
                "community": item["community"],
                "type": "FLOW ANOMALY",
                "severity": "WARNING",
                "message": item["anomaly_explanation"],
                "flow_gap_m3_day": item["flow_gap_m3_day"],
            })

    return {
        "data_status": "SIMULATED",
        "count": len(alerts),
        "alerts": alerts,
    }


# --------------------------------------------------
# DISTRIBUTION PLANNING
# --------------------------------------------------

@app.get("/api/distribution")
def distribution():
    with connect_db() as db:
        rows = db.execute(
            "SELECT * FROM reservoirs ORDER BY id"
        ).fetchall()

    results = []

    for row in rows:
        reservoir = dict(row)
        demand = float(reservoir["demand_m3_day"])
        inflow = float(reservoir["inflow_m3_day"])
        deficit = max(0, demand - inflow)
        surplus = max(0, inflow - demand)

        if deficit > 0:
            recommendation = (
                "Supply indicator is below demand. Review alternative "
                "sources and distribution priorities."
            )
        else:
            recommendation = (
                "Incoming supply meets or exceeds the demand indicator."
            )

        results.append({
            "reservoir_id": reservoir["id"],
            "community": reservoir["community"],
            "demand_m3_day": demand,
            "inflow_m3_day": inflow,
            "deficit_m3_day": deficit,
            "surplus_m3_day": surplus,
            "recommendation": recommendation,
        })

    return {
        "data_status": "SIMULATED",
        "areas": results,
    }


# --------------------------------------------------
# CSV REPORT
# --------------------------------------------------

@app.get("/api/reports/reservoirs.csv")
def export_reservoir_report():
    with connect_db() as db:
        rows = db.execute(
            "SELECT * FROM reservoirs ORDER BY id"
        ).fetchall()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Community",
        "Reservoir",
        "Capacity (m3)",
        "Current storage (m3)",
        "Storage (%)",
        "Inflow (m3/day)",
        "Demand (m3/day)",
        "Outflow (m3/day)",
        "Data status",
    ])

    for row in rows:
        item = dict(row)
        capacity = float(item["capacity_m3"])
        volume = float(item["current_volume_m3"])
        percentage = volume / capacity * 100 if capacity else 0

        writer.writerow([
            item["community"],
            item["name"],
            capacity,
            volume,
            round(percentage, 2),
            item["inflow_m3_day"],
            item["demand_m3_day"],
            item["outflow_m3_day"],
            "SIMULATED",
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=aquasense_reservoir_report.csv"
        },
    )
