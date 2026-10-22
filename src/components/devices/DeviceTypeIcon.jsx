import {
  Cpu, Camera, Video, Wifi, Thermometer, Droplets, CloudRain,
  Activity, Radio, Waves, Sun, MapPin, ToggleRight, Volume2,
  Lightbulb, Speaker, Cog, Satellite, Network, Router, Bluetooth, Server
} from "lucide-react";

export const iconMap = {
  "Raspberry Pi Gateway": Router,
  "AI Camera": Camera,
  "CCTV Camera": Video,
  "IP Camera": Wifi,
  "PTZ Camera": Camera,
  "Thermal Camera": Thermometer,
  "Temperature Sensor": Thermometer,
  "Humidity Sensor": Droplets,
  "Rain Sensor": CloudRain,
  "Motion Sensor": Activity,
  "PIR Sensor": Radio,
  "Ultrasonic Sensor": Waves,
  "Light Sensor": Sun,
  "Soil Moisture Sensor": Droplets,
  "GPS Device": MapPin,
  "Relay Controller": ToggleRight,
  "Smart Switch": ToggleRight,
  "Siren": Volume2,
  "Flashing Light": Lightbulb,
  "Speaker": Speaker,
  "Mechanical Trigger": Cog,
  "AI Controller": Cpu,
  "Edge Gateway": Server,
};

export const categoryColors = {
  gateway: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200" },
  camera: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  sensor: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  deterrent: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  relay: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
  actuator: { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-200" },
  other: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
};

export const statusConfig = {
  online: { label: "Online", color: "bg-emerald-50 text-emerald-600 border-emerald-200", dot: "bg-emerald-500" },
  offline: { label: "Offline", color: "bg-slate-50 text-slate-400 border-slate-200", dot: "bg-slate-300" },
  warning: { label: "Warning", color: "bg-amber-50 text-amber-600 border-amber-200", dot: "bg-amber-500" },
  fault: { label: "Fault", color: "bg-red-50 text-red-600 border-red-200", dot: "bg-red-500" },
  disabled: { label: "Disabled", color: "bg-slate-50 text-slate-400 border-slate-200", dot: "bg-slate-300" },
  maintenance: { label: "Maintenance", color: "bg-blue-50 text-blue-600 border-blue-200", dot: "bg-blue-500" },
};

export const protocolIcons = {
  "MQTT": Radio, "HTTPS REST API": Network, "WebSocket": Wifi, "RTSP": Video,
  "ONVIF": Camera, "Modbus TCP": Cpu, "Bluetooth BLE": Bluetooth,
  "Zigbee": Radio, "LoRa": Satellite, "Ethernet": Network, "Wi-Fi": Wifi,
  "RS485": Cpu, "UART": Cpu, "RTP": Video, "Modbus RTU": Cpu,
};

export function getDeviceIcon(type) {
  return iconMap[type] || Cpu;
}

export function getCategoryColor(category) {
  return categoryColors[category] || categoryColors.other;
}

export default function DeviceTypeIcon({ type, category, className = "w-5 h-5" }) {
  const Icon = getDeviceIcon(type);
  const color = getCategoryColor(category);
  return (
    <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`${className} ${color.text}`} />
    </div>
  );
}