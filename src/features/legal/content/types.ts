/** A paragraph, a bulleted list, or a small table. */
export type LegalBlock =
  string | { list: string[] } | { table: { head: string[]; rows: string[][] } };

export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };

export type LegalDoc = {
  title: string;
  intro: string;
  sections: LegalSection[];
};

export type LegalContent = {
  privacy: LegalDoc;
  terms: LegalDoc;
  ui: {
    updated: (date: string) => string;
    otherLanguage: string;
    home: string;
    contents: string;
  };
};
