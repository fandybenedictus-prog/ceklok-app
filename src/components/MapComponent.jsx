import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon missing in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to recenter map when specific location changes
// Component to recenter map when specific location changes
function RecenterMap({ location, disableAutoCenter }) {
    const map = useMap();
    const [initialized, setInitialized] = React.useState(false);

    useEffect(() => {
        if (location) {
            // If auto-center is disabled (e.g. user is picking point), 
            // only center ONCE initially, then stop.
            if (disableAutoCenter) {
                if (!initialized) {
                    map.flyTo(location, map.getZoom());
                    setInitialized(true);
                }
            } else {
                // Normal behavior: always follow
                map.flyTo(location, map.getZoom());
            }
        }
    }, [location, map, disableAutoCenter, initialized]);
    return null;
}

const MapComponent = ({ myLocation, otherLocations, meetingPoint, onSetMeetingPoint, searchCenter, isPicking, role }) => {
    // Default center if no location (Indonesia)
    const defaultCenter = [-0.7893, 113.9213];
    const center = myLocation || defaultCenter;

    // Green Icon for Buyer
    const greenIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    return (
        <MapContainer center={center} zoom={13} scrollWheelZoom={true} className="h-full w-full z-0">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Recenter when myLocation changes. Disable auto-center if picking location. */}
            {myLocation && <RecenterMap location={myLocation} disableAutoCenter={isPicking} />}

            {/* Recenter when searchCenter changes (Always force recenter for search results) */}
            {searchCenter && <RecenterMap location={searchCenter} disableAutoCenter={false} />}

            {myLocation && (
                <Marker position={myLocation} icon={role === 'buyer' ? greenIcon : undefined}>
                    <Popup>
                        You are here ({role === 'buyer' ? 'Pembeli' : 'Penjual'})
                    </Popup>
                </Marker>
            )}

            {Object.entries(otherLocations).map(([id, user]) => (
                <Marker key={id} position={[user.latitude, user.longitude]} icon={user.role === 'buyer' ? greenIcon : undefined}>
                    <Popup>
                        <div className="text-center">
                            <h3 className="font-bold">{user.username}</h3>
                            <p className="text-xs text-gray-500 mb-1">({user.role === 'buyer' ? 'Pembeli' : 'Penjual'})</p>
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${user.latitude},${user.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 no-underline"
                            >
                                🗺️ Buka di Google Maps
                            </a>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {meetingPoint && (
                <Marker position={meetingPoint} icon={
                    new L.Icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })
                }>
                    <Popup>
                        <div className="text-center">
                            <h3 className="font-bold text-yellow-600">Meeting Point</h3>
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${meetingPoint[0]},${meetingPoint[1]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 no-underline"
                            >
                                🗺️ Navigasi ke Sini
                            </a>
                        </div>
                    </Popup>
                </Marker>
            )}

            {/* Click listener to set meeting point */}
            <LocationMarker onSetMeetingPoint={onSetMeetingPoint} isPicking={true} />
        </MapContainer>
    );
};

function LocationMarker({ onSetMeetingPoint, isPicking }) {
    useMapEvents({
        click(e) {
            if (isPicking) {
                onSetMeetingPoint(e.latlng);
            }
        },
    });
    return null;
}

export default MapComponent;
