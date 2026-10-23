import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowRight, BellRing, BookOpen, Camera, ChevronDown,
  CircleHelp, Clock3, Globe2, Leaf, LocateFixed, MapPin, Menu, ShieldCheck,
  UsersRound, ThumbsDown, ThumbsUp, Sparkles, X,
} from "lucide-react";
import { api } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";
import PokharaLogo from "@/components/PokharaLogo";

const WildlifeHero3D = lazy(() => import("@/components/3d/WildlifeHero3D"));

const copy = {
  en: {
    system: "Human Wildlife Conflict Management System", navAbout: "About this platform", navGuides: "Safety guides", navSpecies: "Species library", navReport: "Report farm damage", viewLibrary: "Explore the species library", language: "नेपाली", noticeScope: "Show notices for", noticeWard: "Ward", noticeMunicipality: "Municipality",
    eyebrow: "INTERNATIONAL · PREMIUM FIELD PLATFORM · POKHARA PILOT", heroTitle: "Better coexistence begins with a clearer picture.", heroBody: "Share a wildlife sighting or farm impact from anywhere. Community reports build a clearer picture of human–wildlife conflict; our first field study tracks monkey crop loss across Pokhara’s 33 wards, beginning in Ward 21. People review reports before they inform research.", capture: "Share a wildlife photo", report: "Report farm impact", pilot: "Pokhara Metropolitan City · 33 wards", pilotNote: "Open to reports from every country. The first research study focuses on Ward 21 in Pokhara; each submission stays unverified until reviewed by a person.", artAlt: "Rhesus macaque photographed in Nepal", illustration: "FIELD REFERENCE · GOKARNA FOREST, NEPAL", locationLabel: "FIRST FIELD STUDY", areaLabel: "Pokhara Metropolitan City · 33 wards", focusLabel: "Monkey crop impact · Ward 21 pilot", noticeSetup: "Choose an area for public notices",
    aboutTitle: "A global reporting platform, with a first study in Pokhara", aboutBody: "Anyone can report wildlife or conflict from any country. The first research study documents when and where monkeys affect farms in Pokhara Metropolitan City, across all 33 wards, with special attention to the Ward 21 pilot. Reports from other places remain welcome and keep their own location details.", howTitle: "How the platform works", howPhoto: "Share what you saw", howPhotoBody: "Take or upload a wildlife photo, or describe crop or livestock damage from anywhere.", howReview: "A person reviews it", howReviewBody: "A project reviewer checks reports before they are used as evidence.", howLearn: "Research improves", howLearnBody: "Reviewed reports help teams understand conflict patterns and response needs in each location.",
    trustTitle: "Your report, handled with care", trustOne: "A person checks reports", trustOneBody: "Phone and camera reports remain unverified until a project reviewer checks them.", trustTwo: "Your exact location is protected", trustTwoBody: "Precise coordinates are visible only to authorized case reviewers.", trustThree: "No automatic deterrents", trustThreeBody: "This research prototype does not automatically trigger lights, sound, or electrical devices.",
    reportTitle: "Tell us what happened", reportBody: "Send a wildlife conflict report from anywhere in the world. GPS coordinates are checked at submission and include the device’s accuracy estimate. Country is required; local administrative areas are optional outside places that use them.", reportType: "Type of loss", crop: "Crop damage", livestock: "Livestock loss", both: "Crop and livestock", other: "Other wildlife damage", cropName: "Crop affected", livestockName: "Livestock affected", estimate: "Estimated loss (optional, NPR)", details: "What happened?", detailsPlaceholder: "Tell us what was damaged, when it happened, and any details that may help the review. If estimating in another currency, include its amount and currency here.", name: "Your name (optional)", phone: "Phone (optional)", country: "Country", countryPlaceholder: "e.g. Nepal", province: "State / Province / Region (optional)", district: "District / County (optional)", municipality: "Municipality / City (optional)", ward: "Ward / local area number (optional)", area: "Area, village or landmark (optional)", location: "Use my location", lookup: "Suggest area from GPS", gpsUnavailable: "Location not available yet. Get a GPS fix or enter coordinates manually to submit.", gpsSecure: "Location requires a secure HTTPS website. Open this site using its HTTPS address, then allow location access.", gpsPermission: "Location permission is blocked. Allow it in your browser or device settings, then try again or enter coordinates manually.", gpsTimeout: "Location took too long. Try again outdoors, or enter coordinates manually.", gpsTryAgain: "Could not read your location. Check device location settings or enter coordinates manually.", manualCoordinates: "Or enter coordinates manually", latitude: "Latitude", longitude: "Longitude", coordinatePair: "Enter both latitude and longitude, or leave both blank.", coordinateInvalid: "Enter valid coordinates: latitude −90 to 90, longitude −180 to 180.", locationRequired: "A location is required. Allow GPS or enter both coordinates manually.", gpsPrecision: "GPS is an estimate. Check the displayed accuracy and confirm the location before sending.", geocodeUnavailable: "Automatic area lookup is not available. Please verify and enter the area yourself.", geocodeReview: "Area suggestions can be approximate. Please check them before submitting.", geocodePrivacy: "Precise coordinates go to the configured area-lookup provider only when you request a suggestion.", consent: "I agree to share this report and its location with authorized project reviewers for conflict research and response.", submit: "Send report for review", sending: "Sending report…", submitted: "Thank you. Your report was received for human review.", reportError: "We could not send the report. Please try again.", gpsReady: "Location details", gpsAccuracy: "Estimated GPS accuracy", required: "Required",
    knowledgeEyebrow: "PRACTICAL FIELD GUIDANCE", knowledgeTitle: "Share space safely", knowledgeBody: "Simple, non-harmful steps can reduce risk while the local team learns from community reports.", monkey: "Monkeys", monkeyBody: "Keep food and waste covered. Avoid feeding, cornering, or chasing monkeys; move indoors if a group approaches.", elephant: "Elephants", elephantBody: "Keep a wide distance, never block a route, and follow instructions from local responders.", leopard: "Leopards", leopardBody: "Bring children and pets indoors at dusk. Do not approach an animal or its den; alert local officials.", boar: "Wild boar", boarBody: "Keep a safe barrier, avoid approaching piglets, and move away calmly if an animal is nearby.", helpTitle: "If anyone is in immediate danger", helpBody: "Move to a safe place and contact your local ward office, police, or the appropriate wildlife authority. This website is not an emergency dispatch service.",
    researchEyebrow: "LEARNING FROM THE FIELD", researchTitle: "Research and community learning", researchBody: "The first study focuses on human–monkey crop-raiding reports in Pokhara Metropolitan City. People can report from any of its 33 wards; the initial field pilot focuses on Ward 21. Reports from other countries are also welcome.", researchCard: "Pokhara study focus", researchCardBody: "Document time, location, crop impact, and response across Pokhara’s 33 wards, starting with Ward 21.", repository: "Research repository", repositoryBody: "Approved papers, summaries, and anonymized incident reports will be shared here when the project team publishes them.", status: "Repository materials will be added after review", footer: "A global reporting platform for safer human–wildlife coexistence.", alertsLabel: "Community notice", noNotices: "No active public notices", dismiss: "Dismiss notice", noticeLabel: "Public safety notice", active: "Active notice", menu: "Open menu", closeMenu: "Close menu", viewGuides: "Read safety guides", scroll: "Explore the pilot", countdownSeconds: "seconds remaining", photoCredit: "Photo credit",
  },
  np: {
    system: "मानव–वन्यजन्तु द्वन्द्व व्यवस्थापन प्रणाली", navAbout: "यस प्लेटफर्मबारे", navGuides: "सुरक्षा सुझाव", navSpecies: "प्रजाति पुस्तकालय", viewLibrary: "प्रजाति पुस्तकालय हेर्नुहोस्", navReport: "खेतको क्षति बताउनुहोस्", language: "English", noticeScope: "सूचना देखाउने क्षेत्र", noticeWard: "वडा", noticeMunicipality: "पालिका",
    eyebrow: "विश्वव्यापी · प्रिमियम क्षेत्रीय प्लेटफर्म · पोखरा नमुना", heroTitle: "सहअस्तित्वका लागि पहिले स्पष्ट जानकारी।", heroBody: "विश्वको जुनसुकै ठाउँबाट वन्यजन्तु देखिएको वा खेतमा परेको असर पठाउनुहोस्। सामुदायिक विवरणले मानव–वन्यजन्तु द्वन्द्व बुझ्न मद्दत गर्छ। पहिलो अध्ययन पोखराका ३३ वटै वडामा बाँदरले बालीमा गर्ने क्षतिमा केन्द्रित छ, वडा २१ बाट सुरु हुँदैछ। अनुसन्धानमा प्रयोग गर्नुअघि प्रत्येक विवरण मानिसले जाँच गर्छ।", capture: "वन्यजन्तुको तस्बिर पठाउनुहोस्", report: "खेतमा परेको असर बताउनुहोस्", pilot: "पोखरा महानगरपालिका · ३३ वडा", pilotNote: "हरेक देशबाट विवरण पठाउन सकिन्छ। पहिलो अध्ययन पोखरा वडा २१ मा केन्द्रित छ; मानिसले जाँच नगरेसम्म कुनै विवरणलाई पुष्टि भएको मानिँदैन।", artAlt: "नेपालमा खिचिएको रिसस मकाक बाँदर", illustration: "क्षेत्रीय सन्दर्भ तस्बिर · गोकर्ण वन, नेपाल", locationLabel: "पहिलो क्षेत्रीय अध्ययन", areaLabel: "पोखरा महानगरपालिका · ३३ वडा", focusLabel: "बालीमा बाँदरको असर · वडा २१ नमुना", noticeSetup: "सार्वजनिक सूचना देखाउने क्षेत्र छान्नुहोस्",
    aboutTitle: "पोखरामा पहिलो अध्ययनसहित विश्वव्यापी विवरण प्लेटफर्म", aboutBody: "जुनसुकै देशबाट वन्यजन्तु वा द्वन्द्वको विवरण पठाउन सकिन्छ। पहिलो अनुसन्धान पोखरा महानगरपालिकाका ३३ वडामा बाँदरले खेतबालीमा पार्ने असरको समय र स्थान बुझ्न केन्द्रित छ, विशेषगरी वडा २१ को नमुना अध्ययनमा। अन्य ठाउँका विवरण पनि स्वागत छन् र तिनको आफ्नै स्थान विवरण राखिन्छ।", howTitle: "यो प्लेटफर्म कसरी चल्छ", howPhoto: "देखेको कुरा पठाउनुहोस्", howPhotoBody: "जुनसुकै ठाउँबाट वन्यजन्तुको तस्बिर पठाउनुहोस् वा बाली तथा पशुधनको क्षति लेख्नुहोस्।", howReview: "मानिसले समीक्षा गर्छन्", howReviewBody: "प्रमाणका रूपमा प्रयोग गर्नुअघि परियोजनाका समीक्षकले विवरण जाँच्छन्।", howLearn: "अनुसन्धानमा सुधार हुन्छ", howLearnBody: "समीक्षा भएका विवरणले हरेक क्षेत्रमा द्वन्द्वको अवस्था र आवश्यक प्रतिक्रियाबारे बुझ्न मद्दत गर्छ।",
    trustTitle: "तपाईंको जानकारी सावधानीपूर्वक प्रयोग हुन्छ", trustOne: "मानिसले विवरण जाँच्छन्", trustOneBody: "परियोजनाको समीक्षकले नजाँचेसम्म फोन र क्यामेराका विवरण अपुष्ट रहन्छन्।", trustTwo: "ठ्याक्कै स्थान सुरक्षित राखिन्छ", trustTwoBody: "ठ्याक्कै GPS स्थान अधिकृत केस समीक्षकले मात्र हेर्न सक्छन्।", trustThree: "स्वचालित प्रतिकार हुँदैन", trustThreeBody: "यो अनुसन्धान नमुना प्रणालीले बत्ती, आवाज वा विद्युतीय उपकरण आफैँ चलाउँदैन।",
    reportTitle: "के भयो हामीलाई बताउनुहोस्", reportBody: "विश्वको जुनसुकै ठाउँबाट वन्यजन्तु द्वन्द्वको विवरण पठाउनुहोस्। पठाउँदा GPS निर्देशाङ्क र उपकरणले देखाएको शुद्धता जाँचिन्छ। देशको नाम आवश्यक छ; अन्य स्थानीय क्षेत्र विवरण जहाँ उपलब्ध छन् त्यहाँ भर्नुहोस्।", reportType: "क्षतिको प्रकार", crop: "बाली क्षति", livestock: "पशुधन क्षति", both: "बाली र पशुधन", other: "अन्य वन्यजन्तु क्षति", cropName: "क्षति भएको बाली", livestockName: "क्षति भएको पशुधन", estimate: "अनुमानित क्षति (वैकल्पिक, नेपाली रुपैयाँ)", details: "के भएको थियो?", detailsPlaceholder: "के क्षति भयो, कहिले भयो र समीक्षा गर्न सहयोग पुग्ने विवरण लेख्नुहोस्। नेपाली रुपैयाँबाहेकको रकम भए मुद्रा सहित यहाँ लेख्नुहोस्।", name: "तपाईंको नाम (वैकल्पिक)", phone: "फोन (वैकल्पिक)", country: "देश", countryPlaceholder: "जस्तै: नेपाल", province: "प्रदेश / राज्य / क्षेत्र (वैकल्पिक)", district: "जिल्ला / काउन्टी (वैकल्पिक)", municipality: "पालिका / सहर (वैकल्पिक)", ward: "वडा / स्थानीय क्षेत्र नम्बर (वैकल्पिक)", area: "टोल, गाउँ वा चिनारीको स्थान (वैकल्पिक)", location: "मेरो स्थान प्रयोग गर्नुहोस्", lookup: "GPS बाट क्षेत्र सुझाव", gpsUnavailable: "स्थान प्राप्त भएको छैन। पठाउन GPS लिनुहोस् वा निर्देशाङ्क आफैँ लेख्नुहोस्।", gpsSecure: "स्थानका लागि सुरक्षित HTTPS वेबसाइट चाहिन्छ। HTTPS ठेगाना खोल्नुहोस् र ब्राउजरमा स्थान अनुमति दिनुहोस्।", gpsPermission: "स्थान अनुमति रोकिएको छ। ब्राउजर वा फोनको सेटिङमा अनुमति दिएर फेरि प्रयास गर्नुहोस् वा निर्देशाङ्क लेख्नुहोस्।", gpsTimeout: "स्थान पत्ता लगाउन ढिलो भयो। बाहिर खुला ठाउँमा फेरि प्रयास गर्नुहोस् वा निर्देशाङ्क लेख्नुहोस्।", gpsTryAgain: "स्थान पत्ता लगाउन सकिएन। फोनको स्थान सेटिङ जाँच्नुहोस् वा निर्देशाङ्क आफैँ लेख्नुहोस्।", manualCoordinates: "वा निर्देशाङ्क आफैँ लेख्नुहोस्", latitude: "अक्षांश", longitude: "देशान्तर", coordinatePair: "अक्षांश र देशान्तर दुवै लेख्नुहोस् वा दुवै खाली छोड्नुहोस्।", coordinateInvalid: "सही निर्देशाङ्क लेख्नुहोस्: अक्षांश −९० देखि ९० र देशान्तर −१८० देखि १८० सम्म।", locationRequired: "स्थान आवश्यक छ। GPS अनुमति दिनुहोस् वा दुवै निर्देशाङ्क आफैँ लेख्नुहोस्।", gpsPrecision: "GPS अनुमानित हुन्छ। देखाइएको शुद्धता जाँचेर पठाउनुअघि स्थान पुष्टि गर्नुहोस्।", geocodeUnavailable: "स्वचालित क्षेत्र खोजी उपलब्ध छैन। कृपया क्षेत्र जाँचेर आफैँ भर्नुहोस्।", geocodeReview: "क्षेत्रका सुझाव अनुमानित हुन सक्छन्। पठाउनुअघि जाँच गर्नुहोस्।", geocodePrivacy: "क्षेत्र सुझाव माग्दा मात्र GPS निर्देशाङ्क कन्फिगर गरिएको खोजी सेवामा पठाइन्छ।", consent: "द्वन्द्व अनुसन्धान र प्रतिक्रियाका लागि अधिकृत परियोजना समीक्षकसँग यो विवरण र स्थान साझा गर्न म सहमत छु।", submit: "समीक्षाका लागि पठाउनुहोस्", sending: "पठाउँदै…", submitted: "धन्यवाद। तपाईंको विवरण मानव समीक्षाका लागि प्राप्त भयो।", reportError: "विवरण पठाउन सकिएन। कृपया फेरि प्रयास गर्नुहोस्।", gpsReady: "स्थान विवरण", gpsAccuracy: "GPS को अनुमानित शुद्धता", required: "आवश्यक", formLocationStatus: "स्थान प्रयोग गरिएको छैन",
    knowledgeEyebrow: "व्यावहारिक सुरक्षा सुझाव", knowledgeTitle: "सुरक्षित रूपमा सहअस्तित्व", knowledgeBody: "समुदायका विवरणबाट स्थानीय टोलीले सिक्दै गर्दा सरल र अहिंसात्मक उपायले जोखिम घटाउन सक्छ।", monkey: "बाँदर", monkeyBody: "खाना र फोहोर छोपेर राख्नुहोस्। बाँदरलाई खाना नदिनुहोस्, नघेर्‍नुहोस् वा नलखेट्नुहोस्; समूह नजिक आए सुरक्षित ठाउँमा जानुहोस्।", elephant: "हात्ती", elephantBody: "टाढै रहनुहोस्, बाटो नछेक्नुहोस् र स्थानीय उद्धार टोलीको निर्देशन पालना गर्नुहोस्।", leopard: "चितुवा", leopardBody: "साँझपख बालबालिका र घरपालुवा जनावरलाई भित्र राख्नुहोस्। जनावर वा ओडार नजिक नजानुहोस्; स्थानीय अधिकारीलाई जानकारी दिनुहोस्।", boar: "बँदेल", boarBody: "सुरक्षित दूरी कायम गर्नुहोस्, बच्चासहितको बँदेल नजिक नजानुहोस् र जनावर देखिए शान्तपूर्वक टाढा जानुहोस्।", helpTitle: "तत्काल जोखिम भएमा", helpBody: "सुरक्षित ठाउँमा जानुहोस् र स्थानीय वडा कार्यालय, प्रहरी वा सम्बन्धित वन्यजन्तु निकायलाई सम्पर्क गर्नुहोस्। यो वेबसाइट आपतकालीन सेवा होइन।",
    researchEyebrow: "मैदानबाट सिकाइ", researchTitle: "अनुसन्धान र समुदायको सिकाइ", researchBody: "पहिलो अध्ययन पोखरा महानगरपालिकामा मानव–बाँदर बाली क्षति विवरणमा केन्द्रित छ। पोखराका ३३ वटै वडाबाट विवरण दिन सकिन्छ; सुरुको क्षेत्रीय अध्ययन वडा २१ मा केन्द्रित छ। अन्य देशबाट आएका विवरण पनि स्वागत छन्।", researchCard: "पोखरा अध्ययनको केन्द्र", researchCardBody: "वडा २१ बाट सुरु गरी पोखराका ३३ वटै वडामा समय, स्थान, बालीको क्षति र प्रतिक्रियाको विवरण राख्नुहोस्।", repository: "अनुसन्धान सामग्री", repositoryBody: "परियोजना टोलीले समीक्षा गरी प्रकाशन गरेपछि स्वीकृत लेख, सारांश र पहिचान हटाइएका घटना प्रतिवेदन यहाँ राखिनेछन्।", status: "समीक्षापछि अनुसन्धान सामग्री थपिनेछ", footer: "विश्वभर मानव–वन्यजन्तु सहअस्तित्वका लागि विवरण प्लेटफर्म।", alertsLabel: "समुदाय सूचना", noNotices: "हाल सार्वजनिक सूचना छैन", dismiss: "सूचना बन्द गर्नुहोस्", noticeLabel: "सार्वजनिक सुरक्षा सूचना", active: "सक्रिय सूचना", menu: "मेनु खोल्नुहोस्", closeMenu: "मेनु बन्द गर्नुहोस्", viewGuides: "सुरक्षा सुझाव हेर्नुहोस्", scroll: "अध्ययनबारे थप जान्नुहोस्", countdownSeconds: "सेकेन्ड बाँकी", photoCredit: "तस्बिर श्रेय",
  },
};

