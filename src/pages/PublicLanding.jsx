import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowRight, BellRing, BookOpen, Camera, Check, ChevronDown,
  CircleHelp, Clock3, Globe2, Leaf, LocateFixed, MapPin, Menu, ShieldCheck,
  UsersRound, X,
} from "lucide-react";
import { api } from "@/api/apiClient";

const copy = {
  en: {
    system: "Nepal Human–Wildlife Conflict Management System", navAbout: "About this prototype", navGuides: "Safety guides", navReport: "Report farm damage", signIn: "Officer sign in", language: "नेपाली", noticeScope: "Show notices for", noticeWard: "Ward", noticeMunicipality: "Municipality",
    eyebrow: "POKHARA METROPOLITAN CITY · COMMUNITY PROTOTYPE", heroTitle: "Help make farms safer, one clear report at a time.", heroBody: "This prototype supports a study of human–monkey crop conflict in Pokhara Metropolitan City, Ward 21. Send a wildlife photo or tell us about farm damage. Project staff review each report to understand what is happening and where support may be needed.", capture: "Send a wildlife photo", report: "Report farm damage", pilot: "Pokhara Metropolitan City prototype · Ward 21", pilotNote: "For the Ward 21 study: share sightings and losses. A person reviews every submission; an AI alert alone is never treated as confirmed.", artAlt: "Illustration of a monkey near farms in Pokhara", illustration: "Study illustration", locationLabel: "STUDY AREA", areaLabel: "Ward 21 · Pokhara, Kaski", focusLabel: "Community study on monkey crop conflict", noticeSetup: "Choose the area for public notices",
    aboutTitle: "A local prototype for Ward 21", aboutBody: "The first study focuses on when and where monkeys affect farms in Ward 21. Residents can share a sighting or a loss; the project team reviews reports to learn from local experience.", howTitle: "How the prototype works", howPhoto: "Share what you saw", howPhotoBody: "Take or upload a wildlife photo, or describe crop damage.", howReview: "The team reviews it", howReviewBody: "A project reviewer checks reports before they are used as evidence.", howLearn: "Local learning builds", howLearnBody: "Reviewed reports help the study understand conflict patterns and response needs.",
    trustTitle: "Your report, handled with care", trustOne: "A person checks reports", trustOneBody: "Phone and camera reports remain unverified until a project reviewer checks them.", trustTwo: "Your exact location is protected", trustTwoBody: "Precise coordinates are visible only to authorized case reviewers.", trustThree: "No automatic deterrents", trustThreeBody: "This research prototype does not automatically trigger lights, sound, or electrical devices.",
    reportTitle: "Tell us what happened", reportBody: "Your report helps researchers understand where conflict occurs and what support is needed. Fields marked required are needed to send it.", reportType: "Type of loss", crop: "Crop damage", livestock: "Livestock loss", both: "Crop and livestock", other: "Other wildlife damage", cropName: "Crop affected", livestockName: "Livestock affected", estimate: "Estimated loss (NPR)", details: "What happened?", detailsPlaceholder: "Tell us what was damaged, when it happened, and any details that may help the review.", name: "Your name (optional)", phone: "Phone (optional)", province: "Province", district: "District", municipality: "Municipality", ward: "Ward number", area: "Area or village (optional)", location: "Use my location", lookup: "Suggest area from GPS", gpsUnavailable: "Location unavailable. You can enter coordinates manually or continue without GPS.", gpsSecure: "Location requires a secure HTTPS website. Open this site using its HTTPS address, then allow location access.", gpsPermission: "Location permission is blocked. Allow it in your browser or device settings, then try again.", gpsTimeout: "Location took too long. Try again outdoors, or enter coordinates manually.", gpsTryAgain: "Could not read your location. Check device location settings or enter coordinates manually.", manualCoordinates: "Or enter coordinates manually", latitude: "Latitude", longitude: "Longitude", coordinatePair: "Enter both latitude and longitude, or leave both blank.", coordinateInvalid: "Enter valid coordinates: latitude −90 to 90, longitude −180 to 180.", geocodeUnavailable: "Automatic area lookup is not available. Please verify and enter the area yourself.", geocodeReview: "Area suggestions can be approximate. Please check them before submitting.", geocodePrivacy: "Your precise coordinates go to the configured area-lookup provider only when you request a suggestion.", consent: "I agree to share this report and its location with authorized project reviewers for conflict research and response.", submit: "Send report for review", sending: "Sending report…", submitted: "Thank you. Your report was received for human review.", reportError: "We could not send the report. Please try again.", gpsReady: "Location details", gpsAccuracy: "Estimated GPS accuracy", required: "Required",
    knowledgeEyebrow: "PRACTICAL FIELD GUIDANCE", knowledgeTitle: "Share space safely", knowledgeBody: "Simple, non-harmful steps can reduce risk while the local team learns from community reports.", monkey: "Monkeys", monkeyBody: "Keep food and waste covered. Avoid feeding, cornering, or chasing monkeys; move indoors if a group approaches.", elephant: "Elephants", elephantBody: "Keep a wide distance, never block a route, and follow instructions from local responders.", leopard: "Leopards", leopardBody: "Bring children and pets indoors at dusk. Do not approach an animal or its den; alert local officials.", boar: "Wild boar", boarBody: "Keep a safe barrier, avoid approaching piglets, and move away calmly if an animal is nearby.", helpTitle: "If anyone is in immediate danger", helpBody: "Move to a safe place and contact your local ward office, police, or the appropriate wildlife authority. This website is not an emergency dispatch service.",
    researchEyebrow: "LEARNING FROM THE FIELD", researchTitle: "Research and community learning", researchBody: "The initial study focuses on human–monkey crop-raiding reports in Pokhara Metropolitan City, Ward 21. Data supports careful research and review; reports are not published as verified incidents by default.", researchCard: "Ward 21 pilot focus", researchCardBody: "Document time, location, crop impact, and response so patterns can be reviewed with the community.", repository: "Research repository", repositoryBody: "Approved papers, summaries, and anonymized incident reports will be shared here when the project team publishes them.", status: "Repository materials will be added after review", footer: "A research pilot for safer coexistence in Nepal.", alertsLabel: "Community notice", noNotices: "No active public notices", dismiss: "Dismiss notice", noticeLabel: "Public safety notice", active: "Active notice", menu: "Open menu", closeMenu: "Close menu", viewGuides: "Read safety guides", scroll: "Explore the pilot",
  },
  np: {
    system: "नेपाल मानव–वन्यजन्तु द्वन्द्व व्यवस्थापन प्रणाली", navAbout: "यस नमुना परियोजनाबारे", navGuides: "सुरक्षा सुझाव", navReport: "खेतको क्षति बताउनुहोस्", signIn: "अधिकारी लगइन", language: "English", noticeScope: "सूचना देखाउने क्षेत्र", noticeWard: "वडा", noticeMunicipality: "पालिका",
    eyebrow: "पोखरा महानगरपालिका · समुदायका लागि नमुना प्रणाली", heroTitle: "एउटा स्पष्ट जानकारीले खेत सुरक्षित बनाउन मद्दत गर्छ।", heroBody: "यो नमुना प्रणाली पोखरा महानगरपालिका वडा २१ मा मानव–बाँदर बाली द्वन्द्वको अध्ययनका लागि बनाइएको हो। बाँदर देखिएको तस्बिर पठाउनुहोस् वा खेतको क्षति बताउनुहोस्। परियोजनाको टोलीले जानकारी समीक्षा गरेर समस्या कहाँ र कहिले भइरहेको छ भन्ने बुझ्नेछ।", capture: "वन्यजन्तुको तस्बिर पठाउनुहोस्", report: "खेतको क्षति बताउनुहोस्", pilot: "पोखरा महानगरपालिकाको नमुना परियोजना · वडा २१", pilotNote: "वडा २१ को अध्ययनका लागि बाँदर देखिएको वा बालीमा भएको क्षतिको जानकारी दिनुहोस्। हरेक जानकारी मानिसले समीक्षा गर्छन्; एआईको सूचना मात्र पुष्टि भएको घटना मानिँदैन।", artAlt: "पोखराको खेत नजिक बाँदर देखाइएको चित्र", illustration: "अध्ययनका लागि बनाइएको चित्र", locationLabel: "अध्ययन क्षेत्र", areaLabel: "वडा २१ · पोखरा, कास्की", focusLabel: "बाँदर र बाली द्वन्द्वसम्बन्धी समुदाय अध्ययन", noticeSetup: "सार्वजनिक सूचना देखाउने क्षेत्र छान्नुहोस्",
    aboutTitle: "वडा २१ का लागि स्थानीय नमुना प्रणाली", aboutBody: "पहिलो अध्ययन वडा २१ मा बाँदरले खेतबालीमा असर गर्ने समय र स्थान बुझ्न केन्द्रित छ। बासिन्दाले वन्यजन्तु देखिएको वा क्षति भएको जानकारी दिन सक्छन्। स्थानीय अनुभवबाट सिक्न परियोजनाको टोलीले विवरण समीक्षा गर्छ।", howTitle: "यो नमुना प्रणाली कसरी चल्छ", howPhoto: "देखेको कुरा पठाउनुहोस्", howPhotoBody: "वन्यजन्तुको तस्बिर खिच्नुहोस् वा पठाउनुहोस्, अथवा बालीको क्षति लेख्नुहोस्।", howReview: "टोलीले समीक्षा गर्छ", howReviewBody: "परियोजनाको समीक्षकले विवरण जाँचेपछि मात्र यसलाई प्रमाणका रूपमा प्रयोग गर्छ।", howLearn: "स्थानीय जानकारी बढ्छ", howLearnBody: "समीक्षा भएका विवरणले द्वन्द्वको अवस्था र आवश्यक प्रतिक्रियाबारे अध्ययन गर्न मद्दत गर्छ।",
    trustTitle: "तपाईंको जानकारी सावधानीपूर्वक प्रयोग हुन्छ", trustOne: "मानिसले विवरण जाँच्छन्", trustOneBody: "परियोजनाको समीक्षकले नजाँचेसम्म फोन र क्यामेराका विवरण अपुष्ट रहन्छन्।", trustTwo: "ठ्याक्कै स्थान सुरक्षित राखिन्छ", trustTwoBody: "ठ्याक्कै GPS स्थान अधिकृत केस समीक्षकले मात्र हेर्न सक्छन्।", trustThree: "स्वचालित प्रतिकार हुँदैन", trustThreeBody: "यो अनुसन्धान नमुना प्रणालीले बत्ती, आवाज वा विद्युतीय उपकरण आफैँ चलाउँदैन।",
    reportTitle: "के भयो हामीलाई बताउनुहोस्", reportBody: "तपाईंको जानकारीले द्वन्द्व कहाँ हुन्छ र कस्तो सहयोग चाहिन्छ भन्ने बुझ्न अनुसन्धानकर्तालाई मद्दत गर्छ। आवश्यक विवरण भर्नुहोस्।", reportType: "क्षतिको प्रकार", crop: "बाली क्षति", livestock: "पशुधन क्षति", both: "बाली र पशुधन", other: "अन्य वन्यजन्तु क्षति", cropName: "क्षति भएको बाली", livestockName: "क्षति भएको पशुधन", estimate: "अनुमानित क्षति (रु.)", details: "के भएको थियो?", detailsPlaceholder: "के क्षति भयो, कहिले भयो र समीक्षा गर्न सहयोग पुग्ने विवरण लेख्नुहोस्।", name: "तपाईंको नाम (वैकल्पिक)", phone: "फोन (वैकल्पिक)", province: "प्रदेश", district: "जिल्ला", municipality: "पालिका", ward: "वडा नम्बर", area: "टोल वा गाउँ (वैकल्पिक)", location: "मेरो स्थान प्रयोग गर्नुहोस्", lookup: "GPS बाट क्षेत्र सुझाव", gpsUnavailable: "स्थान पत्ता लागेन। निर्देशाङ्क आफैँ लेख्न वा GPS बिना जारी राख्न सक्नुहुन्छ।", gpsSecure: "स्थानका लागि सुरक्षित HTTPS वेबसाइट चाहिन्छ। वेबसाइटको HTTPS ठेगाना खोल्नुहोस् र ब्राउजरमा स्थान अनुमति दिनुहोस्।", gpsPermission: "स्थान अनुमति रोकिएको छ। ब्राउजर वा फोनको सेटिङमा अनुमति दिएर फेरि प्रयास गर्नुहोस्।", gpsTimeout: "स्थान पत्ता लगाउन ढिलो भयो। बाहिर खुला ठाउँमा फेरि प्रयास गर्नुहोस् वा निर्देशाङ्क आफैँ लेख्नुहोस्।", gpsTryAgain: "स्थान पत्ता लगाउन सकिएन। फोनको स्थान सेटिङ जाँच्नुहोस् वा निर्देशाङ्क आफैँ लेख्नुहोस्।", manualCoordinates: "वा निर्देशाङ्क आफैँ लेख्नुहोस्", latitude: "अक्षांश", longitude: "देशान्तर", coordinatePair: "अक्षांश र देशान्तर दुवै लेख्नुहोस् वा दुवै खाली छोड्नुहोस्।", coordinateInvalid: "सही निर्देशाङ्क लेख्नुहोस्: अक्षांश −९० देखि ९० र देशान्तर −१८० देखि १८० सम्म।", geocodeUnavailable: "स्वचालित क्षेत्र खोजी उपलब्ध छैन। कृपया क्षेत्र जाँचेर आफैँ भर्नुहोस्।", geocodeReview: "क्षेत्रका सुझाव अनुमानित हुन सक्छन्। पठाउनुअघि जाँच गर्नुहोस्।", geocodePrivacy: "क्षेत्र सुझाव माग्दा मात्र तपाईंको ठ्याक्कै GPS स्थान कन्फिगर गरिएको खोजी सेवामा पठाइन्छ।", consent: "द्वन्द्व अनुसन्धान र प्रतिक्रियाका लागि अधिकृत परियोजना समीक्षकसँग यो विवरण र स्थान साझा गर्न म सहमत छु।", submit: "समीक्षाका लागि पठाउनुहोस्", sending: "पठाउँदै…", submitted: "धन्यवाद। तपाईंको विवरण मानव समीक्षाका लागि प्राप्त भयो।", reportError: "विवरण पठाउन सकिएन। कृपया फेरि प्रयास गर्नुहोस्।", gpsReady: "स्थान विवरण", gpsAccuracy: "अनुमानित GPS शुद्धता", required: "आवश्यक", formLocationStatus: "स्थान प्रयोग गरिएको छैन",
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

const researchSources = {
  en: [
    {
      title: "Earlier Pokhara study · Pumdivumdi/Tallokodi (Ward 25)",
      citation: "Sharma & Acharya · Banko Janakari 27(2), 2017 · field survey in 2016",
      summary: "A purposive survey of 60 households reported maize and potato among the commonly raided crops. These are historical reports from another ward, not current Ward 21 measurements.",
      url: "https://doi.org/10.3126/banko.v27i2.21222",
      link: "Read the study",
    },
    {
      title: "Crop-raiding observations · Kavrepalanchok",
      citation: "Koirala et al. · Journal of Environmental Management 297, 2021",
      summary: "Observations across 172 plots found crop type, distance to forest edges and macaque routes, and farmer actions relevant to crop damage. Ward 21 must test these factors locally.",
      url: "https://pubmed.ncbi.nlm.nih.gov/34298347/",
      link: "Read the study",
    },
    {
      title: "Nationwide conflict mapping · Nepal",
      citation: "Kandel et al. · Journal of Environmental Management 316, 2022",
      summary: "A national analysis examined landscape and human influences on rhesus macaque conflict. Its maps can guide questions, but cannot replace local validation or confirm a sighting.",
      url: "https://pubmed.ncbi.nlm.nih.gov/35576709/",
      link: "Read the study",
    },
  ],
  np: [
    {
      title: "पोखराको अघिल्लो अध्ययन · पुम्दीभुम्दी/तल्लोकोदी (वडा २५)",
      citation: "शर्मा र आचार्य · बैंकको जनकारी २७(२), २०१७ · २०१६ को सर्वेक्षण",
      summary: "६० घरधुरीको छनोट गरिएको सर्वेक्षणमा मकै र आलुलाई धेरै क्षति हुने बालीका रूपमा उल्लेख गरिएको थियो। यो अर्को वडाको पुरानो जानकारी हो, वडा २१ को अहिलेको मापन होइन।",
      url: "https://doi.org/10.3126/banko.v27i2.21222",
      link: "अध्ययन पढ्नुहोस्",
    },
    {
      title: "बालीमा बाँदरको असर · काभ्रेपलाञ्चोक",
      citation: "कोइराला लगायत · जर्नल अफ इन्भाइरोन्मेन्टल म्यानेजमेन्ट २९७, २०२१",
      summary: "१७२ खेतबारीको अवलोकनमा बालीको प्रकार, वनको किनार र बाँदर हिँड्ने बाटोको दूरी तथा किसानको प्रयासलाई क्षतिसँग सम्बन्धित पक्षका रूपमा हेरिएको थियो। वडा २१ मा यी पक्ष छुट्टै जाँच्नुपर्छ।",
      url: "https://pubmed.ncbi.nlm.nih.gov/34298347/",
      link: "अध्ययन पढ्नुहोस्",
    },
    {
      title: "नेपालभर बाँदर–मानव द्वन्द्वको नक्साङ्कन",
      citation: "कँडेल लगायत · जर्नल अफ इन्भाइरोन्मेन्टल म्यानेजमेन्ट ३१६, २०२२",
      summary: "राष्ट्रिय अध्ययनले बाँदरको द्वन्द्वमा वातावरण र मानव गतिविधिको प्रभाव जाँच्यो। नक्साले प्रश्न बनाउन मद्दत गर्छ; स्थानीय जाँच वा बाँदर देखिएको पुष्टि यसको विकल्प होइन।",
      url: "https://pubmed.ncbi.nlm.nih.gov/35576709/",
      link: "अध्ययन पढ्नुहोस्",
    },
  ],
};

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
      className={`fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-3xl overflow-hidden rounded-2xl border bg-white shadow-[0_20px_60px_-22px_rgba(15,23,42,.55)] sm:inset-x-6 sm:bottom-3 ${Number(notice.priority) >= 4 ? "border-rose-300" : "border-amber-200"}`}
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

function parseManualCoordinates(latitudeText, longitudeText) {
  const hasLatitude = latitudeText.trim() !== "";
  const hasLongitude = longitudeText.trim() !== "";
  if (!hasLatitude && !hasLongitude) return null;
  if (!hasLatitude || !hasLongitude) throw new Error("COORDINATE_PAIR");
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    throw new Error("COORDINATES_INVALID");
  }
  return { latitude, longitude, accuracy: null };
}

function explainLocationError(error, t) {
  if (error?.message === "COORDINATE_PAIR") return t.coordinatePair;
  if (error?.message === "COORDINATES_INVALID") return t.coordinateInvalid;
  if (typeof window !== "undefined" && !window.isSecureContext) return t.gpsSecure;
  if (error?.code === 1) return t.gpsPermission;
  if (error?.code === 3) return t.gpsTimeout;
  return t.gpsTryAgain;
}

function MonkeyCursor() {
  const cursorRef = useRef(null);

  useEffect(() => {
    const canHover = window.matchMedia("(pointer: fine) and (hover: hover)");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!canHover.matches || prefersReducedMotion.matches) return undefined;

    let frame = 0;
    let lastX = 0;
    let lastY = 0;
    const move = (event) => {
      lastX = event.clientX;
      lastY = event.clientY;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const node = cursorRef.current;
        if (node) {
          node.style.transform = `translate3d(${lastX + 18}px, ${lastY + 16}px, 0)`;
          node.style.opacity = "1";
        }
        frame = 0;
      });
    };

    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <span ref={cursorRef} className="monkey-cursor" aria-hidden="true"><span>🐒</span></span>;
}

