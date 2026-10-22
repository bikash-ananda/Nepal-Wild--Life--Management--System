import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Fingerprint, MapPin, Calendar, Eye, Target, ScanFace, ImageOff } from "lucide-react";
import { api } from "@/api/apiClient";
import StatusBadge from "@/components/StatusBadge";
import PrivateImage from "@/components/PrivateImage";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import IdentifyIndividualModal from "@/components/individuals/IdentifyIndividualModal";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const SIG_LABELS = {
  pattern_type: "Pattern type",
  distinguishing_marks: "Distinguishing marks",
  body_condition: "Body condition",
  estimated_age_class: "Age class",
  sex: "Sex",
  summary: "Summary",
};

export default function IndividualDetail() {
  const { id } = useParams();
  const [individual, setIndividual] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [identifyOpen, setIdentifyOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.entities.AnimalIndividual.get(id).catch(() => null),
      api.entities.DetectionEvent.filter({ individual_id: id }, { sort: "-detected_at", limit: 50 }),
      api.entities.WildlifeObservation.filter({ individual_id: id }, { sort: "-observed_at", limit: 50 }),
    ]).then(([ind, dRes, oRes]) => {
      setIndividual(ind);
      const dItems = (dRes.items || dRes || []).map((d) => ({
        ...d,
        _kind: "detection",
        _date: d.detected_at || d.created_date,
        _photo: d.image_url,
        _location: d.site_name,
      }));
      const oItems = (oRes.items || oRes || []).map((o) => ({
        ...o,
        _kind: "observation",
        _date: o.observed_at || o.created_date,
        _photo: o.photos && o.photos[0],
        _location: o.location_name,
      }));
      const all = [...dItems, ...oItems].sort((a, b) => new Date(b._date || 0) - new Date(a._date || 0));
      setSightings(all);
      setLoading(false);
    });
  };
  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!individual) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200">
        <EmptyState icon={Fingerprint} title="Individual not found" description="This animal may have been removed." action={<Link to="/individuals"><Button>Back to gallery</Button></Link>} />
      </div>
    );
  }

  const photos = individual.reference_photos || [];
  const sig = individual.feature_signature || {};
  const geoSightings = sightings.filter((s) => s.latitude && s.longitude);
  const hasMap = geoSightings.length > 0;
  const center = hasMap ? [geoSightings[0].latitude, geoSightings[0].longitude] : [27.7, 85.3];

  return (
    <div>
      <Link to="/individuals" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to individuals
      </Link>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="bg-slate-900 aspect-[4/3] lg:aspect-auto relative">
            {photos.length > 0 ? (
              <PrivateImage fileUri={photos[activePhoto]} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                <ImageOff className="w-8 h-8" />
              </div>
            )}
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-3 flex gap-1.5">
                {photos.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(i)}
                    className={`w-10 h-10 rounded-md overflow-hidden border-2 ${i === activePhoto ? "border-emerald-400" : "border-white/40"}`}
                  >
                    <PrivateImage fileUri={p} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="p-6 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{individual.nickname || "Unnamed"}</h1>
                <div className="text-sm text-slate-400">{individual.individual_code}</div>
              </div>
              <StatusBadge status={individual.status} />
            </div>
            <div className="text-sm text-slate-600 mb-4">
              {individual.species_name} {individual.scientific_name ? `· ${individual.scientific_name}` : ""}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-emerald-700">{individual.sighting_count || 0}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">Sightings</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-sm font-semibold text-slate-700">{individual.first_seen_at ? new Date(individual.first_seen_at).toLocaleDateString() : "—"}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">First seen</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-sm font-semibold text-slate-700">{individual.last_seen_at ? timeAgo(individual.last_seen_at) : "—"}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">Last seen</div>
              </div>
            </div>
            {individual.last_location && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
                <MapPin className="w-4 h-4" /> {individual.last_location}
              </div>
            )}
            <div className="mt-auto">
              <Button onClick={() => setIdentifyOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <ScanFace className="w-4 h-4 mr-2" /> Add / match a sighting
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature signature */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h3 className="font-semibold text-slate-800 mb-4">Feature signature (AI-extracted)</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SIG_LABELS).map(([key, label]) => {
            const val = sig[key];
            if (!val) return null;
            return (
              <div key={key} className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold">{label}</div>
                <div className="text-sm text-slate-700 capitalize">{String(val).replace(/_/g, " ")}</div>
              </div>
            );
          })}
          {Object.keys(sig).length === 0 && (
            <p className="text-sm text-slate-400">No feature signature extracted.</p>
          )}
        </div>
        {individual.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Ranger notes</div>
            <p className="text-sm text-slate-600">{individual.notes}</p>
          </div>
        )}
      </div>

      {/* Sighting history */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Sighting history</h3>
          {sightings.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No linked sightings yet. Use “Add / match a sighting” to record one.</p>
          ) : (
            <div className="space-y-3">
              {sightings.map((s) => (
                <div key={s.id} className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    {s._photo ? <PrivateImage fileUri={s._photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Eye className="w-5 h-5" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {s._kind === "detection" ? <Target className="w-3.5 h-3.5 text-blue-500" /> : <Eye className="w-3.5 h-3.5 text-emerald-500" />}
                      <span className="text-sm font-medium text-slate-700 capitalize">{s._kind}</span>
                      {typeof s.match_confidence === "number" && (
                        <span className="text-xs text-slate-400">· {Math.round(s.match_confidence * 100)}% match</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{s._location || s.site_name || "Unknown location"}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" /> {s._date ? new Date(s._date).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Sighting map</h3>
          {hasMap ? (
            <div className="rounded-xl overflow-hidden border border-slate-200 h-72">
              <MapContainer center={center} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                {geoSightings.map((s, i) => (
                  <CircleMarker key={i} center={[s.latitude, s.longitude]} radius={7} pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.7 }}>
                    <Tooltip>{s._location || `Sighting ${i + 1}`}</Tooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-sm text-slate-400 text-center px-4">
              No geocoded sightings yet. Linked detections/observations with coordinates will appear on this map.
            </div>
          )}
        </div>
      </div>

      <IdentifyIndividualModal
        open={identifyOpen}
        onOpenChange={setIdentifyOpen}
        presetSpeciesId={individual.species}
        onConfirmed={load}
      />
    </div>
  );
}