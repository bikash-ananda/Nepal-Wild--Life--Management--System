import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowRight, BellRing, BookOpen, Camera, ChevronDown, Download,
  CircleHelp, Clock3, Globe2, Leaf, LocateFixed, MapPin, Menu, ShieldCheck,
  UsersRound, ThumbsDown, ThumbsUp, Sparkles, X,
} from "lucide-react";
import { api } from "@/api/apiClient";
import VoiceTranscriptionInput from "@/components/VoiceTranscriptionInput";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/LanguageContext";


const WildlifeHero3D = lazy(() => import("@/components/3d/WildlifeHero3D"));

const copy = {
  en: {
    system: "Nepal Wildlife Management System", installApp: "Install app", installHelpTitle: "Install WAMS", installHelpAndroid: "In Chrome, tap ⋮ (top right) and choose “Install app”. If that option is not shown, choose “Add to Home screen” and confirm.", installHelpIOS: "In Safari, tap Share, then choose “Add to Home Screen”.", installHelpOther: "Use your browser menu to add WAMS to your home screen.", closeInstallHelp: "Close install help", navAbout: "About the project", navGuides: "Wildlife safety", navSpecies: "Wildlife guide", navReport: "Report wildlife conflict", viewLibrary: "Explore the species library", language: "नेपाली", noticeScope: "Show notices for", noticeWard: "Ward", noticeMunicipality: "Municipality",
    eyebrow: "NEPAL · WILDLIFE MONITORING & HUMAN–WILDLIFE COEXISTENCE", heroTitle: "Understand wildlife. Reduce conflict. Support coexistence.", heroBody: "WAMS is a digital platform for wildlife observations, community reporting, research and human–wildlife conflict management. Share what you observe, add a photo and—if you choose—your location, to help build evidence for better decisions.", capture: "Share a wildlife observation", captureShort: "Add photo", report: "Report wildlife-related damage", reportShort: "Report damage", pilot: "Current hardware prototype · Pokhara, Ward 21", pilotNote: "The field prototype is being operated at an agricultural farm in Ward 21, under the plan and financial support of Pokhara Metropolitan City’s Economic Development Division. This is a pilot—not a claim of nationwide deployment.", artAlt: "Rhesus macaque photographed in Nepal", illustration: "FIELD REFERENCE · GOKARNA FOREST, NEPAL", locationLabel: "WILDLIFE REFERENCE", areaLabel: "Nepal · wildlife observation", focusLabel: "Illustrative image · not pilot footage", noticeSetup: "Choose an area for public notices",
    aboutTitle: "A shared evidence platform for people and wildlife", aboutBody: "Human–wildlife conflict takes many forms: crop damage by monkeys, livestock attacks by leopards or jackals, and risks or property damage involving elephants, rhinos and tigers. Farmers, foresters, park and conservation staff, researchers and data analysts can contribute observations. People can share wildlife photos and reports from their locations, including outside Nepal; WAMS is focused on supporting conservation and safer coexistence in Nepal. Current field hardware testing is in Pokhara.", howTitle: "How a community report is used", howPhoto: "1. Share what you observed", howPhotoBody: "Tell us what was affected, when and where. Add a photo only if it is safe; never approach wildlife.", howReview: "2. A reviewer checks the report", howReviewBody: "A project reviewer checks each report. Submissions are not automatically verified or used to identify an animal.", howLearn: "3. Support local research", howLearnBody: "Reviewed reports help researchers understand crop-damage patterns and farmers’ experiences.",
    trustTitle: "Your report, handled with care", trustOne: "Every report is reviewed", trustOneBody: "Reports are checked by a project reviewer before they are used in the study.", trustTwo: "Location and contact details are protected", trustTwoBody: "Only authorized reviewers can access exact GPS coordinates and contact details. Share only what is needed.", trustThree: "This is a reporting and research platform", trustThreeBody: "This is not an emergency-response service. If anyone is in immediate danger, contact local emergency services.",
    reportTitle: "Report wildlife-related damage or conflict", reportBody: "Use this form to report crop damage, livestock loss, property damage or a wildlife-related safety incident. The current hardware pilot focuses on Ward 21, Pokhara, but this form is designed to collect observations from other locations too. Describe what you personally observed; mark uncertainty rather than guessing. Add a location using GPS with your permission or enter coordinates manually.", reportType: "Type of loss", crop: "Crop damage", livestock: "Livestock loss", both: "Crop and livestock", other: "Other wildlife damage", cropName: "Crop affected", livestockName: "Livestock affected", estimate: "Estimated loss (optional, NPR)", details: "What happened?", detailsPlaceholder: "Describe what happened, what was damaged, when you noticed it, and any animal or signs you actually observed. You can dictate your account using the microphone below. If the species is uncertain, say so rather than guessing.", name: "Your name (optional)", phone: "Phone (optional)", country: "Country", countryPlaceholder: "Nepal", province: "Province (optional)", district: "District (optional)", municipality: "Municipality (optional)", ward: "Ward number (optional)", area: "Village, tole or nearby landmark (optional)", location: "Get my current location", lookup: "Fill area details from location", gpsUnavailable: "Location has not been added yet. Use the location button or enter latitude and longitude below before submitting.", gpsSecure: "Location requires a secure HTTPS website. Open this site using its HTTPS address, then allow location access.", gpsPermission: "Location access is blocked. On Android, open Chrome site settings, allow Location for this website, and try again. You can also enter coordinates manually.", gpsTimeout: "Location took too long. Try again outdoors, or enter coordinates manually.", gpsTryAgain: "Could not read your location. Check device location settings or enter coordinates manually.", manualCoordinates: "Or enter coordinates manually", latitude: "Latitude", longitude: "Longitude", coordinatePair: "Enter both latitude and longitude, or leave both blank.", coordinateInvalid: "Enter valid coordinates: latitude −90 to 90, longitude −180 to 180.", locationRequired: "A location is required. Allow GPS or enter both coordinates manually.", gpsPrecision: "GPS can be approximate, especially indoors. Check the map point and accuracy before sending your report.", geocodeUnavailable: "Automatic area lookup is not available. Please verify and enter the area yourself.", geocodeReview: "Area suggestions can be approximate. Please check them before submitting.", geocodePrivacy: "Precise coordinates go to the configured area-lookup provider only when you request a suggestion.", consent: "I agree to share the details and location in this report with authorized project reviewers for research and follow-up.", submit: "Submit report for review", sending: "Sending report…", submitted: "Thank you. Your report has been received and is awaiting review by the project team.", reportError: "We could not send the report. Please try again.", gpsReady: "Location details", gpsAccuracy: "Estimated GPS accuracy", required: "Required",
    knowledgeEyebrow: "FARMER AND COMMUNITY SAFETY", knowledgeTitle: "Practical safety around wildlife", knowledgeBody: "Simple, non-harmful precautions can reduce risk. Never approach, feed, chase or capture wild animals.", monkey: "Monkeys", monkeyBody: "Keep food and waste covered. Avoid feeding, cornering, or chasing monkeys; move indoors if a group approaches.", elephant: "Elephants", elephantBody: "Keep a wide distance, never block a route, and follow instructions from local responders.", leopard: "Leopards", leopardBody: "Bring children and pets indoors at dusk. Do not approach an animal or its den; alert local officials.", boar: "Wild boar", boarBody: "Keep a safe barrier, avoid approaching piglets, and move away calmly if an animal is nearby.", helpTitle: "If anyone is in immediate danger", helpBody: "Move to a safe place and contact your local ward office, police, or the appropriate wildlife authority. This website is not an emergency dispatch service.",
    researchEyebrow: "EVIDENCE, RESEARCH & RESPONSIBLE TECHNOLOGY", researchTitle: "From local observations to better decisions", researchBody: "WAMS brings together community-submitted wildlife photos, incident details, time and permission-based location data. AI and machine-learning tools may assist with image screening and pattern analysis, while reviewers check reports before they are treated as evidence. A photo or model suggestion alone does not confirm a species, population or incident.", researchCard: "Platform capabilities", researchCardBody: "Wildlife photo observations, incident reports, location context, time-based records and research-ready data—subject to consent, review and access controls.", repository: "Technology under study", repositoryBody: "CCTV monitoring, machine-learning-assisted activity screening, farmer notifications and non-lethal deterrent approaches are being explored in the Pokhara prototype. Passive radar and LoRa are also being studied as potential lower-cost ways to extend coverage.", status: "Findings will be published after review", footer: "Nepal Wildlife Management System · Wildlife observation, research and human–wildlife coexistence.", alertsLabel: "Community notice", noNotices: "No active public notices", dismiss: "Dismiss notice", noticeLabel: "Public safety notice", active: "Active notice", menu: "Open menu", closeMenu: "Close menu", viewGuides: "Read safety guides", scroll: "Explore the pilot", countdownSeconds: "seconds remaining", photoCredit: "Photo credit",
  },
  np: {
    system: "नेपाल वन्यजन्तु व्यवस्थापन प्रणाली", installApp: "एप इन्स्टल", installHelpTitle: "WAMS मोबाइलमा राख्नुहोस्", installHelpAndroid: "Chrome मा माथिको ⋮ मेनु थिचेर “Install app” छान्नुहोस्। त्यो विकल्प नदेखिए “Add to Home screen” छानेर पुष्टि गर्नुहोस्।", installHelpIOS: "Safari मा Share थिचेर “Add to Home Screen” छान्नुहोस्।", installHelpOther: "ब्राउजरको मेनुबाट WAMS लाई Home Screen मा थप्नुहोस्।", closeInstallHelp: "निर्देशन बन्द गर्नुहोस्", navAbout: "परियोजनाबारे", navGuides: "वन्यजन्तुबाट सुरक्षित रहने उपाय", navSpecies: "वन्यजन्तु परिचय", viewLibrary: "वन्यजन्तुबारे जान्नुहोस्", navReport: "वन्यजन्तुबाट भएको क्षतिको विवरण", language: "English", noticeScope: "सूचना देखाउने क्षेत्र", noticeWard: "वडा", noticeMunicipality: "पालिका",
    eyebrow: "नेपाल · वन्यजन्तु अनुगमन र मानव–वन्यजन्तु सहअस्तित्व", heroTitle: "वन्यजन्तुलाई बुझौँ। द्वन्द्व घटाऔँ। सहअस्तित्व बढाऔँ।", heroBody: "WAMS वन्यजन्तु अवलोकन, समुदायबाट विवरण सङ्कलन, अनुसन्धान र मानव–वन्यजन्तु द्वन्द्व व्यवस्थापनका लागि विकसित डिजिटल प्लेटफर्म हो। आफूले देखेको घटना र तस्बिर पठाउनुहोस्; अनुमति दिनुभयो भने स्थानसमेत जोडेर तथ्यमा आधारित निर्णयमा सहयोग गर्न सक्नुहुन्छ।", capture: "वन्यजन्तुको अवलोकन पठाउनुहोस्", captureShort: "तस्बिर पठाउनुहोस्", report: "वन्यजन्तुबाट भएको क्षतिको विवरण", reportShort: "क्षति रिपोर्ट", pilot: "हालको हार्डवेयर नमुना परीक्षण · पोखरा वडा नं. २१", pilotNote: "पोखरा महानगरपालिकाको आर्थिक विकास महाशाखाको योजना तथा आर्थिक सहयोगमा वडा नं. २१ स्थित खगराज आचार्यको कृषि फर्ममा हार्डवेयर प्रोटोटाइप सञ्चालनमा छ। यो प्रारम्भिक परीक्षण हो; देशभरि कार्यान्वयन भइसकेको भन्ने अर्थ लाग्दैन।", artAlt: "नेपालमा खिचिएको रिसस मकाक बाँदर", illustration: "क्षेत्रीय सन्दर्भ तस्बिर · गोकर्ण वन, नेपाल", locationLabel: "वन्यजन्तु सन्दर्भ", areaLabel: "नेपाल · वन्यजन्तु अवलोकन", focusLabel: "सन्दर्भ तस्बिर · प्रोटोटाइपको दृश्य होइन", noticeSetup: "सार्वजनिक सूचना देखाउने क्षेत्र छान्नुहोस्",
    aboutTitle: "मानिस र वन्यजन्तुका लागि साझा तथ्य–आधारित प्लेटफर्म", aboutBody: "मानव–वन्यजन्तु द्वन्द्वका स्वरूप फरक–फरक हुन्छन्—बाँदरले बाली नष्ट गर्नु, चितुवा वा स्यालले पशुधनमा आक्रमण गर्नु, तथा हात्ती, गैँडा वा बाघसँग सम्बन्धित जोखिम र क्षति। किसान, वनकर्मी, निकुञ्ज तथा संरक्षणकर्मी, अनुसन्धानकर्ता र तथ्याङ्क विश्लेषकले अवलोकन तथा विवरणमा योगदान दिन सक्छन्। नेपालसहित अन्य स्थानका प्रयोगकर्ताले पनि वन्यजन्तुका तस्बिर र अवलोकन पठाउन सक्छन्; WAMS को मुख्य उद्देश्य नेपालमा संरक्षण र सुरक्षित सहअस्तित्वमा सहयोग गर्नु हो। हालको हार्डवेयर परीक्षण पोखरामा भइरहेको छ।", howTitle: "तपाईंले पठाएको विवरण कसरी प्रयोग हुन्छ?", howPhoto: "१. आफूले देखेको कुरा लेख्नुहोस्", howPhotoBody: "कुन बालीमा, कहिले र कहाँ क्षति भयो लेख्नुहोस्। सुरक्षित भए मात्र तस्बिर थप्नुहोस्; वन्यजन्तुको नजिक नजानुहोस्।", howReview: "२. परियोजनाको टोलीले विवरण जाँच्छ", howReviewBody: "परियोजनाको समीक्षकले विवरण जाँच गर्छन्। विवरण पठाएकै आधारमा घटना पुष्टि वा वन्यजन्तुको पहिचान हुँदैन।", howLearn: "३. स्थानीय अध्ययनमा सहयोग गर्नुहोस्", howLearnBody: "समीक्षा भएका विवरणले क्षतिको ढाँचा र किसानका अनुभव बुझ्न मद्दत गर्छन्।",
    trustTitle: "तपाईंको विवरणको जिम्मेवार व्यवस्थापन", trustOne: "हरेक विवरणको मानवीय समीक्षा", trustOneBody: "अध्ययनमा प्रयोग गर्नुअघि परियोजनाका समीक्षकले विवरण जाँच गर्छन्।", trustTwo: "स्थान र सम्पर्क विवरण सुरक्षित", trustTwoBody: "GPS निर्देशाङ्क र सम्पर्क विवरण अधिकृत समीक्षकले मात्र हेर्न पाउँछन्। आवश्यक जानकारी मात्र दिनुहोस्।", trustThree: "यो विवरण तथा अनुसन्धानको प्लेटफर्म हो", trustThreeBody: "यो आपतकालीन सेवा होइन। कसैको ज्यानमा तत्काल जोखिम भए स्थानीय आपतकालीन निकायलाई सम्पर्क गर्नुहोस्।",
    reportTitle: "वन्यजन्तुबाट भएको क्षति वा द्वन्द्वको विवरण", reportBody: "बाली, पशुधन वा सम्पत्तिमा भएको क्षति तथा वन्यजन्तुसँग सम्बन्धित सुरक्षाको घटनाबारे यहाँ जानकारी दिनुहोस्। हालको हार्डवेयर परीक्षण पोखरा वडा नं. २१ मा केन्द्रित छ, तर यो फारम अन्य स्थानका अवलोकनसमेत सङ्कलन गर्न मिल्ने गरी तयार गरिएको हो। आफूले देखेको कुरा मात्र लेख्नुहोस्; निश्चित नभएको कुरा अनुमान नगरी उल्लेख गर्नुहोस्। अनुमति दिएर GPS स्थान थप्न वा निर्देशाङ्क आफैँ लेख्न सक्नुहुन्छ।", reportType: "क्षतिको प्रकार", crop: "बाली क्षति", livestock: "पशुधन क्षति", both: "बाली र पशुधन", other: "अन्य वन्यजन्तु क्षति", cropName: "क्षति भएको बाली", livestockName: "क्षति भएको पशुधन", estimate: "अनुमानित क्षति (वैकल्पिक, नेपाली रुपैयाँ)", details: "के भएको थियो?", detailsPlaceholder: "के भयो, केमा क्षति पुग्यो, कहिले थाहा पाउनुभयो र कुन वन्यजन्तु वा संकेत प्रत्यक्ष देख्नुभयो भन्ने लेख्नुहोस्। तलको माइक्रोफोन प्रयोग गरेर बोलेर पनि विवरण राख्न सक्नुहुन्छ। प्रजाति निश्चित नभए अनुमान नगरी उल्लेख गर्नुहोस्।", name: "तपाईंको नाम (वैकल्पिक)", phone: "फोन (वैकल्पिक)", country: "देश", countryPlaceholder: "नेपाल", province: "प्रदेश (वैकल्पिक)", district: "जिल्ला (वैकल्पिक)", municipality: "पालिका (वैकल्पिक)", ward: "वडा नम्बर (वैकल्पिक)", area: "टोल, गाउँ वा नजिकको चिनारी (वैकल्पिक)", location: "मेरो हालको स्थान लिनुहोस्", lookup: "स्थानका आधारमा क्षेत्र विवरण भर्नुहोस्", gpsUnavailable: "स्थान थपिएको छैन। स्थान लिने बटन थिच्नुहोस् वा तल अक्षांश र देशान्तर लेख्नुहोस्। विवरण पठाउनुअघि स्थान आवश्यक हुन्छ।", gpsSecure: "स्थानका लागि सुरक्षित HTTPS वेबसाइट चाहिन्छ। HTTPS ठेगाना खोल्नुहोस् र ब्राउजरमा स्थान अनुमति दिनुहोस्।", gpsPermission: "स्थान अनुमति बन्द छ। Android मा Chrome को सेटिङ > साइट सेटिङ > स्थानमा गएर यो वेबसाइटका लागि अनुमति दिनुहोस् र फेरि प्रयास गर्नुहोस्। चाहेमा निर्देशाङ्क आफैँ पनि लेख्न सक्नुहुन्छ।", gpsTimeout: "स्थान पत्ता लगाउन ढिलो भयो। बाहिर खुला ठाउँमा फेरि प्रयास गर्नुहोस् वा निर्देशाङ्क लेख्नुहोस्।", gpsTryAgain: "स्थान पत्ता लगाउन सकिएन। फोनको स्थान सेटिङ जाँच्नुहोस् वा निर्देशाङ्क आफैँ लेख्नुहोस्।", manualCoordinates: "वा निर्देशाङ्क आफैँ लेख्नुहोस्", latitude: "अक्षांश", longitude: "देशान्तर", coordinatePair: "अक्षांश र देशान्तर दुवै लेख्नुहोस् वा दुवै खाली छोड्नुहोस्।", coordinateInvalid: "सही निर्देशाङ्क लेख्नुहोस्: अक्षांश −९० देखि ९० र देशान्तर −१८० देखि १८० सम्म।", locationRequired: "स्थान आवश्यक छ। GPS अनुमति दिनुहोस् वा दुवै निर्देशाङ्क आफैँ लेख्नुहोस्।", gpsPrecision: "विशेषगरी घरभित्र GPS को स्थान केही फरक पर्न सक्छ। नक्सामा देखिएको स्थान र शुद्धता जाँचेर मात्र विवरण पठाउनुहोस्।", geocodeUnavailable: "स्वचालित क्षेत्र खोजी उपलब्ध छैन। कृपया क्षेत्र जाँचेर आफैँ भर्नुहोस्।", geocodeReview: "क्षेत्रका सुझाव अनुमानित हुन सक्छन्। पठाउनुअघि जाँच गर्नुहोस्।", geocodePrivacy: "क्षेत्र सुझाव माग्दा मात्र GPS निर्देशाङ्क कन्फिगर गरिएको खोजी सेवामा पठाइन्छ।", consent: "अनुसन्धान तथा परियोजनाको अनुगमनका लागि यस विवरणमा लेखिएका जानकारी र स्थान अधिकृत परियोजना समीक्षकसँग साझा गर्न म सहमत छु।", submit: "समीक्षाका लागि विवरण पठाउनुहोस्", sending: "पठाउँदै…", submitted: "धन्यवाद। तपाईंको विवरण प्राप्त भयो। अब परियोजनाको टोलीले यसको समीक्षा गर्नेछ।", reportError: "विवरण पठाउन सकिएन। कृपया फेरि प्रयास गर्नुहोस्।", gpsReady: "स्थान विवरण", gpsAccuracy: "GPS को अनुमानित शुद्धता", required: "आवश्यक", 
    knowledgeEyebrow: "किसान तथा समुदायको सुरक्षा", knowledgeTitle: "वन्यजन्तु आसपास अपनाउनुपर्ने सावधानी", knowledgeBody: "खेतबारी र घर वरिपरि जोखिम घटाउन अहिंसात्मक सावधानी अपनाउनुहोस्। वन्यजन्तुको नजिक नजानुहोस्, नखुवाउनुहोस्, नलखेट्नुहोस् र समात्ने प्रयास नगर्नुहोस्।", monkey: "बाँदर", monkeyBody: "खाना र फोहोर छोपेर राख्नुहोस्। बाँदरलाई खाना नदिनुहोस्, नघेर्‍नुहोस् वा नलखेट्नुहोस्; समूह नजिक आए सुरक्षित ठाउँमा जानुहोस्।", elephant: "हात्ती", elephantBody: "टाढै रहनुहोस्, बाटो नछेक्नुहोस् र स्थानीय उद्धार टोलीको निर्देशन पालना गर्नुहोस्।", leopard: "चितुवा", leopardBody: "साँझपख बालबालिका र घरपालुवा जनावरलाई भित्र राख्नुहोस्। जनावर वा ओडार नजिक नजानुहोस्; स्थानीय अधिकारीलाई जानकारी दिनुहोस्।", boar: "बँदेल", boarBody: "सुरक्षित दूरी कायम गर्नुहोस्, बच्चासहितको बँदेल नजिक नजानुहोस् र जनावर देखिए शान्तपूर्वक टाढा जानुहोस्।", helpTitle: "तत्काल जोखिम भएमा", helpBody: "सुरक्षित ठाउँमा जानुहोस् र स्थानीय वडा कार्यालय, प्रहरी वा सम्बन्धित वन्यजन्तु निकायलाई सम्पर्क गर्नुहोस्। यो वेबसाइट आपतकालीन सेवा होइन।",
    researchEyebrow: "तथ्य, अनुसन्धान र जिम्मेवार प्रविधि", researchTitle: "स्थानीय अवलोकनदेखि राम्रो निर्णयसम्म", researchBody: "WAMS ले समुदायले पठाएका वन्यजन्तुका तस्बिर, घटना विवरण, समय र अनुमति लिएर सङ्कलन गरिएको स्थानसम्बन्धी जानकारीलाई एकीकृत गर्ने लक्ष्य राख्छ। AI तथा मेसिन लर्निङले तस्बिरको प्रारम्भिक छानबिन र ढाँचा विश्लेषणमा सहयोग गर्न सक्छन्; विवरणलाई प्रमाण मान्नुअघि समीक्षकले जाँच गर्छन्। एउटा तस्बिर वा मोडेलको सुझावले मात्र प्रजाति, जनसङ्ख्या वा घटना पुष्टि गर्दैन।", researchCard: "प्लेटफर्मका क्षमता", researchCardBody: "वन्यजन्तुका तस्बिर, घटना विवरण, स्थान र समयको सन्दर्भ तथा अनुसन्धानका लागि उपयोगी तथ्याङ्क—सहमति, समीक्षा र पहुँच नियन्त्रणका आधारमा।", repository: "अध्ययन भइरहेका प्रविधि", repositoryBody: "पोखराको प्रोटोटाइपमा CCTV अनुगमन, मेसिन लर्निङबाट गतिविधिको प्रारम्भिक विश्लेषण, किसानलाई सूचना र वन्यजन्तुलाई हानि नगर्ने प्रतिरोधात्मक उपाय परीक्षण भइरहेका छन्। कम लागतमा क्षेत्र विस्तार गर्ने सम्भावनाका लागि passive radar र LoRa प्रविधिको पनि अध्ययन भइरहेको छ।", status: "समीक्षापछि निष्कर्ष प्रकाशित गरिनेछ", footer: "नेपाल वन्यजन्तु व्यवस्थापन प्रणाली · वन्यजन्तु अवलोकन, अनुसन्धान र मानव–वन्यजन्तु सहअस्तित्व।", alertsLabel: "समुदाय सूचना", noNotices: "हाल सार्वजनिक सूचना छैन", dismiss: "सूचना बन्द गर्नुहोस्", noticeLabel: "सार्वजनिक सुरक्षा सूचना", active: "सक्रिय सूचना", menu: "मेनु खोल्नुहोस्", closeMenu: "मेनु बन्द गर्नुहोस्", viewGuides: "सुरक्षा सुझाव हेर्नुहोस्", scroll: "अध्ययनबारे थप जान्नुहोस्", countdownSeconds: "सेकेन्ड बाँकी", photoCredit: "तस्बिर श्रेय",
  },
};

