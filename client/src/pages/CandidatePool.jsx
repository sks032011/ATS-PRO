import { useEffect, useState } from 'react';
import { fetchAllCandidates, deleteCandidate } from '../services/api';

const CandidatePool = () => {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      const { data } = await fetchAllCandidates();
      setCandidates(data);
    } catch (e) {
      console.error("Failed to load candidates");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;
    try {
      await deleteCandidate(id);
      loadCandidates(); 
    } catch (e) {
      alert("Delete failed");
    }
  };

  // const openPdf = (id) => {
  //   window.open(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/api/upload/${id}/pdf`, '_blank');
  // };
  
  const openPdf = (id) => {
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    window.open(`${baseUrl}/api/upload/${id}/pdf`, '_blank');
};

  return (
    <div className="max-w-6xl mx-auto mt-4 sm:mt-10 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Candidate Database</h1>
        <span className="bg-zinc-100 text-zinc-800 py-1.5 px-4 rounded-full text-sm font-semibold border border-zinc-200">
          {candidates.length} Candidates
        </span>
      </div>

      {/* overflow-x-auto forhorizontal swiping on phones without breaking the page */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto border border-zinc-200">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Name</th>
              <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Email</th>
              <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
              <th className="px-4 sm:px-6 py-4 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">Resume</th>
              <th className="px-4 sm:px-6 py-4 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-100">
            {candidates.map((c) => (
              <tr key={c._id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-4 sm:px-6 py-4 max-w-[150px] sm:max-w-[250px]">
                  <div className="font-semibold text-zinc-900 truncate" title={c.name.split('_')[0]}>
                    {c.name.split('_')[0]}
                  </div>
                </td>
                
                <td className="px-4 sm:px-6 py-4 text-zinc-500 text-sm">
                  {c.email || <span className="text-zinc-400 italic">Not found</span>}
                </td>

                <td className="px-4 sm:px-6 py-4 text-zinc-400 text-sm hidden sm:table-cell">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>

                <td className="px-4 sm:px-6 py-4 text-center">
                  <button 
                    onClick={() => openPdf(c._id)}
                    className="text-zinc-600 hover:text-zinc-900 font-medium hover:bg-zinc-100 px-3 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 mx-auto border border-transparent hover:border-zinc-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    View
                  </button>
                </td>

                <td className="px-4 sm:px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDelete(c._id)}
                    className="text-red-500 hover:text-red-700 font-semibold hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {candidates.length === 0 && (
          <div className="p-10 text-center text-zinc-400 flex flex-col items-center">
             <svg className="w-12 h-12 mb-3 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
            <p>Database is empty.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatePool;