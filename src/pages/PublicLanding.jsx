import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowRight, BellRing, BookOpen, Check, CircleHelp, Clock3,
  Globe2, Leaf, LocateFixed, MapPin, Menu, ShieldCheck, Sprout, UsersRound, X,
} from "lucide-react";
import { api } from "@/api/apiClient";

const copy = {
  en: {
    system: "Nepal Human–Wildlife Conflict Management System", navAbout: "About the pilot", navGuides: "Safety guides", navReport: "Report an incident", signIn: "Officer sign in", language: "नेपाली", noticeScope: "Show notices for", noticeWard: "Ward", noticeMunicipality: "Municipality",
    eyebrow: "COMMUNITY · RESEARCH · COEXISTENCE", heroTitle: "Safer farms. Better evidence. Shared solutions.", heroBody: "A community-first pilot in Pokhara Metropolitan City studying human–monkey crop conflict in Ward 21. Help document sightings and losses so local teams can respond with evidence and care.", capture: "Capture a wildlife sighting", report: "Report crop or livestock loss", pilot: "Pokhara Metropolitan City · Ward 21 pilot", pilotNote: "Camera and community reports are reviewed by people. An AI flag is not a confirmed sighting.",
    trustTitle: "A careful, community-led pilot", trustOne: "People review every report", trustOneBody: "Camera and phone reports stay unverified until a trained reviewer checks them.", trustTwo: "Your location stays private", trustTwoBody: "Precise coordinates are restricted to authorized case reviewers.", trustThree: "No automatic deterrents", trustThreeBody: "This research pilot does not automatically activate lights, sound, or electrical devices.",
    reportTitle: "Tell us what happened", reportBody: "Your report helps researchers understand where conflict occurs and what support is needed. Fields marked required are needed to send it.", reportType: "Type of loss", crop: "Crop damage", livestock: "Livestock loss", both: "Crop and livestock", other: "Other wildlife damage", cropName: "Crop affected", livestockName: "Livestock affected", estimate: "Estimated loss (NPR)", details: "What happened?", detailsPlaceholder: "Tell us what was damaged, when it happened, and any details that may help the review.", name: "Your name (optional)", phone: "Phone (optional)", province: "Province", district: "District", municipality: "Municipality", ward: "Ward number", area: "Area or village (optional)", location: "Use my location", lookup: "Suggest area from GPS", gpsUnavailable: "Location unavailable. You can enter the area manually.", geocodeUnavailable: "Automatic area lookup is not configured. Please verify and enter the area yourself.", geocodeReview: "Area suggestions can be approximate. Please check them before submitting.", geocodePrivacy: "Your precise coordinates go to the configured area-lookup provider only when you request a suggestion.", consent: "I agree to share this report and its location with authorized project reviewers for conflict research and response.", submit: "Send report for review", sending: "Sending report…", submitted: "Thank you. Your report was received for human review.", reportError: "We could not send the report. Please try again.", gpsReady: "Location details", gpsAccuracy: "Estimated GPS accuracy", required: "Required",
    knowledgeEyebrow: "PRACTICAL FIELD GUIDANCE", knowledgeTitle: "Share space safely", knowledgeBody: "Simple, non-harmful steps can reduce risk while the local team learns from community reports.", monkey: "Monkeys", monkeyBody: "Keep food and waste covered. Avoid feeding, cornering, or chasing monkeys; move indoors if a group approaches.", elephant: "Elephants", elephantBody: "Keep a wide distance, never block a route, and follow instructions from local responders.", leopard: "Leopards", leopardBody: "Bring children and pets indoors at dusk. Do not approach an animal or its den; alert local officials.", boar: "Wild boar", boarBody: "Keep a safe barrier, avoid approaching piglets, and move away calmly if an animal is nearby.", helpTitle: "If anyone is in immediate danger", helpBody: "Move to a safe place and contact your local ward office, police, or the appropriate wildlife authority. This website is not an emergency dispatch service.",
    researchEyebrow: "LEARNING FROM THE FIELD", researchTitle: "Research and community learning", researchBody: "The initial study focuses on human–monkey crop-raiding reports in Pokhara Metropolitan City, Ward 21. Data supports careful research and review; reports are not published as verified incidents by default.", researchCard: "Ward 21 pilot focus", researchCardBody: "Document time, location, crop impact, and response so patterns can be reviewed with the community.", repository: "Research repository", repositoryBody: "Approved papers, summaries, and anonymized incident reports will be shared here when the project team publishes them.", status: "Repository materials will be added after review", footer: "A research pilot for safer coexistence in Nepal.", alertsLabel: "Community notice", noNotices: "No active public notices", dismiss: "Dismiss notice", noticeLabel: "Public safety notice", active: "Active notice", menu: "Open menu", closeMenu: "Close menu", viewGuides: "Read safety guides", scroll: "Explore the pilot",
  },
  np: {
    system: "नेपाल मानव–वन्यजन्तु द्वन्द्व व्यवस्थापन प्रणाली", navAbout: "अध्ययनबारे", navGuides: "सुरक्षा सुझाव", navReport: "घटना जानकारी", signIn: "अधिकारी लगइन", language: "English", noticeScope: "सूचना देखाउने क्षेत्र", noticeWard: "वडा", noticeMunicipality: "पालिका",
    eyebrow: "समुदाय · अनुसन्धान · सहअस्तित्व", heroTitle: "सुरक्षित खेत। राम्रो प्रमाण। साझा समाधान।", heroBody: "पोखरा महानगरपालिका वडा २१ मा मानव–बाँदर बाली द्वन्द्व अध्ययनका लागि समुदाय केन्द्रित प्रारम्भिक परियोजना। स्थानीय टोलीले प्रमाण र संवेदनशीलतासहित प्रतिक्रिया दिन सकून् भनेर देखिएका घटना र क्षतिको जानकारी दिनुहोस्।", capture: "वन्यजन्तु देखिएको तस्बिर खिच्नुहोस्", report: "बाली वा पशुधन क्षतिको जानकारी", pilot: "पोखरा महानगरपालिका · वडा २१ अध्ययन", pilotNote: "क्यामेरा र मोबाइलका विवरण मानिसले समीक्षा गर्छन्। एआईले देखाएको गतिविधि पुष्टि भएको घटना होइन।",
    trustTitle: "सावधानीपूर्वक, समुदायको नेतृत्वमा गरिएको अध्ययन", trustOne: "हरेक विवरण मानिसले समीक्षा गर्छन्", trustOneBody: "प्रशिक्षित समीक्षकले नहेरेसम्म क्यामेरा र मोबाइलका विवरण अपुष्ट रहन्छन्।", trustTwo: "तपाईंको स्थान गोप्य रहन्छ", trustTwoBody: "ठ्याक्कै स्थान अधिकृत समीक्षकलाई मात्र देखाइन्छ।", trustThree: "स्वचालित प्रतिकार छैन", trustThreeBody: "यस अध्ययनमा बत्ती, आवाज वा विद्युतीय उपकरण आफैँ चलाइँदैन।",
    reportTitle: "के भयो हामीलाई बताउनुहोस्", reportBody: "तपाईंको जानकारीले द्वन्द्व कहाँ हुन्छ र कस्तो सहयोग चाहिन्छ भन्ने बुझ्न अनुसन्धानकर्तालाई मद्दत गर्छ। आवश्यक विवरण भर्नुहोस्।", reportType: "क्षतिको प्रकार", crop: "बाली क्षति", livestock: "पशुधन क्षति", both: "बाली र पशुधन", other: "अन्य वन्यजन्तु क्षति", cropName: "क्षति भएको बाली", livestockName: "क्षति भएको पशुधन", estimate: "अनुमानित क्षति (रु.)", details: "के भएको थियो?", detailsPlaceholder: "के क्षति भयो, कहिले भयो र समीक्षा गर्न सहयोग पुग्ने विवरण लेख्नुहोस्।", name: "तपाईंको नाम (वैकल्पिक)", phone: "फोन (वैकल्पिक)", province: "प्रदेश", district: "जिल्ला", municipality: "पालिका", ward: "वडा नम्बर", area: "टोल वा गाउँ (वैकल्पिक)", location: "मेरो स्थान प्रयोग गर्नुहोस्", lookup: "GPS बाट क्षेत्र सुझाव", gpsUnavailable: "स्थान पत्ता लागेन। तपाईं क्षेत्र आफैँ लेख्न सक्नुहुन्छ।", geocodeUnavailable: "स्वचालित क्षेत्र खोजी उपलब्ध छैन। कृपया क्षेत्र जाँचेर आफैँ भर्नुहोस्।", geocodeReview: "क्षेत्रका सुझाव अनुमानित हुन सक्छन्। पठाउनुअघि जाँच गर्नुहोस्।", geocodePrivacy: "क्षेत्र सुझाव माग्दा मात्र तपाईंको ठ्याक्कै GPS स्थान कन्फिगर गरिएको खोजी सेवामा पठाइन्छ।", consent: "द्वन्द्व अनुसन्धान र प्रतिक्रियाका लागि अधिकृत परियोजना समीक्षकसँग यो विवरण र स्थान साझा गर्न म सहमत छु।", submit: "समीक्षाका लागि पठाउनुहोस्", sending: "पठाउँदै…", submitted: "धन्यवाद। तपाईंको विवरण मानव समीक्षाका लागि प्राप्त भयो।", reportError: "विवरण पठाउन सकिएन। कृपया फेरि प्रयास गर्नुहोस्।", gpsReady: "स्थान विवरण", gpsAccuracy: "अनुमानित GPS शुद्धता", required: "आवश्यक", formLocationStatus: "स्थान प्रयोग गरिएको छैन",
    knowledgeEyebrow: "व्यावहारिक सुरक्षा सुझाव", knowledgeTitle: "सुरक्षित रूपमा सहअस्तित्व", knowledgeBody: "समुदायका विवरणबाट स्थानीय टोलीले सिक्दै गर्दा सरल र अहिंसात्मक उपायले जोखिम घटाउन सक्छ।", monkey: "बाँदर", monkeyBody: "खाना र फोहोर छोपेर राख्नुहोस्। बाँदरलाई खाना नदिनुहोस्, नघेर्‍नुहोस् वा नलखेट्नुहोस्; समूह नजिक आए सुरक्षित ठाउँमा जानुहोस्।", elephant: "हात्ती", elephantBody: "टाढै रहनुहोस्, बाटो नछेक्नुहोस् र स्थानीय उद्धार टोलीको निर्देशन पालना गर्नुहोस्।", leopard: "चितुवा", leopardBody: "साँझपख बालबालिका र घरपालुवा जनावरलाई भित्र राख्नुहोस्। जनावर वा ओडार नजिक नजानुहोस्; स्थानीय अधिकारीलाई जानकारी दिनुहोस्।", boar: "बँदेल", boarBody: "सुरक्षित दूरी कायम गर्नुहोस्, बच्चासहितको बँदेल नजिक नजानुहोस् र जनावर देखिए शान्तपूर्वक टाढा जानुहोस्।", helpTitle: "तत्काल जोखिम भएमा", helpBody: "सुरक्षित ठाउँमा जानुहोस् र स्थानीय वडा कार्यालय, प्रहरी वा सम्बन्धित वन्यजन्तु निकायलाई सम्पर्क गर्नुहोस्। यो वेबसाइट आपतकालीन सेवा होइन।",
    researchEyebrow: "मैदानबाट सिकाइ", researchTitle: "अनुसन्धान र समुदायको सिकाइ", researchBody: "प्रारम्भिक अध्ययन पोखरा महानगरपालिका वडा २१ मा मानव–बाँदर बाली द्वन्द्वमा केन्द्रित छ। विवरण सावधानीपूर्वक अनुसन्धान र समीक्षाका लागि हो; स्वतः पुष्टि भएको घटना भनेर सार्वजनिक गरिँदैन।", researchCard: "वडा २१ अध्ययनको केन्द्र", researchCardBody: "समुदायसँग ढाँचाहरू समीक्षा गर्न समय, स्थान, बालीको क्षति र प्रतिक्रियाको विवरण राख्नुहोस्।", repository: "अनुसन्धान सामग्री", repositoryBody: "परियोजना टोलीले समीक्षा गरी प्रकाशन गरेपछि स्वीकृत लेख, सारांश र पहिचान हटाइएका घटना प्रतिवेदन यहाँ राखिनेछन्।", status: "समीक्षापछि अनुसन्धान सामग्री थपिनेछ", footer: "नेपालमा सुरक्षित सहअस्तित्वका लागि अनुसन्धान परियोजना।", alertsLabel: "समुदाय सूचना", noNotices: "हाल सार्वजनिक सूचना छैन", dismiss: "सूचना बन्द गर्नुहोस्", noticeLabel: "सार्वजनिक सुरक्षा सूचना", active: "सक्रिय सूचना", menu: "मेनु खोल्नुहोस्", closeMenu: "मेनु बन्द गर्नुहोस्", viewGuides: "सुरक्षा सुझाव हेर्नुहोस्", scroll: "अध्ययनबारे थप जान्नुहोस्",
  },
};

