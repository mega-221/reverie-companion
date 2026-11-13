import type { Character } from '../../types';
import OriginCard from './narrative/OriginCard';
import RelationshipsCard from './narrative/RelationshipsCard';
import ConvictionsCard from './narrative/ConvictionsCard';
import AspectsCard from './narrative/AspectsCard';
import JournalCard from './narrative/JournalCard';

export default function NarrativeSection({ char, patch, openOriginModal }: { char: Character, patch: any, openOriginModal: () => void }) {
  return (
    <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
      
      {/* 1. ORIGIN SECTION (Top Left) */}
      <div className="w-full lg:col-span-5 h-full">
        <OriginCard char={char} openOriginModal={openOriginModal} />
      </div>

      {/* 2. RELATIONSHIPS SECTION (Top Right) */}
      <div className="w-full lg:col-span-7 h-full">
        <RelationshipsCard char={char} patch={patch} />
      </div>

      {/* 3. CONVICTIONS & FAILINGS (Full Width) */}
      <div className="w-full lg:col-span-12">
        <ConvictionsCard char={char} patch={patch} />
      </div>

      {/* 4. ASPECTS (Bottom Left) */}
      <div className="w-full lg:col-span-5 h-full">
        <AspectsCard char={char} />
      </div>

      {/* 5. JOURNAL (Bottom Right) */}
      <div className="w-full lg:col-span-7 h-full">
        <JournalCard char={char} patch={patch} />
      </div>

    </div>
  );
}