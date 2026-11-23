export interface RuleSection {
  id: string;
  title: string;
  pages: [number, number];
  content: string;
  searchText: string;
}

export interface RuleChapter {
  id: string;
  number: string;
  title: string;
  pages: [number, number];
  sections: RuleSection[];
}

export interface RulesMeta {
  source: string;
  scope: string;
  page_range: [number, number];
  generated_from?: string;
  note?: string;
}

export interface RulesBundle {
  meta: RulesMeta;
  chapters: RuleChapter[];
}

export interface RuleSearchResult {
  chapter: RuleChapter;
  section: RuleSection;
  score: number;
  matchCount: number;
  snippet: string;
}

export interface RuleBookmark {
  id: string;
  chapterId: string;
  sectionId?: string;
  addedAt: number;
}
