import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Sites from '@/pages/Sites';
import Cameras from '@/pages/Cameras';
import CameraDetail from '@/pages/CameraDetail';
import CameraLive from '@/pages/CameraLive';
import Sensors from '@/pages/Sensors';
import Detections from '@/pages/Detections';
import DecisionEngine from '@/pages/DecisionEngine';
import Reports from '@/pages/Reports';
import MapView from '@/pages/MapView';
import AIResponseEngine from '@/pages/AIResponseEngine';
import Predictions from '@/pages/Predictions';
import Deterrents from '@/pages/Deterrents';
import AutomationRules from '@/pages/AutomationRules';
import EdgeDevices from '@/pages/EdgeDevices';
import DeviceManager from '@/pages/DeviceManager';
import DeviceDetail from '@/pages/DeviceDetail';
import DeviceDashboard from '@/pages/DeviceDashboard';
import DeviceAdmin from '@/pages/DeviceAdmin';
import DeviceSetupWizard from '@/pages/DeviceSetupWizard';
import AIVerification from '@/pages/AIVerification';
import AIModels from '@/pages/AIModels';
import Notifications from '@/pages/Notifications';
import VoiceBot from '@/pages/VoiceBot';
import KnowledgeBase from '@/pages/KnowledgeBase';
import Analytics from '@/pages/Analytics';
import DatasetBuilder from '@/pages/DatasetBuilder';
import SpeciesLearning from '@/pages/SpeciesLearning';
import AISelfLearning from '@/pages/AISelfLearning';
import DetectionReports from '@/pages/DetectionReports';
import SiteComparison from '@/pages/SiteComparison';
import DetectionTrends from '@/pages/DetectionTrends';
import Team from '@/pages/Team';
import TeamMemberDetail from '@/pages/TeamMemberDetail';
import AddTeamMember from '@/pages/AddTeamMember';
import ApiIntegrations from '@/pages/ApiIntegrations';
import Incidents from '@/pages/Incidents';
import IncidentDetail from '@/pages/IncidentDetail';
import Hwc from '@/pages/Hwc';
import HwcDetail from '@/pages/HwcDetail';
import Sightings from '@/pages/Sightings';
import Patrols from '@/pages/Patrols';
import PatrolDetail from '@/pages/PatrolDetail';
import Individuals from '@/pages/Individuals';
import IndividualDetail from '@/pages/IndividualDetail';
import SightingHistory from '@/pages/SightingHistory';
import MovementMap from '@/pages/MovementMap';
import FieldCapture from '@/pages/FieldCapture';
import PublicCapture from '@/pages/PublicCapture';
import NationalWildlife from '@/pages/NationalWildlife';
import VerificationGame from '@/pages/VerificationGame';
import Leaderboard from '@/pages/Leaderboard';
import ExpertReview from '@/pages/ExpertReview';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const isPublicRoute = location.pathname === "/public-capture";

  // Public routes bypass the auth gate entirely (no login required)
  if (!isPublicRoute && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors (skipped for public routes)
  if (!isPublicRoute && authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/public-capture" element={<PublicCapture />} />
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
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App