import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1>&#64;tocdk/ng-spotlight kitchen sink</h1>`,
})
export class App {}