function PilotIllustration({ t }) {
  return (
    <div className="pilot-illustration relative aspect-[1.05/1] min-h-[310px] overflow-hidden rounded-[1.6rem] border border-white/55 shadow-[0_35px_90px_-45px_rgba(15,54,42,.8)] sm:aspect-[1.08/1] sm:min-h-[420px]">
      <svg viewBox="0 0 720 620" className="absolute inset-0 h-full w-full" role="img" aria-label={t.artAlt} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="pokhara-sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#b8d9c2" /><stop offset=".58" stopColor="#e7e8c3" /><stop offset="1" stopColor="#f1d8a5" /></linearGradient>
          <linearGradient id="field-green" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8fa963" /><stop offset="1" stopColor="#476d48" /></linearGradient>
          <linearGradient id="field-gold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d7b76e" /><stop offset="1" stopColor="#a77e4e" /></linearGradient>
          <filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10" /></filter>
        </defs>
        <rect width="720" height="620" fill="url(#pokhara-sky)" />
        <circle cx="560" cy="118" r="51" fill="#f8e6aa" opacity=".8" />
        <path d="M0 255 113 142l83 86 127-151 107 157 85-91 205 142v165H0Z" fill="#718b7a" opacity=".54" />
        <path d="m0 284 122-94 96 106 121-133 100 126 112-107 169 100v145H0Z" fill="#4d7861" opacity=".72" />
        <path d="M0 342q118-73 233-12t227-9 260-5v112H0Z" fill="#71925e" />
        <path d="M0 397q169-87 343-31t377-20v274H0Z" fill="url(#field-green)" />
        <path d="M0 463q168-97 348-30t372-21v208H0Z" fill="#708c50" />
        <path d="M0 536q191-99 386-21t334-34v139H0Z" fill="url(#field-gold)" />
        <path d="M0 563q178-87 356-21t364-25" fill="none" stroke="#ead69a" strokeWidth="5" opacity=".62" />
        <path d="M0 594q178-87 356-21t364-25" fill="none" stroke="#f1dfad" strokeWidth="4" opacity=".48" />
        <g opacity=".9" stroke="#d3bd78" strokeWidth="3" strokeLinecap="round">
          <path d="M75 452v88m-18-47 18 14m0-31-17-12m17 42 19-17m-19-17 19-13" />
          <path d="M128 435v75m-16-40 16 13m0-26-16-12m16 35 17-15m-17-14 17-11" />
          <path d="M633 415v89m-18-46 18 14m0-29-18-12m18 40 18-16m-18-17 18-12" />
          <path d="M578 431v78m-16-41 16 13m0-27-16-11m16 37 16-14m-16-15 16-11" />
        </g>
        <g className="art-tree">
          <path d="M96 365q43-93 78-160l15 11q-24 85-48 154Z" fill="#684d36" />
          <path d="M173 225q48-5 80-28m-93 45q-38-5-67-35" fill="none" stroke="#684d36" strokeWidth="12" strokeLinecap="round" />
          <circle cx="123" cy="192" r="48" fill="#456b46" /><circle cx="182" cy="165" r="55" fill="#527b4a" /><circle cx="232" cy="199" r="43" fill="#62844e" /><circle cx="163" cy="218" r="49" fill="#567748" />
        </g>
        <g opacity=".86">
          <path d="m420 358 46-38 46 38v40h-92Z" fill="#f0dfb4" /><path d="m407 359 59-49 60 49" fill="none" stroke="#855d45" strokeWidth="11" strokeLinejoin="round" /><rect x="459" y="367" width="18" height="31" rx="2" fill="#8d6c4d" />
          <path d="m522 373 34-29 35 29v31h-69Z" fill="#e9d7a9" /><path d="m513 374 43-36 44 36" fill="none" stroke="#795842" strokeWidth="9" strokeLinejoin="round" />
        </g>
        <ellipse cx="372" cy="437" rx="94" ry="19" fill="#233f31" opacity=".2" filter="url(#soft-shadow)" />
        <g className="art-monkey" stroke="#543d31" strokeLinecap="round" strokeLinejoin="round">
          <path d="M343 351q-41-2-43-35t-24-24q-18 1-11 20" fill="none" strokeWidth="11" />
          <path d="M353 342q-21 28-11 63l-11 22q19 11 43 2l4-37q22 8 37 30l13-7q-10-38-43-56l7-24Z" fill="#765541" strokeWidth="7" />
          <path d="M356 365q-14 22-7 45l15 9 11-25-2-22" fill="#bd946b" stroke="none" />
          <circle cx="363" cy="330" r="27" fill="#765541" strokeWidth="6" />
          <ellipse cx="365" cy="336" rx="17" ry="14" fill="#d7b48a" stroke="none" />
          <circle cx="368" cy="332" r="2.5" fill="#292720" stroke="none" /><path d="M375 340q-6 5-12 0" fill="none" stroke="#694632" strokeWidth="2.5" />
          <path d="m344 319-10-10m38 1 8-12" fill="none" strokeWidth="6" />
          <path d="m343 417-20 8m60 2 15 6" fill="none" strokeWidth="8" />
        </g>
        <g className="art-focus" fill="none" stroke="#f8fff1" strokeWidth="3" opacity=".9">
          <path d="M310 286v-17h18m72 0h18v17m0 76v17h-18m-72 0h-18v-17" />
          <circle cx="363" cy="333" r="72" strokeDasharray="3 9" opacity=".72" />
        </g>
        <path d="M0 0h720v620H0Z" fill="url(#pokhara-sky)" opacity=".04" />
      </svg>
      <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3 sm:inset-x-6 sm:top-6">
        <span className="max-w-[78%] rounded-full border border-white/50 bg-white/88 px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-emerald-950 shadow-sm backdrop-blur sm:text-xs">{t.pilot}</span>
        <span className="rounded-full bg-emerald-950/80 px-3 py-2 text-[10px] font-semibold text-white backdrop-blur">{t.illustration}</span>
      </div>
      <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-xl backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:p-5">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-emerald-800"><MapPin className="h-3.5 w-3.5" />{t.locationLabel}</div>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">{t.areaLabel}</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">{t.focusLabel}</p>
      </div>
    </div>
  );
}

