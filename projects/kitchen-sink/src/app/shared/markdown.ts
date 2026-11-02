import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';

/**
 * Renders hand-written markdown from content/*.content.ts with Prism-highlighted code fences.
 * The content is authored in this repo, so it is trusted (no DOMPurify), like lingui-angular.
 */
@Component({
  selector: 'app-markdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="prose" [innerHTML]="html()"></div>`,
})
export class Markdown {
  readonly source = input.required<string>();
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly html = computed<SafeHtml>(() => {
    const raw = marked.parse(this.source(), { async: false, gfm: true, breaks: false });
    return this.sanitizer.bypassSecurityTrustHtml(highlight(raw));
  });
}

function highlight(html: string): string {
  return html.replace(/<code class="language-([a-z0-9-]+)">([\s\S]*?)<\/code>/g, (_match, lang: string, code: string) => {
    const grammar = Prism.languages[lang];
    if (!grammar) return `<code class="language-${lang}">${code}</code>`;
    const decoded = code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
    return `<code class="language-${lang}">${Prism.highlight(decoded, grammar, lang)}</code>`;
  });
}
