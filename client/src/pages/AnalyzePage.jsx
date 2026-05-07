import { useState } from 'react';
import { analyzeResume } from '../services/api';

const AnalyzePage = () => {
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError("");
      setResult(null); 
    } else {
      setError("Please select a valid PDF file.");
      setFile(null);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please upload a resume PDF first.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await analyzeResume(formData);
      setResult(response.data);
    } catch (err) {
      if (err.response?.status === 429) {
        setError("Rate limit exceeded. Try again later.");
      } else {
        setError(err.response?.data?.error || "Analysis failed.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-4 sm:mt-10 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">Resume Score Check</h1>
        <p className="text-zinc-500 mt-2">Test a resume against our ATS parsing engine without saving it to the database.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 mb-8 border border-zinc-200">
        <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-4 items-center">
          <input 
            type="file" 
            accept="application/pdf" 
            onChange={handleFileChange}
            className="w-full sm:flex-1 block text-sm text-zinc-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
          />
          <button 
            type="submit" 
            disabled={isAnalyzing}
            className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white transition-all ${isAnalyzing ? 'bg-zinc-400 cursor-not-allowed' : 'bg-zinc-900 hover:bg-zinc-800 shadow-md'}`}
          >
            {isAnalyzing ? "Analyzing..." : "Generate Report"}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-4 font-medium text-center">{error}</p>}
      </div>

      {result && (
        <div className="space-y-6">
          {/* Top Metric Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <div className="text-center shrink-0">
              <div className="text-6xl font-black text-emerald-500 tracking-tighter">
                {result.atsScore}<span className="text-2xl text-zinc-400">/100</span>
              </div>
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-1">ATS Score</p>
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Extracted Words</p>
                <p className="text-lg font-semibold text-zinc-900">{result.analysis.wordCount}</p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Action Verbs</p>
                <p className="text-lg font-semibold text-zinc-900">{result.analysis.verbCount}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Strengths
              </h3>
              <ul className="space-y-3">
                {result.strengths.map((str, i) => (
                  <li key={i} className="text-zinc-600 text-sm leading-relaxed flex gap-3">
                    <span className="text-zinc-300 mt-0.5">•</span> {str}
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggestions */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 sm:p-8 border-l-4 border-l-amber-400">
              <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Areas to Improve
              </h3>
              <ul className="space-y-3">
                {result.suggestions.map((sug, i) => (
                  <li key={i} className="text-zinc-600 text-sm leading-relaxed flex gap-3">
                     <span className="text-zinc-300 mt-0.5">•</span> {sug}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyzePage;