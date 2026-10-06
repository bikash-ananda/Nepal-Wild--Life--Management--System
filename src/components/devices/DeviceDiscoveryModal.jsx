import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Barcode, Keyboard, Wifi, Camera, Radio, Bluetooth, Usb, Cpu, FileUp, Loader2, CheckCircle2, X } from "lucide-react";

const discoveryMethods = [
  { id: "qr", label: "QR Code Scan", icon: QrCode, desc: "Scan device QR code with camera" },
  { id: "barcode", label: "Barcode Scan", icon: Barcode, desc: "Scan device barcode" },
  { id: "manual", label: "Manual Entry", icon: Keyboard, desc: "Enter device details manually" },
  { id: "network", label: "Auto Network Discovery", icon: Wifi, desc: "Scan local network for devices" },
  { id: "onvif", label: "ONVIF Discovery", icon: Camera, desc: "Find ONVIF-compatible cameras" },
  { id: "mqtt", label: "MQTT Discovery", icon: Radio, desc: "Discover MQTT-connected devices" },
  { id: "bluetooth", label: "Bluetooth Discovery", icon: Bluetooth, desc: "Scan for BLE devices" },
  { id: "usb", label: "USB Discovery", icon: Usb, desc: "Detect USB-connected devices" },
  { id: "serial", label: "Serial Port Discovery", icon: Cpu, desc: "Scan serial ports (RS485/UART)" },
  { id: "import", label: "Import Config File", icon: FileUp, desc: "Import from JSON/CSV config" },
];

const mockDiscovered = [
  { name: "UNIARCH Camera 192.168.1.108", device_type: "IP Camera", category: "camera", ip_address: "192.168.1.108", protocol: "RTSP", manufacturer: "UNIARCH" },
  { name: "Raspberry Pi 192.168.1.115", device_type: "Raspberry Pi Gateway", category: "gateway", ip_address: "192.168.1.115", protocol: "MQTT", manufacturer: "Raspberry Pi" },
  { name: "ESP32 Sensor 192.168.1.122", device_type: "Temperature Sensor", category: "sensor", ip_address: "192.168.1.122", protocol: "Wi-Fi", manufacturer: "Espressif" },
];

export default function DeviceDiscoveryModal({ open, onOpenChange, onDeviceFound, onManualEntry }) {
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState([]);
  const [selected, setSelected] = useState(null);
  const [importText, setImportText] = useState("");

  const startScan = (methodId) => {
    if (methodId === "manual") { onManualEntry(); return; }
    if (methodId === "import") { setFound([]); return; }
    setScanning(true);
    setFound([]);
    setSelected(null);
    setTimeout(() => {
      setScanning(false);
      setFound(mockDiscovered.slice(0, Math.floor(Math.random() * 2) + 2));
    }, 2000);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importText);
      onDeviceFound(Array.isArray(data) ? data[0] : data);
    } catch {
      onDeviceFound({ name: "Imported Device", device_type: "Custom Device", category: "other" });
    }
    onOpenChange(false);
    setImportText("");
  };

  const handleSelect = () => {
    if (selected) {
      onDeviceFound(selected);
      onOpenChange(false);
      setFound([]);
      setSelected(null);
    }
  };

  const reset = () => { setFound([]); setSelected(null); setScanning(false); setImportText(""); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Device — Choose Discovery Method</DialogTitle></DialogHeader>

        {found.length === 0 && !scanning && !importText && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {discoveryMethods.map(m => {
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => startScan(m.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center"><Icon className="w-6 h-6 text-slate-600" /></div>
                  <div className="text-xs font-semibold text-slate-700">{m.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">{m.desc}</div>
                </button>
              );
            })}
          </div>
        )}

        {scanning && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <div className="text-sm font-medium text-slate-700">Scanning for devices...</div>
            <div className="text-xs text-slate-400 mt-1">Searching local network</div>
          </div>
        )}

        {found.length > 0 && !scanning && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-700">{found.length} device(s) found</div>
              <Button variant="ghost" size="sm" onClick={reset}><X className="w-4 h-4 mr-1" /> Rescan</Button>
            </div>
            <div className="space-y-2">
              {found.map((d, i) => (
                <button key={i} onClick={() => setSelected(d)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${selected === d ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}>
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center"><Wifi className="w-5 h-5 text-slate-500" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{d.name}</div>
                    <div className="text-xs text-slate-400">{d.device_type} · {d.ip_address} · {d.protocol}</div>
                  </div>
                  {selected === d && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleSelect} disabled={!selected} className="bg-emerald-600 hover:bg-emerald-700">Add Selected Device</Button>
            </div>
          </div>
        )}

        {importText && (
          <div>
            <Label>Paste device configuration (JSON)</Label>
            <textarea className="w-full mt-1 min-h-[200px] p-3 text-xs font-mono rounded-lg border border-slate-200" placeholder='{"name": "My Device", "device_type": "IP Camera", ...}'
              value={importText} onChange={e => setImportText(e.target.value)} />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleImport} className="bg-emerald-600 hover:bg-emerald-700">Import & Add</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}