import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
const Home = lazy(() => import('@/pages/Home'));
const Sites = lazy(() => import('@/pages/Sites'));
const Cameras = lazy(() => import('@/pages/Cameras'));
const CameraDetail = lazy(() => import('@/pages/CameraDetail'));
const CameraLive = lazy(() => import('@/pages/CameraLive'));
const Sensors = lazy(() => import('@/pages/Sensors'));
const Detections = lazy(() => import('@/pages/Detections'));
const DecisionEngine = lazy(() => import('@/pages/DecisionEngine'));
const Reports = lazy(() => import('@/pages/Reports'));
const MapView = lazy(() => import('@/pages/MapView'));
const AIResponseEngine = lazy(() => import('@/pages/AIResponseEngine'));
const Predictions = lazy(() => import('@/pages/Predictions'));
const Deterrents = lazy(() => import('@/pages/Deterrents'));
const AutomationRules = lazy(() => import('@/pages/AutomationRules'));
const EdgeDevices = lazy(() => import('@/pages/EdgeDevices'));
const DeviceManager = lazy(() => import('@/pages/DeviceManager'));
const DeviceDetail = lazy(() => import('@/pages/DeviceDetail'));
const DeviceDashboard = lazy(() => import('@/pages/DeviceDashboard'));
const DeviceAdmin = lazy(() => import('@/pages/DeviceAdmin'));
const DeviceSetupWizard = lazy(() => import('@/pages/DeviceSetupWizard'));
const AIVerification = lazy(() => import('@/pages/AIVerification'));
const AIModels = lazy(() => import('@/pages/AIModels'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const VoiceBot = lazy(() => import('@/pages/VoiceBot'));
const KnowledgeBase = lazy(() => import('@/pages/KnowledgeBase'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const DatasetBuilder = lazy(() => import('@/pages/DatasetBuilder'));
const SpeciesLearning = lazy(() => import('@/pages/SpeciesLearning'));
const AISelfLearning = lazy(() => import('@/pages/AISelfLearning'));
const DetectionReports = lazy(() => import('@/pages/DetectionReports'));
const SiteComparison = lazy(() => import('@/pages/SiteComparison'));
const DetectionTrends = lazy(() => import('@/pages/DetectionTrends'));
const Team = lazy(() => import('@/pages/Team'));
const TeamMemberDetail = lazy(() => import('@/pages/TeamMemberDetail'));
const AddTeamMember = lazy(() => import('@/pages/AddTeamMember'));
const ApiIntegrations = lazy(() => import('@/pages/ApiIntegrations'));
const Incidents = lazy(() => import('@/pages/Incidents'));
const IncidentDetail = lazy(() => import('@/pages/IncidentDetail'));
const Hwc = lazy(() => import('@/pages/Hwc'));
const HwcDetail = lazy(() => import('@/pages/HwcDetail'));
const Sightings = lazy(() => import('@/pages/Sightings'));
const Patrols = lazy(() => import('@/pages/Patrols'));
const PatrolDetail = lazy(() => import('@/pages/PatrolDetail'));
const Individuals = lazy(() => import('@/pages/Individuals'));
const IndividualDetail = lazy(() => import('@/pages/IndividualDetail'));
const SightingHistory = lazy(() => import('@/pages/SightingHistory'));
const MovementMap = lazy(() => import('@/pages/MovementMap'));
const FieldCapture = lazy(() => import('@/pages/FieldCapture'));
const PublicCapture = lazy(() => import('@/pages/PublicCapture'));
const PublicLanding = lazy(() => import('@/pages/PublicLanding'));
const NationalWildlife = lazy(() => import('@/pages/NationalWildlife'));
const VerificationGame = lazy(() => import('@/pages/VerificationGame'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const ExpertReview = lazy(() => import('@/pages/ExpertReview'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Accounts = lazy(() => import('@/pages/Accounts'));
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();
  const isPublicRoute = location.pathname === "/public-capture";
  const isPublicHome = ["/welcome", "/public"].includes(location.pathname) || (location.pathname === "/" && !isAuthenticated && !isLoadingAuth);
  const isAuthRoute = ["/login", "/register", "/forgot-password", "/reset-password"].includes(location.pathname);

  if (isPublicRoute) return <PublicCapture />;
  if (isPublicHome) return <PublicLanding />;

  if (isAuthRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/national-wildlife" element={<NationalWildlife />} />
        <Route path="/verification-game" element={<VerificationGame />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/expert-review" element={<ExpertReview />} />
        <Route path="/sites" element={<Sites />} />
        <Route path="/cameras" element={<Cameras />} />
        <Route path="/cameras/:id" element={<CameraDetail />} />
        <Route path="/cameras/:id/live" element={<CameraLive />} />
        <Route path="/sensors" element={<Sensors />} />
        <Route path="/detections" element={<Detections />} />
        <Route path="/decision-engine" element={<DecisionEngine />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/ai-response" element={<AIResponseEngine />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/deterrents" element={<Deterrents />} />
        <Route path="/automation" element={<AutomationRules />} />
        <Route path="/edge-devices" element={<EdgeDevices />} />
        <Route path="/devices" element={<DeviceManager />} />
        <Route path="/devices/:id" element={<DeviceDetail />} />
        <Route path="/device-dashboard" element={<DeviceDashboard />} />
        <Route path="/device-admin" element={<DeviceAdmin />} />
        <Route path="/device-setup" element={<DeviceSetupWizard />} />
        <Route path="/ai-verification" element={<AIVerification />} />
        <Route path="/ai-models" element={<AIModels />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/voice-bot" element={<VoiceBot />} />
        <Route path="/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/dataset-builder" element={<DatasetBuilder />} />
        <Route path="/species-learning" element={<SpeciesLearning />} />
        <Route path="/ai-self-learning" element={<AISelfLearning />} />
        <Route path="/detection-reports" element={<DetectionReports />} />
        <Route path="/site-comparison" element={<SiteComparison />} />
        <Route path="/detection-trends" element={<DetectionTrends />} />
        <Route path="/team" element={<Team />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/team/add" element={<AddTeamMember />} />
        <Route path="/team/:id" element={<TeamMemberDetail />} />
        <Route path="/api-integrations" element={<ApiIntegrations />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route path="/hwc" element={<Hwc />} />
        <Route path="/hwc/:id" element={<HwcDetail />} />
        <Route path="/sightings" element={<Sightings />} />
        <Route path="/patrols" element={<Patrols />} />
        <Route path="/patrols/:id" element={<PatrolDetail />} />
        <Route path="/individuals" element={<Individuals />} />
        <Route path="/individuals/:id" element={<IndividualDetail />} />
        <Route path="/sighting-history" element={<SightingHistory />} />
        <Route path="/movement-map" element={<MovementMap />} />
        <Route path="/field-capture" element={<FieldCapture />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center" role="status" aria-label="Loading page"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>}>
              <AuthenticatedApp />
            </Suspense>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
