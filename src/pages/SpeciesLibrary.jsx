import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, BookOpen, ChevronRight, Globe2,
  Leaf, MapPin, Search, ShieldAlert, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from "@/components/ui/dialog";
import PokharaLogo from "@/components/PokharaLogo";
import { speciesGroups, speciesLibrary } from "@/data/speciesLibrary";

const getLanguage = (searchParams) => {
  const requested = searchParams.get("lang");
  if (requested === "en" || requested === "np") return requested;
  return window.localStorage.getItem("nws-public-language") === "np" ? "np" : "en";
};

const ui = {
  en: {
    title: "Wildlife species library", subtitle: "A field-friendly guide to animals people may encounter. Browse, search by name, and review calm, safe actions.",
    back: "Back to home", language: "नेपाली", search: "Search animals or scientific names", searchLabel: "Search species", count: "species", open: "View guide",
    featured: "START WITH WHAT YOU SAW", featuredTitle: "Not sure what animal it was?", featuredBody: "Compare the photo and names below. If you are still unsure, submit your report as unidentified. A human reviewer will check it.",
    all: "Browse all", emptyTitle: "No animals found", emptyBody: "Try another name or clear the selected category.", clear: "Clear filters",
    facts: "At a glance", habitat: "Habitat", diet: "Food", safety: "If you see one", photo: "Reference photo", photoLocation: "Photo location", credit: "Photo", photoBy: "Photo by", license: "License",
    important: "Stay safe. Do not approach, feed, chase or try to scare wildlife. Keep a safe distance and follow local officials' advice.",
    photoNote: "Educational reference image, resized/cropped for display. It is not evidence from a live sighting or a camera connected to this system.",
    collectionNote: "This starter collection includes selected species found in Nepal and is not a complete global species list. Species identification in submitted reports remains subject to human review.",
    home: "Home", library: "Species library", close: "Close species guide", countLabel: "Showing",
  },
  np: {
    title: "वन्यजन्तु प्रजाति पुस्तकालय", subtitle: "मानिसले भेट्न सक्ने जनावरबारे सजिलो जानकारी। नाम खोज्नुहोस् र सुरक्षित व्यवहारबारे पढ्नुहोस्।",
    back: "मुख्य पृष्ठमा फर्कनुहोस्", language: "English", search: "जनावर वा वैज्ञानिक नाम खोज्नुहोस्", searchLabel: "प्रजाति खोज्नुहोस्", count: "प्रजाति", open: "जानकारी हेर्नुहोस्",
    featured: "देखिएको जनावर चिन्नुहोस्", featuredTitle: "कुन जनावर हो पक्का छैन?", featuredBody: "तलका तस्बिर र नामसँग तुलना गर्नुहोस्। अझै पक्का नभए ‘पहिचान नभएको’ भनेर विवरण पठाउनुहोस्। समीक्षकले जाँच गर्नेछन्।",
    all: "सबै हेर्नुहोस्", emptyTitle: "जनावर भेटिएन", emptyBody: "अर्को नाम खोज्नुहोस् वा छानिएको समूह हटाउनुहोस्।", clear: "फिल्टर हटाउनुहोस्",
    facts: "छोटो जानकारी", habitat: "बासस्थान", diet: "खाना", safety: "देखिएमा के गर्ने", photo: "सन्दर्भ तस्बिर", photoLocation: "तस्बिर खिचिएको ठाउँ", credit: "तस्बिर", photoBy: "तस्बिर", license: "इजाजत",
    important: "सुरक्षित रहनुहोस्। वन्यजन्तु नजिक नजानुहोस्, खाना नदिनुहोस्, नलखेट्नुहोस् र डराउने प्रयास नगर्नुहोस्। सुरक्षित दूरी राख्नुहोस् र स्थानीय अधिकारीको सल्लाह मान्नुहोस्।",
    photoNote: "जानकारीका लागि राखिएको तस्बिर हो; वेबसाइटमा देखाउन आकार मिलाइएको छ। यो हालै देखिएको वा यस प्रणालीको क्यामेराबाट आएको प्रमाण होइन।",
    collectionNote: "यो सुरुआती सूचीमा नेपालमा पाइने केही प्रजाति छन्; यो विश्वका सबै प्रजातिको पूर्ण सूची होइन। पठाइएका विवरणमा जनावरको पहिचान मानिसले समीक्षा गरेपछि मात्र पुष्टि हुन्छ।",
    home: "मुख्य पृष्ठ", library: "प्रजाति पुस्तकालय", close: "प्रजातिको जानकारी बन्द गर्नुहोस्", countLabel: "देखाइएका",
  },
};

