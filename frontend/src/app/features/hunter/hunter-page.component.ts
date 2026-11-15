import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SessionStore } from '../../core/session/session.store';
import { AiAnalyzerPanelComponent } from './ai-analyzer-panel.component';
import { ImportDialogComponent } from './import-dialog.component';
import { KpiStripComponent } from './kpi-strip.component';
import { ResultsLedgerTableComponent } from './results-ledger-table.component';
import { SearchFormPanelComponent } from './search-form-panel.component';

@Component({
  selector: 'app-hunter-page',
  imports: [
    SearchFormPanelComponent,
    ImportDialogComponent,
    KpiStripComponent,
    AiAnalyzerPanelComponent,
    ResultsLedgerTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-screen bg-[#0b1120] text-slate-100' },
  template: `
    <div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header
        class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 px-5 py-3.5"
      >
        <div class="flex items-center gap-3">
          <h1 class="text-lg font-semibold tracking-tight text-slate-100">Willhaben Hunter</h1>
          <span
            class="rounded-md border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300"
          >
            Marktplatz
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div
            role="status"
            class="flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            [class]="
              store.isScraping()
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-teal-400/40 bg-teal-400/10 text-teal-300'
            "
          >
            <span
              class="h-2 w-2 rounded-full"
              [class]="store.isScraping() ? 'bg-amber-400 animate-pulse' : 'bg-teal-400'"
            ></span>
            @if (store.isScraping()) {
              <span>Scraping… {{ store.currentProgress() ?? 'working' }}</span>
            } @else {
              <span>Ready</span>
            }
          </div>

          <button
            type="button"
            (click)="importOpen.set(true)"
            class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
          >
            Import JSON
          </button>

          <button
            type="button"
            (click)="store.clearSession()"
            class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500/50 hover:text-red-300"
          >
            Clear session
          </button>
        </div>
      </header>

      @if (store.errorBanner(); as errorMsg) {
        <div
          role="alert"
          class="rounded-xl border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-200"
        >
          {{ errorMsg }}
        </div>
      }

      @if (store.infoNotice(); as infoMsg) {
        <div
          role="status"
          class="rounded-xl border border-sky-500/40 bg-sky-950/30 px-4 py-3 text-sm text-sky-200"
        >
          {{ infoMsg }}
        </div>
      }

      @if (store.quotaWarning()) {
        <div
          role="status"
          class="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs text-amber-200"
        >
          Browser storage quota exceeded: search parameters and job ID remain saved, but the full
          listing array could not be persisted in localStorage.
        </div>
      }

      <app-search-form-panel
        [meta]="store.meta()"
        [initialRequest]="store.searchRequest()"
        [scraping]="store.isScraping()"
        (submitScrape)="store.startScrape($event)"
        (openImport)="importOpen.set(true)"
      />

      <app-kpi-strip
        [itemCount]="store.items().length"
        [querySummary]="store.querySummary()"
        [searchUrl]="store.searchUrl()"
        [sourceKind]="store.sourceKind()"
        [durationMs]="store.durationMs()"
        [topPickCount]="store.topPickCount()"
        [anthropicConfigured]="store.anthropicConfigured()"
        [modelName]="store.modelName()"
      />

      <app-ai-analyzer-panel
        [initialPrompt]="store.prompt()"
        [itemCount]="store.items().length"
        [anthropicConfigured]="store.anthropicConfigured()"
        [analyzing]="store.analyzing()"
        [analysis]="store.analysis()"
        (promptChange)="store.updatePrompt($event)"
        (analyze)="store.runAnalysis($event)"
      />

      <app-results-ledger-table [items]="store.items()" />

      <app-import-dialog
        [open]="importOpen()"
        (closed)="importOpen.set(false)"
        (imported)="store.importItems($event)"
      />
    </div>
  `,
})
export class HunterPageComponent implements OnInit {
  protected readonly store = inject(SessionStore);
  protected readonly importOpen = signal<boolean>(false);

  ngOnInit(): void {
    void this.store.initialize();
  }
}
