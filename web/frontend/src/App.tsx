import { Routes, Route, Navigate } from 'react-router-dom';
import TokenGate from './auth/TokenGate';
import AppSidebar from './components/AppSidebar';
import Console from './pages/Console';
import CasePage from './pages/CasePage';
import MayorsBrief from './pages/MayorsBrief';
import NationalDashboard from './pages/NationalDashboard';
import TrendStudio from './pages/TrendStudio';
import PartnerWorkspace from './pages/PartnerWorkspace';
import ModerationConsole from './pages/ModerationConsole';
import AbuseDetection from './pages/AbuseDetection';

export default function App() {
  return (
    <TokenGate>
      <div className="flex h-screen bg-bg overflow-hidden">
        <AppSidebar />
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/console" replace />} />
            <Route path="/console" element={<Console />} />
            <Route path="/console/case/:id" element={<CasePage />} />
            <Route path="/mayors-brief" element={<MayorsBrief />} />
            <Route path="/national" element={<NationalDashboard />} />
            <Route path="/trends" element={<TrendStudio />} />
            <Route path="/partners" element={<PartnerWorkspace />} />
            <Route path="/moderation" element={<ModerationConsole />} />
            <Route path="/abuse" element={<AbuseDetection />} />
          </Routes>
        </div>
      </div>
    </TokenGate>
  );
}