function SpeciesDetails({ animal, lang, text }) {
  if (!animal) return null;
  const localized = (field) => animal[field][lang];
  return (
    <DialogContent className="max-h-[94dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto rounded-3xl border-0 bg-white p-0 shadow-2xl sm:w-[calc(100%-2rem)]">
      <div className="grid md:grid-cols-[.92fr_1.08fr]">
        <div className="relative min-h-64 bg-slate-100 md:min-h-full">
          <img src={animal.image} alt={animal.alt[lang]} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow">{text.photo}</span>
        </div>
        <div className="p-5 sm:p-7">
          <div className="pr-9">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">{text.facts}</p>
            <DialogTitle className="mt-2 text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">{animal.commonName[lang]}</DialogTitle>
            <p className="mt-1 text-sm italic text-slate-500">{animal.scientificName}</p>
            <DialogDescription className="mt-4 text-sm leading-6 text-slate-600">{localized("summary")}</DialogDescription>
          </div>
          <dl className="mt-5 grid gap-3">
            {[
              [MapPin, text.habitat, localized("habitat")],
              [Leaf, text.diet, localized("diet")],
              [ShieldAlert, text.safety, localized("safety")],
            ].map(([Icon, label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600"><Icon className="h-4 w-4 text-emerald-800" />{label}</dt>
                <dd className="mt-2 text-sm leading-6 text-slate-700">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">{text.photoLocation}</p>
            <p className="mt-1 text-sm text-emerald-950">{animal.photoLocation[lang]}</p>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            {text.credit}: <a className="font-semibold text-emerald-900 underline underline-offset-2" href={animal.source} target="_blank" rel="noreferrer">{animal.photoCredit}</a>
            {" · "}<a className="text-emerald-900 underline underline-offset-2" href={animal.license === "CC BY-SA 3.0" ? "https://creativecommons.org/licenses/by-sa/3.0/" : "https://creativecommons.org/licenses/by-sa/4.0/"} target="_blank" rel="noreferrer">{animal.license}</a>
            {" · "}{text.photoNote}
          </p>
        </div>
      </div>
    </DialogContent>
  );
}

export default function SpeciesLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lang, setLang] = useState(() => getLanguage(searchParams));
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [selected, setSelected] = useState(null);
  const text = ui[lang];

  useEffect(() => {
    document.documentElement.lang = lang === "np" ? "ne" : "en";
    window.localStorage.setItem("nws-public-language", lang);
  }, [lang]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return speciesLibrary.filter((animal) => {
      if (group !== "all" && animal.group !== group) return false;
      if (!normalizedQuery) return true;
      const terms = [
        animal.commonName.en, animal.commonName.np, animal.scientificName,
        animal.photoLocation.en, animal.photoLocation.np, animal.id,
      ].join(" ").toLocaleLowerCase();
      return terms.includes(normalizedQuery);
    });
  }, [group, query]);

  const switchLanguage = () => {
    const nextLanguage = lang === "en" ? "np" : "en";
    setLang(nextLanguage);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("lang", nextLanguage);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#f7f8f5] pb-10 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-emerald-950/10 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-[4.5rem] sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Link to={"/welcome?lang=" + lang} aria-label={text.home} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 ring-1 ring-emerald-900/10 sm:h-11 sm:w-11"><PokharaLogo className="h-8 w-8" /></Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950 sm:text-base">{text.title}</p>
              <Link to={"/welcome?lang=" + lang} className="inline-flex min-h-6 items-center gap-1 text-xs font-medium text-emerald-800 hover:underline"><ArrowLeft className="h-3 w-3" />{text.back}</Link>
            </div>
          </div>
          <button type="button" onClick={switchLanguage} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" aria-label={text.language}><Globe2 className="h-4 w-4" /><span>{text.language}</span></button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-7 pt-7 sm:px-6 sm:pb-10 sm:pt-10 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[#15382f] text-white shadow-[0_24px_64px_-38px_rgba(9,48,37,.75)]">
          <div className="absolute inset-0 opacity-25">
            <img src="/images/species/rhesus_macaque.jpg" alt="" className="h-full w-full object-cover object-[center_38%]" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#102f27] via-[#15382f]/95 to-[#15382f]/45" />
          <div className="relative max-w-3xl px-5 py-8 sm:px-9 sm:py-11">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-lime-200"><BookOpen className="h-4 w-4" />{text.featured}</div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">{text.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/85 sm:text-base sm:leading-7">{text.subtitle}</p>
            <div className="mt-6 max-w-2xl rounded-2xl border border-white/15 bg-black/15 p-4 sm:p-5">
              <h2 className="font-semibold">{text.featuredTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-emerald-50/80">{text.featuredBody}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label={text.library}>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-100">
            <Search className="h-5 w-5 shrink-0 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={text.searchLabel} placeholder={text.search} className="min-h-12 w-full border-0 bg-transparent text-base outline-none placeholder:text-slate-400 focus:ring-0" />
            {query && <button type="button" onClick={() => setQuery("")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-200" aria-label={text.clear}><X className="h-4 w-4" /></button>}
          </label>
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={text.all}>
            {speciesGroups.map((item) => (
              <button key={item.id} type="button" onClick={() => setGroup(item.id)} aria-pressed={group === item.id} className={"min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition " + (group === item.id ? "bg-emerald-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}>{item.label[lang]}</button>
            ))}
          </div>
        </div>

        <div className="mb-4 mt-6 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-600" aria-live="polite">{text.countLabel} <strong className="text-slate-950">{filtered.length}</strong> {text.count}</p>
          {(query || group !== "all") && <button type="button" onClick={() => { setQuery(""); setGroup("all"); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">{text.clear}<X className="h-4 w-4" /></button>}
        </div>

        {filtered.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((animal) => (
              <article key={animal.id} className="group overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_8px_28px_-24px_rgba(15,23,42,.4)] transition hover:-translate-y-0.5 hover:shadow-lg">
                <button type="button" onClick={() => setSelected(animal)} className="block w-full text-left focus-visible:outline focus-visible:outline-4 focus-visible:outline-emerald-500" aria-label={text.open + ": " + animal.commonName[lang]}>
                  <div className="relative h-52 overflow-hidden bg-slate-100 sm:h-56">
                    <img src={animal.image} alt={animal.alt[lang]} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"><MapPin className="h-3.5 w-3.5 text-emerald-800" />{animal.photoLocation[lang]}</span>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold leading-snug text-slate-950 sm:text-xl">{animal.commonName[lang]}</h2>
                        <p className="mt-1 text-sm italic text-slate-500">{animal.scientificName}</p>
                      </div>
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-900 transition group-hover:bg-emerald-900 group-hover:text-white"><ChevronRight className="h-5 w-5" /></span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{animal.summary[lang]}</p>
                    <span className="mt-3 block text-[11px] leading-5 text-slate-500">{text.photoBy} {animal.photoCredit} · {animal.license}</span>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-900">{text.open}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                  </div>
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-400" />
            <h2 className="mt-4 text-xl font-semibold">{text.emptyTitle}</h2>
            <p className="mt-2 text-sm text-slate-600">{text.emptyBody}</p>
            <button type="button" onClick={() => { setQuery(""); setGroup("all"); }} className="mt-5 min-h-11 rounded-full bg-emerald-900 px-5 text-sm font-semibold text-white">{text.clear}</button>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <p className="flex items-start gap-2.5 text-sm leading-6 text-amber-950"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />{text.important}</p>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">{text.collectionNote}</p>
        <Link to={"/welcome?lang=" + lang + "#guides"} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-emerald-800 hover:text-emerald-900"><ArrowLeft className="h-4 w-4" />{text.back}</Link>
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SpeciesDetails animal={selected} lang={lang} text={text} />
      </Dialog>
    </main>
  );
}
