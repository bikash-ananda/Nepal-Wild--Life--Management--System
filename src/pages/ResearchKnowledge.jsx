import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, BookOpen, Leaf, Search, ShieldCheck, Cpu, CalendarDays } from "lucide-react";
import { officialResearchSources, preventionMethods, researchReviewedOn, researchStudies, technologyStatusLabels } from "@/data/researchKnowledge";

const text = {
  en: {
    back: "Back to WLMS", eyebrow: "EVIDENCE, RESEARCH & PRACTICAL SOLUTIONS",
    title: "Research & Knowledge Centre", intro: "Explore what Nepal-based research and official assessments have documented: where conflicts occurred, what was affected, what researchers found, and which prevention methods have been studied or used.",
    studies: "Research and field evidence", methods: "Prevention methods and technologies", sources: "Official source organisations",
    studyIntro: "Short, plain-language summaries. Open the original paper or report for the full methods, data and conclusions.",
    methodsIntro: "Methods are labelled by their evidence status. A method used in one landscape may not work the same way elsewhere.",
    search: "Search by species, place, topic or title", all: "All topics", national: "National studies", mitigation: "Prevention methods", "human-safety": "Human safety", "species-conflict": "Species conflicts",
    allYears: "All years", allRegions: "All study areas", read: "Read original study", limitations: "Scope and limitations",
    status: "Evidence status", fit: "Where it may help", caution: "Safety and limitations",
    updated: "Content reviewed", note: "Research summaries are editorial explanations, not substitutes for the original publications. Dates, sample sizes and findings are reported as described by each source. Study findings are location- and method-specific; they should not be treated as current local risk estimates.",
    methodSearch: "Search methods or technology", allGroups: "All methods", community: "Community", livestock: "Livestock safety", barrier: "Barriers", technology: "Technology", landscape: "Landscape",
    sourceNote: "Use these institutional libraries to find additional reports and publications. A source organisation's website is not itself proof that every listed claim has been independently verified.",
    noResults: "No matching studies. Try a different search or filter.",
  },
  np: {
    back: "WLMS मुख्य पृष्ठ", eyebrow: "प्रमाण, अनुसन्धान र व्यवहारिक समाधान",
    title: "अनुसन्धान तथा ज्ञान केन्द्र", intro: "नेपालमा भएका अनुसन्धान र सरकारी मूल्याङ्कनबाट कहाँ, कहिले, कुन वन्यजन्तुबाट कस्तो क्षति भयो, अनुसन्धानले के देखायो र रोकथामका कुन उपाय अध्ययन वा प्रयोग भएका छन् भन्ने कुरा पढ्नुहोस्।",
    studies: "अनुसन्धान तथा क्षेत्रीय प्रमाण", methods: "क्षति रोकथामका उपाय तथा प्रविधि", sources: "आधिकारिक स्रोत संस्था",
    studyIntro: "सरल भाषामा छोटो सारांश पढ्नुहोस्। विधि, तथ्याङ्क र पूर्ण निष्कर्षका लागि मूल अनुसन्धान वा प्रतिवेदन खोल्नुहोस्।",
    methodsIntro: "प्रत्येक उपायको प्रमाण अवस्था स्पष्ट राखिएको छ। एउटा क्षेत्रमा उपयोगी भएको विधि अर्को ठाउँमा उस्तै प्रभावकारी हुन्छ भन्ने हुँदैन।",
    search: "प्रजाति, स्थान, विषय वा शीर्षक खोज्नुहोस्", all: "सबै विषय", national: "राष्ट्रिय अध्ययन", mitigation: "रोकथामका उपाय", "human-safety": "मानव सुरक्षा", "species-conflict": "प्रजातिअनुसार द्वन्द्व",
    allYears: "सबै वर्ष", allRegions: "सबै अध्ययन क्षेत्र", read: "मूल अनुसन्धान पढ्नुहोस्", limitations: "अध्ययनको दायरा र सीमितता",
    status: "प्रमाणको अवस्था", fit: "कहाँ उपयोगी हुन सक्छ", caution: "सुरक्षा र सीमितता",
    updated: "सामग्री समीक्षा मिति", note: "अनुसन्धानका सारांश सम्पादकीय व्याख्या हुन्; मूल प्रकाशनको विकल्प होइनन्। मिति, नमुना सङ्ख्या र निष्कर्ष मूल स्रोतमा उल्लेख भएअनुसार राखिएका छन्। अनुसन्धानको निष्कर्ष अध्ययन क्षेत्र र विधिमा निर्भर हुन्छ; यसलाई अहिलेको स्थानीय जोखिमको मापन नमान्नुहोस्।",
    methodSearch: "उपाय वा प्रविधि खोज्नुहोस्", allGroups: "सबै उपाय", community: "समुदाय", livestock: "पशुधन सुरक्षा", barrier: "बार तथा अवरोध", technology: "प्रविधि", landscape: "बासस्थान तथा भू-दृश्य",
    sourceNote: "थप प्रतिवेदन र प्रकाशन खोज्न यी संस्थाका आधिकारिक प्रकाशन सूची प्रयोग गर्नुहोस्। संस्थाको वेबसाइटमा भएको सबै सामग्रीलाई स्वतः स्वतन्त्र रूपमा प्रमाणित मानिएको छैन।",
    noResults: "मिल्दो अनुसन्धान भेटिएन। खोज वा फिल्टर परिवर्तन गर्नुहोस्।",
  },
};

