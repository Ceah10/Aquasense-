# WATERMIND project status

## Version 0.1.0 — simulation MVP
- [x] FastAPI service and health endpoint
- [x] Simulated reservoir dashboard endpoint
- [x] Transparent storage-balance shortage screening
- [x] Basic possible-anomaly screening
- [x] Proportional allocation scenario endpoint
- [x] React dashboard and scenario lab
- [ ] Persistent PostgreSQL database
- [ ] User authentication and roles
- [ ] Historical time-series data
- [ ] Validated predictive models
- [ ] Geospatial map and asset registry
- [ ] Real IoT ingestion
- [ ] Field validation

## Data integrity rules
Every future reading should include: timestamp, asset/sensor ID, measurement, unit, source (`SIMULATED` or `SENSOR`), quality status, and ingestion time. Do not mix simulated and measured readings without visibly distinguishing them.
