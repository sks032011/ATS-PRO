const ResumeCard = ({ candidate, onClick }) => {
  const getScoreColor = (score) => {
    if (score >= 75) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 sm:p-6 border border-zinc-200 cursor-pointer group hover:-translate-y-0.5 duration-200"
    >
      {/*  gap-3 to keep spacing between text andpill */}
      <div className="flex justify-between items-start gap-3 mb-4">
        
        {/* min-w-0 and flex-1 == long emails was breaking the box */}
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-lg text-zinc-900 group-hover:text-zinc-600 transition-colors truncate">
            {candidate.name.split('_')[0]} 
          </h3>
          {/* truncate for addin ... if  mail is too long */}
          <p className="text-sm text-zinc-500 truncate">{candidate.email}</p>
        </div>
        
        {/* 📱 shrink-0 pill was squishing in long mail */}
        <div className={`shrink-0 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold border ${getScoreColor(candidate.matchScore)}`}>
          {candidate.matchScore}% Match
        </div>
      </div>

      <div className="mb-5">
        <p className="text-zinc-600 text-sm line-clamp-3 leading-relaxed">
          <span className="font-bold text-zinc-900">AI Analysis: </span>
          {candidate.reason}
        </p>
      </div>

      <div className="flex items-center text-zinc-900 text-sm font-bold">
        <span>View Full Analysis</span>
        <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
      </div>
    </div>
  );
};

export default ResumeCard;