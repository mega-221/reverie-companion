import type { Tab } from './utils';

export default function Footer({ activeTab, setActiveTab, showFilter }: { activeTab: Tab, setActiveTab: (t: Tab) => void, showFilter?: boolean }) {
  return (
    <footer className={`fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 text-gray-500 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] w-full transition-all duration-1000 ${showFilter ? 'grayscale-[60%] contrast-[1.1]' : ''}`}>
      <div className="w-full flex text-xs sm:text-sm font-bold uppercase tracking-wider">
        <button onClick={() => setActiveTab('gameplay')} 
          className={`flex-1 py-4 hover:text-white transition-colors border-t-4 ${activeTab === 'gameplay' ? 'border-red-600 text-white bg-gray-800' : 'border-transparent hover:bg-gray-800/50'}`}>
          Gameplay Profile
        </button>
        <button onClick={() => setActiveTab('narrative')} 
          className={`flex-1 py-4 hover:text-white transition-colors border-t-4 ${activeTab === 'narrative' ? 'border-red-600 text-white bg-gray-800' : 'border-transparent hover:bg-gray-800/50'}`}>
          Narrative Profile
        </button>
        <button onClick={() => setActiveTab('progression')} 
          className={`flex-1 py-4 hover:text-white transition-colors border-t-4 ${activeTab === 'progression' ? 'border-red-600 text-white bg-gray-800' : 'border-transparent hover:bg-gray-800/50'}`}>
          Progression Profile
        </button>
      </div>
    </footer>
  );
}