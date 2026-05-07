import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import CandidatePool from './pages/CandidatePool';
import AnalyzePage from './pages/AnalyzePage'; 

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <Navbar />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/pool" element={<CandidatePool />} />
            <Route path="/analyze" element={<AnalyzePage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;