import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="icon-button"
      [attr.aria-label]="dark() ? 'Switch to light theme' : 'Switch to dark theme'"
      (click)="toggle()"
    >
      <i [class]="dark() ? 'pi pi-sun' : 'pi pi-moon'" aria-hidden="true"></i>
    </button>
  `,
})
export class ThemeToggle {
  private readonly root = inject(DOCUMENT).documentElement;
  protected readonly dark = signal(this.root.classList.contains('sp-dark'));

  protected toggle(): void {
    const dark = !this.dark();
    this.dark.set(dark);
    this.root.classList.toggle('sp-dark', dark);
    this.root.classList.toggle('sp-light', !dark);
    try {
      localStorage.setItem('kitchen-sink:theme', dark ? 'dark' : 'light');
    } catch {
      // Storage blocked: the choice lasts until reload.
    }
  }
}