const species = [
  { key: "monkey", image: "/images/species/rhesus_macaque.jpg", source: "https://commons.wikimedia.org/wiki/File:Rhesus_macaque_(Macaca_mulatta)_Gokarna_3.jpg", credit: "Charles J. Sharp · CC BY-SA 4.0" },
  { key: "elephant", image: "/images/species/asian_elephant.jpg", source: "https://commons.wikimedia.org/wiki/File:Asian_Elephant_in_Koshi.jpg", credit: "Aditya Pal · CC BY-SA 4.0" },
  { key: "leopard", image: "/images/species/leopard.jpg", source: "https://commons.wikimedia.org/wiki/File:Panthera_Pardus.jpg", credit: "Adhish Dulal · CC BY-SA 4.0" },
  { key: "boar", image: "/images/species/wild_boar.jpg", source: "https://commons.wikimedia.org/wiki/File:Wild_boar_at_Parsa_Wildlife_Reserve.jpg", credit: "Aditya Pal · CC BY-SA 4.0" },
];

function getReportPrompts(lossType, lang) {
  const nepali = lang === "np";
  const prompts = {
    crop: [
      { id: "when-where", title: nepali ? "घटना कहिले र कहाँ भयो?" : "When and where did it happen?", body: nepali ? "मिति, समय र खेतको ठाउँ सम्झन सजिलो हुने गरी लेख्नुहोस्।" : "Start with the date, time, and part of the farm affected.", outline: nepali ? "घटना भएको मिति र समय: [थाहा भए लेख्नुहोस्]\nखेत वा बाली भएको ठाउँ: [गाउँ / टोल / खेतको भाग]\nबाली र त्यसको अवस्था: [लेख्नुहोस्]\nदेखिएको क्षति: [लेख्नुहोस्]" : "Date and time noticed: [if known]\nFarm or crop location: [village / landmark / part of field]\nCrop and growth stage: [fill in]\nDamage observed: [describe]" },
      { id: "impact", title: nepali ? "क्षतिको असर कति भयो?" : "What was the impact?", body: nepali ? "बालीको प्रकार, क्षति देखिएको भाग र तपाईंले गरेको कुनै सुरक्षित कदम उल्लेख गर्नुहोस्।" : "Describe the crop, visible damage, and any safe action you took.", outline: nepali ? "प्रभावित बाली: [लेख्नुहोस्]\nक्षति देखिएको क्षेत्र वा बोटको संख्या: [अनुमान भए लेख्नुहोस्]\nवन्यजन्तु देखिएको समय वा व्यवहार: [देखेको कुरा मात्र]\nमैले गरेको सुरक्षित कदम: [ऐच्छिक]" : "Crop affected: [fill in]\nArea or number of plants affected: [estimate if known]\nAnimal sighting or behaviour: [only what you observed]\nSafe action taken: [optional]" },
    ],
    livestock: [
      { id: "animal", title: nepali ? "पशुधनको अवस्था बताउनुहोस्" : "Describe what happened to the livestock", body: nepali ? "समय, स्थान र अहिले पशुधन सुरक्षित छ कि छैन भन्ने कुरा लेख्नुहोस्।" : "Include when and where, and whether the animal is safe now.", outline: nepali ? "घटना भएको मिति र समय: [थाहा भए लेख्नुहोस्]\nपशुधनको प्रकार र संख्या: [लेख्नुहोस्]\nघटना भएको ठाउँ: [गाउँ / टोल / खोर]\nअहिलेको अवस्था वा उपचार: [लेख्नुहोस्]" : "Date and time: [if known]\nLivestock type and number: [fill in]\nLocation: [village / landmark / enclosure]\nCurrent condition or care provided: [fill in]" },
      { id: "sequence", title: nepali ? "घटनाको क्रम लेख्नुहोस्" : "Tell the sequence of events", body: nepali ? "जनावर देखिएको थियो कि थिएन, के भयो, र कसलाई जानकारी दिनुभयो भन्ने लेख्नुहोस्।" : "Note what you observed, what happened next, and who you contacted.", outline: nepali ? "घटना हुनुअघि देखेको कुरा: [लेख्नुहोस्]\nके भएको थियो: [आफ्नो शब्दमा]\nसम्पर्क गरिएको व्यक्ति वा निकाय: [ऐच्छिक]\nथप विवरण: [ऐच्छिक]" : "What you observed beforehand: [fill in]\nWhat happened: [in your own words]\nPerson or office contacted: [optional]\nOther details: [optional]" },
    ],
    both: [
      { id: "combined", title: nepali ? "बाली र पशुधन दुवैको असर लेख्नुहोस्" : "Describe crop and livestock impacts", body: nepali ? "कुन असर कहाँ भयो भनेर छुट्टाछुट्टै उल्लेख गर्नुहोस्।" : "List each affected crop or animal and where it happened.", outline: nepali ? "घटना भएको मिति र समय: [थाहा भए लेख्नुहोस्]\nप्रभावित बाली र क्षति: [लेख्नुहोस्]\nप्रभावित पशुधन र अवस्था: [लेख्नुहोस्]\nघटना भएको ठाउँ: [गाउँ / टोल / खेत]\nअहिलेको जोखिम वा सहयोगको आवश्यकता: [ऐच्छिक]" : "Date and time: [if known]\nAffected crop and damage: [fill in]\nAffected livestock and condition: [fill in]\nLocation: [village / landmark / farm]\nCurrent risk or help needed: [optional]" },
      { id: "timeline", title: nepali ? "पहिले र पछि के भयो?" : "What happened before and after?", body: nepali ? "वन्यजन्तु देखिएको समय, क्षतिको क्रम र तपाईंले लिएको सुरक्षित कदम लेख्नुहोस्।" : "Add a short timeline and any safe steps taken.", outline: nepali ? "वन्यजन्तु देखिएको समय: [थाहा भए लेख्नुहोस्]\nपहिले भएको क्षति: [बाली / पशुधन]\nपछि देखिएको असर: [लेख्नुहोस्]\nलिएको सुरक्षित कदम: [ऐच्छिक]" : "Time wildlife was seen: [if known]\nCrop or livestock impact first noticed: [fill in]\nWhat changed afterwards: [fill in]\nSafe steps taken: [optional]" },
    ],
    other: [
      { id: "observation", title: nepali ? "आफूले देखेको कुरा लेख्नुहोस्" : "Describe what you observed", body: nepali ? "जनावर, ठाउँ, समय र देखिएको असर छुट्टाछुट्टै उल्लेख गर्नुहोस्।" : "Separate what you saw from what you think may have happened.", outline: nepali ? "घटना भएको मिति र समय: [थाहा भए लेख्नुहोस्]\nवन्यजन्तु वा देखिएको संकेत: [देखेको कुरा मात्र]\nघटना भएको ठाउँ: [गाउँ / टोल / नजिकको चिन्ह]\nमानिस, बाली वा सम्पत्तिमा परेको असर: [लेख्नुहोस्]" : "Date and time: [if known]\nWildlife or signs observed: [only what you saw]\nLocation: [village / landmark]\nImpact on people, crops, or property: [describe]" },
      { id: "follow-up", title: nepali ? "समीक्षाका लागि थप विवरण" : "Add details that help a review", body: nepali ? "तस्बिर वा अन्य साक्ष्य छ कि छैन र कसलाई जानकारी दिनुभयो भन्ने लेख्नुहोस्।" : "Mention any photo or evidence and whether a local office was informed.", outline: nepali ? "देखिएको वन्यजन्तु: [थाहा भए लेख्नुहोस्]\nघटना भएको मिति, समय र ठाउँ: [लेख्नुहोस्]\nतस्बिर वा अन्य साक्ष्य: [छ / छैन]\nसम्पर्क गरिएको स्थानीय निकाय: [ऐच्छिक]" : "Wildlife involved: [if known]\nDate, time, and location: [fill in]\nPhoto or other evidence: [yes / no]\nLocal office contacted: [optional]" },
    ],
  };
  return prompts[lossType] || prompts.crop;
}