export default function ResearchKnowledge() {
  const [params] = useSearchParams();
  const lang = params.get("lang") === "np" ? "np" : "en";
  const t = text[lang];
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [year, setYear] = useState("all");
  const [methodQuery, setMethodQuery] = useState("");
  const [methodGroup, setMethodGroup] = useState("all");
  const [tab, setTab] = useState("studies");

  const studies = useMemo(() => researchStudies.filter((study) => {
    const haystack = [study.title[lang], study.title.en, study.title.np, study.citation, ...study.species, ...study.region].join(" ").toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (topic === "all" || study.category === topic) && (year === "all" || String(study.year) === year);
  }), [lang, query, topic, year]);

  const methods = useMemo(() => preventionMethods.filter((method) => {
    const haystack = [method.title[lang], method.title.en, method.title.np, method.description[lang], method.fit[lang]].join(" ").toLowerCase();
    return (!methodQuery || haystack.includes(methodQuery.toLowerCase())) && (methodGroup === "all" || method.group === methodGroup);
  }), [lang, methodQuery, methodGroup]);

  return (
    <div className="min-h-screen bg-[#f5f8f5] text-slate-900">
      <header className="border-b border-emerald-950/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/welcome" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900"><ArrowLeft className="h-4 w-4" />{t.back}</Link>
          <div className="flex items-center gap-2">
            <button onClick={() => { window.location.href = "/research?lang=en"; }} className={`rounded-full px-3 py-2 text-sm font-semibold ${lang === "en" ? "bg-emerald-900 text-white" : "text-slate-600"}`}>English</button>
            <button onClick={() => { window.location.href = "/research?lang=np"; }} className={`rounded-full px-3 py-2 text-sm font-semibold ${lang === "np" ? "bg-emerald-900 text-white" : "text-slate-600"}`}>नेपाली</button>
          </div>
        </div>
      </header>
      <main>
        <section className="bg-[#0b251d] text-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-lime-300">{t.eyebrow}</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-emerald-50/80">{t.intro}</p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-emerald-50/70"><span className="rounded-full border border-white/15 px-3 py-1.5">{researchStudies.length} {lang === "np" ? "अध्ययन" : "studies"}</span><span className="rounded-full border border-white/15 px-3 py-1.5">{preventionMethods.length} {lang === "np" ? "उपाय तथा प्रविधि" : "methods and technologies"}</span><span className="rounded-full border border-white/15 px-3 py-1.5">{t.updated}: {researchReviewedOn}</span></div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
            <button onClick={() => setTab("studies")} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "studies" ? "bg-emerald-900 text-white" : "bg-white text-slate-700"}`}><BookOpen className="mr-2 inline h-4 w-4"/>{t.studies}</button>
            <button onClick={() => setTab("methods")} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "methods" ? "bg-emerald-900 text-white" : "bg-white text-slate-700"}`}><ShieldCheck className="mr-2 inline h-4 w-4"/>{t.methods}</button>
            <button onClick={() => setTab("sources")} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "sources" ? "bg-emerald-900 text-white" : "bg-white text-slate-700"}`}><Leaf className="mr-2 inline h-4 w-4"/>{t.sources}</button>
          </div>

          {tab === "studies" && <div className="pt-6">
            <p className="mb-5 max-w-3xl text-sm leading-6 text-slate-600">{t.studyIntro}</p>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_150px]">
              <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm"/></label>
              <select value={topic} onChange={(event) => setTopic(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">{t.all}</option><option value="national">{t.national}</option><option value="mitigation">{t.mitigation}</option><option value="human-safety">{t["human-safety"]}</option><option value="species-conflict">{t["species-conflict"]}</option></select>
              <select value={year} onChange={(event) => setYear(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">{t.allYears}</option>{[...new Set(researchStudies.map((study) => study.year))].sort((a,b) => b-a).map((value) => <option key={value} value={value}>{value}</option>)}</select>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {studies.map((study) => <article key={study.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5"/>{study.year}</span><span>{study.sourceType === "government" ? (lang === "np" ? "सरकारी प्रतिवेदन" : "Government report") : study.sourceType === "university" ? (lang === "np" ? "विश्वविद्यालय अनुसन्धान" : "University research") : (lang === "np" ? "समीक्षित वैज्ञानिक लेख" : "Peer-reviewed article")}</span></div>
                <h2 className="mt-3 text-lg font-semibold leading-7 text-slate-950">{study.title[lang]}</h2>
                <p className="mt-2 text-xs leading-5 text-emerald-800">{study.citation}</p>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-700">{study.summary[lang]}</p>
                <div className="mt-4 rounded-xl bg-amber-50 p-3"><p className="text-xs font-bold text-amber-900">{t.limitations}</p><p className="mt-1 text-xs leading-5 text-amber-900/90">{study.limitations[lang]}</p></div>
                <a href={study.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center justify-between gap-2 rounded-xl border border-emerald-900/15 px-4 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">{t.read}<ArrowUpRight className="h-4 w-4"/></a>
              </article>)}
              {studies.length === 0 && <p className="rounded-xl bg-white p-5 text-sm text-slate-600 lg:col-span-2">{t.noResults}</p>}
            </div>
          </div>}

          {tab === "methods" && <div className="pt-6">
            <p className="mb-5 max-w-3xl text-sm leading-6 text-slate-600">{t.methodsIntro}</p>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={methodQuery} onChange={(event) => setMethodQuery(event.target.value)} placeholder={t.methodSearch} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm"/></label>
              <select value={methodGroup} onChange={(event) => setMethodGroup(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">{t.allGroups}</option><option value="community">{t.community}</option><option value="livestock">{t.livestock}</option><option value="barrier">{t.barrier}</option><option value="technology">{t.technology}</option><option value="landscape">{t.landscape}</option></select>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {methods.map((method) => <article key={method.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800"><Cpu className="h-4 w-4"/>{t.status}: {technologyStatusLabels[method.status][lang]}</div>
                <h2 className="mt-3 text-lg font-semibold">{method.title[lang]}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-700">{method.description[lang]}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-emerald-50 p-3"><h3 className="text-xs font-bold text-emerald-900">{t.fit}</h3><p className="mt-1 text-xs leading-5 text-emerald-900/85">{method.fit[lang]}</p></div><div className="rounded-xl bg-amber-50 p-3"><h3 className="text-xs font-bold text-amber-900">{t.caution}</h3><p className="mt-1 text-xs leading-5 text-amber-900/85">{method.caution[lang]}</p></div></div>
              </article>)}
            </div>
          </div>}

          {tab === "sources" && <div className="pt-6">
            <p className="mb-5 max-w-3xl text-sm leading-6 text-slate-600">{t.sourceNote}</p>
            <div className="grid gap-3 md:grid-cols-2">{officialResearchSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">{source.name}<ArrowUpRight className="h-4 w-4 shrink-0"/></a>)}</div>
          </div>}
          <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600">{t.note}</p>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between sm:px-6 lg:px-8"><span>WLMS · Nepal Wildlife Management System</span><Link to="/welcome" className="font-semibold text-emerald-900">{t.back}</Link></div></footer>
    </div>
  );
}