const species = [
  { key: "monkey", image: "/images/species/rhesus_macaque.jpg", source: "https://commons.wikimedia.org/wiki/File:Rhesus_macaque_(Macaca_mulatta)_Gokarna_3.jpg", credit: "Charles J. Sharp · CC BY-SA 4.0" },
  { key: "elephant", image: "/images/species/asian_elephant.jpg", source: "https://commons.wikimedia.org/wiki/File:Asian_Elephant_in_Koshi.jpg", credit: "Aditya Pal · CC BY-SA 4.0" },
  { key: "leopard", image: "/images/species/leopard.jpg", source: "https://commons.wikimedia.org/wiki/File:Panthera_Pardus.jpg", credit: "Adhish Dulal · CC BY-SA 4.0" },
  { key: "boar", image: "/images/species/wild_boar.jpg", source: "https://commons.wikimedia.org/wiki/File:Wild_boar_at_Parsa_Wildlife_Reserve.jpg", credit: "Aditya Pal · CC BY-SA 4.0" },
];
const getDetailedWildlifeGuides = (lang) => {
  const np = lang === "np";
  return [
    {
      id: "rhesus", group: np ? "बाँदरका प्रजाति" : "MONKEY IDENTIFICATION",
      name: np ? "रातो बाँदर / रेसस मकाक" : "Rhesus macaque",
      scientific: "Macaca mulatta", image: "/images/species/rhesus_macaque.jpg", photoCredit: "Charles J. Sharp · CC BY-SA 4.0", photoSource: "https://commons.wikimedia.org/wiki/File:Rhesus_macaque_(Macaca_mulatta)_Gokarna_3.jpg",
      identify: np ? "मध्यम आकार, खैरो–खैरो खैरो शरीर, गुलाबी वा रातो अनुहार र नितम्ब; पुच्छर मध्यम लम्बाइको। प्रायः दिनमा सक्रिय र समूहमा हिँड्ने।" : "Medium-sized macaque with a grey-brown coat, pink to red face and rump, and a medium-length tail. Usually active by day and commonly travels in groups.",
      behaviour: np ? "खाना खोज्दा खेत, घर वरिपरि र वनको किनारमा आउन सक्छ। मकै, आलु, फलफूल, गहुँलगायत बाली खान सक्छ। समूह ठूलो हुँदा एउटै पटक धेरै बोट वा फलमा क्षति देखिन सक्छ।" : "Forages around farms, settlements and forest edges. May eat maize, potatoes, fruit and other crops. A larger foraging party can affect many plants during one visit.",
      action: np ? "खेतको निगरानी पालो मिलाएर गर्नुहोस्; पाकेको बाली समयमै टिप्नुहोस्; अन्न र फोहोर बन्द भाँडोमा राख्नुहोस्; बाँदरलाई खाना नदिनुहोस्। सुरक्षित, मानवीय उपाय समुदायसँग मिलेर अपनाउनुहोस्। ढुङ्गा, गुलेली, विष वा पासो प्रयोग नगर्नुहोस्।" : "Organise shared, rotating field watch; harvest ripe crops promptly; secure grain and waste; never feed macaques. Coordinate humane, safe deterrence with neighbours. Do not use stones, catapults, poison or traps.",
      caution: np ? "समूहको आकार र क्षति ठाउँ, मौसम र बालीअनुसार फरक हुन्छ; फोटोबाट मात्र संख्या अनुमान नगर्नुहोस्।" : "Troop size and damage vary by site, season and crop. Do not infer a population count from a single photo."
    },
    {
      id: "assamese", group: np ? "बाँदरका प्रजाति" : "MONKEY IDENTIFICATION",
      name: np ? "पहाडे बाँदर / आसामी मकाक" : "Assamese macaque",
      scientific: "Macaca assamensis", image: "https://commons.wikimedia.org/wiki/Special:FilePath/Assam_macaque_(Macaca_assamensis_pelops)_male_head_Nagarjun.jpg?width=960", photoCredit: "Charles J. Sharp · CC BY-SA 4.0 · Nagarjun Forest, Nepal", photoSource: "https://commons.wikimedia.org/wiki/File:Assam_macaque_(Macaca_assamensis_pelops)_male_head_Nagarjun.jpg",
      identify: np ? "रेसस मकाकभन्दा प्रायः ठूलो र गाढा खैरो–खरानी रङको देखिन सक्छ। अनुहारको छाला गाढा र पुच्छर छोटो तथा बाक्लो रौँ भएको हुन सक्छ। स्थानीय रङ तथा आकारमा भिन्नता हुन्छ।" : "Often appears larger and darker brown-grey than a rhesus macaque. The face is dark and the tail is relatively short and well-haired. Appearance varies across local populations.",
      behaviour: np ? "पहाडी वन, नदी आसपासका वन र बस्ती नजिकका वन किनारमा देखिन सक्छ। मकै, धान, आलु, कोदो तथा अन्य उपलब्ध खाद्यवस्तु खान सक्छ। यसको वितरण र स्थानीय संख्या सबै क्षेत्रमा समान छैन।" : "Occurs in hill forests, riverine forests and some forest edges near settlements. May feed on maize, rice, potato, millet and other available foods. Distribution and local abundance are uneven.",
      action: np ? "वनको किनारमा रहेका खेतमा सामूहिक निगरानी, बाली समयमै भित्र्याउने, अन्न सुरक्षित राख्ने र फोहोर व्यवस्थापन गर्ने उपाय अपनाउनुहोस्। स्थानीय वन कार्यालयसँग प्रजाति पहिचान र उपयुक्त उपायबारे सल्लाह लिनुहोस्।" : "Use coordinated field watch near forest edges, timely harvesting, secure food storage and proper waste management. Ask the local forest office to confirm identification and recommend site-specific measures.",
      caution: np ? "रेसस मकाकसँग झुक्किन सक्छ। पुच्छर, अनुहार र शरीरको रङ सबै हेर्नुहोस्; शंका भए ‘बाँदरको प्रजाति निश्चित छैन’ छान्नुहोस्।" : "Can be confused with rhesus macaques. Consider the face, tail and overall coat together; if unsure, report ‘macaque species uncertain’."
    },
    {
      id: "langur", group: np ? "बाँदरका प्रजाति" : "MONKEY IDENTIFICATION",
      name: np ? "नेपाल ग्रे लङ्गुर" : "Nepal gray langur",
      scientific: "Semnopithecus schistaceus", image: "/images/species/nepal_gray_langur.jpg", photoCredit: "Aditya Pal · CC BY-SA 4.0", photoSource: "https://commons.wikimedia.org/wiki/File:Nepal_gray_langur_at_Manag.jpg",
      identify: np ? "खरानी वा चाँदीजस्तो रौँ, कालो अनुहार र हातखुट्टा, तथा शरीरभन्दा निकै लामो पुच्छर यसको मुख्य चिनारी हुन्। मकाकभन्दा लामो खुट्टा र पातलो शरीर देखिन्छ।" : "Recognisable by its grey to silvery coat, dark face and limbs, and very long tail. It generally has a more slender build and longer limbs than macaques.",
      behaviour: np ? "धेरैजसो रुखमा बस्ने र पात, कोपिला तथा वनस्पति खाने गर्छ। कहिलेकाहीँ खेत वा फलफूलमा आउन सक्छ, तर सबै लङ्गुरले समान क्षति गर्छन् भन्ने हुँदैन।" : "Mostly arboreal and feeds on leaves, buds and other vegetation. It may sometimes visit fields or orchards, but crop impacts vary by place and season.",
      action: np ? "फलफूल तथा बाली पाक्ने समयमा खेतको किनार निगरानी गर्नुहोस्; बगैँचामा खसेका फल र खुला खाद्यवस्तु व्यवस्थापन गर्नुहोस्; स्थानीय समुदायसँग मिलेर सुरक्षित उपाय अपनाउनुहोस्।" : "Monitor field and orchard edges as crops ripen; collect fallen fruit and secure exposed food; coordinate safe, non-injurious measures with neighbours.",
      caution: np ? "लङ्गुर र मकाकको शरीरको बनोट फरक हुन्छ। टाढाबाट देखिएको जनावरको प्रजाति निश्चित नभए अनुमान नगर्नुहोस्।" : "Langurs have a different body shape from macaques. Do not guess the species from a distant or unclear sighting."
    },
    {
      id: "leopard", group: np ? "ठूला बिराला: चितुवा र बाघ" : "BIG CATS: LEOPARD VS TIGER",
      name: np ? "चितुवा" : "Leopard",
      scientific: "Panthera pardus", image: "/images/species/leopard.jpg", photoCredit: "Adhish dulal · CC BY-SA 4.0", photoSource: "https://commons.wikimedia.org/wiki/File:Panthera_Pardus.jpg",
      identify: np ? "मध्यम आकारको बलियो शरीर, पहेँलो–सुनौलो पृष्ठभूमिमा कालो गुलाफजस्ता धब्बा (rosettes) र लामो पुच्छर। बाघभन्दा सानो र रुख चढ्न निकै सक्षम हुन्छ।" : "A muscular, medium-sized cat with a golden coat covered in dark rosettes. Smaller than a tiger, with a long tail and strong climbing ability.",
      behaviour: np ? "प्रायः एक्लै हिँड्छ र साँझ, रात वा बिहान सक्रिय हुन सक्छ। बाख्रा, भेडा तथा अन्य साना/मध्यम पशुधन जोखिममा पर्न सक्छन्, विशेष गरी असुरक्षित खोरमा।" : "Usually solitary and may be active at dusk, night or dawn. Goats, sheep and other small or medium livestock can be vulnerable, especially in weak night enclosures.",
      action: np ? "पशुधनलाई साँझ पर्नुअघि बलियो खोरमा राख्नुहोस्; ढोका, भित्ता र छाना सुरक्षित बनाउनुहोस्; रातभर खुला चरनमा नछोड्नुहोस्। मृत पशु वा अवशेष खुला नराखी सम्बन्धित निकायको सल्लाह लिनुहोस्।" : "Bring livestock into a strong enclosure before dusk; reinforce doors, walls and roofing; do not leave animals tethered in open fields overnight. Do not leave carcasses exposed; seek local authority advice.",
      caution: np ? "चितुवाको धब्बा बाघको धर्साजस्तो हुँदैन। पदचिह्न वा क्षतिको आधारमा मात्र प्रजाति पुष्टि नगर्नुहोस्।" : "Leopards have rosettes, not a tiger’s stripes. Tracks or livestock remains alone are not enough to confirm the species."
    },
    {
      id: "tiger", group: np ? "ठूला बिराला: चितुवा र बाघ" : "BIG CATS: LEOPARD VS TIGER",
      name: np ? "पाटेबाघ" : "Bengal tiger",
      scientific: "Panthera tigris tigris", image: "/images/species/bengal_tiger.png", photoCredit: "Robirob4433 · CC BY-SA 4.0 · Bardia, Nepal", photoSource: "https://commons.wikimedia.org/wiki/File:Bengal_tiger_walking_in_tall_grass_in_Dalla_Community_Forest,_Bardia,_Nepal.png",
      identify: np ? "चितुवाभन्दा धेरै ठूलो र भारी शरीर, सुनौलो–सुन्तला रङमा स्पष्ट कालो ठाडा धर्सा, ठूलो टाउको र बलिया खुट्टा। प्रत्येक बाघका धर्साको ढाँचा फरक हुन्छ।" : "Much larger and heavier than a leopard, with a powerful body, orange-gold coat and prominent black vertical stripes. Stripe patterns are individual.",
      behaviour: np ? "मुख्यतः तराईका वन, घाँसे मैदान र नदी आसपासका क्षेत्रमा पाइन्छ। ठूलो शिकार गर्ने एक्लो सिकारी हो; पशुधन चराउने वा वनमा घाँस–दाउरा लिन जाने मानिससँग जोखिमपूर्ण भेट हुन सक्छ।" : "Found mainly in the Terai’s forests, grasslands and riverine habitats. A solitary large predator; risk can arise where livestock grazing or forest-resource collection overlaps with tiger habitat.",
      action: np ? "बाघ देखिएको वा ताजा गतिविधि भएको सूचना आएमा वन/निकुञ्जको निर्देशन नआएसम्म जोखिम क्षेत्र नजानुहोस्। वनमा एक्लै नजानुहोस्; पशुधन सुरक्षित खोरमा राख्नुहोस्; स्थानीय सूचना र चेतावनी पालना गर्नुहोस्।" : "If a tiger is sighted or fresh activity is reported, avoid the area until forest or park authorities advise it is safe. Do not enter forests alone; secure livestock at night and follow local alerts.",
      caution: np ? "मानिस वा पशुधनमाथि आक्रमणको जोखिम गम्भीर हुन सक्छ। जनावर खोज्न, पछ्याउन वा घेराबन्दी गर्न नजानुहोस्; तुरुन्त सम्बन्धित वन/निकुञ्ज निकायलाई खबर गर्नुहोस्।" : "An encounter can be dangerous. Never search for, follow or surround the animal; notify the relevant forest or park authority immediately."
    }
  ];
};


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
  const { lang: appLanguage, setLang } = useLanguage();
  const lang = appLanguage === "ne" ? "np" : "en";
  const { toast } = useToast();
  const [notices, setNotices] = useState([]);
  const [noticeWard, setNoticeWard] = useState(() => window.localStorage.getItem("nws-notice-ward-v2") || "21");
  const [noticeMunicipality, setNoticeMunicipality] = useState(() => window.localStorage.getItem("nws-notice-municipality-v2") || "Pokhara Metropolitan City");
  const [dismissed, setDismissed] = useState(() => new Set());
  const [mobileNav, setMobileNav] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const scrollProgressRef = useRef(null);
  const [gps, setGps] = useState(null);
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [locationBusy, setLocationBusy] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [alertSaved, setAlertSaved] = useState(false);
  const [alertProfile, setAlertProfile] = useState(() => { try { return JSON.parse(window.localStorage.getItem("wams-alert-preferences-v1") || "null"); } catch { return null; } });
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
    description: "", reporter_name: "", reporter_phone: "", country: "Nepal", province: "",
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
    document.documentElement.lang = lang === "np" ? "ne-NP" : "en";
  }, [lang]);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches
      || window.navigator.standalone === true;
    setIsAppInstalled(Boolean(standalone));
    setInstallPrompt(window.__wamsDeferredInstallPrompt || null);

    const onPromptAvailable = () => {
      setInstallPrompt(window.__wamsDeferredInstallPrompt || null);
    };
    const onInstalled = () => {
      window.__wamsDeferredInstallPrompt = null;
      setIsAppInstalled(true);
      setInstallPrompt(null);
      setShowInstallHelp(false);
    };
    window.addEventListener("wams-install-prompt-available", onPromptAvailable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("wams-install-prompt-available", onPromptAvailable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

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
    setLang(next === "np" ? "ne" : "en");
  };

  const activeNotice = notices.find((notice) => !dismissed.has(notice.id));

  const handleInstallApp = async () => {
    const promptEvent = installPrompt || window.__wamsDeferredInstallPrompt;
    if (promptEvent?.prompt) {
      window.__wamsDeferredInstallPrompt = null;
      setInstallPrompt(null);
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        setShowInstallHelp(choice?.outcome !== "accepted");
      } catch {
        setShowInstallHelp(true);
      }
      return;
    }
    setShowInstallHelp(true);
  };
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
            <img src="/wams-logo.webp?v=4" alt="Nepal Wildlife Management System logo" width="64" height="64" fetchPriority="high" decoding="async" className="h-14 w-14 shrink-0 rounded-2xl bg-white object-contain p-0.5 shadow-md ring-1 ring-emerald-900/10 transition-transform duration-300 group-hover:scale-105 sm:h-16 sm:w-16" />
            <span className="min-w-0"><span className="block max-w-[220px] truncate text-sm font-bold leading-tight text-slate-950 sm:max-w-md">{t.system}</span><span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[.14em] text-emerald-800 sm:text-[10px]">{lang === "np" ? "नेपाल · वन्यजन्तु व्यवस्थापन" : "NEPAL · WILDLIFE MANAGEMENT"}</span></span>
          </Link>
          <nav className="hidden items-center gap-7 lg:flex" aria-label={lang === "np" ? "मुख्य नेभिगेसन" : "Main navigation"}>
            <a className="text-sm font-medium text-slate-600 hover:text-emerald-800" href="#about">{t.navAbout}</a>
            <a className="text-sm font-medium text-slate-600 hover:text-emerald-800" href="#field-guides">{t.navGuides}</a>
            <Link className="text-sm font-medium text-slate-600 hover:text-emerald-800" to={"/species-library?lang=" + lang}>{t.navSpecies}</Link>
            <a className="text-sm font-medium text-slate-600 hover:text-emerald-800" href="#report">{t.navReport}</a>
            <a className="text-sm font-semibold text-emerald-800 hover:text-emerald-950" href="#early-alerts">{lang === "np" ? "अग्रिम सूचना" : "Early alerts"}</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            
            <button type="button" onClick={() => setLanguage(lang === "en" ? "np" : "en")} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" aria-label={`Switch language: ${t.language}`}><Globe2 className="h-4 w-4" /><span>{t.language}</span></button>
            <button type="button" onClick={() => setMobileNav((value) => !value)} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-emerald-950/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 lg:hidden" aria-expanded={mobileNav} aria-controls="public-mobile-navigation" aria-label={mobileNav ? t.closeMenu : t.menu}>{mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        {showInstallHelp && !isAppInstalled && <div className="border-t border-emerald-950/5 bg-emerald-50 px-4 py-3 sm:px-6"><div className="mx-auto flex max-w-7xl items-start gap-3"><Download className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-emerald-950">{t.installHelpTitle}</p><p className="mt-1 text-sm leading-relaxed text-emerald-900">{/iPad|iPhone|iPod/.test(window.navigator.userAgent) ? t.installHelpIOS : /Android/i.test(window.navigator.userAgent) ? t.installHelpAndroid : t.installHelpOther}</p></div><button type="button" onClick={() => setShowInstallHelp(false)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-emerald-900 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700" aria-label={t.closeInstallHelp}><X className="h-4 w-4" /></button></div></div>}
        {mobileNav && <nav id="public-mobile-navigation" aria-label={lang === "np" ? "मुख्य नेभिगेसन" : "Main navigation"} className="public-mobile-nav grid gap-1 border-t border-emerald-950/5 bg-white/95 px-4 py-3 shadow-[0_16px_28px_-24px_rgba(15,23,42,.35)] backdrop-blur-xl lg:hidden"><a onClick={() => setMobileNav(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900" href="#about">{t.navAbout}</a><a onClick={() => setMobileNav(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900" href="#field-guides">{t.navGuides}</a><Link onClick={() => setMobileNav(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900" to={"/species-library?lang=" + lang}>{t.navSpecies}</Link><a onClick={() => setMobileNav(false)} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900" href="#report">{t.navReport}</a></nav>}
      </header>

      <main id="top">
        <section className="hero-section relative isolate overflow-hidden bg-[#081c17] text-white">
          <div className="hero-glow absolute inset-0 -z-10" />
          <div className="hero-grid-lines absolute inset-0 -z-10" aria-hidden="true" />
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-12 pt-9 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-14 lg:px-8 lg:pb-24 lg:pt-16">
            <div className="hero-copy">
              <div className="hero-kicker inline-flex max-w-full items-center gap-2 rounded-full border px-3.5 py-2 text-[9px] font-bold uppercase tracking-[.11em] sm:text-[10px]"><span className="h-2 w-2 shrink-0 rounded-full bg-lime-300 ring-4 ring-lime-300/15" />{t.eyebrow}</div>
              <h1 className="hero-title mt-5 max-w-3xl text-[clamp(2.55rem,9vw,5rem)] font-semibold leading-[.99] tracking-[-.055em] text-white sm:mt-7">{t.heroTitle}</h1>
              <p className="hero-description mt-5 max-w-2xl text-[15px] leading-7 text-emerald-50/75 sm:mt-6 sm:text-lg sm:leading-8">{t.heroBody}</p>
              <div className="mt-6 grid gap-3 sm:mt-8 sm:flex sm:flex-wrap">
                <Link to={`/public-capture?lang=${lang}`} className="group inline-flex min-h-[56px] items-center justify-center gap-2.5 rounded-2xl bg-lime-300 px-5 py-3 text-center text-sm font-bold text-[#10261e] shadow-[0_12px_36px_-16px_rgba(190,242,100,.8)] transition duration-300 hover:-translate-y-0.5 hover:bg-lime-200 active:scale-[.99] sm:rounded-full sm:px-6"><Camera className="h-4 w-4" />{t.capture}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
                <a href="#report" className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[.06] px-5 py-3 text-center text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10 active:scale-[.99] sm:rounded-full sm:px-6">{t.report}<ArrowDown className="h-4 w-4" /></a>
                <a href="#early-alerts" className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-lime-200/35 bg-lime-200/10 px-5 py-3 text-center text-sm font-semibold text-lime-100 transition hover:bg-lime-200/20 sm:rounded-full sm:px-6"><BellRing className="h-4 w-4" />{lang === "np" ? "अग्रिम सूचना पाउनुहोस्" : "Get early alerts"}</a>
              </div>
              <div className="hero-trust-card mt-6 flex max-w-xl items-start gap-3 rounded-2xl border p-4 text-sm leading-6 sm:mt-8 sm:p-5"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-200/10 text-lime-200"><ShieldCheck className="h-5 w-5" /></span><div><strong className="font-semibold text-white">{t.pilot}</strong><p className="mt-1 text-sm text-emerald-50/70">{t.pilotNote}</p></div></div>
              <a href="#about" className="mt-5 inline-flex min-h-10 items-center gap-2 px-1 text-sm font-semibold text-lime-200 hover:text-white"><span>{t.scroll}</span><ChevronDown className="h-4 w-4 animate-bounce" /></a>
            </div>
            <div className="hero-art relative mx-auto w-full max-w-xl lg:ml-auto"><div className="hero-photo-halo absolute -inset-4 -z-10 rounded-[2rem] blur-2xl" /><PilotIllustration t={t} /></div>
          </div>
          <div className="hero-proof-strip mx-auto grid max-w-7xl grid-cols-3 gap-2 border-t border-white/10 px-4 py-4 text-center sm:px-6 sm:py-5 lg:px-8">
            <div><strong className="block text-sm font-semibold text-white sm:text-base">{lang === "np" ? "नेपाल" : "Nepal"}</strong><span className="text-[9px] text-emerald-50/55 sm:text-[10px]">{lang === "np" ? "दीर्घकालीन परिकल्पना" : "long-term vision"}</span></div>
            <div className="border-x border-white/10"><strong className="block text-sm font-semibold text-white sm:text-base">{lang === "np" ? "वडा २१" : "Ward 21"}</strong><span className="text-[9px] text-emerald-50/55 sm:text-[10px]">{lang === "np" ? "पोखराको हालको नमुना" : "current Pokhara pilot"}</span></div>
            <div><strong className="block text-sm font-semibold text-white sm:text-base">{lang === "np" ? "मानवीय जाँच" : "Human review"}</strong><span className="text-[9px] text-emerald-50/55 sm:text-[10px]">{lang === "np" ? "अध्ययनमा प्रयोग गर्नुअघि" : "before research use"}</span></div>
          </div>
        </section>

        <section id="pilot" className="border-b border-emerald-950/5 bg-[#f5f7f1] py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">{lang === "np" ? "हालको स्थलगत कार्यान्वयन" : "CURRENT FIELD IMPLEMENTATION"}</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{lang === "np" ? "पोखरा महानगरपालिकाको वडा नं. २१ मा हार्डवेयर प्रोटोटाइप" : "Hardware prototype in Pokhara Metropolitan City, Ward No. 21"}</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">{lang === "np" ? "यो प्रोटोटाइप पोखरा महानगरपालिका आर्थिक विकास महाशाखाको योजना तथा आर्थिक सहयोगमा खगराज आचार्यको कृषि फर्ममा विकास तथा सञ्चालन गरिएको हो। यो हालको स्थलगत परीक्षण हो; WAMS को दीर्घकालीन परिकल्पना भने नेपालभर वन्यजन्तु अवलोकन, अनुसन्धान र मानव–वन्यजन्तु द्वन्द्व व्यवस्थापनमा सहयोग गर्ने हो।" : "This hardware prototype was developed and is being operated at the agricultural farm of Mr. Kharagaj Acharya under the plan and financial support of the Economic Development Division, Pokhara Metropolitan City. This is the current field pilot; WAMS has a broader long-term vision for wildlife observation, research and human–wildlife conflict management across Nepal."}</p>
                <p className="mt-3 text-xs leading-6 text-slate-500">{lang === "np" ? "यस पृष्ठमा देखाइएको वन्यजन्तुको तस्बिर सन्दर्भका लागि हो; यो वडा २१ को फार्ममा खिचिएको प्रोटोटाइपको तस्बिर होइन।" : "The wildlife image above is illustrative reference material, not a photograph of the Ward 21 prototype installation."}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-[0_10px_30px_-24px_rgba(16,38,31,.28)]">
                  <Camera className="h-5 w-5 text-emerald-800" />
                  <h3 className="mt-3 font-semibold text-slate-950">{lang === "np" ? "क्यामेरा र प्रारम्भिक विश्लेषण" : "Camera monitoring and screening"}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{lang === "np" ? "CCTV बाट दृश्य सङ्कलन गरी मेसिन लर्निङको सहयोगमा वन्यजन्तुको गतिविधि प्रारम्भिक रूपमा विश्लेषण गर्ने अवधारणा परीक्षण भइरहेको छ। नतिजा समीक्षापछि मात्र प्रयोग गर्नुपर्छ।" : "CCTV footage is collected for machine-learning-assisted screening of possible wildlife activity. Outputs are candidate detections and require human review; they are not guaranteed predictions."}</p>
                </article>
                <article className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-[0_10px_30px_-24px_rgba(16,38,31,.28)]">
                  <BellRing className="h-5 w-5 text-emerald-800" />
                  <h3 className="mt-3 font-semibold text-slate-950">{lang === "np" ? "किसानलाई सूचना र प्रतिरोधात्मक उपाय" : "Farmer alerts and deterrent concepts"}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{lang === "np" ? "साइरन र ध्वनि उपकरण वन्यजन्तुलाई टाढा राख्ने उपायका रूपमा परीक्षण तथा अध्ययनको विषय हुन्। किसानलाई इमेल र WhatsApp/AI आवाजमार्फत सूचना दिने माध्यम प्रस्तावित कार्यप्रवाहमा छन्; तिनको सञ्चालन सम्बन्धित सेवा प्रदायकको एकीकरणमा निर्भर हुन्छ। IoT बाट नियन्त्रण हुने विद्युतीय बार प्रयोग गर्दा प्रमाणित energizer, सही earthing, चेतावनी संकेत, सुरक्षित दूरी र आपतकालीन बन्द गर्ने व्यवस्था सहित लागू विद्युतीय सुरक्षा मापदण्ड पालना अनिवार्य हुन्छ।" : "Siren and sound devices are being explored as deterrents. Email and WhatsApp/AI voice notification channels are part of the intended farmer-alert workflow; their operational availability depends on provider integration and should not be assumed. Any IoT-controlled electric deterrent fence must be designed, installed and operated under applicable electrical safety requirements, with a certified energizer, correct earthing, warning signs, safe clearances and emergency shutoff."}</p>
                </article>
                <article className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-[0_10px_30px_-24px_rgba(16,38,31,.28)] sm:col-span-2">
                  <Globe2 className="h-5 w-5 text-emerald-800" />
                  <h3 className="mt-3 font-semibold text-slate-950">{lang === "np" ? "कम लागतमा क्षेत्र विस्तारको अध्ययन" : "Research into lower-cost wider coverage"}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{lang === "np" ? "CCTV तथा हार्डवेयरको लागत र कभरेज चुनौतीलाई सम्बोधन गर्न passive radar र LoRa प्रविधिको सम्भाव्यता अध्ययन भइरहेको छ। यी प्रविधि अध्ययनको चरणमा छन्; उपलब्ध भइसकेको कार्यक्षमता भनेर बुझ्नु हुँदैन।" : "Passive radar and LoRa are being studied as potential ways to reduce equipment costs and extend coverage. They remain under study and should not be understood as deployed capabilities."}</p>
                </article>
              </div>
            </div>
          </div>
        </section>


        <section id="early-alerts" className="scroll-mt-20 bg-[#102b21] py-14 text-white sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-lime-300">{lang === "np" ? "अग्रिम सूचना प्राथमिकता" : "EARLY-WARNING PREFERENCES"}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{lang === "np" ? "जोखिमबारे समयमै जानकारी पाउन तयार हुनुहोस्" : "Get prepared for local wildlife-risk updates"}</h2>
              <p className="mt-4 text-sm leading-7 text-emerald-50/75">{lang === "np" ? "आफ्नो क्षेत्र र सम्पर्क माध्यम छान्नुहोस्। भविष्यमा उपलब्ध हुने सूचना सेवाका लागि आफ्नो प्राथमिकता तयार गर्न सक्नुहुन्छ।" : "Choose the areas and contact channels that matter to you. Prepare your preferences for the planned local early-warning service."}</p>
              <div className="mt-6 rounded-2xl border border-white/15 bg-white/[.06] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-lime-200"><ShieldCheck className="h-4 w-4" />{lang === "np" ? "स्थान गोपनीयता र सहमति" : "Location privacy and consent"}</div>
                <p className="mt-2 text-xs leading-6 text-emerald-50/70">{lang === "np" ? "GPS अनुमति बिना स्थान प्रयोग हुँदैन। यो पृष्ठले निरन्तर background tracking गर्दैन। अहिले प्राथमिकता यही उपकरणमा मात्र सुरक्षित हुन्छ; वास्तविक SMS, इमेल वा WhatsApp सूचना पठाउने सेवा जोडिएको छैन।" : "GPS is not accessed without browser permission. This page does not continuously track your device in the background. Preferences are stored only on this device; live SMS, email and WhatsApp delivery is not connected yet."}</p>
              </div>
            </div>
            <form className="rounded-[1.75rem] border border-white/10 bg-white p-5 text-slate-900 shadow-2xl sm:p-8" onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const phoneField = event.currentTarget.elements.namedItem("alert_phone");
              const emailValue = String(data.get("alert_email") || "").trim();
              if (!String(data.get("alert_phone") || "").trim() && !emailValue) {
                phoneField.setCustomValidity(lang === "np" ? "फोन नम्बर वा इमेलमध्ये कम्तीमा एउटा राख्नुहोस्।" : "Enter a phone number or email address.");
                phoneField.reportValidity();
                return;
              }
              phoneField.setCustomValidity("");
              const profile = {
                name: String(data.get("alert_name") || "").trim(),
                phone: String(data.get("alert_phone") || "").trim(),
                email: String(data.get("alert_email") || "").trim(),
                province: String(data.get("alert_province") || "").trim(),
                district: String(data.get("alert_district") || "").trim(),
                municipality: String(data.get("alert_municipality") || "").trim(),
                ward: String(data.get("alert_ward") || "").trim(),
                channels: data.getAll("alert_channel"),
                risks: data.getAll("alert_risk"),
                locationConsent: data.get("alert_location") === "on"
              };
              try { window.localStorage.setItem("wams-alert-preferences-v1", JSON.stringify(profile)); setAlertProfile(profile); setAlertSaved(true); }
              catch { setAlertSaved(false); }
            }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">{lang === "np" ? "नाम" : "Your name"}<input name="alert_name" defaultValue={alertProfile?.name || ""} required autoComplete="name" className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-semibold">{lang === "np" ? "फोन नम्बर" : "Phone number"}<input name="alert_phone" defaultValue={alertProfile?.phone || ""} type="tel" autoComplete="tel" className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal" placeholder="+977 ..." /></label>
                <label className="grid gap-1.5 text-sm font-semibold">Email<input name="alert_email" defaultValue={alertProfile?.email || ""} type="email" autoComplete="email" className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal" placeholder="name@example.com" /></label>
                <label className="grid gap-1.5 text-sm font-semibold">{lang === "np" ? "प्रदेश" : "Province"}<input name="alert_province" defaultValue={alertProfile?.province || ""} className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-semibold">{lang === "np" ? "जिल्ला" : "District"}<input name="alert_district" defaultValue={alertProfile?.district || ""} className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-semibold">{lang === "np" ? "पालिका / गाउँपालिका" : "Municipality / Rural municipality"}<input name="alert_municipality" defaultValue={alertProfile?.municipality || ""} className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1.5 text-sm font-semibold">{lang === "np" ? "वडा नं." : "Ward number"}<input name="alert_ward" defaultValue={alertProfile?.ward || ""} inputMode="numeric" className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal" /></label>
                <fieldset className="grid gap-2 sm:col-span-2"><legend className="text-sm font-semibold">{lang === "np" ? "सूचना पाउने माध्यम" : "Preferred notification channels"}</legend><div className="grid grid-cols-3 gap-2 text-sm">{[["email","Email"],["sms","SMS"],["whatsapp","WhatsApp"]].map(([value,label]) => <label key={value} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 px-3"><input type="checkbox" name="alert_channel" value={value} defaultChecked={alertProfile?.channels?.includes(value)} className="h-4 w-4 accent-emerald-800" />{label}</label>)}</div></fieldset>
                <fieldset className="grid gap-2 sm:col-span-2"><legend className="text-sm font-semibold">{lang === "np" ? "कुन जोखिमको सूचना चाहिन्छ?" : "Which wildlife risks interest you?"}</legend><div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">{(lang === "np" ? [["crop","बाली क्षति"],["livestock","पशुधनमा आक्रमण"],["elephant","हात्ती"],["rhino","गैँडा"],["tiger","बाघ"],["leopard","चितुवा"],["monkey","बाँदर"],["other","अन्य"]] : [["crop","Crop damage"],["livestock","Livestock attacks"],["elephant","Elephants"],["rhino","Rhinos"],["tiger","Tigers"],["leopard","Leopards"],["monkey","Monkeys"],["other","Other"]]).map(([value,label]) => <label key={value} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3"><input type="checkbox" name="alert_risk" value={value} defaultChecked={alertProfile?.risks?.includes(value)} className="h-4 w-4 accent-emerald-800" />{label}</label>)}</div></fieldset>
                <label className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-slate-700 sm:col-span-2"><input type="checkbox" name="alert_location" defaultChecked={alertProfile?.locationConsent} className="mt-1 h-4 w-4 accent-emerald-800" /><span>{lang === "np" ? "स्थानमा आधारित सूचना सुविधाका लागि अनुमति मागिएको बेला मात्र उपकरणको स्थान प्रयोग गर्न सहमत छु।" : "I consent to location access only when requested for location-based alerts; this does not enable continuous background tracking."}</span></label>
                <p className="text-xs leading-5 text-slate-500 sm:col-span-2">{lang === "np" ? "फोन वा इमेलमध्ये कम्तीमा एउटा राख्नुहोस्। अहिले विवरण यही ब्राउजरमा मात्र सुरक्षित हुन्छ; वास्तविक सूचना पठाउन backend सेवा सक्रिय गर्न बाँकी छ।" : "Provide at least one contact method. Preferences are currently stored only in this browser; backend activation is still required before alerts can be delivered."}</p>
                <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-bold text-white hover:bg-emerald-800 sm:col-span-2">{lang === "np" ? "सूचना प्राथमिकता सुरक्षित गर्नुहोस्" : "Save alert preferences"}<ArrowRight className="h-4 w-4" /></button>
                {alertSaved && <p role="status" className="text-sm font-semibold text-emerald-800 sm:col-span-2">{lang === "np" ? "प्राथमिकता यो उपकरणमा सुरक्षित भयो। वास्तविक सूचना सेवा अझै सक्रिय छैन।" : "Preferences saved on this device. Live notification delivery is not active yet."}</p>}
              </div>
            </form>
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

        <section id="wildlife-gallery" className="border-y border-emerald-950/5 bg-[#fafbf8] py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">{lang === "np" ? "नेपालका वन्यजन्तु" : "WILDLIFE OF NEPAL"}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{lang === "np" ? "विविध वन्यजन्तु, साझा सहअस्तित्व" : "Diverse wildlife. Shared landscapes."}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{lang === "np" ? "यी तस्बिरहरू वन्यजन्तु परिचयका लागि हुन्। कुनै तस्बिरले आफैँ घटना वा प्रजातिको पुष्टि गर्दैन।" : "These photographs introduce wildlife relevant to human–wildlife coexistence. An image alone does not verify a reported incident or species identification."}</p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {species.map((animal) => (
                <article key={animal.key} className="group overflow-hidden rounded-2xl border border-emerald-950/10 bg-white shadow-[0_16px_36px_-30px_rgba(15,45,32,.45)]">
                  <div className="aspect-[4/5] overflow-hidden bg-emerald-950/5">
                    <img src={animal.image} alt={t[animal.key]} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-semibold text-slate-950">{t[animal.key]}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{t[animal.key + "Body"]}</p>
                    <a href={animal.source} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[10px] font-semibold text-emerald-800 underline underline-offset-2">{lang === "np" ? "तस्बिर स्रोत" : "Photo source"} · {animal.credit}</a>
                  </div>
                </article>
              ))}
            </div>
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
                <div className="grid gap-1.5 text-sm font-medium text-slate-800 sm:col-span-2"><label htmlFor="wams-report-description">{t.details}</label><textarea id="wams-report-description" name="description" value={form.description} onChange={update} required rows={4} maxLength={2500} className="rounded-xl border border-slate-300 px-3 py-2.5 font-normal" placeholder={t.detailsPlaceholder} /><VoiceTranscriptionInput value={form.description} onChange={(value) => setForm((prior) => ({ ...prior, description: value.slice(0, 2500) }))} /><p className="text-xs font-normal leading-5 text-slate-500">{lang === "np" ? "माइक्रोफोन थिचेर नेपाली वा अंग्रेजीमा बोल्नुहोस्। बोलेको कुरा सम्पादन गर्न मिल्ने घटना विवरणमा बदलिन्छ। क्षतिको प्रकार, प्रभावित बाली वा पशुधन र स्थानसम्बन्धी विवरण पनि भर्नुहोस्; फारमले यी सबैलाई संरचित रिपोर्टका रूपमा पठाउँछ। पठाउनुअघि बोलेको टेक्स्ट जाँचेर सच्याउनुहोस्। यो सुविधा ब्राउजर र उपकरणको speech recognition समर्थनमा निर्भर हुन्छ।" : "Tap the microphone and speak in Nepali or English. The transcript becomes editable incident notes. Complete the loss type, affected crop or livestock and location fields; the form submits them together as a structured report. Review and correct the transcript before sending. Speech recognition depends on your browser and device."}</p></div>
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


        <section id="field-guides" className="scroll-mt-24 bg-[#f3f6f0] py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">{lang === "np" ? "किसान र समुदायका लागि व्यवहारिक मार्गदर्शन" : "PRACTICAL GUIDANCE FOR FARMERS & COMMUNITIES"}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{lang === "np" ? "वन्यजन्तु चिन्नुहोस्, सुरक्षित उपाय अपनाउनुहोस्" : "Recognise wildlife. Choose safer responses."}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{lang === "np" ? "नेपालमा देखिने तीन प्रमुख बाँदर समूह—रेसस मकाक, आसामी मकाक र ग्रे लङ्गुर—एकअर्कासँग झुक्किन सक्छन्। चितुवा र बाघ छुट्याउन शरीरको आकार र छालाको ढाँचा हेर्नुहोस्। यी परिचय प्रारम्भिक सहयोगका लागि हुन्; टाढाको फोटोबाट प्रजाति वा संख्या निश्चित हुँदैन।" : "Three primates commonly involved in crop-related reports in Nepal—rhesus macaques, Assamese macaques and gray langurs—can be confused. Distinguish leopards from tigers by overall size and coat pattern. These are field-level clues, not a substitute for expert confirmation from a clear observation."}</p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {getDetailedWildlifeGuides(lang).map((animal) => (
                <article key={animal.id} className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-[0_18px_50px_-38px_rgba(12,40,28,.35)]">
                  {animal.image ? <img src={animal.image} alt={animal.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-52 w-full bg-slate-100 object-cover sm:h-60" /> : <div className="flex h-52 items-center justify-center bg-gradient-to-br from-[#e4ece3] to-[#cbd9c9] sm:h-60"><div className="rounded-full border border-emerald-900/15 bg-white/80 px-5 py-3 text-center"><span className="block text-xs font-bold uppercase tracking-wider text-emerald-800">{lang === "np" ? "पहिचान तुलना" : "IDENTIFICATION NOTE"}</span><span className="mt-1 block text-sm font-semibold text-emerald-950">{lang === "np" ? "रेसससँग तुलना गर्नुहोस्" : "Compare with rhesus macaque"}</span></div></div>}
                  <div className="p-5 sm:p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-800">{animal.group}</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">{animal.name}</h3>
                    <p className="mt-1 text-xs italic text-slate-500">{animal.scientific}</p>\n                    {animal.photoSource && <a href={animal.photoSource} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-[10px] font-medium text-emerald-800 underline underline-offset-2">{lang === "np" ? "तस्बिर श्रेय" : "Photo credit"}: {animal.photoCredit}</a>}
                    <div className="mt-4 space-y-3 text-sm leading-6">
                      <div><p className="font-semibold text-slate-900">{lang === "np" ? "कसरी चिन्ने" : "How to identify"}</p><p className="text-slate-600">{animal.identify}</p></div>
                      <div><p className="font-semibold text-slate-900">{lang === "np" ? "व्यवहार र सम्भावित असर" : "Behaviour and possible impact"}</p><p className="text-slate-600">{animal.behaviour}</p></div>
                      <div className="rounded-2xl bg-emerald-50 p-4"><p className="font-semibold text-emerald-950">{lang === "np" ? "किसानका लागि उपाय" : "Practical steps for farmers"}</p><p className="mt-1 text-emerald-950/80">{animal.action}</p></div>
                      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><strong>{lang === "np" ? "ध्यान दिनुहोस्: " : "Important: "}</strong>{animal.caution}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-6 rounded-3xl bg-[#102b21] p-5 text-white sm:p-7">
              <h3 className="text-lg font-semibold">{lang === "np" ? "चितुवा र बाघ देखिएमा मानिसको सुरक्षा पहिलो प्राथमिकता" : "If a leopard or tiger is sighted, put human safety first"}</h3>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-emerald-50/85 sm:grid-cols-2">
                {(lang === "np" ? ["जनावर नजिक नजानुहोस्, पछ्याउन वा फोटो खिच्न नखोज्नुहोस्।", "बालबालिका र पशुधनलाई सुरक्षित भवन वा बलियो खोरभित्र राख्नुहोस्।", "वन/निकुञ्ज क्षेत्रमा एक्लै नजानुहोस्; स्थानीय चेतावनी पालना गर्नुहोस्।", "ताजा गतिविधि, घाइते जनावर वा आक्रमणबारे सम्बन्धित वन/निकुञ्ज कार्यालयलाई तुरुन्त खबर गर्नुहोस्।"] : ["Do not approach, follow or move closer to take a photograph.", "Move children and livestock to a secure building or strong enclosure.", "Avoid entering forest areas alone and follow local warnings.", "Report fresh activity, an injured animal or an attack promptly to the relevant forest or park office."]).map((tip) => <li key={tip} className="flex gap-2"><span className="text-lime-300">•</span>{tip}</li>)}
              </ul>
              <p className="mt-4 text-xs leading-5 text-emerald-50/65">{lang === "np" ? "यी सामान्य सावधानी हुन्; घटनास्थलको अवस्था र स्थानीय वन्यजन्तु अधिकारीको निर्देशनलाई प्राथमिकता दिनुहोस्। WAMS आपतकालीन उद्धार सेवा होइन।" : "These are general precautions. Follow site-specific instructions from wildlife authorities. WAMS is not an emergency rescue service."}</p>
            </div>
          </div>
        </section>

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
        <Link to={`/public-capture?lang=${lang}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-3 text-center text-sm font-semibold text-white active:scale-[.98]"><Camera className="h-4 w-4 shrink-0" />{t.captureShort}</Link>
        <a href="#report" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-900/15 bg-emerald-50 px-3 text-center text-sm font-semibold text-emerald-950 active:scale-[.98]">{t.reportShort}<ArrowDown className="h-4 w-4 shrink-0" /></a>
      </div>
      {!isAppInstalled && <div className="fixed bottom-28 right-4 z-[60] sm:bottom-6 sm:right-6"><button type="button" onClick={handleInstallApp} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-lime-300/30 bg-emerald-950 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_35px_-10px_rgba(6,78,59,.65)] transition hover:-translate-y-0.5 hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" aria-label={t.installApp}><Download className="h-4 w-4" /><span>{t.installApp}</span></button></div>}
      <MonkeyCursor />
      {activeNotice && <NoticeBanner notice={activeNotice} lang={lang} onDismiss={dismissNotice} />}
    </div>
  );
}
