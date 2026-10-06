import {
  LayoutDashboard, MapPin, Camera, Activity, Target,
  Zap, FileBarChart, Map, Shield, Brain, Workflow,
  Cpu, Settings, Phone, Globe, BarChart3, FileSpreadsheet, Scale,
  Users, Cable, Bell, Leaf, LineChart, ShieldAlert, Swords, Eye, Footprints, Fingerprint, History, Gamepad2, Trophy, ListOrdered, Route
} from "lucide-react";

const ALL_ROLES = [
  "super_admin", "wildlife_admin", "government_officer",
  "technical_operator", "farm_owner", "farm_worker",
  "admin", "user"
];

const ADMIN_ROLES = [
  "super_admin", "wildlife_admin", "government_officer", "admin"
];

const TECH_ROLES = [
  "super_admin", "wildlife_admin", "technical_operator", "admin"
];

export const navGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard, roles: ALL_ROLES },
      { label: "Live Map", path: "/map", icon: Map, roles: ALL_ROLES },
      { label: "Analytics", path: "/analytics", icon: BarChart3, roles: ["super_admin", "wildlife_admin", "government_officer", "admin", "user"] },
      { label: "Detection Trends", path: "/detection-trends", icon: LineChart, roles: ALL_ROLES },
      { label: "Site Comparison", path: "/site-comparison", icon: Scale, roles: ["super_admin", "wildlife_admin", "government_officer", "admin", "user"] },
      { label: "Leaderboard", path: "/leaderboard", icon: Trophy, roles: ALL_ROLES },
    ],
  },
  {
    label: "Wildlife",
    items: [
      { label: "Detections", path: "/detections", icon: Target, roles: ALL_ROLES },
      { label: "Incidents", path: "/incidents", icon: ShieldAlert, roles: ALL_ROLES },
      { label: "HWC Cases", path: "/hwc", icon: Swords, roles: ALL_ROLES },
      { label: "Field Capture", path: "/field-capture", icon: Camera, roles: ALL_ROLES },
      { label: "Sightings", path: "/sightings", icon: Eye, roles: ALL_ROLES },
      { label: "Individuals", path: "/individuals", icon: Fingerprint, roles: ALL_ROLES },
      { label: "Sighting History", path: "/sighting-history", icon: History, roles: ALL_ROLES },
      { label: "Movement Map", path: "/movement-map", icon: Route, roles: ALL_ROLES },
      { label: "National Wildlife", path: "/national-wildlife", icon: Globe, roles: ALL_ROLES },
      { label: "Patrols", path: "/patrols", icon: Footprints, roles: ALL_ROLES },
      { label: "Alerts", path: "/notifications", icon: Bell, roles: ALL_ROLES },
      { label: "Predictions", path: "/predictions", icon: Brain, roles: ["super_admin", "wildlife_admin", "government_officer", "admin", "user"] },
      { label: "Decision Engine", path: "/decision-engine", icon: Zap, roles: ADMIN_ROLES },
      { label: "AI Response", path: "/ai-response", icon: Shield, roles: ["super_admin", "wildlife_admin", "admin", "user"] },
      { label: "Deterrents", path: "/deterrents", icon: Zap, roles: TECH_ROLES.concat(["user"]) },
      { label: "Automation", path: "/automation", icon: Workflow, roles: ADMIN_ROLES },
    ],
  },
  {
    label: "AI & Learning",
    items: [
      { label: "AI Verify", path: "/ai-verification", icon: Brain, roles: ["super_admin", "wildlife_admin", "admin", "user"] },
      { label: "Verification Game", path: "/verification-game", icon: Gamepad2, roles: ALL_ROLES },
      { label: "Expert Review", path: "/expert-review", icon: ListOrdered, roles: ADMIN_ROLES },
      { label: "Self-Learning", path: "/ai-self-learning", icon: Brain, roles: ADMIN_ROLES },
      { label: "AI Models", path: "/ai-models", icon: Cpu, roles: TECH_ROLES },
      { label: "Dataset Builder", path: "/dataset-builder", icon: Cpu, roles: ADMIN_ROLES },
      { label: "Species Learning", path: "/species-learning", icon: Cpu, roles: ADMIN_ROLES },
      { label: "Knowledge Base", path: "/knowledge-base", icon: Globe, roles: ["super_admin", "wildlife_admin", "government_officer", "admin", "user"] },
    ],
  },
  {
    label: "Farms & Devices",
    items: [
      { label: "Farms", path: "/sites", icon: Leaf, roles: ALL_ROLES },
      { label: "Cameras", path: "/cameras", icon: Camera, roles: TECH_ROLES.concat(["user"]) },
      { label: "Sensors", path: "/sensors", icon: Activity, roles: TECH_ROLES.concat(["user"]) },
      { label: "Devices", path: "/devices", icon: Cpu, roles: TECH_ROLES.concat(["user"]) },
      { label: "Device Dashboard", path: "/device-dashboard", icon: LayoutDashboard, roles: TECH_ROLES },
      { label: "Edge Devices", path: "/edge-devices", icon: Cpu, roles: TECH_ROLES },
      { label: "Device Admin", path: "/device-admin", icon: Settings, roles: ["super_admin", "technical_operator", "admin"] },
      { label: "Device Setup", path: "/device-setup", icon: Settings, roles: ["super_admin", "technical_operator", "admin"] },
    ],
  },
  {
    label: "Team & Administration",
    items: [
      { label: "Team", path: "/team", icon: Users, roles: ALL_ROLES },
      { label: "API & Integrations", path: "/api-integrations", icon: Cable, roles: ADMIN_ROLES },
      { label: "Reports", path: "/reports", icon: FileBarChart, roles: ["super_admin", "wildlife_admin", "government_officer", "admin", "user"] },
      { label: "Detection Reports", path: "/detection-reports", icon: FileSpreadsheet, roles: ["super_admin", "wildlife_admin", "government_officer", "admin", "user"] },
      { label: "Voice Bot", path: "/voice-bot", icon: Phone, roles: ["super_admin", "wildlife_admin", "admin", "user"] },
    ],
  },
];

export const roleLabels = {
  super_admin: "Super Admin",
  wildlife_admin: "Wildlife Admin",
  government_officer: "Gov. Officer",
  technical_operator: "Tech Operator",
  farm_owner: "Farm Owner",
  farm_worker: "Farm Worker",
  admin: "Administrator",
  user: "Operator",
};

export function canAccessNav(userRole, allowedRoles) {
  if (!userRole) return true;
  if (allowedRoles.includes(userRole)) return true;
  // Legacy roles get full access for backward compatibility
  if (userRole === "admin" || userRole === "user") return true;
  return false;
}

export function getFilteredNavGroups(userRole) {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessNav(userRole, item.roles)),
    }))
    .filter((group) => group.items.length > 0);
}

export const mobileNavItems = [
  { label: "Home", path: "/", icon: LayoutDashboard },
  { label: "Capture", path: "/field-capture", icon: Camera },
  { label: "Map", path: "/map", icon: Map },
  { label: "Alerts", path: "/notifications", icon: Bell },
  { label: "Team", path: "/team", icon: Users },
];