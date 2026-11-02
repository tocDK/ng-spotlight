/** One documentation page, rendered by Page from a route's data.content. */
export interface PageContent {
  title: string;
  sections: PageSection[];
  examples: PageExample[];
}

export interface PageSection {
  id: string;
  title: string;
  markdown: string;
}

export interface PageExample {
  /** Key into EXAMPLES and SOURCES: the example file name without `.example.ts`. */
  key: string;
  title: string;
}
