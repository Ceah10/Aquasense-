
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const locations = [
  {
    name: "Embu Town",
    position: [-0.5399, 37.4574],
    storage: 62,
    risk: "LOW"
  },
  {
    name: "Runyenjes",
    position: [-0.4230, 37.5704],
    storage: 78,
    risk: "LOW"
  },
  {
    name: "Siakago",
    position: [-0.5773, 37.6400],
    storage: 26.2,
    risk: "HIGH"
  },
  {
    name: "Kiritiri",
    position: [-0.6877, 37.6480],
    storage: 38,
    risk: "WATCH"
  },
  {
    name: "Ishiara",
    position: [-0.4530, 37.7888],
    storage: 57,
    risk: "LOW"
  }
];

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function EmbuMap() {
  return (
    <div className="embu-map-wrapper">
      <div className="map-heading">
        <h3>Embu County geographical monitoring</h3>
        <p>Approximate town and pilot service-area locations</p>
        <span className="map-status">PILOT MAP · SIMULATED DATA</span>
      </div>

      <MapContainer
        center={[-0.54, 37.62]}
        zoom={10}
        scrollWheelZoom={true}
        className="embu-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locations.map((location) => (
          <Marker
            key={location.name}
            position={location.position}
            icon={markerIcon}
          >
            <Popup>
              <strong>{location.name}</strong>
              <br />
              Storage: {location.storage}%
              <br />
              Shortage risk: {location.risk}
              <br />
              <small>Illustrative simulated monitoring data</small>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
