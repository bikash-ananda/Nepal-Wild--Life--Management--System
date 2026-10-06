import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ScanFace, UserPlus, Search, Fingerprint } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import PrivateImage from "@/components/PrivateImage";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/motion/MotionKit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RegisterIndividualModal from "@/components/individuals/RegisterIndividualModal";
import IdentifyIndividualModal from "@/components/individuals/IdentifyIndividualModal";

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Individuals() {
  const [items, setItems] = useState([]);
  const [speciesList, setSpeciesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [identifyOpen, setIdentifyOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.AnimalIndividual.filter({}, { sort: "-last_seen_at", limit: 100 }),
      base44.entities.Species.filter({ category: "wildlife" }, { limit: 200 }),
    ])
      .then(([res, spRes]) => {
        setItems(res.items || res || []);
        setSpeciesList(spRes.items || spRes || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((i) => {
    const matchSearch =
      (i.nickname || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.individual_code || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.species_name || "").toLowerCase().includes(search.toLowerCase());
    const matchSpecies = speciesFilter === "all" || i.species === speciesFilter;
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchSpecies && matchStatus;
  });

  return (
    <div>
      <PageHeader
        title="Individual Animals"
        description="Re-identify specific animals across sightings — all wildlife species"
        icon={Fingerprint}
        actions={
          <>
            <Button variant="outline" onClick={() => setIdentifyOpen(true)} className="border-emerald-300 text-emerald-700">
              <ScanFace className="w-4 h-4 mr-2" /> Identify a Sighting
            </Button>
            <Button onClick={() => setRegisterOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <UserPlus className="w-4 h-4 mr-2" /> Register Individual
            </Button>
          </>
        }
      />

      <FadeIn className="mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by nickname, code, or species..."
              className="pl-9"
            />
          </div>
          <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
            <SelectTrigger className="sm:w-48"><SelectValue placeholder="All species" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All species</SelectItem>
              {speciesList.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-40"><SelectValue placeholder="All status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FadeIn>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={Fingerprint}
            title="No individuals registered yet"
            description="Register an animal with reference photos to start building your identity gallery."
            action={
              <Button onClick={() => setRegisterOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <UserPlus className="w-4 h-4 mr-2" /> Register first individual
              </Button>
            }
          />
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" stagger={0.05}>
          {filtered.map((ind) => (
            <StaggerItem key={ind.id}>
              <Link
                to={`/individuals/${ind.id}`}
                className="block bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all"
              >
                <div className="aspect-[4/3] bg-slate-100">
                  <PrivateImage
                    fileUri={ind.reference_photos && ind.reference_photos[0]}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-slate-800 truncate">{ind.nickname || "Unnamed"}</div>
                    <StatusBadge status={ind.status} />
                  </div>
                  <div className="text-xs text-slate-400 mb-3">{ind.individual_code}</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 truncate">{ind.species_name}</span>
                    <span className="font-semibold text-emerald-700">{ind.sighting_count || 0} sightings</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Last seen {timeAgo(ind.last_seen_at)}
                  </div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      <RegisterIndividualModal open={registerOpen} onOpenChange={setRegisterOpen} onCreated={load} />
      <IdentifyIndividualModal open={identifyOpen} onOpenChange={setIdentifyOpen} onConfirmed={load} />
    </div>
  );
}