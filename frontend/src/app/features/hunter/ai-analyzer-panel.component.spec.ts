import { TestBed } from '@angular/core/testing';
import analyzeFixture from '../../../../../contracts/fixtures/analyze-response.json';
import { type AnalyzeResponse } from '../../core/api/willhaben-api.models';
import { AiAnalyzerPanelComponent } from './ai-analyzer-panel.component';

describe('AiAnalyzerPanelComponent', () => {
  it('renders verdict colours, truncation notices, and only https://www.willhaben.at links', async () => {
    await TestBed.configureTestingModule({
      imports: [AiAnalyzerPanelComponent],
    }).compileComponents();

    const maliciousFixture: AnalyzeResponse = {
      ...(analyzeFixture as AnalyzeResponse),
      truncatedFields: 2,
      droppedRecommendations: 1,
      recommendations: [
        ...(analyzeFixture as AnalyzeResponse).recommendations,
        {
          rank: 3,
          id: 'bad-link',
          title: 'Untrusted External Link',
          url: 'https://evil.example/phish',
          fitScore: 40,
          verdict: 'good-alternative',
          justification: 'Should not render href',
          pros: [],
          cons: [],
        },
      ],
    };

    const fixture = TestBed.createComponent(AiAnalyzerPanelComponent);
    fixture.componentRef.setInput('itemCount', 3);
    fixture.componentRef.setInput('anthropicConfigured', true);
    fixture.componentRef.setInput('analysis', maliciousFixture);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('2 field(s) truncated');
    expect(el.textContent).toContain('1 unverified pick(s) dropped');

    const links = Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toHaveLength(2);
    expect(links.every((href) => href?.startsWith('https://www.willhaben.at/'))).toBe(true);
    expect(el.textContent).toContain('Untrusted External Link');

    // Preset click updates prompt and emits analyze on button click
    const emitted: string[] = [];
    fixture.componentInstance.analyze.subscribe((p) => emitted.push(p));
    const presetBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Defekte'),
    )!;
    presetBtn.click();
    fixture.detectChanges();

    const analyzeBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Analyze with Haiku 5.5'),
    )!;
    analyzeBtn.click();
    expect(emitted).toEqual(['Defekte & Red Flags prüfen']);
  });
});
