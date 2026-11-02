import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  createEnvironmentInjector,
  DestroyRef,
  EnvironmentInjector,
  inject,
  input,
  signal,
} from '@angular/core';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import { EXAMPLES } from '../examples';
import { SOURCES } from '../examples/sources.generated';

/** A live example plus its own source, read from the real example file at build time. */
@Component({
  selector: 'app-example-card',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="example" [id]="key()">
      <header class="example-header">
        <h3>{{ title() }}</h3>
        <button type="button" class="link-button" [attr.aria-expanded]="showSource()" (click)="showSource.set(!showSource())">
          {{ showSource() ? 'Hide source' : 'Show source' }}
        </button>
      </header>
      <div class="example-demo">
        <ng-container *ngComponentOutlet="example().component; environmentInjector: environment()" />
      </div>
      @if (showSource()) {
        <pre class="example-source"><code class="language-typescript" [innerHTML]="highlighted()"></code></pre>
      }
    </section>
  `,
})
export class ExampleCard {
  readonly key = input.required<string>();
  readonly title = input.required<string>();

  private readonly parent = inject(EnvironmentInjector);
  private readonly created: EnvironmentInjector[] = [];
  protected readonly showSource = signal(false);

  protected readonly example = computed(() => {
    const example = EXAMPLES[this.key()];
    if (!example) throw new Error(`[kitchen-sink] unknown example "${this.key()}"`);
    return example;
  });

  /** Each example gets its own environment injector, so its provideSpotlight() is independent. */
  protected readonly environment = computed(() => {
    const env = createEnvironmentInjector(this.example().providers, this.parent, `example:${this.key()}`);
    this.created.push(env);
    return env;
  });

  protected readonly highlighted = computed(() =>
    Prism.highlight(SOURCES[this.key()] ?? '', Prism.languages['typescript'], 'typescript'),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.created.forEach((env) => env.destroy()));
  }
}
