import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ItemsSourceKind } from '../../core/session/local-session.storage';
import { SafeWillhabenUrlPipe } from '../../shared/pipes/safe-willhaben-url.pipe';

@Component({
  selector: 'app-kpi-strip',
  imports: [SafeWillhabenUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Session telemetry summary"
    >
      <div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div class="text-xs text-slate-400">Loaded listings</div>
        <div class="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-100">
          {{ itemCount() }}
        </div>
      </div>

      <div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div class="text-xs text-slate-400">Active query</div>
        <div
          class="mt-1 truncate text-sm font-medium text-slate-100"
          [title]="querySummary() ?? ''"
        >
          {{ querySummary() ?? 'No active dataset' }}
        </div>
        @if (searchUrl() | safeWillhabenUrl; as safeUrl) {
          <a
            [href]="safeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-1 inline-block text-xs text-sky-400 hover:underline"
          >
            Open Willhaben search
          </a>
        }
      </div>

      <div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div class="text-xs text-slate-400">Source &amp; duration</div>
        <div class="mt-1 flex items-baseline gap-2">
          <span class="text-sm font-medium text-slate-100">{{ sourceLabel() }}</span>
          @if (formattedDuration()) {
            <span class="font-mono text-sm tabular-nums text-slate-300">
              {{ formattedDuration() }}
            </span>
          }
        </div>
      </div>

      <div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div class="text-xs text-slate-400">AI analysis</div>
        <div class="mt-1 flex items-center justify-between gap-2">
          <span class="font-mono text-sm font-semibold tabular-nums text-teal-400">
            {{ topPickCount() }} top picks
          </span>
          <span
            class="rounded border px-2 py-0.5 font-mono text-xs"
            [class]="
              anthropicConfigured()
                ? 'border-slate-700 bg-slate-950 text-slate-300'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            "
          >
            {{ anthropicConfigured() ? modelName() : 'API key missing' }}
          </span>
        </div>
      </div>
    </section>
  `,
})
export class KpiStripComponent {
  readonly itemCount = input<number>(0);
  readonly querySummary = input<string | null>(null);
  readonly searchUrl = input<string | null>(null);
  readonly sourceKind = input<ItemsSourceKind>(null);
  readonly durationMs = input<number | null>(null);
  readonly topPickCount = input<number>(0);
  readonly anthropicConfigured = input<boolean>(false);
  readonly modelName = input<string>('claude-haiku-5-5');

  readonly sourceLabel = computed(() => {
    const src = this.sourceKind();
    if (src === 'scrape') {
      return 'Live scrape';
    }
    if (src === 'import') {
      return 'Imported JSON';
    }
    return '—';
  });

  readonly formattedDuration = computed(() => {
    const ms = this.durationMs();
    if (ms === null || ms === undefined) {
      return null;
    }
    return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
  });
}
