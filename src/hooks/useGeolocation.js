import { useState, useEffect, useCallback } from "react";

// Live GPS tracking via the browser Geolocation API (watchPosition).
// Returns { coords: {latitude, longitude, accuracy}, error, loading }.
export function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const readPosition = useCallback((position) => {
    const next = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp || Date.now(),
    };
    setCoords(next);
    setError(null);
    setLoading(false);
    return next;
  }, []);

  const refresh = useCallback(() => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const cause = new Error("Location is not supported by this browser.");
      setError(cause.message);
      reject(cause);
      return;
    }
    setRefreshing(true);
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(readPosition(position)),
      (cause) => {
        const message = geoErrorMessage(cause);
        setError(message);
        reject(new Error(message));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }).finally(() => setRefreshing(false)), [readPosition]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser.");
      setLoading(false);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        readPosition(pos);
      },
      (err) => {
        setError(geoErrorMessage(err));
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 25000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [readPosition]);

  return { coords, error, loading, refreshing, refresh };
}

function geoErrorMessage(error) {
  if (error?.code === 1) return "Location permission is blocked. Allow location access in your browser settings.";
  if (error?.code === 2) return "The device could not determine its location. Move to an open area and try again.";
  if (error?.code === 3) return "Location took too long. Try again outdoors or enter coordinates manually.";
  return error?.message || "Could not read the device location.";
}
