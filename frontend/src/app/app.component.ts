import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HunterPageComponent } from './features/hunter/hunter-page.component';

@Component({
  selector: 'app-root',
  imports: [HunterPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `<app-hunter-page />`,
})
export class AppComponent {}
