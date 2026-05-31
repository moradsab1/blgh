import { Routes, Route, Navigate } from 'react-router-dom';
import TokenGate from './auth/TokenGate';
import Console from './pages/Console';

export default function App() {
  return (
    <TokenGate>
      <Routes>
        <Route path="/console" element={<Console />} />
        <Route path="/" element={<Navigate to="/console" replace />} />
      </Routes>
    </TokenGate>
  );
}
