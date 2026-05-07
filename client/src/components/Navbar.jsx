import { Link, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.png';

const Navbar = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path 
      ? "text-zinc-900 bg-zinc-100/50 font-semibold border-b-2 border-emerald-500" 
      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 border-b-2 border-transparent transition-all";
  };

  return (
    <nav className="bg-white/95 border-b border-zinc-200 sticky top-0 z-50 shadow-sm backdrop-blur-md">
      {/*  flex col on mobile, flex row on desktop */}
      <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0">
        
        <Link to="/" className="flex items-center gap-2 group">
          {/* logo scale down on mobile by h10 */}
          <img 
            src={logoImg} 
            alt="ATS Pro Logo" 
            className="h-10 md:h-12 w-auto group-hover:scale-105 transition-transform duration-200" 
          />
        </Link>

        {/* link cont. horiz. scrollable on small screens */}
        <div className="flex w-full md:w-auto overflow-x-auto justify-start md:justify-end space-x-1 sm:space-x-2 hide-scrollbar">
          <Link 
            to="/" 
            className={`whitespace-nowrap px-3 sm:px-4 py-2 text-sm md:text-base rounded-t-lg ${isActive('/')}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/pool" 
            className={`whitespace-nowrap px-3 sm:px-4 py-2 text-sm md:text-base rounded-t-lg ${isActive('/pool')}`}
          >
            Database
          </Link>
          <Link 
            to="/upload" 
            className={`whitespace-nowrap px-3 sm:px-4 py-2 text-sm md:text-base rounded-t-lg ${isActive('/upload')}`}
          >
            Upload
          </Link>
          <Link 
            to="/analyze" 
            className={`whitespace-nowrap px-3 sm:px-4 py-2 text-sm md:text-base rounded-t-lg ${isActive('/analyze')}`}
          >
            Analyze
          </Link>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;