const POKHARA_WARDS = Array.from({ length: 33 }, (_, index) => String(index + 1));
const isPokhara = (value) => /pokhara|पोखरा/iu.test(value || "");

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
  return Math.min(15000, 4000 + (words / (lang === "np" ? 150 : 200)) * 60000);
}

function NoticeBanner({ notice, lang, onDismiss }) {
  const title = lang === "np" ? notice.title_np : notice.title_en;
  const content = lang === "np" ? notice.content_np : notice.content_en;
  const duration = useMemo(() => readDuration({ title, content }, lang), [title, content, lang]);
  const [remaining, setRemaining] = useState(duration);
  useEffect(() => {
    setRemaining(duration);
    const endsAt = Date.now() + duration;
    const timer = window.setInterval(() => {
      const next = Math.max(0, endsAt - Date.now());
      setRemaining(next);
      if (next === 0) onDismiss(notice.id);
    }, 200);
    return () => window.clearInterval(timer);
  }, [duration, notice.id, onDismiss]);

  const remainingSeconds = Math.ceil(remaining / 1000);
  const remainingLabel = new Intl.NumberFormat(lang === "np" ? "ne-NP" : "en").format(remainingSeconds);

  return (
    <aside
      aria-label={lang === "np" ? copy.np.noticeLabel : copy.en.noticeLabel}
      aria-live="polite"
      className={`fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-3xl overflow-hidden rounded-2xl border bg-white shadow-[0_20px_60px_-22px_rgba(15,23,42,.55)] sm:inset-x-6 sm:bottom-3 ${Number(notice.priority) >= 4 ? "border-rose-300" : "border-amber-200"}`}
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className={`mt-0.5 rounded-xl p-2 ${Number(notice.priority) >= 4 ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}><BellRing className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[.13em] text-amber-800">
            <span>{lang === "np" ? copy.np.alertsLabel : copy.en.alertsLabel}</span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-amber-500" />
            {(notice.target_municipality || notice.target_ward) && <span className="inline-flex items-center gap-1 normal-case tracking-normal text-slate-600"><MapPin className="h-3 w-3" />{[notice.target_municipality, notice.target_ward ? `${lang === "np" ? "वडा" : "Ward"} ${notice.target_ward}` : ""].filter(Boolean).join(" · ")}</span>}
            <time dateTime={notice.created_at}>{new Date(notice.created_at).toLocaleTimeString(lang === "np" ? "ne-NP" : "en-NP", { hour: "numeric", minute: "2-digit" })}</time>
            <span className="inline-flex items-center gap-1 text-slate-500" aria-label={`${remainingLabel} ${copy[lang].countdownSeconds}`}><Clock3 className="h-3.5 w-3.5" /><span>{remainingLabel}{lang === "np" ? " से" : "s"}</span></span>
          </div>
          <h2 className="font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">{content}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-100" role="progressbar" aria-label={lang === "np" ? "सूचना देखाउने बाँकी समय" : "Notice time remaining"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((remaining / duration) * 100)}>
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
  const photo = species[0];
  return (
    <figure className="hero-photo-frame relative aspect-[.96/1] min-h-[330px] overflow-hidden rounded-[1.7rem] border border-white/15 shadow-[0_38px_110px_-46px_rgba(0,0,0,.9)] sm:aspect-[1.12/1] sm:min-h-[480px]">
      <img src={photo.image} alt={t.artAlt} loading="eager" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#071b16]/95 via-[#071b16]/5 to-[#071b16]/20" aria-hidden="true" />
      <div className="hero-photo-orbit" aria-hidden="true"><Suspense fallback={null}><WildlifeHero3D /></Suspense></div>
      <div className="absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-3 sm:inset-x-6 sm:top-6">
        <span className="max-w-[78%] rounded-full border border-white/20 bg-[#0b231d]/70 px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-white shadow-sm backdrop-blur sm:text-xs">{t.pilot}</span>
        <span className="rounded-full border border-white/20 bg-[#0b231d]/65 px-3 py-2 text-[10px] font-semibold text-white backdrop-blur">{t.illustration}</span>
      </div>
      <figcaption className="absolute inset-x-4 bottom-4 z-10 rounded-2xl border border-white/15 bg-[#081e18]/75 p-4 text-white shadow-xl backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:p-5">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-lime-200"><MapPin className="h-3.5 w-3.5" />{t.locationLabel}</div>
        <p className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">{t.areaLabel}</p>
        <p className="mt-1 text-xs leading-5 text-white/75">{t.focusLabel}</p>
        <a href={photo.source} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[10px] leading-4 text-white/65 underline decoration-white/35 underline-offset-2 hover:text-white">{t.photoCredit}: {photo.credit}</a>
      </figcaption>
    </figure>
  );
}
export default function PublicLanding() {
  const [lang, setLang] = useState(() => window.localStorage.getItem("nws-public-language") === "np" ? "np" : "en");
  const { toast } = useToast();
  const [notices, setNotices] = useState([]);
  const [noticeWard, setNoticeWard] = useState(() => window.localStorage.getItem("nws-notice-ward-v2") || "");
  const [noticeMunicipality, setNoticeMunicipality] = useState(() => window.localStorage.getItem("nws-notice-municipality-v2") || "");
  const [dismissed, setDismissed] = useState(() => new Set());
  const [mobileNav, setMobileNav] = useState(false);
  const scrollProgressRef = useRef(null);
  const [gps, setGps] = useState(null);
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [locationBusy, setLocationBusy] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [guideRatings, setGuideRatings] = useState(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem("nws-form-guide-feedback-v1") || "{}");
      return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    }
    catch { return {}; }
  });
  const [guideFeedbackMessage, setGuideFeedbackMessage] = useState("");
  const [form, setForm] = useState({
    loss_type: "crop", crop_type: "", livestock_type: "", estimated_loss_npr: "",
    description: "", reporter_name: "", reporter_phone: "", country: "", province: "",
    district: "", municipality: "", ward: "", location_name: "", consent: false,
  });
  const t = copy[lang];
  const guidePrompts = useMemo(() => getReportPrompts(form.loss_type, lang), [form.loss_type, lang]);
  const selectedGuide = [...guidePrompts].sort((left, right) =>
    (guideRatings[`${form.loss_type}:${right.id}`] || 0) - (guideRatings[`${form.loss_type}:${left.id}`] || 0),
  )[0];
  const guideKey = `${form.loss_type}:${selectedGuide.id}`;

  const rateGuide = (rating) => {
    const next = { ...guideRatings, [guideKey]: rating };
    setGuideRatings(next);
    setGuideFeedbackMessage(rating > 0 ? "helpful" : "rotate");
    try { window.sessionStorage.setItem("nws-form-guide-feedback-v1", JSON.stringify(next)); } catch { /* Feedback remains optional if storage is unavailable. */ }
  };

  const insertGuideOutline = () => {
    setForm((prior) => ({ ...prior, description: prior.description.trim() ? `${prior.description.trim()}\n\n${selectedGuide.outline}` : selectedGuide.outline }));
    window.requestAnimationFrame(() => {
      const description = document.getElementsByName("description")[0];
      if (description instanceof HTMLTextAreaElement) description.focus();
    });
  };

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
    window.localStorage.setItem("nws-notice-ward-v2", noticeWard);
    window.localStorage.setItem("nws-notice-municipality-v2", noticeMunicipality);
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
    try {
      const manualPoint = parseManualCoordinates(manualLatitude, manualLongitude);
      let point = manualPoint;
      if (!point) {
        try {
          point = await getPosition();
          setGps(point);
        } catch (error) {
          setLookupMessage(explainLocationError(error, t));
          throw new Error("LOCATION_REQUIRED");
        }
      }
      const payload = {
        ...form,
        consent: form.consent,
        submission_id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        location_name: [form.country.trim() ? `Country: ${form.country.trim()}` : "", form.location_name.trim()].filter(Boolean).join(" · "),
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: point.accuracy ?? null,
        reported_at: new Date().toISOString(),
      };
      await api.public.submitDamageReport(payload);
      setForm((prior) => ({ ...prior, crop_type: "", livestock_type: "", estimated_loss_npr: "", description: "", reporter_name: "", reporter_phone: "", location_name: "", consent: false }));
      setManualLatitude("");
      setManualLongitude("");
      toast({ title: t.submitted, description: point.accuracy == null ? t.gpsReady : `${t.gpsAccuracy}: ±${Math.round(point.accuracy)} m` });
    } catch (error) {
      setFormError(error.message === "COORDINATE_PAIR" || error.message === "COORDINATES_INVALID" ? explainLocationError(error, t)
        : error.message === "LOCATION_REQUIRED" ? t.locationRequired
          : error.message || t.reportError);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="public-landing min-h-screen overflow-x-clip bg-[#fafbf8] pb-24 text-slate-900 selection:bg-emerald-200 selection:text-emerald-950 sm:pb-0">
      <a href="#top" className="skip-to-content">{lang === "np" ? "मुख्य सामग्रीमा जानुहोस्" : "Skip to main content"}</a>
      <header className="public-header sticky top-0 z-40 border-b border-emerald-950/5 bg-[#f8f8f3]/90 backdrop-blur-xl">
        <div ref={scrollProgressRef} className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-lime-500" aria-hidden="true" />
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/login" className="group flex min-w-0 items-center gap-3" aria-label={lang === "np" ? "आधिकारिक लगइन खोल्नुहोस्" : "Open official login"}>
            <PokharaLogo className="h-11 w-11 shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105" />
            <span className="min-w-0"><span className="block max-w-[220px] truncate text-sm font-bold leading-tight text-slate-950 sm:max-w-md">{t.system}</span><span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[.14em] text-emerald-800 sm:text-[10px]">{lang === "np" ? "विश्वव्यापी विवरण · पोखराको पहिलो अध्ययन" : "Global field reports · Pokhara pilot study"}</span></span>
          </Link>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
            <a className="text-sm font-medium text-slate-600 hover:text-emerald-800" href="#about">{t.navAbout}</a>
            <a className="text-sm font-medium text-slate-600 hover:text-emerald-800" href="#guides">{t.navGuides}</a>
            <Link className="text-sm font-medium text-slate-600 hover:text-emerald-800" to={"/species-library?lang=" + lang}>{t.navSpecies}</Link>
            <a className="text-sm font-medium text-slate-600 hover:text-emerald-800" href="#report">{t.navReport}</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setLanguage(lang === "en" ? "np" : "en")} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" aria-label={`Switch language: ${t.language}`}><Globe2 className="h-4 w-4" /><span>{t.language}</span></button>
            <button type="button" onClick={() => setMobileNav((value) => !value)} className="rounded-full p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-expanded={mobileNav} aria-label={mobileNav ? t.closeMenu : t.menu}><Menu className="h-5 w-5" /></button>
          </div>
        </div>
        {mobileNav && <nav className="grid gap-1 border-t border-slate-100 px-5 py-3 lg:hidden"><a onClick={() => setMobileNav(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-50" href="#about">{t.navAbout}</a><a onClick={() => setMobileNav(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-50" href="#guides">{t.navGuides}</a><Link onClick={() => setMobileNav(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-50" to={"/species-library?lang=" + lang}>{t.navSpecies}</Link><a onClick={() => setMobileNav(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-50" href="#report">{t.navReport}</a></nav>}
      </header>

      <main id="top">
        <section className="hero-section relative isolate overflow-hidden bg-[#081c17] text-white">
          <div className="hero-glow absolute inset-0 -z-10" />
          <div className="hero-grid-lines absolute inset-0 -z-10" aria-hidden="true" />
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-12 pt-9 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-14 lg:px-8 lg:pb-24 lg:pt-16">
            <div className="hero-copy">
              <div className="hero-kicker inline-flex max-w-full items-center gap-2 rounded-full border px-3.5 py-2 text-[9px] font-bold uppercase tracking-[.11em] sm:text-[10px]"><span className="h-2 w-2 shrink-0 rounded-full bg-lime-300 ring-4 ring-lime-300/15" />{t.eyebrow}</div>
              <h1 className="mt-5 max-w-3xl text-[clamp(2.55rem,9vw,5rem)] font-semibold leading-[.99] tracking-[-.055em] text-white sm:mt-7">{t.heroTitle}</h1>
              <p className="mt-5 max-w-2xl text-[15px] leading-7 text-emerald-50/75 sm:mt-6 sm:text-lg sm:leading-8">{t.heroBody}</p>
              <div className="mt-6 grid gap-3 sm:mt-8 sm:flex sm:flex-wrap">
                <Link to={`/public-capture?lang=${lang}`} className="group inline-flex min-h-[56px] items-center justify-center gap-2.5 rounded-2xl bg-lime-300 px-5 py-3 text-center text-sm font-bold text-[#10261e] shadow-[0_12px_36px_-16px_rgba(190,242,100,.8)] transition duration-300 hover:-translate-y-0.5 hover:bg-lime-200 active:scale-[.99] sm:rounded-full sm:px-6"><Camera className="h-4 w-4" />{t.capture}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
                <a href="#report" className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[.06] px-5 py-3 text-center text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10 active:scale-[.99] sm:rounded-full sm:px-6">{t.report}<ArrowDown className="h-4 w-4" /></a>
              </div>
              <div className="hero-trust-card mt-6 flex max-w-xl items-start gap-3 rounded-2xl border p-4 text-sm leading-6 sm:mt-8 sm:p-5"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-200/10 text-lime-200"><ShieldCheck className="h-5 w-5" /></span><div><strong className="font-semibold text-white">{t.pilot}</strong><p className="mt-1 text-sm text-emerald-50/70">{t.pilotNote}</p></div></div>
              <a href="#about" className="mt-5 inline-flex min-h-10 items-center gap-2 px-1 text-sm font-semibold text-lime-200 hover:text-white"><span>{t.scroll}</span><ChevronDown className="h-4 w-4 animate-bounce" /></a>
            </div>
            <div className="hero-art relative mx-auto w-full max-w-xl lg:ml-auto"><div className="hero-photo-halo absolute -inset-4 -z-10 rounded-[2rem] blur-2xl" /><PilotIllustration t={t} /></div>
          </div>
          <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 border-t border-white/10 px-4 py-4 text-center sm:px-6 sm:py-5 lg:px-8">
            <div><strong className="block text-sm font-semibold text-white sm:text-base">{lang === "np" ? "विश्वव्यापी" : "Worldwide"}</strong><span className="text-[9px] text-emerald-50/55 sm:text-[10px]">{lang === "np" ? "समुदायका विवरण" : "community reports"}</span></div>
            <div className="border-x border-white/10"><strong className="block text-sm font-semibold text-white sm:text-base">{lang === "np" ? "३३ वडा" : "33 wards"}</strong><span className="text-[9px] text-emerald-50/55 sm:text-[10px]">{lang === "np" ? "पोखरा महानगरपालिका" : "Pokhara Metropolitan City"}</span></div>
            <div><strong className="block text-sm font-semibold text-white sm:text-base">{lang === "np" ? "मानव समीक्षा" : "Human reviewed"}</strong><span className="text-[9px] text-emerald-50/55 sm:text-[10px]">{lang === "np" ? "पुष्टि गर्नुअघि" : "before confirmation"}</span></div>
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
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-4 sm:px-5"><span className="text-xs font-semibold text-slate-500">{t.noticeScope}:</span><label className="grid flex-1 gap-1 text-xs text-slate-600 sm:max-w-xs">{t.noticeMunicipality}<input aria-label={t.noticeMunicipality} value={noticeMunicipality} onChange={(event) => setNoticeMunicipality(event.target.value)} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800" /></label><label className="grid w-36 gap-1 text-xs text-slate-600">{t.noticeWard}<input aria-label={t.noticeWard} list="notice-ward-list" value={noticeWard} onChange={(event) => setNoticeWard(event.target.value.slice(0, 40))} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800" /></label><datalist id="notice-ward-list">{isPokhara(noticeMunicipality) && POKHARA_WARDS.map((ward) => <option key={ward} value={ward} />)}</datalist></div>
            </details>
          </div>
        </section>

        <section id="report" className="scroll-mt-24 bg-[#f0f5ef] py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.75fr_1.25fr] lg:px-8">
            <div className="lg:sticky lg:top-28 lg:self-start"><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">{t.navReport}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t.reportTitle}</h2><p className="mt-4 max-w-md text-sm leading-7 text-slate-600">{t.reportBody}</p><div className="mt-6 rounded-2xl border border-emerald-900/10 bg-white p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><LocateFixed className="h-4 w-4 text-emerald-800" />{t.gpsReady}</div><p className="mt-2 text-xs leading-5 text-slate-600">{gps ? `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)} · ±${Math.round(gps.accuracy)} m` : t.gpsUnavailable}</p>{gps && <a className="mt-1 inline-flex text-xs font-semibold text-emerald-800 underline" href={`https://www.openstreetmap.org/?mlat=${gps.latitude}&mlon=${gps.longitude}#map=18/${gps.latitude}/${gps.longitude}`} target="_blank" rel="noreferrer">{lang === "np" ? "नक्सामा स्थान हेर्नुहोस्" : "Check this point on a map"}</a>}<p className="mt-2 text-xs leading-5 text-slate-500">{t.gpsPrecision}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={locate} disabled={locationBusy} className="rounded-full bg-emerald-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{locationBusy ? "…" : t.location}</button><button type="button" onClick={suggestArea} disabled={locationBusy} className="rounded-full border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{t.lookup}</button></div><p className="mt-2 text-xs leading-5 text-slate-500">{t.geocodePrivacy}</p>{lookupMessage && <p className="mt-2 text-xs text-slate-600" role="status">{lookupMessage}</p>}</div><div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-amber-950"><Clock3 className="h-4 w-4" />{t.helpTitle}</div><p className="mt-2 text-xs leading-5 text-amber-900">{t.helpBody}</p></div></div>
            <div className="space-y-5">
            <aside className="report-guide-card rounded-2xl border p-5 sm:p-6" aria-label={lang === "np" ? "विवरण भर्ने सुझाव" : "Report writing guide"}>
              <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-200/15 text-lime-200"><Sparkles className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-lime-200">{lang === "np" ? "सहज विवरण सहायक" : "FIELD NOTE ASSISTANT"}</p><h3 className="mt-1 text-base font-semibold text-white">{selectedGuide.title}</h3><p className="mt-1 text-sm leading-6 text-emerald-50/70">{selectedGuide.body}</p></div></div>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-3 text-xs leading-6 text-white/70"><pre className="whitespace-pre-wrap font-sans">{selectedGuide.outline}</pre></div>
              <div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={insertGuideOutline} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-lime-200 px-4 text-xs font-bold text-emerald-950 transition hover:bg-lime-100"><Sparkles className="h-3.5 w-3.5" />{lang === "np" ? "यो ढाँचा विवरणमा राख्नुहोस्" : "Use this outline"}</button><span className="text-[11px] text-white/55">{lang === "np" ? "पठाउनुअघि आफ्नै विवरणले कोष्ठक भर्नुहोस्।" : "Replace every bracket with your own details."}</span></div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3"><span className="mr-1 text-[11px] text-white/65">{lang === "np" ? "यो सुझाव उपयोगी छ?" : "Was this prompt useful?"}</span><button type="button" onClick={() => rateGuide(1)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs text-white/80 transition hover:border-lime-200/60 hover:text-lime-100" aria-label={lang === "np" ? "उपयोगी" : "Helpful prompt"}><ThumbsUp className="h-3.5 w-3.5" />{lang === "np" ? "उपयोगी" : "Helpful"}</button><button type="button" onClick={() => rateGuide(-1)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs text-white/80 transition hover:border-amber-200/60 hover:text-amber-100" aria-label={lang === "np" ? "उपयोगी छैन" : "Not helpful"}><ThumbsDown className="h-3.5 w-3.5" />{lang === "np" ? "अर्को सुझाव" : "Try another"}</button></div>
              <p className="mt-2 text-[10px] leading-5 text-white/45" role={guideFeedbackMessage ? "status" : undefined}>{guideFeedbackMessage ? (lang === "np" ? (guideFeedbackMessage === "helpful" ? "धन्यवाद। यो यन्त्रमा तपाईंको रोजाइअनुसार आगामी सुझाव मिलाइनेछ।" : "धन्यवाद। यस सत्रमा अर्को सुझाव पहिले देखाइनेछ।") : (guideFeedbackMessage === "helpful" ? "Thanks. Your choice will prioritize similar prompts on this device." : "Thanks. We’ll show a different prompt first in this session.")) : (lang === "np" ? "तपाईंको प्रतिक्रिया यही ब्राउजरमा मात्रै रहन्छ; घटना विवरण वा व्यक्तिगत जानकारीसँग पठाइँदैन।" : "Feedback stays in this browser session and is not sent with your report or personal details.")}</p>
            </aside>
            <form onSubmit={submitReport} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-48px_rgba(15,23,42,.4)] sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-800 sm:col-span-2">{t.reportType}<select name="loss_type" value={form.loss_type} onChange={update} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="crop">{t.crop}</option><option value="livestock">{t.livestock}</option><option value="both">{t.both}</option><option value="other">{t.other}</option></select></label>
                {(form.loss_type === "crop" || form.loss_type === "both") && <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.cropName}<input name="crop_type" value={form.crop_type} onChange={update} required className="h-11 rounded-xl border border-slate-300 px-3 font-normal" placeholder={lang === "np" ? "जस्तै: मकै" : "e.g. Maize"} /></label>}
                {(form.loss_type === "livestock" || form.loss_type === "both") && <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.livestockName}<input name="livestock_type" value={form.livestock_type} onChange={update} required className="h-11 rounded-xl border border-slate-300 px-3 font-normal" placeholder={lang === "np" ? "जस्तै: बाख्रा" : "e.g. Goat"} /></label>}
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.estimate}<input name="estimated_loss_npr" value={form.estimated_loss_npr} onChange={update} type="number" min="0" step="1" inputMode="numeric" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" placeholder="0" /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.name}<input name="reporter_name" value={form.reporter_name} onChange={update} autoComplete="name" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800 sm:col-span-2">{t.details}<textarea name="description" value={form.description} onChange={update} required rows={3} maxLength={2500} className="rounded-xl border border-slate-300 px-3 py-2.5 font-normal" placeholder={t.detailsPlaceholder} /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.country}<input name="country" value={form.country} onChange={update} required autoComplete="country-name" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" placeholder={t.countryPlaceholder} /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.province}<input name="province" value={form.province} onChange={update} autoComplete="address-level1" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.district}<input name="district" value={form.district} onChange={update} autoComplete="address-level2" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.municipality}<input name="municipality" value={form.municipality} onChange={update} autoComplete="address-level3" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-800">{t.ward}<input name="ward" value={form.ward} onChange={update} list="report-ward-list" className="h-11 rounded-xl border border-slate-300 px-3 font-normal" placeholder={lang === "np" ? "पोखराका लागि १–३३" : "1–33 in Pokhara"} /><datalist id="report-ward-list">{isPokhara(form.municipality) && /nepal|नेपाल/iu.test(form.country) && POKHARA_WARDS.map((ward) => <option key={ward} value={ward} />)}</datalist></label>
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
          </div>
        </section>

        <section id="guides" className="scroll-mt-24 py-16 sm:py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">{t.knowledgeEyebrow}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t.knowledgeTitle}</h2><p className="mt-4 text-sm leading-7 text-slate-600">{t.knowledgeBody}</p><Link to={"/species-library?lang=" + lang} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800">{t.viewLibrary}<ArrowRight className="h-4 w-4" /></Link></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{species.map(({ key, image, source, credit }) => <article key={key} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"><img src={image} alt={t[key]} loading="lazy" decoding="async" className="h-44 w-full bg-slate-100 object-cover transition duration-500 group-hover:scale-[1.03]" /><div className="p-5"><h3 className="text-lg font-semibold">{t[key]}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{t[`${key}Body`]}</p><a href={source} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[10px] leading-4 text-slate-500 underline decoration-slate-300 underline-offset-2">{t.photoCredit}: {credit}</a></div></article>)}</div><p className="mt-3 text-xs text-slate-500">{lang === "np" ? "यी जानकारीमूलक तस्बिर हुन्; प्रयोगकर्ताले पठाएका प्रमाण होइनन्।" : "These are educational reference photos, not user-submitted evidence."}</p></div></section>

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

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><span>{t.footer}</span><a href="https://commons.wikimedia.org/wiki/File:Rhesus_macaque_(Macaca_mulatta)_Gokarna_3.jpg" target="_blank" rel="noreferrer" className="hover:text-emerald-900 hover:underline">{t.photoCredit} · Wikimedia Commons / Creative Commons</a></div></footer>
      <div className="mobile-action-dock fixed inset-x-3 bottom-[calc(.65rem+env(safe-area-inset-bottom))] z-40 grid grid-cols-2 gap-2 rounded-2xl border border-emerald-950/10 bg-white/95 p-2 shadow-[0_14px_36px_-12px_rgba(15,23,42,.35)] backdrop-blur-xl sm:hidden">
        <Link to={`/public-capture?lang=${lang}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-3 text-center text-sm font-semibold text-white active:scale-[.98]"><Camera className="h-4 w-4 shrink-0" />{t.capture}</Link>
        <a href="#report" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-900/15 bg-emerald-50 px-3 text-center text-sm font-semibold text-emerald-950 active:scale-[.98]">{t.report}<ArrowDown className="h-4 w-4 shrink-0" /></a>
      </div>
      <MonkeyCursor />
      {activeNotice && <NoticeBanner notice={activeNotice} lang={lang} onDismiss={dismissNotice} />}
    </div>
  );
}
