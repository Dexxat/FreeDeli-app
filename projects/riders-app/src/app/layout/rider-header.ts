import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'fd-rider-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <div class="marca">
        <span class="casco"><img src="brand/casco-header.svg" width="36" height="26" alt="" class="fd-pixel" /></span>
        <span class="nombre">
          <span class="free">Free<span class="deli">Deli</span></span>
          <span class="app">RIDERS</span>
        </span>
      </div>
      <span class="pill" [class.on]="disponible()" role="status">
        <span class="punto" aria-hidden="true"></span>{{ disponible() ? 'EN LÍNEA' : 'OFFLINE' }}
      </span>
    </header>
  `,
  styles: `
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      padding-top: max(14px, env(safe-area-inset-top));
      background: var(--fd-navy-900);
      border-bottom: 4px solid var(--fd-navy-700);
    }
    .marca { display: flex; align-items: center; gap: 10px; }
    .casco {
      width: 44px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      background: var(--fd-blue-50);
    }
    .nombre { display: flex; flex-direction: column; gap: 6px; font-family: var(--fd-font-pixel); line-height: 1; }
    .free { font-size: 13px; }
    .deli, .app { color: var(--fd-blue-300); }
    .app { font-size: 8px; letter-spacing: 3px; }
    .pill {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px;
      background: var(--fd-navy-700); color: var(--fd-blue-100);
      font-family: var(--fd-font-pixel); font-size: 9px; line-height: 1;
    }
    .punto { width: 8px; height: 8px; background: var(--fd-blue-300); }
    .pill.on { background: var(--fd-yellow-400); color: var(--fd-navy-900); }
    .pill.on .punto { background: var(--fd-navy-900); }
  `,
})
export class RiderHeader {
  readonly disponible = input(false);
}
