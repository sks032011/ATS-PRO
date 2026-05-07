import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { searchCandidates } from '../services/api';
import ResumeCard from '../components/ResumeCard';

const Dashboard = () => {
  const location = useLocation();
  const [jobDescription, setJobDescription] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loadingText, setLoadingText] = useState("Analyzing...");

  useEffect(() => {
    if (location.state && location.state.newResult) {
      setCandidates([location.state.newResult]);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (isLoading) {
      const messages = [
        "Parsing PDF Content...",
        "Generating Vector Embeddings...",
        "Querying Pinecone Index...",
        "Running Llama-3 Inference...",
        "Finalizing Match Scores..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingText(messages[i % messages.length]);
        i++;
      }, 800);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!jobDescription.trim()) return;
    setIsLoading(true);
    setError("");
    setCandidates([]);
    try {
      const { data } = await searchCandidates({ jobDescription });
      setCandidates(data.matches);
      if (data.matches.length === 0) setError("No matches found.");
    } catch (err) {
      setError("Search failed. Check backend.");
    } finally {
      setIsLoading(false);
    }
  };

  // const openPdf = (id) => {
  //   window.open(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/api/upload/${id}/pdf`, '_blank');
  // };
  const openPdf = (id) => {
    // This tells React to use the live Vercel/Render URL if it exists, otherwise fallback to localhost
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    window.open(`${baseUrl}/api/upload/${id}/pdf`, '_blank');
};

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-0">
      <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-8 mb-10 border border-zinc-200 relative overflow-hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-5 relative z-10 tracking-tight">Find the Best Candidate</h1>

        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
          <div className="px-3 sm:px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 border border-emerald-100 w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            System Status: Online
          </div>
          <div className="px-3 sm:px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-xs sm:text-sm font-medium border border-zinc-200 w-fit"> Llama-3</div>
          <div className="px-3 sm:px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-xs sm:text-sm font-medium border border-zinc-200 w-fit"> Vector DB: Pinecone</div>
        </div>

        {/*  flex-col on mobile so the button goes below the text area. Absolute positioned on desktop */}
        <form onSubmit={handleSearch} className="relative z-10 flex flex-col sm:block gap-3">
          <textarea 
            className="w-full p-4 sm:pr-48 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none shadow-sm text-zinc-800 bg-zinc-50 placeholder-zinc-400" 
            rows="3" 
            placeholder="Paste your Job Description here..." 
            value={jobDescription} 
            onChange={(e) => setJobDescription(e.target.value)} 
          />
          <button 
            type="submit" 
            disabled={isLoading || !jobDescription} 
            className={`w-full sm:w-auto sm:absolute sm:bottom-4 sm:right-4 px-6 py-3 rounded-xl font-bold text-white transition-all ${isLoading ? 'bg-zinc-400' : 'bg-zinc-900 hover:bg-zinc-800 shadow-md hover:shadow-lg hover:-translate-y-0.5'}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {loadingText}
              </span>
            ) : "Rank Candidates"}
          </button>
        </form>
      </div>

      {error && <div className="text-center p-6 mb-8 bg-red-50 text-red-600 rounded-xl font-medium border border-red-100">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((candidate) => (
          <ResumeCard
            key={candidate.id}
            candidate={candidate}
            onClick={() => setSelectedCandidate(candidate)}
          />
        ))}
      </div>



      {selectedCandidate && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h2 className="text-2xl font-bold text-gray-800">{selectedCandidate.name.split('_')[0]}</h2>
              <button 
                onClick={() => setSelectedCandidate(null)} 
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-8">
              {/* AI Summary */}
              <div className="mb-6">
                <h4 className="flex items-center gap-2 font-bold text-indigo-900 mb-3 text-lg">
                   AI Analysis
                </h4>
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-900 leading-relaxed">
                  {selectedCandidate.reason || "No specific analysis available."}
                </div>
              </div>

              {/* Match Score Bar */}
              <div className="flex items-center gap-4 mb-8">
                <span className="text-gray-600 font-medium">Match Score:</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${selectedCandidate.matchScore > 70 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                    style={{ width: `${selectedCandidate.matchScore}%` }}
                  ></div>
                </div>
                <span className="font-bold text-gray-800">{selectedCandidate.matchScore}%</span>
              </div>

              {/* STRUCTURED DATA DISPLAY */}
              {selectedCandidate.structuredData && !selectedCandidate.structuredData.extractionFailed && (
                <div className="space-y-6 mb-8">
                  
                  {/* Skills Section */}
                  {selectedCandidate.structuredData.skills && selectedCandidate.structuredData.skills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                        💼 Skills
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.structuredData.skills.map((skill, idx) => (
                          <span 
                            key={idx}
                            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
                          >
                            {skill.length > 35 ? skill.substring(0, 35) + '...' : skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education Section */}
                  {selectedCandidate.structuredData.education && selectedCandidate.structuredData.education.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                         Education
                      </h4>
                      <ul className="space-y-2">
                        {selectedCandidate.structuredData.education.map((edu, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                            <span className="text-gray-700">{edu}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Experience Section */}
                  {selectedCandidate.structuredData.experience && selectedCandidate.structuredData.experience.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                         Experience
                      </h4>
                      <ul className="space-y-2">
                        {selectedCandidate.structuredData.experience.map((exp, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></div>
                            <span className="text-gray-700">{exp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Summary */}
                  {selectedCandidate.structuredData.summary && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                         Professional Summary
                      </h4>
                      <p className="text-gray-600 leading-relaxed italic">
                        "{selectedCandidate.structuredData.summary}"
                      </p>
                    </div>
                  )}

                </div>
              )}

              {/* Warning if extraction failed */}
              {selectedCandidate.structuredData?.extractionFailed && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                     AI data extraction was temporarily unavailable during upload. Detailed parsing not available for this candidate.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => openPdf(selectedCandidate.id)}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                  View Original PDF
                </button>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;