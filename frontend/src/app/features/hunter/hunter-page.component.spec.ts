import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import analyzeFixture from '../../../../../contracts/fixtures/analyze-response.json';
import cliExportFixture from '../../../../../contracts/fixtures/cli-export.marketplace.json';
import metaFixture from '../../../../../contracts/fixtures/meta.json';
import { WillhabenApiService } from '../../core/api/willhaben-api.service';
import { AppComponent } from '../../app.component';

describe('AppComponent & HunterPageComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('boots workbench, opens import dialog, imports listings, runs analysis, and clears session', async () => {
    const apiMock = {
      getMeta: vi.fn(() => of(metaFixture)),
      getStatus: vi.fn(() =>
        of({
          scraping: false,
          currentJobId: null,
          currentMode: null,
          currentProgress: null,
          startedAt: null,
          anthropicConfigured: true,
          model: 'claude-haiku-5-5',
        }),
      ),
      pollScrapeJob: vi.fn(),
      startScrape: vi.fn(() => throwError(() => new Error('Scrape rejected for test'))),
      analyze: vi.fn(() => of(analyzeFixture)),
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: WillhabenApiService, useValue: apiMock }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Willhaben Hunter');
    expect(el.textContent).toContain('Marktplatz');
    expect(el.textContent).toContain('Ready');
    expect(el.textContent).toContain('claude-haiku-5-5');

    // Open Import dialog from header button
    const importBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Import JSON'),
    )!;
    importBtn.click();
    fixture.detectChanges();

    const dialogTextarea = el.querySelector('#json-paste-input') as HTMLTextAreaElement;
    expect(dialogTextarea).not.toBeNull();
    dialogTextarea.value = JSON.stringify(cliExportFixture);
    dialogTextarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const confirmImportBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Import listings'),
    )!;
    confirmImportBtn.click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Imported JSON');
    expect(el.querySelectorAll('tbody tr')).toHaveLength(3);

    // Run analysis
    const analyzeBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Analyze with Haiku 5.5'),
    )!;
    analyzeBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(el.textContent).toContain('1 top picks');

    // Clear session
    const clearBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Clear session'),
    )!;
    clearBtn.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('No listings loaded yet.');
  });
});
