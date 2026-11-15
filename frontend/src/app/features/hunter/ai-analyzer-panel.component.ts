import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnalyzeResponse, AnalyzeVerdict } from '../../core/api/willhaben-api.models';
import { SafeWillhabenUrlPipe } from '../../shared/pipes/safe-willhaben-url.pipe';

export const ANALYZER_PRESET_PROMPTS: readonly string[] = [
  'Bestes Preis-Leistungs-Verhältnis',
  'Defekte & Red Flags prüfen',
  'Top 5 Empfehlungen mit Begründung',
];

@Component({
  selector: 'app-ai-analyzer-panel',
  imports: [FormsModule, SafeWillhabenUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="rounded-xl border border-slate-800 bg-slate-900 p-5"
      aria-labelledby="ai-panel-heading"
    >
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="ai-panel-heading" class="text-base font-semibold text-slate-100">
            Claude Haiku 5.5 analyzer
          </h2>
          <p class="text-xs text-slate-400">
            Evaluates loaded listings against your criteria and verifies every listing link on the
            server.
          </p>
        </div>

        @if (!anthropicConfigured()) {
          <span
            class="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300"
          >
            ANTHROPIC_API_KEY not configured
          </span>
        }
      </div>

      <div class="mb-3 flex flex-wrap gap-2">
        @for (preset of presets; track preset) {
          <button
            type="button"
            (click)="selectPreset(preset)"
            class="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-400/60 hover:text-sky-300"
          >
            {{ preset }}
          </button>
        }
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex-1">
          <label for="analyze-prompt" class="mb-1.5 block text-xs font-medium text-slate-300">
            Evaluation prompt
          </label>
          <textarea
            id="analyze-prompt"
            rows="2"
            [ngModel]="promptText()"
            (ngModelChange)="onPromptInput($event)"
            maxlength="4000"
            placeholder="Describe what matters most for this purchase…"
            class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-400 focus:outline-none"
          ></textarea>
        </div>

        <button
          type="button"
          [disabled]="!canAnalyze()"
          (click)="onAnalyze()"
          class="shrink-0 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ analyzing() ? 'Analyzing…' : 'Analyze with Haiku 5.5' }}
        </button>
      </div>

      @if (analysis(); as res) {
        <div class="mt-5 flex flex-col gap-4 border-t border-slate-800 pt-4">
          <div class="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div
              class="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"
            >
              <span>
                Evaluated
                <span class="font-mono font-semibold tabular-nums text-slate-200">
                  {{ res.totalEvaluated }}
                </span>
                listings · Model <span class="font-mono text-slate-300">{{ res.model }}</span>
              </span>
              @if (res.truncatedFields > 0 || res.droppedRecommendations > 0) {
                <span class="font-mono text-xs tabular-nums text-amber-300">
                  @if (res.truncatedFields > 0) {
                    {{ res.truncatedFields }} field(s) truncated
                  }
                  @if (res.truncatedFields > 0 && res.droppedRecommendations > 0) {
                    ·
                  }
                  @if (res.droppedRecommendations > 0) {
                    {{ res.droppedRecommendations }} unverified pick(s) dropped
                  }
                </span>
              }
            </div>
            <p class="text-sm leading-relaxed text-slate-200">{{ res.summary }}</p>
          </div>

          <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
            @for (rec of res.recommendations; track rec.id) {
              <article class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div class="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-semibold tabular-nums text-slate-400">
                      #{{ rec.rank }}
                    </span>
                    <span
                      class="rounded-full border px-2 py-0.5 text-xs font-medium"
                      [class]="verdictBadgeClass(rec.verdict)"
                    >
                      {{ rec.verdict }}
                    </span>
                  </div>
                  <span class="font-mono text-sm font-semibold tabular-nums text-slate-100">
                    {{ rec.fitScore }}/100
                  </span>
                </div>

                <div class="mb-1 flex items-baseline justify-between gap-3">
                  @if (rec.url | safeWillhabenUrl; as safeUrl) {
                    <a
                      [href]="safeUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-sm font-semibold text-sky-400 hover:underline"
                    >
                      {{ rec.title }}
                    </a>
                  } @else {
                    <span class="text-sm font-semibold text-slate-100">{{ rec.title }}</span>
                  }

                  @if (rec.price) {
                    <span
                      class="shrink-0 font-mono text-sm font-semibold tabular-nums text-slate-200"
                    >
                      {{ rec.price }}
                    </span>
                  }
                </div>

                <p class="mb-3 text-xs leading-relaxed text-slate-300">{{ rec.justification }}</p>

                <div class="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  @if (rec.pros.length > 0) {
                    <div>
                      <div class="mb-1 font-medium text-teal-400">Pros</div>
                      <ul class="list-disc space-y-0.5 pl-4 text-slate-300">
                        @for (pro of rec.pros; track $index) {
                          <li>{{ pro }}</li>
                        }
                      </ul>
                    </div>
                  }
                  @if (rec.cons.length > 0) {
                    <div>
                      <div class="mb-1 font-medium text-amber-300">Cons</div>
                      <ul class="list-disc space-y-0.5 pl-4 text-slate-300">
                        @for (con of rec.cons; track $index) {
                          <li>{{ con }}</li>
                        }
                      </ul>
                    </div>
                  }
                </div>
              </article>
            }
          </div>
        </div>
      }
    </section>
  `,
})
export class AiAnalyzerPanelComponent {
  readonly presets = ANALYZER_PRESET_PROMPTS;

  readonly initialPrompt = input<string>('Bestes Preis-Leistungs-Verhältnis');
  readonly itemCount = input<number>(0);
  readonly anthropicConfigured = input<boolean>(false);
  readonly analyzing = input<boolean>(false);
  readonly analysis = input<AnalyzeResponse | null>(null);

  readonly promptChange = output<string>();
  readonly analyze = output<string>();

  readonly promptText = signal<string>('Bestes Preis-Leistungs-Verhältnis');

  constructor() {
    effect(() => {
      this.promptText.set(this.initialPrompt());
    });
  }

  canAnalyze(): boolean {
    return (
      this.itemCount() > 0 &&
      this.anthropicConfigured() &&
      !this.analyzing() &&
      this.promptText().trim().length > 0
    );
  }

  selectPreset(preset: string): void {
    this.promptText.set(preset);
    this.promptChange.emit(preset);
  }

  onPromptInput(value: string): void {
    this.promptText.set(value);
    this.promptChange.emit(value);
  }

  onAnalyze(): void {
    const trimmed = this.promptText().trim();
    if (!trimmed || !this.canAnalyze()) {
      return;
    }
    this.analyze.emit(trimmed);
  }

  verdictBadgeClass(verdict: AnalyzeVerdict): string {
    switch (verdict) {
      case 'top-pick':
        return 'border-teal-400/50 bg-teal-400/15 text-teal-300';
      case 'good-alternative':
        return 'border-sky-400/50 bg-sky-500/15 text-sky-300';
      case 'caution':
        return 'border-amber-400/50 bg-amber-400/15 text-amber-300';
    }
  }
}
