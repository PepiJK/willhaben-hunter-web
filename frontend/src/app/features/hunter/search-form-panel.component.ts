import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarketplaceScrapeRequest, MetaResponse } from '../../core/api/willhaben-api.models';

@Component({
  selector: 'app-search-form-panel',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="rounded-xl border border-slate-800 bg-slate-900 p-5"
      aria-labelledby="search-panel-heading"
    >
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="search-panel-heading" class="text-base font-semibold text-slate-100">
            Marktplatz search
          </h2>
          <p class="text-xs text-slate-400">
            Configure search filters or import an existing Willhaben CLI JSON export.
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
          (click)="openImport.emit()"
        >
          Import JSON
        </button>
      </div>

      <form (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div class="md:col-span-5">
            <label for="query-input" class="mb-1.5 block text-xs font-medium text-slate-300">
              Search keyword
            </label>
            <input
              id="query-input"
              name="query"
              type="text"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
              placeholder="e.g. Gravelbike, Espresso Maschine, ThinkPad"
              maxlength="200"
              required
              class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div class="md:col-span-2">
            <label for="price-min-input" class="mb-1.5 block text-xs font-medium text-slate-300">
              Price min (€)
            </label>
            <input
              id="price-min-input"
              name="priceMin"
              type="number"
              min="0"
              [ngModel]="priceMin()"
              (ngModelChange)="priceMin.set(parseOptionalNumber($event))"
              placeholder="0"
              class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm tabular-nums text-slate-100 placeholder-slate-500 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div class="md:col-span-2">
            <label for="price-max-input" class="mb-1.5 block text-xs font-medium text-slate-300">
              Price max (€)
            </label>
            <input
              id="price-max-input"
              name="priceMax"
              type="number"
              min="0"
              [ngModel]="priceMax()"
              (ngModelChange)="priceMax.set(parseOptionalNumber($event))"
              placeholder="2000"
              class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm tabular-nums text-slate-100 placeholder-slate-500 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div class="md:col-span-3">
            <label for="sort-select" class="mb-1.5 block text-xs font-medium text-slate-300">
              Sort order
            </label>
            <select
              id="sort-select"
              name="sort"
              [ngModel]="sort()"
              (ngModelChange)="sort.set($event)"
              class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
            >
              <option value="">Standard (Relevanz)</option>
              @for (opt of meta()?.marketplace?.sortOrders ?? []; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </div>
        </div>

        <div>
          <span class="mb-2 block text-xs font-medium text-slate-300">Bundesländer</span>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Bundesländer filter">
            @for (area of meta()?.marketplace?.areas ?? []; track area.value) {
              @let selected = selectedAreas().includes(area.value);
              <button
                type="button"
                [attr.aria-pressed]="selected"
                (click)="toggleArea(area.value)"
                class="rounded-full border px-3 py-1 text-xs font-medium transition"
                [class]="
                  selected
                    ? 'border-sky-400/60 bg-sky-500/20 text-sky-300'
                    : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600'
                "
              >
                {{ area.label }}
              </button>
            }
          </div>
        </div>

        @if (isWienSelected()) {
          <div class="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-xs font-medium text-slate-300">Vienna districts (1–23)</span>
              @if (selectedDistricts().length > 0) {
                <button
                  type="button"
                  (click)="selectedDistricts.set([])"
                  class="text-xs text-slate-400 hover:text-slate-200"
                >
                  Clear districts
                </button>
              }
            </div>
            <div class="flex flex-wrap gap-1.5" role="group" aria-label="Vienna districts filter">
              @for (district of meta()?.marketplace?.wienDistricts ?? []; track district.value) {
                @let active = selectedDistricts().includes(district.value);
                <button
                  type="button"
                  [attr.aria-pressed]="active"
                  (click)="toggleDistrict(district.value)"
                  [title]="district.label"
                  class="rounded border px-2 py-0.5 font-mono text-xs tabular-nums transition"
                  [class]="
                    active
                      ? 'border-sky-400/60 bg-sky-500/20 text-sky-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  "
                >
                  {{ district.value }}
                </button>
              }
            </div>
          </div>
        }

        <div class="flex flex-wrap items-end justify-between gap-4 border-t border-slate-800 pt-4">
          <div class="flex flex-wrap items-center gap-6">
            <div>
              <label for="limit-input" class="mb-1 block text-xs font-medium text-slate-300">
                Max listings (1–<span class="font-mono tabular-nums">{{ maxLimit() }}</span
                >)
              </label>
              <input
                id="limit-input"
                name="limit"
                type="number"
                min="1"
                [max]="maxLimit()"
                [ngModel]="limit()"
                (ngModelChange)="limit.set(parseLimit($event))"
                class="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-sm tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>

            <label class="flex cursor-pointer items-center gap-2 pt-4 text-sm text-slate-300">
              <input
                type="checkbox"
                name="skipDetails"
                [ngModel]="skipDetails()"
                (ngModelChange)="onSkipDetailsChange($event)"
                class="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500"
              />
              <span>Skip detail pages (faster, up to 250)</span>
            </label>
          </div>

          <div class="flex items-center gap-3">
            @if (validationError()) {
              <p class="text-xs text-red-300" role="alert">{{ validationError() }}</p>
            }
            <button
              type="submit"
              [disabled]="scraping() || !!validationError()"
              class="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ scraping() ? 'Scraping…' : 'Start scrape' }}
            </button>
          </div>
        </div>
      </form>
    </section>
  `,
})
export class SearchFormPanelComponent {
  readonly meta = input<MetaResponse | null>(null);
  readonly initialRequest = input.required<MarketplaceScrapeRequest>();
  readonly scraping = input<boolean>(false);

  readonly submitScrape = output<MarketplaceScrapeRequest>();
  readonly openImport = output<void>();

  readonly query = signal<string>('');
  readonly priceMin = signal<number | undefined>(undefined);
  readonly priceMax = signal<number | undefined>(undefined);
  readonly sort = signal<string>('');
  readonly selectedAreas = signal<string[]>([]);
  readonly selectedDistricts = signal<number[]>([]);
  readonly limit = signal<number>(25);
  readonly skipDetails = signal<boolean>(false);

  readonly isWienSelected = computed(() => this.selectedAreas().includes('wien'));

  readonly maxLimit = computed(() => {
    const limits = this.meta()?.marketplace?.limits;
    const withDetails = limits?.maxWithDetails ?? 100;
    const withoutDetails = limits?.maxSkipDetails ?? 250;
    return this.skipDetails() ? withoutDetails : withDetails;
  });

  readonly validationError = computed(() => {
    if (this.query().trim().length === 0) {
      return 'Search keyword is required.';
    }
    const min = this.priceMin();
    const max = this.priceMax();
    if (min !== undefined && max !== undefined && min > max) {
      return 'Price min must be <= price max.';
    }
    const lim = this.limit();
    if (!Number.isInteger(lim) || lim < 1 || lim > this.maxLimit()) {
      return `Limit must be between 1 and ${this.maxLimit()}.`;
    }
    return null;
  });

  constructor() {
    effect(() => {
      const req = this.initialRequest();
      this.query.set(req.query);
      this.priceMin.set(req.priceMin);
      this.priceMax.set(req.priceMax);
      this.sort.set(req.sort ?? '');
      this.selectedAreas.set(req.area ?? []);
      this.selectedDistricts.set(req.wienDistricts ?? []);
      this.limit.set(req.limit);
      this.skipDetails.set(req.skipDetails);
    });
  }

  toggleArea(areaValue: string): void {
    this.selectedAreas.update((current) => {
      const next = current.includes(areaValue)
        ? current.filter((a) => a !== areaValue)
        : [...current, areaValue];
      if (!next.includes('wien')) {
        this.selectedDistricts.set([]);
      }
      return next;
    });
  }

  toggleDistrict(num: number): void {
    this.selectedDistricts.update((current) =>
      current.includes(num)
        ? current.filter((d) => d !== num)
        : [...current, num].sort((a, b) => a - b),
    );
  }

  onSkipDetailsChange(nextSkip: boolean): void {
    this.skipDetails.set(nextSkip);
    const max = this.maxLimit();
    if (this.limit() > max) {
      this.limit.set(max);
    }
  }

  parseOptionalNumber(raw: unknown): number | undefined {
    if (raw === '' || raw === null || raw === undefined) {
      return undefined;
    }
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? num : undefined;
  }

  parseLimit(raw: unknown): number {
    const num = Number(raw);
    return Number.isFinite(num) ? Math.trunc(num) : 25;
  }

  onSubmit(): void {
    if (this.validationError() || this.scraping()) {
      return;
    }

    const req: MarketplaceScrapeRequest = {
      mode: 'marketplace',
      query: this.query().trim(),
      limit: this.limit(),
      skipDetails: this.skipDetails(),
    };

    if (this.priceMin() !== undefined) {
      req.priceMin = this.priceMin();
    }
    if (this.priceMax() !== undefined) {
      req.priceMax = this.priceMax();
    }
    if (this.sort()) {
      req.sort = this.sort();
    }
    if (this.selectedAreas().length > 0) {
      req.area = this.selectedAreas();
    }
    if (this.isWienSelected() && this.selectedDistricts().length > 0) {
      req.wienDistricts = this.selectedDistricts();
    }

    this.submitScrape.emit(req);
  }
}
