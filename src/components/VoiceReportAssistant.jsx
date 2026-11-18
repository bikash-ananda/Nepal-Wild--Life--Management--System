import React, { useEffect, useRef, useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

// Conservative extraction: only populate fields when the spoken words contain
// an explicit, supported phrase. Unknown species, quantities and locations stay blank.
export function extractReportFields(transcript) {
  const text = String(transcript || "").trim();
  const lower = text.toLocaleLowerCase();
  const result = { description: text.slice(0, 2500) };
  if (/(बाली|मकै|धान|गहुँ|कोदो|आलु|तरकारी|फलफूल|crop|maize|corn|rice|wheat|potato)/i.test(text)) result.loss_type = "crop";
  if (/(बाख्रा|गाई|भैँसी|भेडा|कुखुरा|पशुधन|livestock|goat|cow|buffalo|sheep|poultry)/i.test(text)) {
    result.loss_type = result.loss_type === "crop" ? "both" : "livestock";
  }
  const crops = [["मकै","मकै"],["धान","धान"],["गहुँ","गहुँ"],["कोदो","कोदो"],["आलु","आलु"],["maize","Maize"],["corn","Corn"],["rice","Rice"],["wheat","Wheat"],["potato","Potato"]];
  const crop = crops.find(([needle]) => lower.includes(needle.toLocaleLowerCase()));
  if (crop) result.crop_type = crop[1];
  const livestock = [["बाख्रा","बाख्रा"],["गाई","गाई"],["भैँसी","भैँसी"],["भेडा","भेडा"],["कुखुरा","कुखुरा"],["goat","Goat"],["cow","Cow"],["buffalo","Buffalo"],["sheep","Sheep"]];
  const animal = livestock.find(([needle]) => lower.includes(needle.toLocaleLowerCase()));
  if (animal) result.livestock_type = animal[1];
  const ward = text.match(/(?:वडा|ward)\s*(?:नम्बर|नं\.?|no\.?|number)?\s*(\d{1,2})/i);
  if (ward) result.ward = ward[1];
  const municipality = text.match(/(पोखरा महानगरपालिका|पोखरा|Pokhara Metropolitan City|Pokhara)/i);
  if (municipality) result.municipality = municipality[1];
  const money = text.match(/(?:रु\.?|रुपैयाँ|रुपियाँ|npr|rs\.?|रू)\s*([\d,]+)/i);
  if (money) result.estimated_loss_npr = money[1].replace(/,/g, "");
  return result;
}

export default function VoiceReportAssistant({ lang = "np", onApply }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const nepali = lang === "np";
  useEffect(() => () => recognitionRef.current?.abort(), []);
  const start = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) { setError(nepali ? "यो ब्राउजरमा आवाज पहिचान उपलब्ध छैन। तल लेखेर विवरण दिन सक्नुहुन्छ।" : "Speech recognition is not supported in this browser. You can type below."); return; }
    setError("");
    const recognition = new SpeechRecognition();
    recognition.lang = nepali ? "ne-NP" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const spoken = Array.from(event.results || []).slice(event.resultIndex || 0).map((r) => r[0]?.transcript || "").join(" ").trim();
      if (spoken) setTranscript((prior) => [prior, spoken].filter(Boolean).join(" ").slice(0, 2500));
    };
    recognition.onerror = (event) => { setError(event.error === "not-allowed" ? (nepali ? "माइक्रोफोन अनुमति दिनुहोस्।" : "Please allow microphone access.") : (nepali ? "आवाज बुझ्न सकिएन। फेरि प्रयास गर्नुहोस्।" : "Could not recognize speech. Please try again.")); setListening(false); };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); } catch { setError(nepali ? "माइक्रोफोन सुरु भएन।" : "Could not start microphone."); }
  };
  const apply = () => { if (!transcript.trim()) return; onApply?.(extractReportFields(transcript)); };
  return <section className="mt-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-4 sm:p-5">
    <div className="flex items-center gap-2 text-emerald-950"><Sparkles className="h-5 w-5"/><h3 className="text-base font-extrabold">{nepali ? "बोलेर रिपोर्ट तयार गर्नुहोस्" : "Create report by speaking"}</h3></div>
    <p className="mt-1 text-sm leading-6 text-slate-700">{nepali ? "घटना आफ्नै भाषामा भन्नुहोस्—केमा क्षति भयो, कहिले, कहाँ र कति भयो। बोलेको विवरणबाट चिनिएका बाली, पशुधन, वडा र रकमका क्षेत्र आफैँ भरिन्छन्। नबुझिएको कुरा अनुमान गरिँदैन।" : "Describe what happened, when, where and what was damaged. Recognized crop, livestock, ward and stated amount fields are filled automatically; unknown details are never guessed."}</p>
    <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={listening ? () => recognitionRef.current?.stop() : start} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-xl px-5 text-base font-bold text-white shadow-md ${listening ? "bg-rose-700" : "bg-emerald-700 hover:bg-emerald-800"}`}><span className="text-xl">{listening ? "■" : "🎙"}</span>{listening ? (nepali ? "बोल्न रोक्नुहोस्" : "Stop speaking") : (nepali ? "बोल्न सुरु गर्नुहोस्" : "Start speaking")}</button><button type="button" onClick={() => { setTranscript(""); setError(""); }} className="min-h-14 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">{nepali ? "मेटाउनुहोस्" : "Clear"}</button></div>
    {error && <p role="status" className="mt-2 text-sm font-medium text-amber-800">{error}</p>}
    <label className="mt-3 block text-sm font-semibold text-slate-800">{nepali ? "तपाईंले बोल्नुभएको विवरण (जाँचेर सच्याउन सक्नुहुन्छ)" : "Your spoken account (review and edit)"}
      <textarea value={transcript} onChange={(e) => setTranscript(e.target.value.slice(0,2500))} rows={4} maxLength={2500} className="mt-1 w-full rounded-xl border border-emerald-200 bg-white p-3 text-sm font-normal leading-6" placeholder={nepali ? "मकैबारीमा बाँदर आएर क्षति गरे..." : "Monkeys damaged my maize field..."} />
    </label>
    <button type="button" onClick={apply} disabled={!transcript.trim()} className="mt-3 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-950 px-5 text-base font-extrabold text-white disabled:opacity-40"><CheckCircle2 className="h-5 w-5"/>{nepali ? "रिपोर्टका विवरण भर्नुहोस्" : "Fill report fields"}</button>
    <p className="mt-2 text-xs leading-5 text-slate-600">{nepali ? "भरिएका विवरणहरू फारममा देखिन्छन्। सबै कुरा जाँचेर, आवश्यक कुरा सच्याएर मात्र पठाउनुहोस्।" : "Extracted fields appear in the form. Review and correct everything before submitting."}</p>
  </section>;
}
