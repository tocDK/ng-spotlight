import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ExampleCard } from './example-card';
import { Markdown } from './markdown';
import type { PageContent } from './page-content.types';

@Component({
  selector: 'app-page',
  imports: [ExampleCard, Markdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article>
      <h1>{{ content().title }}</h1>
      @for (section of content().sections; track section.id) {
        <section [id]="section.id">
          <h2>{{ section.title }}</h2>
          <app-markdown [source]="section.markdown" />
        </section>
      }
      @if (content().examples.length > 0) {
        <h2 id="examples">Examples</h2>
        @for (example of content().examples; track example.key) {
          <app-example-card [key]="example.key" [title]="example.title" />
        }
      }
    </article>
  `,
})
export class Page {
  readonly content = input.required<PageContent>();
}
