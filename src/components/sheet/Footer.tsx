import type { Tab } from './utils';

export default function Footer({ activeTab, setActiveTab, showFilter }: { activeTab: Tab, setActiveTab: (t: Tab) => void, showFilter?: boolean }) {
  return (
    <footer className={`fixed bottom-0 left-0 right-0 rev-footer-bar z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.22)] w-full transition-all duration-1000 ${showFilter ? 'grayscale-[60%] contrast-[1.1]' : ''}`}>
      <div className="w-full flex text-xs sm:text-sm font-bold uppercase tracking-wider">
        {(['gameplay', 'narrative', 'progression'] as Tab[]).map((tabKey) => {
          const isActive = activeTab === tabKey;
          const label =
            tabKey === 'gameplay'
              ? 'Gameplay Profile'
              : tabKey === 'narrative'
              ? 'Narrative Profile'
              : 'Progression Profile';

          return (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className="flex-1 py-4 transition-colors border-t-4"
              style={{
                borderTopColor: isActive ? 'var(--rev-accent-border)' : 'transparent',
                backgroundColor: isActive ? 'var(--rev-surface)' : 'transparent',
                color: isActive ? 'var(--rev-text-bright)' : 'var(--rev-text-muted)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </footer>
  );
}