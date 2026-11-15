import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WillhabenItem } from '../../core/api/willhaben-api.models';
import {
  buildExportFilename,
  downloadTextFile,
  serializeItemsToCsv,
} from '../../core/export/csv-export';
import { exportItemsAsJson } from '../../core/export/json-export';
import { StickyTableHeaderDirective } from '../../shared/directives/sticky-table-header.directive';
import { SafeWillhabenUrlPipe } from '../../shared/pipes/safe-willhaben-url.pipe';

@Component({
  selector: 'app-results-ledger-table',
  imports: [FormsModule, StickyTableHeaderDirective, SafeWillhabenUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="rounded-xl border border-slate-800 bg-slate-900 p-5"
      aria-labelledby="ledger-heading"
    >
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="ledger-heading" class="text-base font-semibold text-slate-100">
            Listings ledger
          </h2>
          <p class="text-xs text-slate-400">
            Showing
            <span class="font-mono font-semibold tabular-nums text-slate-200">
              {{ filteredItems().length }}
            </span>
            of
            <span class="font-mono font-semibold tabular-nums text-slate-200">
              {{ items().length }}
            </span>
            listings
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <input
            type="search"
            aria-label="Filter listings"
            [ngModel]="filterText()"
            (ngModelChange)="filterText.set($event)"
            placeholder="Filter title, attributes, description…"
            class="w-60 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-400 focus:outline-none"
          />
          <button
            type="button"
            [disabled]="items().length === 0"
            (click)="downloadJson()"
            class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Download JSON
          </button>
          <button
            type="button"
            [disabled]="items().length === 0"
            (click)="downloadCsv()"
            class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Download CSV
          </button>
        </div>
      </div>

      @if (items().length === 0) {
        <div
          class="rounded-lg border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center"
        >
          <p class="text-sm text-slate-300">No listings loaded yet.</p>
          <p class="mt-1 text-xs text-slate-500">
            Run a Marktplatz scrape above or import a Willhaben CLI JSON export.
          </p>
        </div>
      } @else {
        <div class="relative overflow-auto rounded-lg border border-slate-800">
          <table class="min-w-full border-collapse text-left text-xs">
            <thead appStickyHeader class="bg-slate-950 text-slate-300">
              <tr class="border-b border-slate-800">
                <th scope="col" class="px-3 py-2.5 font-medium">ID</th>
                <th scope="col" class="px-3 py-2.5 font-medium">Listing</th>
                <th scope="col" class="px-3 py-2.5 font-medium">Price</th>
                <th scope="col" class="px-3 py-2.5 font-medium">Attributes</th>
                <th scope="col" class="px-3 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/80 bg-slate-900">
              @for (item of filteredItems(); track item.id) {
                <tr class="align-top hover:bg-slate-800/40">
                  <td class="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-slate-400">
                    {{ item.id }}
                  </td>
                  <td class="max-w-sm px-3 py-2.5 text-slate-100">
                    @if (item.url | safeWillhabenUrl; as safeUrl) {
                      <a
                        [href]="safeUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="font-medium text-sky-400 hover:underline"
                      >
                        {{ item.title }}
                      </a>
                    } @else {
                      <span class="font-medium">{{ item.title }}</span>
                    }
                  </td>
                  <td
                    class="whitespace-nowrap px-3 py-2.5 font-mono font-semibold tabular-nums text-slate-200"
                  >
                    {{ item.price ?? '—' }}
                  </td>
                  <td class="max-w-xs px-3 py-2.5 text-slate-300">
                    {{ item.attributes ?? '—' }}
                  </td>
                  <td class="max-w-md px-3 py-2.5 text-slate-300">
                    @if (item.description) {
                      @let expanded = expandedIds().has(item.id);
                      <p [class]="expanded ? 'whitespace-pre-line' : 'line-clamp-2'">
                        {{ item.description }}
                      </p>
                      <button
                        type="button"
                        (click)="toggleExpanded(item.id)"
                        class="mt-1 text-xs text-sky-400 hover:underline"
                      >
                        {{ expanded ? 'Show less' : 'Show full description' }}
                      </button>
                    } @else {
                      <span class="text-slate-500">—</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class ResultsLedgerTableComponent {
  readonly items = input<WillhabenItem[]>([]);

  readonly filterText = signal<string>('');
  readonly expandedIds = signal<Set<string>>(new Set());

  readonly filteredItems = computed(() => {
    const query = this.filterText().trim().toLowerCase();
    const list = this.items();
    if (!query) {
      return list;
    }

    return list.filter((item) => {
      const haystack = [
        item.id,
        item.title,
        item.price ?? '',
        item.attributes ?? '',
        item.description ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  });

  toggleExpanded(id: string): void {
    this.expandedIds.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  downloadJson(): void {
    if (this.items().length === 0) {
      return;
    }
    exportItemsAsJson(this.items());
  }

  downloadCsv(): void {
    if (this.items().length === 0) {
      return;
    }
    const csv = serializeItemsToCsv(this.items());
    downloadTextFile(csv, 'text/csv;charset=utf-8', buildExportFilename('csv'));
  }
}
