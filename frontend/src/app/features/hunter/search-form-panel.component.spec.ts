import { TestBed } from '@angular/core/testing';
import metaFixture from '../../../../../contracts/fixtures/meta.json';
import { type MetaResponse } from '../../core/api/willhaben-api.models';
import { SearchFormPanelComponent } from './search-form-panel.component';

describe('SearchFormPanelComponent', () => {
  it('renders options from meta, shows Vienna districts only when Wien is selected, and switches limit cap with skipDetails', async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFormPanelComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(SearchFormPanelComponent);
    fixture.componentRef.setInput('meta', metaFixture as MetaResponse);
    fixture.componentRef.setInput('initialRequest', {
      mode: 'marketplace',
      query: 'gravelbike',
      limit: 25,
      skipDetails: false,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Niederösterreich');
    expect(el.querySelector('[aria-label="Vienna districts filter"]')).toBeNull();

    // Toggle Wien on -> district chips 1..23 appear
    const wienBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Wien',
    )!;
    wienBtn.click();
    fixture.detectChanges();

    const districtsGroup = el.querySelector('[aria-label="Vienna districts filter"]');
    expect(districtsGroup).not.toBeNull();
    expect(districtsGroup?.querySelectorAll('button')).toHaveLength(23);

    // Select district 7 then clear and re-select
    const d7 = Array.from(districtsGroup!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '7',
    )!;
    d7.click();
    fixture.detectChanges();
    const clearDistrictsBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Clear districts'),
    )!;
    clearDistrictsBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedDistricts()).toEqual([]);

    d7.click();
    fixture.detectChanges();

    // Toggle skipDetails on -> max limit becomes 250; set limit 200; toggle off -> clamped to 100
    const checkbox = el.querySelector('input[name="skipDetails"]') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();
    const limitInput = el.querySelector('#limit-input') as HTMLInputElement;
    expect(limitInput.max).toBe('250');

    fixture.componentInstance.limit.set(200);
    fixture.detectChanges();
    checkbox.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.limit()).toBe(100);
    expect(limitInput.max).toBe('100');

    // Fill optional priceMin/priceMax/sort via input events
    const priceMinInput = el.querySelector('#price-min-input') as HTMLInputElement;
    const priceMaxInput = el.querySelector('#price-max-input') as HTMLInputElement;
    const sortSelect = el.querySelector('#sort-select') as HTMLSelectElement;

    priceMinInput.value = '300';
    priceMinInput.dispatchEvent(new Event('input'));
    priceMaxInput.value = '1500';
    priceMaxInput.dispatchEvent(new Event('input'));
    sortSelect.value = 'neueste';
    sortSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    // Submit emits normalized request
    const emitted: unknown[] = [];
    fixture.componentInstance.submitScrape.subscribe((val) => emitted.push(val));
    const form = el.querySelector('form')!;
    form.dispatchEvent(new Event('submit'));
    expect(emitted).toEqual([
      {
        mode: 'marketplace',
        query: 'gravelbike',
        priceMin: 300,
        priceMax: 1500,
        sort: 'neueste',
        area: ['wien'],
        wienDistricts: [7],
        limit: 100,
        skipDetails: false,
      },
    ]);

    // Toggling Wien off clears selected districts; invalid priceMin > priceMax blocks submission
    wienBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedDistricts()).toEqual([]);

    fixture.componentInstance.priceMin.set(2000);
    fixture.componentInstance.priceMax.set(500);
    fixture.detectChanges();
    expect(el.textContent).toContain('Price min must be <= price max.');
    form.dispatchEvent(new Event('submit'));
    expect(emitted).toHaveLength(1);
  });
});
