import type { Character } from '../../types';
import { SectionHeader } from './utils';

export default function InjuriesCard({ char, patch }: { char: Character, patch: any }) {
  return (
    <div className="w-full h-full">
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-sm w-full h-full flex flex-col">
        <SectionHeader title="Injuries" />
        <div className="overflow-x-auto rounded-xl border border-gray-700 shadow-sm w-full bg-black/20 flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                <th className="p-2 font-bold">Injury Name</th>
                <th className="p-2 font-bold w-16 text-center whitespace-nowrap">Sev</th>
                <th className="p-2 font-bold w-16 text-center whitespace-nowrap">Weeks</th>
                <th className="p-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {char.data.trackers.injuries.map((inj, i) => (
                <tr key={i} className="hover:bg-white/5 border-b border-gray-700/50 last:border-0">
                  <td className="p-1">
                    <input 
                      className="w-full bg-transparent focus:outline-none p-1 text-sm text-gray-200" 
                      placeholder="Injury..." 
                      value={inj.part} 
                      onChange={e => { 
                        const n = [...char.data.trackers.injuries]; 
                        n[i] = { ...n[i], part: e.target.value }; 
                        patch({ trackers: { ...char.data.trackers, injuries: n } }); 
                      }} 
                    />
                  </td>
                  <td className="p-1 text-center">
                    <input 
                      type="number" 
                      className="w-10 border border-gray-700 rounded p-1 text-center bg-black/40 shadow-inner focus:outline-none focus:border-red-500 text-gray-200 text-sm" 
                      title="Severity" 
                      value={inj.severity} 
                      onChange={e => { 
                        const n = [...char.data.trackers.injuries]; 
                        n[i] = { ...n[i], severity: +e.target.value }; 
                        patch({ trackers: { ...char.data.trackers, injuries: n } }); 
                      }} 
                    />
                  </td>
                  <td className="p-1 text-center">
                    <input 
                      type="number" 
                      className="w-10 border border-gray-700 rounded p-1 text-center bg-black/40 shadow-inner focus:outline-none focus:border-red-500 text-gray-200 text-sm" 
                      title="Weeks" 
                      value={inj.weeksLeft} 
                      onChange={e => { 
                        const n = [...char.data.trackers.injuries]; 
                        n[i] = { ...n[i], weeksLeft: +e.target.value }; 
                        patch({ trackers: { ...char.data.trackers, injuries: n } }); 
                      }} 
                    />
                  </td>
                  <td className="p-1 text-center">
                    <button 
                      className="text-red-500 font-bold text-lg hover:text-red-400" 
                      onClick={() => { 
                        const n = char.data.trackers.injuries.filter((_, j) => j !== i); 
                        patch({ trackers: { ...char.data.trackers, injuries: n } }); 
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {char.data.trackers.injuries.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500 italic text-sm">No active injuries.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button 
          className="mt-3 border border-dashed border-gray-600 px-4 py-2 text-xs rounded-lg hover:bg-white/5 font-bold text-gray-300 shadow-sm transition-colors shrink-0" 
          onClick={() => { 
            const n = [...char.data.trackers.injuries, { part: '', severity: 1, weeksLeft: 0 }]; 
            patch({ trackers: { ...char.data.trackers, injuries: n } }); 
          }}
        >
          + Add Injury
        </button>
      </section>
    </div>
  );
}