import type { Character } from '../../types';
import OriginCard from './narrative/OriginCard';
import RelationshipsCard from './narrative/RelationshipsCard';
import ConvictionsCard from './narrative/ConvictionsCard';
import AspectsCard from './narrative/AspectsCard';
import JournalCard from './narrative/JournalCard';

export default function NarrativeSection({ 
  char, patch, openOriginModal, onRemoveOrigin 
}: { 
  char: Character, 
  patch: any, 
  openOriginModal: () => void, 
  onRemoveOrigin: () => void 
}) {
  return (
    <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 animate-in fade-in duration-200 overflow-x-clip">
      {/* 1. ORIGIN — fixed height on lg */}
      <div className="w-full lg:col-span-4">
        <OriginCard char={char} openOriginModal={openOriginModal} onRemoveOrigin={onRemoveOrigin} />
      </div>

      {/* 2. RELATIONSHIPS — expanded to fill the 8 cols on lg */}
      <div className="w-full lg:col-span-8">
        <RelationshipsCard char={char} patch={patch} />
      </div>

      {/* 3. CONVICTIONS & FAILINGS — hero band */}
      <div className="w-full lg:col-span-12">
        <ConvictionsCard char={char} patch={patch} />
      </div>

      {/* 4. ASPECTS — 5-up band */}
      <div className="w-full lg:col-span-12">
        <AspectsCard char={char} patch={patch} />
      </div>

      {/* 5. JOURNAL — full-width band */}
      <div className="w-full lg:col-span-12">
        <JournalCard char={char} patch={patch} />
      </div>
    </div>
  );
}