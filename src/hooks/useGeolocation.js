import { useState, useEffect } from "react";

// Live GPS tracking via the browser Geolocation API (watchPosition).
// Returns { coords: {latitude, longitude, accuracy}, error, loading }.
export function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported on this device");
      setLoading(false);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Location permission denied");
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { coords, error, loading };
}