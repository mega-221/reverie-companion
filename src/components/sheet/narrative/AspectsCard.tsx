import type { Character } from '../../../types';
import { SectionHeader } from '../utils';

export default function AspectsCard({ char: _char }: { char: Character }) {
  return (
    <section className="sheet-panel p-5 w-full h-full flex flex-col">
      <SectionHeader title="Aspects" />
      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl bg-black/20 min-h-[200px] text-center p-6">
        <div className="text-gray-500 font-cinzel text-lg mb-2">Thought Cabinet</div>
        <p className="text-xs text-gray-600 italic">Aspects and their mini-challenges will be implemented here.</p>
      </div>
    </section>
  );
}