import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StickyTableHeaderDirective } from './sticky-table-header.directive';

@Component({
  imports: [StickyTableHeaderDirective],
  template: `
    <div class="relative overflow-auto" data-testid="test-container">
      <table>
        <thead appStickyHeader>
          <tr>
            <th>Col</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Row</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
class HostTestComponent {}

describe('StickyTableHeaderDirective', () => {
  it('sets maxHeight on the scroll container based on remaining viewport height', async () => {
    await TestBed.configureTestingModule({
      imports: [HostTestComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(HostTestComponent);
    await fixture.whenStable();

    const container = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="test-container"]',
    ) as HTMLDivElement;

    Object.defineProperty(window, 'innerHeight', {
      value: 900,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      top: 300,
      bottom: 800,
      height: 500,
      left: 0,
      right: 800,
      width: 800,
      x: 0,
      y: 300,
      toJSON: () => ({}),
    } as DOMRect);

    window.dispatchEvent(new Event('resize'));
    expect(container.style.maxHeight).toBe('572px');
  });
});
