import { useState } from 'react';
import { uploadResume } from '../services/api';
import { useNavigate } from 'react-router-dom';

const UploadPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [email, setEmail] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError("");
    } else {
      setError("Please select a valid PDF file.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please attach a resume PDF.");

    setIsUploading(true);
    setError("");

    const formData = new FormData();
    formData.append('resume', file);
    if (jobDescription) formData.append('jobDescription', jobDescription);
    if (email) formData.append('email', email);

    try {
      const response = await uploadResume(formData);
      navigate('/', { state: { newResult: response.data.candidate } });
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed. Check backend.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-4 sm:mt-10 px-4">
      <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 border border-zinc-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-2 tracking-tight">Add New Candidate</h1>
        <p className="text-zinc-500 mb-8">Upload a resume to automatically parse and add it to the talent pool.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2 uppercase tracking-wide">Resume PDF *</label>
            <div className="relative border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center hover:bg-zinc-50 transition-colors bg-white">
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
              <div className="pointer-events-none">
                <svg className="mx-auto h-12 w-12 text-zinc-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-zinc-700 font-medium">{file ? file.name : "Drag & drop or click to browse"}</p>
                <p className="text-sm text-zinc-400 mt-1">PDF up to 5MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2 uppercase tracking-wide">Candidate Email <span className="text-zinc-400 font-normal lowercase">(Optional)</span></label>
            <input 
              type="email" 
              placeholder="e.g. candidate@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-zinc-50 hover:bg-white" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2 uppercase tracking-wide">Target Job Description <span className="text-zinc-400 font-normal lowercase">(Optional)</span></label>
            <textarea 
              rows="3" 
              placeholder="Paste JD to pre-calculate match score..." 
              value={jobDescription} 
              onChange={(e) => setJobDescription(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none transition-all bg-zinc-50 hover:bg-white" 
            />
          </div>

          {error && <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">{error}</div>}
          
          <button 
            type="submit" 
            disabled={isUploading} 
            className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all ${isUploading ? 'bg-zinc-400 cursor-not-allowed' : 'bg-zinc-900 hover:bg-zinc-800 shadow-md hover:-translate-y-0.5'}`}
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                 <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Document...
              </span>
            ) : "Upload to Database"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadPage;