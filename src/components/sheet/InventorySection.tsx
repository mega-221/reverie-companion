import type { Character } from '../../types';
import { SectionHeader } from './utils';

export default function InventorySection({ char, patch }: { char: Character, patch: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm w-full">
        <SectionHeader title="Inventory" />
        <div className="overflow-x-auto rounded-xl border border-gray-700 shadow-sm w-full">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700"><th className="p-3 font-bold">Item Name</th><th className="p-3 font-bold w-20 text-center">Burden</th><th className="p-3 font-bold w-20 text-center">Qty</th><th className="p-3 font-bold w-20 text-center">Equipped</th><th className="p-3 w-10"></th></tr></thead>
            <tbody>
              {char.data.items.map((it, i) => (
                <tr key={i} className="hover:bg-gray-700/30 border-b border-gray-700/50 last:border-0">
                  <td className="p-2"><input className="w-full bg-transparent focus:outline-none p-1 text-gray-200" placeholder="Item name..." value={it.name} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], name: e.target.value }; patch({ items: n }); }} /></td>
                  <td className="p-2 text-center"><input type="number" className="w-14 border border-gray-600 rounded p-1.5 text-center bg-gray-900 shadow-sm focus:outline-none focus:border-red-500 text-gray-200" value={it.burden} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], burden: +e.target.value }; patch({ items: n }); }} /></td>
                  <td className="p-2 text-center"><input type="number" className="w-14 border border-gray-600 rounded p-1.5 text-center bg-gray-900 shadow-sm focus:outline-none focus:border-red-500 text-gray-200" value={it.qty} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], qty: +e.target.value }; patch({ items: n }); }} /></td>
                  <td className="p-2 text-center"><input type="checkbox" className="w-5 h-5 cursor-pointer accent-red-600" checked={it.equipped} onChange={e => { const n = [...char.data.items]; n[i] = { ...n[i], equipped: e.target.checked }; patch({ items: n }); }} /></td>
                  <td className="p-2 text-center"><button className="text-red-500 font-bold text-lg hover:text-red-400" onClick={() => patch({ items: char.data.items.filter((_, j) => j !== i) })}>×</button></td>
                </tr>
              ))}
              {char.data.items.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500 italic text-sm">No items in inventory.</td></tr>}
            </tbody>
          </table>
        </div>
        <button className="mt-4 border border-dashed border-gray-600 px-4 py-2 text-sm rounded-lg hover:bg-gray-700 font-bold text-gray-300 shadow-sm transition-colors" onClick={() => patch({ items: [...char.data.items, { name: '', burden: 0, qty: 1, equipped: false }] })}>+ Add Item</button>
      </section>

      <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-sm w-full">
        <SectionHeader title="Injuries" />
        <div className="overflow-x-auto rounded-xl border border-gray-700 shadow-sm w-full">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700"><th className="p-3 font-bold">Injury Name</th><th className="p-3 font-bold w-20 text-center whitespace-nowrap">Severity</th><th className="p-3 font-bold w-20 text-center whitespace-nowrap">Weeks</th><th className="p-3 w-10"></th></tr></thead>
            <tbody>
              {char.data.trackers.injuries.map((inj, i) => (
                <tr key={i} className="hover:bg-gray-700/30 border-b border-gray-700/50 last:border-0">
                  <td className="p-2"><input className="w-full bg-transparent focus:outline-none p-1 text-gray-200" placeholder="Injury name..." value={inj.part} onChange={e => { const n = [...char.data.trackers.injuries]; n[i] = { ...n[i], part: e.target.value }; patch({ trackers: { ...char.data.trackers, injuries: n } }); }} /></td>
                  <td className="p-2 text-center"><input type="number" className="w-14 border border-gray-600 rounded p-1.5 text-center bg-gray-900 shadow-sm focus:outline-none focus:border-red-500 text-gray-200" title="Severity" value={inj.severity} onChange={e => { const n = [...char.data.trackers.injuries]; n[i] = { ...n[i], severity: +e.target.value }; patch({ trackers: { ...char.data.trackers, injuries: n } }); }} /></td>
                  <td className="p-2 text-center"><input type="number" className="w-14 border border-gray-600 rounded p-1.5 text-center bg-gray-900 shadow-sm focus:outline-none focus:border-red-500 text-gray-200" title="Weeks" value={inj.weeksLeft} onChange={e => { const n = [...char.data.trackers.injuries]; n[i] = { ...n[i], weeksLeft: +e.target.value }; patch({ trackers: { ...char.data.trackers, injuries: n } }); }} /></td>
                  <td className="p-2 text-center"><button className="text-red-500 font-bold text-lg hover:text-red-400" onClick={() => { const n = char.data.trackers.injuries.filter((_, j) => j !== i); patch({ trackers: { ...char.data.trackers, injuries: n } }); }}>×</button></td>
                </tr>
              ))}
              {char.data.trackers.injuries.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-gray-500 italic text-sm">No active injuries.</td></tr>}
            </tbody>
          </table>
        </div>
        <button className="mt-4 border border-dashed border-gray-600 px-4 py-2 text-sm rounded-lg hover:bg-gray-700 font-bold text-gray-300 shadow-sm transition-colors" onClick={() => { const n = [...char.data.trackers.injuries, { part: '', severity: 1, weeksLeft: 0 }]; patch({ trackers: { ...char.data.trackers, injuries: n } }); }}>+ Add Injury</button>
      </section>
    </div>
  );
}