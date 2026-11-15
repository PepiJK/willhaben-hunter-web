import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WillhabenItem } from '../../core/api/willhaben-api.models';
import { parseImportedListingsJson } from '../../core/import/json-import';

@Component({
  selector: 'app-import-dialog',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
      >
        <div
          class="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl"
        >
          <div class="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 id="import-dialog-title" class="text-base font-semibold text-slate-100">
                Import listings JSON
              </h2>
              <p class="text-xs text-slate-400">
                Accepts a Willhaben CLI array ([...]) or an export object with an items array.
              </p>
            </div>
            <button
              type="button"
              (click)="closeDialog()"
              class="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          <div class="flex flex-col gap-3">
            <div>
              <label for="json-file-input" class="mb-1 block text-xs font-medium text-slate-300">
                Upload .json file
              </label>
              <input
                id="json-file-input"
                type="file"
                accept=".json,application/json"
                (change)="onFileSelected($event)"
                class="block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border file:border-slate-700 file:bg-slate-950 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-200 hover:file:bg-slate-800"
              />
            </div>

            <div>
              <label for="json-paste-input" class="mb-1 block text-xs font-medium text-slate-300">
                Or paste JSON payload
              </label>
              <textarea
                id="json-paste-input"
                rows="8"
                [ngModel]="rawJson()"
                (ngModelChange)="rawJson.set($event)"
                placeholder='[{"id":"911861422","title":"Männershirt","price":"€ 8","url":"https://www.willhaben.at/iad/kaufen-und-verkaufen/d/maennershirt-911861422/"}]'
                class="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-100 placeholder-slate-600 focus:border-sky-400 focus:outline-none"
              ></textarea>
            </div>

            @if (rawJson().trim().length > 0) {
              @let preview = parsedPreview();
              <div class="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs">
                @if (preview.parseError) {
                  <p class="text-red-300">{{ preview.parseError }}</p>
                } @else {
                  <p class="text-emerald-300">
                    Valid listings ready:
                    <span class="font-mono font-semibold tabular-nums">
                      {{ preview.items.length }}
                    </span>
                  </p>
                  @if (preview.rejected.length > 0) {
                    <p class="mt-1 text-amber-300">
                      Rejected rows:
                      <span class="font-mono font-semibold tabular-nums">
                        {{ preview.rejected.length }}
                      </span>
                    </p>
                    <ul
                      class="mt-1 max-h-24 list-disc space-y-0.5 overflow-auto pl-4 text-amber-200/80"
                    >
                      @for (rej of preview.rejected; track rej.index) {
                        <li>{{ rej.reason }}</li>
                      }
                    </ul>
                  }
                }
              </div>
            }
          </div>

          <div class="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-3">
            <button
              type="button"
              (click)="closeDialog()"
              class="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              [disabled]="parsedPreview().items.length === 0"
              (click)="confirmImport()"
              class="rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Import listings
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ImportDialogComponent {
  readonly open = input<boolean>(false);
  readonly closed = output<void>();
  readonly imported = output<WillhabenItem[]>();

  readonly rawJson = signal<string>('');

  readonly parsedPreview = computed(() => {
    const text = this.rawJson().trim();
    if (!text) {
      return { items: [] as WillhabenItem[], rejected: [] };
    }
    return parseImportedListingsJson(text);
  });

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.rawJson.set(reader.result);
      }
    };
    reader.readAsText(file);
  }

  confirmImport(): void {
    const preview = this.parsedPreview();
    if (preview.items.length === 0) {
      return;
    }
    this.imported.emit(preview.items);
    this.rawJson.set('');
    this.closed.emit();
  }

  closeDialog(): void {
    this.closed.emit();
  }
}
