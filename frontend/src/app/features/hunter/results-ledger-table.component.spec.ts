import { TestBed } from '@angular/core/testing';
import cliExportFixture from '../../../../../contracts/fixtures/cli-export.marketplace.json';
import { ResultsLedgerTableComponent } from './results-ledger-table.component';

describe('ResultsLedgerTableComponent', () => {
  it('filters listings, toggles full description, and triggers JSON/CSV exports', async () => {
    await TestBed.configureTestingModule({
      imports: [ResultsLedgerTableComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ResultsLedgerTableComponent);
    fixture.componentRef.setInput('items', cliExportFixture);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('tbody tr')).toHaveLength(3);

    // Filter by 'Torpedo'
    fixture.componentInstance.filterText.set('Torpedo');
    fixture.detectChanges();
    expect(el.querySelectorAll('tbody tr')).toHaveLength(1);

    // Toggle description expansion
    const expandBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Show full description'),
    )!;
    expandBtn.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Show less');

    // Exports
    const createObjectURL = vi.fn(() => 'blob:export-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const jsonBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Download JSON'),
    )!;
    const csvBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Download CSV'),
    )!;
    jsonBtn.click();
    csvBtn.click();

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(clickSpy).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
    clickSpy.mockRestore();
  });
});
