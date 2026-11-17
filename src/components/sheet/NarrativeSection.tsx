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
    <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
      
      {/* 1. ORIGIN — fixed height */}
      <div className="w-full lg:col-span-4">
        <OriginCard char={char} openOriginModal={openOriginModal} onRemoveOrigin={onRemoveOrigin} />
      </div>

      {/* 2. RELATIONSHIPS — expanded to fill the 8 cols */}
      <div className="w-full lg:col-span-8">
        <RelationshipsCard char={char} patch={patch} />
      </div>

      {/* 3. CONVICTIONS & FAILINGS — hero band */}
      <div className="w-full lg:col-span-12">
        <ConvictionsCard char={char} patch={patch} />
      </div>

      {/* 4. ASPECTS — 5-up band (constraint for AspectsCard when built) */}
      <div className="w-full lg:col-span-12">
        <AspectsCard char={char} />
      </div>

      {/* 5. JOURNAL — full-width band, centered timeline */}
      <div className="w-full lg:col-span-12">
        <div className="max-w-3xl mx-auto">
          <JournalCard char={char} patch={patch} />
        </div>
      </div>

    </div>
  );
}