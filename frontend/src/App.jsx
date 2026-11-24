
import { useCallback, useEffect, useMemo, useState } from "react";
import EmbuMap from "./components/EmbuMap";
import "./style.css";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from "recharts";


const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";


const tabs = [
  "Overview",
  "County Map",
  "Water Sources",
  "Service Areas",
  "Reservoir Management",
  "Shortage Intelligence",
  "Leak Detection",
  "Distribution",
  "History & Reports"
];

const initialForm = {
  community: "",
  name: "",
  capacity_m3: "",
  current_volume_m3: "",
  inflow_m3_day: "",
  demand_m3_day: "",
  outflow_m3_day: ""
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-KE", {
    maximumFractionDigits: 1
  });
}

function riskClass(risk) {
  if (risk === "HIGH" || risk === "CRITICAL") return "critical";
  if (risk === "WATCH" || risk === "WARNING") return "warning";
  return "stable";
}

function Metric({ label, value, unit, note }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <div className="metric-value">
        {value} <small>{unit}</small>
      </div>
      {note && <p className="metric-note">{note}</p>}
    </div>
  );
}

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function RiskLabel({ risk }) {
  return (
    <span className={`risk-label ${riskClass(risk)}`}>
      {risk || "UNKNOWN"}
    </span>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [dashboard, setDashboard] = useState(null);
  const [intelligence, setIntelligence] = useState([]);
  const [reservoirs, setReservoirs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [simulationDays, setSimulationDays] = useState("1");
  const [simulationMessage, setSimulationMessage] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const endpoints = [
        "/api/dashboard",
        "/api/intelligence",
        "/api/reservoirs",
        "/api/alerts",
        "/api/distribution",
        "/api/history?limit=200"
      ];

      const responses = await Promise.all(
        endpoints.map((endpoint) =>
          fetch(`${API}${endpoint}`).then(async (response) => {
            if (!response.ok) {
              throw new Error(`API request failed: ${endpoint}`);
            }
            return response.json();
          })
        )
      );

      const [
        dashboardData,
        intelligenceData,
        reservoirData,
        alertData,
        distributionData,
        historyData
      ] = responses;

      setDashboard(dashboardData);
      setIntelligence(Array.isArray(intelligenceData) ? intelligenceData : []);
      setReservoirs(Array.isArray(reservoirData) ? reservoirData : []);
      setAlerts(alertData.alerts || []);
      setDistribution(distributionData.areas || []);
      setHistory(historyData.records || []);
      setApiError("");
      setLastUpdated(new Date());
    } catch (error) {
      setApiError(
        "Cannot connect to the AquaSense backend. Check that the backend server is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
    const timer = setInterval(() => loadData(false), 15000);
    return () => clearInterval(timer);
  }, [loadData]);

  const highRiskCount = intelligence.filter(
    (item) => item.shortage_risk === "HIGH"
  ).length;

  const watchCount = intelligence.filter(
    (item) => item.shortage_risk === "WATCH"
  ).length;

  const averageStorage = dashboard?.storage_percent ?? 0;

  const historyChart = useMemo(() => {
    return history.map((item) => ({
      time: new Date(item.recorded_at).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      community: item.community,
      storage: Number(item.storage_m3),
      percentage: Number(item.storage_percent)
    }));
  }, [history]);

  const communityHistory = useMemo(() => {
    const grouped = {};

    history.forEach((item) => {
      if (!grouped[item.community]) grouped[item.community] = [];
      grouped[item.community].push({
        time: new Date(item.recorded_at).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }),
        storage: Number(item.storage_m3)
      });
    });

    return grouped;
  }, [history]);

  async function runSimulation() {
    setSimulationMessage("");

    try {
      const response = await fetch(`${API}/api/simulation/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: Number(simulationDays) })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Simulation failed.");
      }

      setSimulationMessage(result.message);
      await loadData(false);
    } catch (error) {
      setSimulationMessage(error.message);
    }
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function editReservoir(reservoir) {
    setEditingId(reservoir.id);
    setForm({
      community: reservoir.community,
      name: reservoir.name,
      capacity_m3: reservoir.capacity_m3,
      current_volume_m3: reservoir.current_volume_m3,
      inflow_m3_day: reservoir.inflow_m3_day,
      demand_m3_day: reservoir.demand_m3_day,
      outflow_m3_day: reservoir.outflow_m3_day
    });
    setActiveTab("Reservoir Management");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  async function saveReservoir(event) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      community: form.community.trim(),
      name: form.name.trim(),
      capacity_m3: Number(form.capacity_m3),
      current_volume_m3: Number(form.current_volume_m3),
      inflow_m3_day: Number(form.inflow_m3_day),
      demand_m3_day: Number(form.demand_m3_day),
      outflow_m3_day: Number(form.outflow_m3_day)
    };

    try {
      const response = await fetch(
        editingId
          ? `${API}/api/reservoirs/${editingId}`
          : `${API}/api/reservoirs`,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Could not save reservoir.");
      }

      setSimulationMessage(
        editingId ? "Reservoir updated successfully." : "Reservoir added successfully."
      );

      resetForm();
      await loadData(false);
    } catch (error) {
      setSimulationMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteReservoir(id, name) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${name}? This also deletes its stored history.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API}/api/reservoirs/${id}`, {
        method: "DELETE"
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Could not delete reservoir.");
      }

      setSimulationMessage("Reservoir deleted successfully.");
      await loadData(false);
    } catch (error) {
      setSimulationMessage(error.message);
    }
  }

  const nav = (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">A</div>
        <div>
          <h2>AQUASENSE</h2>
          <span>WATER INTELLIGENCE</span>
        </div>
      </div>

      <div className="sidebar-caption">EMBU COUNTY PILOT</div>

      <nav className="navigation">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="status-dot" />
        Simulation environment
        <small>Version 2.0 · MVP</small>
      </div>
    </aside>
  );

  return (
    <div className="app-shell">
      {nav}

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb">KENYA / EMBU COUNTY</span>
            <h1>{activeTab}</h1>
          </div>

          <div className="topbar-right">
            <span className="simulation-tag">SIMULATED DATA</span>
            <button className="secondary-button" onClick={() => loadData(true)}>
              Refresh data
            </button>
          </div>
        </header>

        {apiError && (
          <div className="error-banner">
            {apiError}
            <button onClick={() => loadData(true)}>Retry</button>
          </div>
        )}

        {loading && !dashboard ? (
          <div className="loading-panel">Loading AquaSense data...</div>
        ) : (
          <>
            {activeTab === "Overview" && (
              <>
                <section className="welcome-panel">
                  <div>
                    <span className="eyebrow">WATER SECURITY COMMAND CENTRE</span>
                    <h2>Embu County Water Intelligence</h2>
                    <p>
                      Monitor simulated reservoir conditions, identify shortage
                      risks and explore water distribution indicators.
                    </p>
                  </div>
                  <div className="welcome-status">
                    <span className="status-dot" />
                    PILOT SYSTEM ACTIVE
                  </div>
                </section>

                <section className="metrics-grid">
                  <Metric
                    label="TOTAL WATER CAPACITY"
                    value={formatNumber(dashboard?.total_capacity_m3)}
                    unit="m³"
                    note="Across registered reservoirs"
                  />
                  <Metric
                    label="CURRENT WATER STORAGE"
                    value={formatNumber(dashboard?.total_volume_m3)}
                    unit="m³"
                    note={`${formatNumber(averageStorage)}% of total capacity`}
                  />
                  <Metric
                    label="DAILY WATER DEMAND"
                    value={formatNumber(dashboard?.daily_demand_m3)}
                    unit="m³/day"
                    note="Combined reservoir demand"
                  />
                  <Metric
                    label="MONITORED RESERVOIRS"
                    value={dashboard?.reservoir_count ?? 0}
                    unit=""
                    note="Registered pilot reservoirs"
                  />
                </section>

                <section className="metrics-grid secondary-metrics">
                  <Metric label="HIGH-RISK RESERVOIRS" value={highRiskCount} unit="" />
                  <Metric label="WATCH-LIST RESERVOIRS" value={watchCount} unit="" />
                  <Metric label="ACTIVE ALERTS" value={alerts.length} unit="" />
                  <Metric
                    label="COUNTY STORAGE STATUS"
                    value={
                      averageStorage < 30
                        ? "HIGH RISK"
                        : averageStorage < 50
                          ? "MODERATE"
                          : "STABLE"
                    }
                    unit=""
                  />
                </section>

                <div className="content-grid">
                  <Panel
                    title="Reservoir Storage Status"
                    subtitle="Current simulated storage by reservoir"
                  >
                    <div className="reservoir-status-list">
                      {intelligence.map((item) => (
                        <div className="reservoir-status" key={item.reservoir_id}>
                          <div className="status-row">
                            <strong>{item.name}</strong>
                            <RiskLabel risk={item.shortage_risk} />
                          </div>
                          <div className="progress-track">
                            <div
                              className={`progress-fill ${riskClass(item.shortage_risk)}`}
                              style={{ width: `${item.storage_percent}%` }}
                            />
                          </div>
                          <div className="status-row muted-row">
                            <span>{item.community}</span>
                            <strong>{item.storage_percent}%</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel
                    title="Early Warning Alerts"
                    subtitle="Automatically generated from the screening rules"
                  >
                    {alerts.length === 0 ? (
                      <p className="empty-state">No alerts from current simulated readings.</p>
                    ) : (
                      <div className="alert-list">
                        {alerts.map((alert) => (
                          <div className="alert-item" key={alert.id}>
                            <RiskLabel risk={alert.severity} />
                            <div>
                              <strong>{alert.community} · {alert.type}</strong>
                              <p>{alert.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                </div>

                <Panel
                  title="Reservoir Intelligence"
                  subtitle="Forecasts use a constant daily inflow and demand assumption"
                >
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Reservoir</th>
                          <th>Storage</th>
                          <th>Net daily change</th>
                          <th>7-day projection</th>
                          <th>14-day projection</th>
                          <th>Days to empty</th>
                          <th>Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {intelligence.map((item) => (
                          <tr key={item.reservoir_id}>
                            <td>{item.name}</td>
                            <td>{formatNumber(item.current_storage_m3)} m³</td>
                            <td>{formatNumber(item.net_daily_change_m3)} m³</td>
                            <td>{formatNumber(item.projected_storage_7_days_m3)} m³</td>
                            <td>{formatNumber(item.projected_storage_14_days_m3)} m³</td>
                            <td>
                              {item.days_to_empty_estimate == null
                                ? "Not depleting"
                                : `${item.days_to_empty_estimate} days`}
                            </td>
                            <td><RiskLabel risk={item.shortage_risk} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>

                <Panel title="Quick Simulation" subtitle="Advance the simulated reservoir model">
                  <div className="simulation-controls">
                    <label>
                      Advance simulation by
                      <select
                        value={simulationDays}
                        onChange={(event) => setSimulationDays(event.target.value)}
                      >
                        <option value="1">1 day</option>
                        <option value="3">3 days</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                      </select>
                    </label>
                    <button className="primary-button" onClick={runSimulation}>
                      Run simulation
                    </button>
                  </div>
                  {simulationMessage && <p className="success-message">{simulationMessage}</p>}
                </Panel>
              </>
            )}

            {activeTab === "County Map" && (
              <Panel
                title="Embu County geographical monitoring"
                subtitle="Approximate town and pilot service-area locations"
              >
                <EmbuMap />
              </Panel>
            )}

            {activeTab === "Water Sources" && (
              <div className="source-grid">
                {[
                  ["Rupingazi River", "Water-source reference for the Embu area."],
                  ["Thuci River", "Regional river-system reference."],
                  ["Thiba River", "Regional water-resource reference."],
                  ["Ena River", "Water-resource reference for the county pilot."],
                  ["Tana River", "Major regional river system." ]
                ].map(([name, description]) => (
                  <article className="source-card" key={name}>
                    <div className="source-icon">≈</div>
                    <h3>{name}</h3>
                    <p>{description}</p>
                    <span>REFERENCE SOURCE · NOT LIVE MONITORING</span>
                  </article>
                ))}
              </div>
            )}

            {activeTab === "Service Areas" && (
              <Panel
                title="Pilot service areas"
                subtitle="Town-level service-area indicators from the pilot model"
              >
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Service area</th>
                        <th>Associated reservoir</th>
                        <th>Storage</th>
                        <th>Shortage risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intelligence.map((item) => (
                        <tr key={item.reservoir_id}>
                          <td>{item.community}</td>
                          <td>{item.name}</td>
                          <td>{item.storage_percent}%</td>
                          <td><RiskLabel risk={item.shortage_risk} /></td>
                        </tr>
                      ))}
                      {["Kiritiri", "Ishiara"].map((area) => (
                        <tr key={area}>
                          <td>{area}</td>
                          <td>Not yet linked</td>
                          <td>Not available</td>
                          <td><RiskLabel risk="UNKNOWN" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="info-note">
                  Kiritiri and Ishiara are mapped pilot reference areas. They do not
                  yet have independent reservoir records in the database.
                </p>
              </Panel>
            )}

            {activeTab === "Reservoir Management" && (
              <>
                <Panel
                  title={editingId ? "Edit Reservoir" : "Register a Reservoir"}
                  subtitle="Create or update a simulated water-storage record"
                >
                  <form className="reservoir-form" onSubmit={saveReservoir}>
                    <label>
                      Community
                      <input name="community" value={form.community} onChange={updateForm} required minLength="2" />
                    </label>
                    <label>
                      Reservoir name
                      <input name="name" value={form.name} onChange={updateForm} required minLength="2" />
                    </label>
                    <label>
                      Capacity (m³)
                      <input type="number" min="0.01" step="any" name="capacity_m3" value={form.capacity_m3} onChange={updateForm} required />
                    </label>
                    <label>
                      Current storage (m³)
                      <input type="number" min="0" step="any" name="current_volume_m3" value={form.current_volume_m3} onChange={updateForm} required />
                    </label>
                    <label>
                      Daily inflow (m³)
                      <input type="number" min="0" step="any" name="inflow_m3_day" value={form.inflow_m3_day} onChange={updateForm} required />
                    </label>
                    <label>
                      Daily demand (m³)
                      <input type="number" min="0" step="any" name="demand_m3_day" value={form.demand_m3_day} onChange={updateForm} required />
                    </label>
                    <label>
                      Daily outflow (m³)
                      <input type="number" min="0" step="any" name="outflow_m3_day" value={form.outflow_m3_day} onChange={updateForm} required />
                    </label>
                    <div className="form-actions">
                      <button className="primary-button" type="submit" disabled={saving}>
                        {saving ? "Saving..." : editingId ? "Update reservoir" : "Add reservoir"}
                      </button>
                      {editingId && (
                        <button className="secondary-button" type="button" onClick={resetForm}>
                          Cancel editing
                        </button>
                      )}
                    </div>
                  </form>
                  {simulationMessage && <p className="success-message">{simulationMessage}</p>}
                </Panel>

                <Panel title="Registered Reservoirs" subtitle="Edit or remove reservoir records">
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Reservoir</th>
                          <th>Community</th>
                          <th>Capacity</th>
                          <th>Storage</th>
                          <th>Inflow</th>
                          <th>Demand</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservoirs.map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.community}</td>
                            <td>{formatNumber(item.capacity_m3)} m³</td>
                            <td>{formatNumber(item.current_volume_m3)} m³</td>
                            <td>{formatNumber(item.inflow_m3_day)}</td>
                            <td>{formatNumber(item.demand_m3_day)}</td>
                            <td className="action-cell">
                              <button className="small-button" onClick={() => editReservoir(item)}>Edit</button>
                              <button className="small-button danger-button" onClick={() => deleteReservoir(item.id, item.name)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </>
            )}

            {activeTab === "Shortage Intelligence" && (
              <>
                <div className="metrics-grid">
                  <Metric label="HIGH RISK" value={highRiskCount} unit="reservoirs" />
                  <Metric label="WATCH LIST" value={watchCount} unit="reservoirs" />
                  <Metric label="COUNTY STORAGE" value={`${formatNumber(averageStorage)}%`} unit="" />
                </div>
                <Panel
                  title="Shortage Forecast"
                  subtitle="Linear projections based on current simulated daily net change"
                >
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Community</th>
                          <th>Current storage</th>
                          <th>Daily net change</th>
                          <th>Estimated days to empty</th>
                          <th>Estimated shortage date</th>
                          <th>Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {intelligence.map((item) => (
                          <tr key={item.reservoir_id}>
                            <td>{item.community}</td>
                            <td>{item.storage_percent}%</td>
                            <td>{formatNumber(item.net_daily_change_m3)} m³</td>
                            <td>{item.days_to_empty_estimate ?? "Not depleting"}</td>
                            <td>{item.estimated_shortage_date || "Not estimated"}</td>
                            <td><RiskLabel risk={item.shortage_risk} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
                {intelligence.map((item) => (
                  <Panel
                    key={item.reservoir_id}
                    title={item.name}
                    subtitle={item.risk_explanation}
                  >
                    <div className="forecast-cards">
                      <Metric label="CURRENT STORAGE" value={formatNumber(item.current_storage_m3)} unit="m³" />
                      <Metric label="7-DAY PROJECTION" value={formatNumber(item.projected_storage_7_days_m3)} unit="m³" />
                      <Metric label="14-DAY PROJECTION" value={formatNumber(item.projected_storage_14_days_m3)} unit="m³" />
                    </div>
                    <RiskLabel risk={item.shortage_risk} />
                  </Panel>
                ))}
              </>
            )}

            {activeTab === "Leak Detection" && (
              <Panel
                title="Flow anomaly screening"
                subtitle="A preliminary comparison of outflow and demand; a difference alone does not prove a leak"
              >
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Reservoir</th>
                        <th>Outflow</th>
                        <th>Demand</th>
                        <th>Flow gap</th>
                        <th>Screening result</th>
                        <th>Explanation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intelligence.map((item) => (
                        <tr key={item.reservoir_id}>
                          <td>{item.name}</td>
                          <td>{formatNumber(item.outflow_m3_day)} m³/day</td>
                          <td>{formatNumber(item.demand_m3_day)} m³/day</td>
                          <td>{formatNumber(item.flow_gap_m3_day)} m³/day</td>
                          <td>
                            <RiskLabel risk={item.flow_anomaly ? "WARNING" : "STABLE"} />
                          </td>
                          <td>{item.anomaly_explanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="info-note">
                  This MVP uses a simple screening threshold. Real leak detection
                  requires validated flow measurements, pressure data and field checks.
                </p>
              </Panel>
            )}

            {activeTab === "Distribution" && (
              <>
                <Panel
                  title="Water distribution planning"
                  subtitle="Compare daily inflow indicators with daily demand indicators"
                >
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Community</th>
                          <th>Daily inflow</th>
                          <th>Daily demand</th>
                          <th>Deficit</th>
                          <th>Surplus</th>
                          <th>Planning note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {distribution.map((item) => (
                          <tr key={item.reservoir_id}>
                            <td>{item.community}</td>
                            <td>{formatNumber(item.inflow_m3_day)} m³</td>
                            <td>{formatNumber(item.demand_m3_day)} m³</td>
                            <td>{formatNumber(item.deficit_m3_day)} m³</td>
                            <td>{formatNumber(item.surplus_m3_day)} m³</td>
                            <td>{item.recommendation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>

                <Panel title="Inflow versus demand" subtitle="Daily simulated values by community">
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={distribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="community" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="inflow_m3_day" name="Inflow" fill="#22c55e" />
                        <Bar dataKey="demand_m3_day" name="Demand" fill="#38bdf8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </>
            )}

            {activeTab === "History & Reports" && (
              <>
                <Panel
                  title="Historical reservoir storage"
                  subtitle="Records are saved in the local SQLite database when reservoirs are created, updated or simulated"
                >
                  {history.length === 0 ? (
                    <p className="empty-state">
                      No history records yet. Run a simulation or update a reservoir to create records.
                    </p>
                  ) : (
                    <>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={340}>
                          <LineChart data={historyChart}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="storage"
                              name="Storage (m³)"
                              stroke="#38bdf8"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="history-groups">
                        {Object.entries(communityHistory).map(([community, records]) => (
                          <div className="history-community" key={community}>
                            <h4>{community}</h4>
                            <span>{records.length} saved records</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Panel>

                <Panel title="Download reports" subtitle="Export the current reservoir register">
                  <p>
                    Download a CSV file containing reservoir capacity, storage,
                    inflow, demand, outflow and the simulated-data label.
                  </p>
                  <a
                    className="primary-button download-link"
                    href={`${API}/api/reports/reservoirs.csv`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download reservoir CSV report
                  </a>
                </Panel>

                <Panel title="Recent history records" subtitle="Latest saved measurements in the simulation database">
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Recorded at</th>
                          <th>Community</th>
                          <th>Storage</th>
                          <th>Storage percentage</th>
                          <th>Data status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...history].reverse().slice(0, 30).map((item) => (
                          <tr key={item.id}>
                            <td>{new Date(item.recorded_at).toLocaleString()}</td>
                            <td>{item.community}</td>
                            <td>{formatNumber(item.storage_m3)} m³</td>
                            <td>{formatNumber(item.storage_percent)}%</td>
                            <td>SIMULATED</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </>
            )}
          </>
        )}

        <footer className="app-footer">
          <span>AQUASENSE · EMBU COUNTY PILOT</span>
          <span>
            {lastUpdated
              ? `Last refreshed ${lastUpdated.toLocaleTimeString()}`
              : "Waiting for data"}
          </span>
          <span>All displayed readings are simulated</span>
        </footer>
      </main>
    </div>
  );
}