const species = [
  { icon: "🐒", key: "monkey", tone: "bg-amber-50" },
  { icon: "🐘", key: "elephant", tone: "bg-teal-50" },
  { icon: "🐆", key: "leopard", tone: "bg-orange-50" },
  { icon: "🐗", key: "boar", tone: "bg-lime-50" },
];

function readDuration(notice, lang) {
  const words = `${notice.title || ""} ${notice.content || ""}`.trim().split(/\s+/u).filter(Boolean).length;
  return 4000 + (words / (lang === "np" ? 150 : 200)) * 60000;
}

function NoticeBanner({ notice, lang, onDismiss }) {
  const title = lang === "np" ? notice.title_np : notice.title_en;
  const content = lang === "np" ? notice.content_np : notice.content_en;
  const duration = useMemo(() => readDuration({ title, content }, lang), [title, content, lang]);
  const [remaining, setRemaining] = useState(duration);
  const remainingRef = useRef(duration);
  const paused = useRef(false);
  const previousFrame = useRef(null);

  useEffect(() => {
    remainingRef.current = duration;
    setRemaining(duration);
    previousFrame.current = null;
    let frame;
    const tick = (now) => {
      if (previousFrame.current !== null && !paused.current) {
        const delta = now - previousFrame.current;
        const next = Math.max(0, remainingRef.current - delta);
        remainingRef.current = next;
        setRemaining(next);
        if (next === 0) onDismiss(notice.id);
      }
      previousFrame.current = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, notice.id, onDismiss]);

  const pause = () => { paused.current = true; previousFrame.current = null; };
  const resume = () => { paused.current = false; previousFrame.current = null; };

  return (
    <aside
      aria-label={lang === "np" ? copy.np.noticeLabel : copy.en.noticeLabel}
      aria-live="polite"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onPointerDown={pause}
      onPointerUp={resume}
      onPointerCancel={resume}
      onFocus={pause}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) resume(); }}
      className={`fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl overflow-hidden rounded-2xl border bg-white shadow-[0_20px_60px_-22px_rgba(15,23,42,.55)] sm:inset-x-6 ${Number(notice.priority) >= 4 ? "border-rose-300" : "border-amber-200"}`}
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className={`mt-0.5 rounded-xl p-2 ${Number(notice.priority) >= 4 ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}><BellRing className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[.13em] text-amber-800">
            <span>{lang === "np" ? copy.np.alertsLabel : copy.en.alertsLabel}</span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-amber-500" />
            {(notice.target_municipality || notice.target_ward) && <span className="inline-flex items-center gap-1 normal-case tracking-normal text-slate-600"><MapPin className="h-3 w-3" />{[notice.target_municipality, notice.target_ward ? `${lang === "np" ? "वडा" : "Ward"} ${notice.target_ward}` : ""].filter(Boolean).join(" · ")}</span>}
            <time dateTime={notice.expires_at}>{new Date(notice.created_at).toLocaleTimeString(lang === "np" ? "ne-NP" : "en-NP", { hour: "numeric", minute: "2-digit" })}</time>
          </div>
          <h2 className="font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">{content}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-100" role="progressbar" aria-label={lang === "np" ? "सूचना देखाउने बाँकी समय" : "Notice time remaining"} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round((remaining / duration) * 100)}>
            <div className="h-full rounded-full bg-amber-500 transition-[width] duration-100" style={{ width: `${Math.max(0, (remaining / duration) * 100)}%` }} />
          </div>
        </div>
        <button type="button" onClick={() => onDismiss(notice.id)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={lang === "np" ? copy.np.dismiss : copy.en.dismiss}><X className="h-5 w-5" /></button>
      </div>
    </aside>
  );
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("GPS_NOT_AVAILABLE"));
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, captured_at: new Date(position.timestamp || Date.now()).toISOString() }),
      reject,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  });
}

export default function PublicLanding() {
  const [lang, setLang] = useState(() => window.localStorage.getItem("nws-public-language") === "np" ? "np" : "en");
  const [notices, setNotices] = useState([]);
  const [noticeWard, setNoticeWard] = useState(() => window.localStorage.getItem("nws-notice-ward") || "21");
  const [noticeMunicipality, setNoticeMunicipality] = useState(() => window.localStorage.getItem("nws-notice-municipality") || "Pokhara Metropolitan City");
  const [dismissed, setDismissed] = useState(() => new Set());
  const [mobileNav, setMobileNav] = useState(false);
  const [gps, setGps] = useState(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    loss_type: "crop", crop_type: "", livestock_type: "", estimated_loss_npr: "",
    description: "", reporter_name: "", reporter_phone: "", province: "Gandaki",
    district: "Kaski", municipality: "Pokhara Metropolitan City", ward: "21", location_name: "", consent: false,
  });
  const t = copy[lang];

  const loadNotices = useCallback(async () => {
    try {
      const result = await api.public.activeNotices(noticeWard, noticeMunicipality);
      setNotices(result?.notices || []);
    } catch { /* A public notice feed is optional; the page remains usable offline. */ }
  }, [noticeWard, noticeMunicipality]);

  useEffect(() => {
    const initial = window.setTimeout(loadNotices, 300);
    const timer = window.setInterval(loadNotices, 60000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [loadNotices]);

  useEffect(() => {
    window.localStorage.setItem("nws-notice-ward", noticeWard);
    window.localStorage.setItem("nws-notice-municipality", noticeMunicipality);
  }, [noticeWard, noticeMunicipality]);

  useEffect(() => {
    document.documentElement.lang = lang === "np" ? "ne" : "en";
  }, [lang]);

  const setLanguage = (next) => {
    setLang(next);
    window.localStorage.setItem("nws-public-language", next);
    document.documentElement.lang = next === "np" ? "ne" : "en";
  };

  const activeNotice = notices.find((notice) => !dismissed.has(notice.id));
  const dismissNotice = useCallback((id) => setDismissed((prior) => new Set(prior).add(id)), []);

  const update = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((prior) => ({ ...prior, [name]: type === "checkbox" ? checked : value }));
  };

  const locate = async () => {
    setLocationBusy(true);
    setLookupMessage("");
    try {
      const position = await getPosition();
      setGps(position);
      setLookupMessage(`${t.gpsAccuracy}: ±${Math.round(position.accuracy)} m`);
      return position;
    } catch {
      setLookupMessage(t.gpsUnavailable);
      return null;
    } finally { setLocationBusy(false); }
  };

  const suggestArea = async () => {
    setLocationBusy(true);
    try {
      const point = gps || await getPosition();
      if (!gps) setGps(point);
      const result = await api.public.reverseGeocode({ latitude: point.latitude, longitude: point.longitude });
      if (!result.configured) {
        setLookupMessage(t.geocodeUnavailable);
      } else {
        setForm((prior) => ({
          ...prior,
          province: result.province || prior.province,
          district: result.district || prior.district,
          municipality: result.municipality || prior.municipality,
          ward: result.ward || prior.ward,
          location_name: result.display_name || prior.location_name,
        }));
        setLookupMessage(t.geocodeReview);
      }
    } catch { setLookupMessage(t.geocodeUnavailable); }
    finally { setLocationBusy(false); }
  };

  const submitReport = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setSubmitted(false);
    try {
      const payload = {
        ...form,
        consent: form.consent,
        submission_id: crypto.randomUUID(),
        latitude: gps?.latitude ?? null,
        longitude: gps?.longitude ?? null,
        accuracy: gps?.accuracy ?? null,
        reported_at: new Date().toISOString(),
      };
      await api.public.submitDamageReport(payload);
      setSubmitted(true);
      setForm((prior) => ({ ...prior, crop_type: "", livestock_type: "", estimated_loss_npr: "", description: "", reporter_name: "", reporter_phone: "", location_name: "", consent: false }));
    } catch (error) {
      setFormError(error.message || t.reportError);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#fafbf8] text-slate-900 selection:bg-emerald-200 selection:text-emerald-950">
      <header className="sticky top-0 z-40 border-b border-emerald-950/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="#top" className="flex min-w-0 items-center gap-3" aria-label={t.system}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-900 text-emerald-50 shadow-sm"><Leaf className="h-5 w-5" /></span>
            <span className="min-w-0"><span className="block max-w-[220px] truncate text-sm font-bold leading-tight text-slate-950 sm:max-w-md">{t.system}</span><span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[.16em] text-emerald-800">Pokhara · Gandaki</span></span>
          </a>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
            <a className="text-sm font-medium text-slate-600 hover:text-emerald-800" href="#about">{t.navAbout}</a>
            <a className="text-sm font-medium text-slate-600 hover:text-emerald-800" href="#guides">{t.navGuides}</a>
            <a className="text-sm font-medium text-slate-600 hover:text-emerald-800" href="#report">{t.navReport}</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setLanguage(lang === "en" ? "np" : "en")} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" aria-label={`Switch language: ${t.language}`}><Globe2 className="h-4 w-4" /><span>{t.language}</span></button>
            <Link to="/login" className="hidden rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 sm:inline-flex">{t.signIn}</Link>
            <button type="button" onClick={() => setMobileNav((value) => !value)} className="rounded-full p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-expanded={mobileNav} aria-label={mobileNav ? t.closeMenu : t.menu}><Menu className="h-5 w-5" /></button>
          </div>
        </div>
        {mobileNav && <nav className="grid gap-1 border-t border-slate-100 px-5 py-3 lg:hidden"><a onClick={() => setMobileNav(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-50" href="#about">{t.navAbout}</a><a onClick={() => setMobileNav(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-50" href="#guides">{t.navGuides}</a><a onClick={() => setMobileNav(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-50" href="#report">{t.navReport}</a><Link className="rounded-lg px-3 py-2 text-sm font-semibold text-emerald-800 sm:hidden" to="/login">{t.signIn}</Link></nav>}
      </header>

      <main id="top">
        <section className="relative isolate">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_15%,rgba(187,220,190,.48),transparent_35%),linear-gradient(145deg,#f6faf3_10%,#fff_68%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:pb-24 lg:pt-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.15em] text-emerald-900 shadow-sm"><span className="h-2 w-2 rounded-full bg-emerald-500" />{t.eyebrow}</div>
              <h1 className="mt-6 max-w-3xl text-[clamp(2.6rem,6vw,5rem)] font-semibold leading-[1.04] tracking-[-.055em] text-slate-950">{t.heroTitle}</h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{t.heroBody}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={`/public-capture?lang=${lang}`} className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-emerald-800">{t.capture}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
                <a href="#report" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-800 hover:text-emerald-900">{t.report}<ArrowDown className="h-4 w-4" /></a>
              </div>
              <div className="mt-8 flex items-start gap-3 border-l-2 border-emerald-700 pl-4 text-sm leading-6 text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" /><div><strong className="font-semibold text-slate-800">{t.pilot}</strong><p>{t.pilotNote}</p><div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.noticeScope}:</span><input aria-label={t.noticeMunicipality} value={noticeMunicipality} onChange={(event) => setNoticeMunicipality(event.target.value)} className="h-8 w-48 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800" /><span className="text-xs text-slate-600">{t.noticeWard}</span><input aria-label={t.noticeWard} value={noticeWard} onChange={(event) => setNoticeWard(event.target.value.slice(0, 3))} inputMode="numeric" className="h-8 w-14 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800" /></div></div></div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -right-3 -top-5 h-32 w-32 rounded-full bg-lime-200/50 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white bg-[#163b31] p-4 shadow-[0_35px_90px_-42px_rgba(15,54,42,.7)] sm:p-6">
                <div className="relative min-h-[370px] overflow-hidden rounded-[1.5rem] bg-[linear-gradient(160deg,#6f9d79_0%,#9ec596_35%,#d7d9a4_68%,#bb9065_69%,#775a42_100%)] p-5 sm:min-h-[430px] sm:p-7">
                  <div className="absolute inset-x-0 top-[62%] h-20 rotate-[-8deg] bg-[#718c58]/70" /><div className="absolute inset-x-[-10%] top-[72%] h-24 rotate-[7deg] bg-[#beaa72]/80" />
                  <div className="absolute left-[9%] top-[31%] h-28 w-2 rotate-[11deg] rounded-full bg-[#574936] sm:h-40" /><div className="absolute left-[6%] top-[24%] h-20 w-32 rounded-[100%] bg-[#446b43] blur-[1px] sm:h-28 sm:w-44" /><div className="absolute left-[16%] top-[20%] h-14 w-28 rounded-[100%] bg-[#537e4f] sm:h-20 sm:w-36" />
                  <div className="absolute right-[12%] top-[45%] h-16 w-16 rounded-full bg-[#49382d] shadow-[0_3px_0_1px_#d1a769] sm:right-[17%] sm:h-20 sm:w-20"><span className="absolute -left-2 top-5 h-9 w-10 rounded-full bg-[#49382d] sm:h-11 sm:w-12" /><span className="absolute -right-6 top-1 h-2 w-12 rotate-[-32deg] rounded-full bg-[#49382d]" /><span className="absolute -left-6 top-8 h-2 w-9 rotate-[28deg] rounded-full bg-[#49382d]" /></div>
                  <div className="absolute inset-x-5 top-5 flex items-start justify-between gap-3 sm:inset-x-7 sm:top-7"><span className="rounded-full border border-white/40 bg-white/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.13em] text-emerald-950 backdrop-blur">{t.pilot}</span><span className="flex items-center gap-1.5 rounded-full bg-emerald-950/70 px-3 py-1.5 text-[10px] font-semibold text-white"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" />FIELD STUDY</span></div>
                  <div className="absolute bottom-5 left-5 max-w-[75%] rounded-2xl border border-white/45 bg-white/88 p-4 shadow-xl backdrop-blur-md sm:bottom-7 sm:left-7 sm:p-5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-emerald-900"><MapPin className="h-3.5 w-3.5" />Pokhara · Kaski</div><p className="mt-1.5 text-lg font-semibold text-slate-950 sm:text-xl">Ward 21 study area</p><div className="mt-3 flex items-center gap-2 text-xs text-slate-600"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-lime-100"><Sprout className="h-3.5 w-3.5 text-emerald-900" /></span>Community crop protection study</div></div>
                  <div className="absolute bottom-7 right-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/50 bg-emerald-950/75 text-white shadow-xl sm:bottom-8 sm:right-7"><MapPin className="h-5 w-5" /></div>
                </div>
                <div className="flex items-center justify-between gap-4 px-1 pb-1 pt-4 text-xs text-emerald-50/80"><span className="flex items-center gap-2"><UsersRound className="h-4 w-4" />{t.trustOne}</span><span className="hidden items-center gap-2 sm:flex"><ShieldCheck className="h-4 w-4" />{t.trustTwo}</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="border-y border-emerald-950/5 bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mb-7 flex items-end justify-between gap-4"><h2 className="max-w-xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{t.trustTitle}</h2><span className="hidden text-xs font-semibold uppercase tracking-[.15em] text-slate-400 sm:block">01 — 03</span></div>
            <div className="grid gap-3 md:grid-cols-3"><article className="rounded-2xl border border-slate-200 bg-[#fbfcfa] p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900"><UsersRound className="h-5 w-5" /></span><h3 className="mt-4 font-semibold">{t.trustOne}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{t.trustOneBody}</p></article><article className="rounded-2xl border border-slate-200 bg-[#fbfcfa] p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-900"><ShieldCheck className="h-5 w-5" /></span><h3 className="mt-4 font-semibold">{t.trustTwo}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{t.trustTwoBody}</p></article><article className="rounded-2xl border border-slate-200 bg-[#fbfcfa] p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900"><CircleHelp className="h-5 w-5" /></span><h3 className="mt-4 font-semibold">{t.trustThree}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{t.trustThreeBody}</p></article></div>
          </div>
        </section>

        <section id="report" className="scroll-mt-24 bg-[#f0f5ef] py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.75fr_1.25fr] lg:px-8">
            <div className="lg:sticky lg:top-28 lg:self-start"><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">{t.navReport}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t.reportTitle}</h2><p className="mt-4 max-w-md text-sm leading-7 text-slate-600">{t.reportBody}</p><div className="mt-6 rounded-2xl border border-emerald-900/10 bg-white p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><LocateFixed className="h-4 w-4 text-emerald-800" />{t.gpsReady}</div><p className="mt-2 text-xs leading-5 text-slate-600">{gps ? `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)} · ±${Math.round(gps.accuracy)} m` : t.gpsUnavailable}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={locate} disabled={locationBusy} className="rounded-full bg-emerald-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{locationBusy ? "…" : t.location}</button><button type="button" onClick={suggestArea} disabled={locationBusy} className="rounded-full border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{t.lookup}</button></div><p className="mt-2 text-xs leading-5 text-slate-500">{t.geocodePrivacy}</p>{lookupMessage && <p className="mt-2 text-xs text-slate-600" role="status">{lookupMessage}</p>}</div><div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-amber-950"><Clock3 className="h-4 w-4" />{t.helpTitle}</div><p className="mt-2 text-xs leading-5 text-amber-900">{t.helpBody}</p></div></div>
            <form onSubmit={submitReport} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-48px_rgba(15,23,42,.4)] sm:p-8">
              {submitted && <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950" role="status"><Check className="mt-0.5 h-4 w-4 shrink-0" />{t.submitted}</div>}
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-800 sm:col-span-2">{t.reportType}<select name="loss_type" value={form.loss_type} onChange={update} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="crop">{t.crop}</option><option value="livestock">{t.livestock}</option><option value="both">{t.both}</option><option value="other">{t.other}</option></select></label>
                {(form.loss_type === "crop" || form.loss_type === "both") && <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.cropName}<input name="crop_type" value={form.crop_type} onChange={update} required className="h-11 rounded-xl border border-slate-300 px-3 font-normal" placeholder={lang === "np" ? "जस्तै: मकै" : "e.g. Maize"} /></label>}
                {(form.loss_type === "livestock" || form.loss_type === "both") && <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.livestockName}<input name="livestock_type" value={form.livestock_type} onChange={update} required className="h-11 rounded-xl border border-slate-300 px-3 font-normal" placeholder={lang === "np" ? "जस्तै: बाख्रा" : "e.g. Goat"} /></label>}
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.estimate}<input name="estimated_loss_npr" value={form.estimated_loss_npr} onChange={update} type="number" min="0" step="1" inputMode="numeric" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" placeholder="0" /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.name}<input name="reporter_name" value={form.reporter_name} onChange={update} autoComplete="name" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800 sm:col-span-2">{t.details}<textarea name="description" value={form.description} onChange={update} required rows={3} maxLength={2500} className="rounded-xl border border-slate-300 px-3 py-2.5 font-normal" placeholder={t.detailsPlaceholder} /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.province}<input name="province" value={form.province} onChange={update} required className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.district}<input name="district" value={form.district} onChange={update} required className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.municipality}<input name="municipality" value={form.municipality} onChange={update} required className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.ward}<input name="ward" value={form.ward} onChange={update} required inputMode="numeric" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800 sm:col-span-2">{t.area}<input name="location_name" value={form.location_name} onChange={update} className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.phone}<input name="reporter_phone" value={form.reporter_phone} onChange={update} type="tel" autoComplete="tel" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
              </div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700"><input type="checkbox" name="consent" checked={form.consent} onChange={update} required className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-800" />{t.consent}</label>
              {formError && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{formError || t.reportError}</p>}
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><button type="submit" disabled={submitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-900 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-50">{submitting ? t.sending : t.submit}<ArrowRight className="h-4 w-4" /></button><p className="text-[11px] leading-5 text-slate-500">{t.trustTwoBody}</p></div>
            </form>
          </div>
        </section>

        <section id="guides" className="scroll-mt-24 py-16 sm:py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">{t.knowledgeEyebrow}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t.knowledgeTitle}</h2><p className="mt-4 text-sm leading-7 text-slate-600">{t.knowledgeBody}</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{species.map(({ icon, key, tone }) => <article key={key} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone} text-2xl`}>{icon}</div><h3 className="mt-4 text-lg font-semibold">{t[key]}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{t[`${key}Body`]}</p></article>)}</div></div></section>

        <section className="bg-[#152f29] py-16 text-white sm:py-20"><div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-lime-300">{t.researchEyebrow}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t.researchTitle}</h2><p className="mt-4 max-w-lg text-sm leading-7 text-emerald-50/75">{t.researchBody}</p></div><div className="grid gap-3 sm:grid-cols-2"><article className="rounded-2xl border border-white/10 bg-white/[.06] p-5"><BookOpen className="h-5 w-5 text-lime-300" /><h3 className="mt-4 font-semibold">{t.researchCard}</h3><p className="mt-2 text-sm leading-6 text-emerald-50/75">{t.researchCardBody}</p></article><article className="rounded-2xl border border-white/10 bg-white/[.06] p-5"><Leaf className="h-5 w-5 text-lime-300" /><h3 className="mt-4 font-semibold">{t.repository}</h3><p className="mt-2 text-sm leading-6 text-emerald-50/75">{t.repositoryBody}</p><div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-emerald-50/80"><Clock3 className="h-3 w-3" />{t.status}</div></article></div></div></section>
      </main>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><span>{t.footer}</span><Link className="inline-flex items-center gap-1 font-semibold text-emerald-900 hover:underline" to="/login">{t.signIn}<ArrowRight className="h-3.5 w-3.5" /></Link></div></footer>
      {activeNotice && <NoticeBanner notice={activeNotice} lang={lang} onDismiss={dismissNotice} />}
    </div>
  );
}
