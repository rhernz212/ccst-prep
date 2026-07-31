export interface ChapterSection {
  anchorId: string;
  title: string;
  order: number;
  html: string;
  isReviewQuestions: boolean;
}

export interface Chapter {
  slug: string;
  number: number;
  title: string;
  /** Intro content before the first named (h2) section — topic checklist, opening paragraphs. */
  introHtml: string;
  sections: ChapterSection[];
}

export interface NavSection {
  anchorId: string;
  title: string;
  order: number;
}

export interface NavChapter {
  number: number;
  slug: string;
  title: string;
  sourceFile: string;
  sections: NavSection[];
}
