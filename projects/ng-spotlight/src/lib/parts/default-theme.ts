import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * The default theme: CSS variables only, light and dark. Variables sit on :where(:root)
 * (zero specificity) so apps override them with a plain :root or pane-class rule. Every
 * other rule is scoped under .sp-theme-default (set on the pane/backdrop by the host).
 */
export const SPOTLIGHT_DEFAULT_CSS = `
:where(:root) {
  --sp-bg: #ffffff;
  --sp-fg: #1f2328;
  --sp-muted: #59636e;
  --sp-accent: #0969da;
  --sp-accent-fg: #ffffff;
  --sp-active-bg: #ddf4ff;
  --sp-border: #d1d9e0;
  --sp-backdrop: rgba(31, 35, 40, 0.4);
  --sp-radius: 12px;
  --sp-font: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --sp-shadow: 0 16px 48px rgba(31, 35, 40, 0.24);
  --sp-info: #0969da;
  --sp-success: #1a7f37;
  --sp-warn: #9a6700;
  --sp-danger: #d1242f;
}
@media (prefers-color-scheme: dark) {
  :where(:root:not(.sp-light)) {
    --sp-bg: #151b23;
    --sp-fg: #f0f6fc;
    --sp-muted: #9198a1;
    --sp-accent: #4493f8;
    --sp-accent-fg: #0d1117;
    --sp-active-bg: #1d2d44;
    --sp-border: #3d444d;
    --sp-backdrop: rgba(1, 4, 9, 0.6);
    --sp-shadow: 0 16px 48px rgba(1, 4, 9, 0.6);
    --sp-info: #4493f8;
    --sp-success: #3fb950;
    --sp-warn: #d29922;
    --sp-danger: #f85149;
  }
}
:where(.sp-dark) {
  --sp-bg: #151b23;
  --sp-fg: #f0f6fc;
  --sp-muted: #9198a1;
  --sp-accent: #4493f8;
  --sp-accent-fg: #0d1117;
  --sp-active-bg: #1d2d44;
  --sp-border: #3d444d;
  --sp-backdrop: rgba(1, 4, 9, 0.6);
  --sp-shadow: 0 16px 48px rgba(1, 4, 9, 0.6);
  --sp-info: #4493f8;
  --sp-success: #3fb950;
  --sp-warn: #d29922;
  --sp-danger: #f85149;
}
.sp-backdrop.sp-theme-default { background: var(--sp-backdrop); }
.sp-theme-default .sp-dialog {
  box-sizing: border-box; display: flex; flex-direction: column; width: 100%; max-height: min(70vh, 640px);
  background: var(--sp-bg); color: var(--sp-fg); font-family: var(--sp-font); font-size: 14px;
  border: 1px solid var(--sp-border); border-radius: var(--sp-radius); box-shadow: var(--sp-shadow); overflow: hidden;
}
.sp-theme-default.sp-sheet .sp-dialog { height: 100%; max-height: none; border: 0; border-radius: 0; }
.sp-theme-default .sp-input { display: flex; align-items: center; border-bottom: 1px solid var(--sp-border); }
.sp-theme-default .sp-input:focus-within { box-shadow: inset 0 -2px 0 var(--sp-accent); }
.sp-theme-default .sp-input-el {
  flex: 1; min-width: 0; padding: 16px; border: 0; outline: none; background: transparent; color: inherit; font: inherit; font-size: 16px;
}
.sp-theme-default .sp-input-el::placeholder { color: var(--sp-muted); }
.sp-theme-default .sp-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px; border-bottom: 1px solid var(--sp-border); }
.sp-theme-default .sp-chip-button { padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; border-radius: 999px; }
.sp-theme-default .sp-chip { display: inline-block; padding: 2px 10px; border: 1px solid var(--sp-border); border-radius: 999px; color: var(--sp-muted); }
.sp-theme-default .sp-chip-active { background: var(--sp-accent); border-color: var(--sp-accent); color: var(--sp-accent-fg); }
.sp-theme-default .sp-list { flex: 1; overflow-y: auto; padding: 4px 0; outline: none; }
.sp-theme-default .sp-group + .sp-group { border-top: 1px solid var(--sp-border); }
.sp-theme-default .sp-group-header {
  display: flex; align-items: center; gap: 8px; padding: 8px 16px 4px; color: var(--sp-muted);
  font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
}
.sp-theme-default .sp-group-total { font-weight: 400; }
.sp-theme-default .sp-option { display: flex; align-items: center; gap: 12px; padding: 8px 16px; cursor: pointer; }
.sp-theme-default .sp-option[aria-selected='true'] { background: var(--sp-active-bg); box-shadow: inset 3px 0 0 var(--sp-accent); }
.sp-theme-default .sp-icon { display: inline-flex; justify-content: center; width: 20px; color: var(--sp-muted); }
.sp-theme-default .sp-icon img { width: 20px; height: 20px; object-fit: contain; }
.sp-theme-default .sp-text { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.sp-theme-default .sp-title, .sp-theme-default .sp-subtitle { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sp-theme-default .sp-subtitle { color: var(--sp-muted); font-size: 12px; }
.sp-theme-default .sp-badges { display: inline-flex; gap: 4px; }
.sp-theme-default .sp-badge { padding: 0 6px; background: var(--sp-bg); border: 1px solid currentColor; border-radius: 4px; font-size: 11px; line-height: 18px; color: var(--sp-info); }
.sp-theme-default .sp-badge[data-tone='success'] { color: var(--sp-success); }
.sp-theme-default .sp-badge[data-tone='warn'] { color: var(--sp-warn); }
.sp-theme-default .sp-badge[data-tone='danger'] { color: var(--sp-danger); }
.sp-theme-default .sp-error { flex: 1; color: var(--sp-muted); }
.sp-theme-default .sp-retry { color: var(--sp-accent); text-decoration: underline; }
.sp-theme-default .sp-empty { padding: 24px 16px; text-align: center; color: var(--sp-muted); }
.sp-theme-default .sp-footer {
  display: flex; flex-wrap: wrap; gap: 16px; padding: 8px 16px; border-top: 1px solid var(--sp-border); color: var(--sp-muted); font-size: 12px;
}
.sp-theme-default .sp-footer kbd { padding: 0 4px; border: 1px solid var(--sp-border); border-radius: 4px; font-family: inherit; }
.sp-theme-default .sp-spinner {
  width: 10px; height: 10px; border: 2px solid var(--sp-border); border-top-color: var(--sp-accent); border-radius: 50%;
  animation: sp-spin 0.8s linear infinite;
}
@keyframes sp-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .sp-theme-default .sp-spinner { animation: none; } }
`;

/** Rendered by <spotlight-host> only when theme is 'default'; theme 'none' never loads this CSS. */
@Component({
  selector: 'spotlight-theme-default',
  template: '',
  styles: [SPOTLIGHT_DEFAULT_CSS],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:none' },
})
export class SpotlightDefaultTheme {}