export default function PublicLanding() {
  const [lang, setLang] = useState(() => window.localStorage.getItem("nws-public-language") === "np" ? "np" : "en");
  const [notices, setNotices] = useState([]);
  const [noticeWard, setNoticeWard] = useState(() => window.localStorage.getItem("nws-notice-ward") || "21");
  const [noticeMunicipality, setNoticeMunicipality] = useState(() => window.localStorage.getItem("nws-notice-municipality") || "Pokhara Metropolitan City");
  const [dismissed, setDismissed] = useState(() => new Set());
  const [mobileNav, setMobileNav] = useState(false);
  const scrollProgressRef = useRef(null);
  const [gps, setGps] = useState(null);
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
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

  useEffect(() => {
    let frame = 0;
    const updateProgress = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const page = document.documentElement;
        const distance = page.scrollHeight - window.innerHeight;
        const progress = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
        if (scrollProgressRef.current) scrollProgressRef.current.style.transform = `scaleX(${progress})`;
        frame = 0;
      });
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

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
    } catch (error) {
      setLookupMessage(explainLocationError(error, t));
      return null;
    } finally { setLocationBusy(false); }
  };

  const suggestArea = async () => {
    setLocationBusy(true);
    setLookupMessage("");
    let point;
    try {
      point = parseManualCoordinates(manualLatitude, manualLongitude) || gps || await getPosition();
      if (!gps && !manualLatitude.trim() && !manualLongitude.trim()) setGps(point);
    } catch (error) {
      setLookupMessage(explainLocationError(error, t));
      setLocationBusy(false);
      return;
    }
    try {
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
      const manualPoint = parseManualCoordinates(manualLatitude, manualLongitude);
      const payload = {
        ...form,
        consent: form.consent,
        submission_id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        latitude: manualPoint?.latitude ?? gps?.latitude ?? null,
        longitude: manualPoint?.longitude ?? gps?.longitude ?? null,
        accuracy: manualPoint ? null : gps?.accuracy ?? null,
        reported_at: new Date().toISOString(),
      };
      await api.public.submitDamageReport(payload);
      setSubmitted(true);
      setForm((prior) => ({ ...prior, crop_type: "", livestock_type: "", estimated_loss_npr: "", description: "", reporter_name: "", reporter_phone: "", location_name: "", consent: false }));
      setManualLatitude("");
      setManualLongitude("");
    } catch (error) {
      setFormError(error.message === "COORDINATE_PAIR" || error.message === "COORDINATES_INVALID" ? explainLocationError(error, t) : error.message || t.reportError);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="public-landing min-h-screen overflow-x-clip bg-[#fafbf8] pb-24 text-slate-900 selection:bg-emerald-200 selection:text-emerald-950 sm:pb-0">
      <a href="#top" className="skip-to-content">{lang === "np" ? "मुख्य सामग्रीमा जानुहोस्" : "Skip to main content"}</a>
      <header className="sticky top-0 z-40 border-b border-emerald-950/5 bg-white/90 backdrop-blur-xl">
        <div ref={scrollProgressRef} className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-lime-500" aria-hidden="true" />
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
        <section className="hero-section relative isolate">
          <div className="hero-glow absolute inset-0 -z-10" />
          <div className="mx-auto grid max-w-7xl items-center gap-9 px-4 pb-12 pt-8 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.04fr_.96fr] lg:gap-14 lg:px-8 lg:pb-24 lg:pt-16">
            <div className="hero-copy">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-900/10 bg-white/85 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.11em] text-emerald-900 shadow-sm sm:text-xs"><span className="h-2 w-2 shrink-0 rounded-full bg-lime-600 ring-4 ring-lime-100" />{t.eyebrow}</div>
              <h1 className="mt-5 max-w-3xl text-[clamp(2.25rem,8vw,4.6rem)] font-semibold leading-[1.05] tracking-[-.05em] text-slate-950 sm:mt-7">{t.heroTitle}</h1>
              <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8">{t.heroBody}</p>
              <div className="mt-6 grid gap-3 sm:mt-8 sm:flex sm:flex-wrap">
                <Link to={`/public-capture?lang=${lang}`} className="group inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl bg-emerald-900 px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_12px_28px_-12px_rgba(6,78,59,.6)] transition hover:-translate-y-0.5 hover:bg-emerald-800 active:scale-[.99] sm:rounded-full sm:px-6"><Camera className="h-4 w-4" />{t.capture}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
                <a href="#report" className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-emerald-900/20 bg-white/85 px-5 py-3 text-center text-sm font-semibold text-emerald-950 transition hover:border-emerald-800 hover:bg-white active:scale-[.99] sm:rounded-full sm:px-6">{t.report}<ArrowDown className="h-4 w-4" /></a>
              </div>
              <div className="mt-6 flex max-w-xl items-start gap-3 rounded-2xl border border-emerald-900/10 bg-white/75 p-4 text-sm leading-6 text-slate-600 shadow-sm sm:mt-8 sm:p-5"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900"><ShieldCheck className="h-5 w-5" /></span><div><strong className="font-semibold text-slate-900">{t.pilot}</strong><p className="mt-1">{t.pilotNote}</p></div></div>
              <a href="#about" className="mt-5 inline-flex min-h-10 items-center gap-2 px-1 text-sm font-semibold text-emerald-900 hover:text-emerald-700"><span>{t.scroll}</span><ChevronDown className="h-4 w-4 animate-bounce" /></a>
            </div>
            <div className="hero-art relative mx-auto w-full max-w-xl lg:ml-auto"><div className="absolute -inset-3 -z-10 rounded-[2rem] bg-emerald-900/10 blur-2xl" /><PilotIllustration t={t} /></div>
          </div>
        </section>

        <section id="about" className="scroll-mt-20 border-y border-emerald-950/5 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">{t.pilot}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t.aboutTitle}</h2>
              <p className="mt-4 text-[15px] leading-7 text-slate-600 sm:text-base sm:leading-8">{t.aboutBody}</p>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-emerald-950/10 bg-[#f7faf5] p-5 sm:p-6"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-900 shadow-sm"><Camera className="h-5 w-5" /></span><h3 className="mt-4 font-semibold text-slate-950">{t.howPhoto}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{t.howPhotoBody}</p></article>
              <article className="rounded-2xl border border-emerald-950/10 bg-[#f7faf5] p-5 sm:p-6"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-900 shadow-sm"><UsersRound className="h-5 w-5" /></span><h3 className="mt-4 font-semibold text-slate-950">{t.howReview}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{t.howReviewBody}</p></article>
              <article className="rounded-2xl border border-emerald-950/10 bg-[#f7faf5] p-5 sm:p-6"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-900 shadow-sm"><Leaf className="h-5 w-5" /></span><h3 className="mt-4 font-semibold text-slate-950">{t.howLearn}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{t.howLearnBody}</p></article>
            </div>
            <div className="mb-6 mt-12 flex items-end justify-between gap-4 sm:mt-16"><h2 className="max-w-xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{t.trustTitle}</h2><span className="hidden text-xs font-semibold uppercase tracking-[.15em] text-slate-400 sm:block">01 — 03</span></div>
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-[#fbfcfa] p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900"><UsersRound className="h-5 w-5" /></span><h3 className="mt-4 font-semibold">{t.trustOne}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{t.trustOneBody}</p></article>
              <article className="rounded-2xl border border-slate-200 bg-[#fbfcfa] p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-900"><ShieldCheck className="h-5 w-5" /></span><h3 className="mt-4 font-semibold">{t.trustTwo}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{t.trustTwoBody}</p></article>
              <article className="rounded-2xl border border-slate-200 bg-[#fbfcfa] p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900"><CircleHelp className="h-5 w-5" /></span><h3 className="mt-4 font-semibold">{t.trustThree}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{t.trustThreeBody}</p></article>
            </div>
            <details className="notice-settings group mt-6 rounded-2xl border border-slate-200 bg-white">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-slate-800 sm:px-5"><span>{t.noticeSetup}</span><ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary>
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-4 sm:px-5"><span className="text-xs font-semibold text-slate-500">{t.noticeScope}:</span><label className="grid flex-1 gap-1 text-xs text-slate-600 sm:max-w-xs">{t.noticeMunicipality}<input aria-label={t.noticeMunicipality} value={noticeMunicipality} onChange={(event) => setNoticeMunicipality(event.target.value)} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800" /></label><label className="grid w-28 gap-1 text-xs text-slate-600">{t.noticeWard}<input aria-label={t.noticeWard} value={noticeWard} onChange={(event) => setNoticeWard(event.target.value.slice(0, 3))} inputMode="numeric" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800" /></label></div>
            </details>
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
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-semibold text-slate-700">{t.manualCoordinates}</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid min-w-0 gap-1.5 text-xs font-medium text-slate-600">{t.latitude}<input aria-label={t.latitude} inputMode="decimal" value={manualLatitude} onChange={(event) => setManualLatitude(event.target.value)} placeholder="28.21" className="h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800" /></label>
                  <label className="grid min-w-0 gap-1.5 text-xs font-medium text-slate-600">{t.longitude}<input aria-label={t.longitude} inputMode="decimal" value={manualLongitude} onChange={(event) => setManualLongitude(event.target.value)} placeholder="83.99" className="h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800" /></label>
                </div>
              </div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700"><input type="checkbox" name="consent" checked={form.consent} onChange={update} required className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-800" />{t.consent}</label>
              {formError && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{formError || t.reportError}</p>}
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><button type="submit" disabled={submitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-900 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-50">{submitting ? t.sending : t.submit}<ArrowRight className="h-4 w-4" /></button><p className="text-[11px] leading-5 text-slate-500">{t.trustTwoBody}</p></div>
            </form>
          </div>
        </section>

        <section id="guides" className="scroll-mt-24 py-16 sm:py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">{t.knowledgeEyebrow}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t.knowledgeTitle}</h2><p className="mt-4 text-sm leading-7 text-slate-600">{t.knowledgeBody}</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{species.map(({ icon, key, tone }) => <article key={key} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone} text-2xl`}>{icon}</div><h3 className="mt-4 text-lg font-semibold">{t[key]}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{t[`${key}Body`]}</p></article>)}</div></div></section>

        <section className="bg-[#152f29] py-16 text-white sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-lime-300">{t.researchEyebrow}</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t.researchTitle}</h2>
                <p className="mt-4 max-w-lg text-sm leading-7 text-emerald-50/75">{t.researchBody}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl border border-white/10 bg-white/[.06] p-5">
                  <BookOpen className="h-5 w-5 text-lime-300" />
                  <h3 className="mt-4 font-semibold">{t.researchCard}</h3>
                  <p className="mt-2 text-sm leading-6 text-emerald-50/75">{t.researchCardBody}</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-white/[.06] p-5">
                  <Leaf className="h-5 w-5 text-lime-300" />
                  <h3 className="mt-4 font-semibold">{t.repository}</h3>
                  <p className="mt-2 text-sm leading-6 text-emerald-50/75">{t.repositoryBody}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-emerald-50/80"><Clock3 className="h-3 w-3" />{t.status}</div>
                </article>
              </div>
            </div>
            <div className="mt-10 border-t border-white/10 pt-8">
              <h3 className="text-xl font-semibold">{lang === "np" ? "अघिल्ला अध्ययनले के देखाए?" : "What earlier studies found"}</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50/75">
                {lang === "np"
                  ? "यी अध्ययनले पृष्ठभूमि दिन्छन्। यिनले वडा २१ को अहिलेको अवस्था बताउँदैनन्। यस परियोजनाले आफ्नै विवरण सङ्कलन र समीक्षा गर्नेछ।"
                  : "These studies provide context; they do not describe current conditions in Ward 21. This project will collect and review its own evidence."}
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {researchSources[lang].map((source) => (
                  <article key={source.url} className="flex flex-col rounded-2xl border border-white/10 bg-white/[.06] p-4">
                    <h4 className="font-semibold leading-6">{source.title}</h4>
                    <p className="mt-2 text-xs leading-5 text-lime-100/80">{source.citation}</p>
                    <p className="mt-3 flex-1 text-sm leading-6 text-emerald-50/75">{source.summary}</p>
                    <a href={source.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-lime-200 underline-offset-4 hover:underline">
                      {source.link}<ArrowRight className="h-4 w-4" />
                    </a>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><span>{t.footer}</span><Link className="inline-flex items-center gap-1 font-semibold text-emerald-900 hover:underline" to="/login">{t.signIn}<ArrowRight className="h-3.5 w-3.5" /></Link></div></footer>
      <div className="mobile-action-dock fixed inset-x-3 bottom-[calc(.65rem+env(safe-area-inset-bottom))] z-40 grid grid-cols-2 gap-2 rounded-2xl border border-emerald-950/10 bg-white/95 p-2 shadow-[0_14px_36px_-12px_rgba(15,23,42,.35)] backdrop-blur-xl sm:hidden">
        <Link to={`/public-capture?lang=${lang}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-3 text-center text-sm font-semibold text-white active:scale-[.98]"><Camera className="h-4 w-4 shrink-0" />{t.capture}</Link>
        <a href="#report" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-900/15 bg-emerald-50 px-3 text-center text-sm font-semibold text-emerald-950 active:scale-[.98]">{t.report}<ArrowDown className="h-4 w-4 shrink-0" /></a>
      </div>
      <MonkeyCursor />
      {activeNotice && <NoticeBanner notice={activeNotice} lang={lang} onDismiss={dismissNotice} />}
    </div>
  );
}
