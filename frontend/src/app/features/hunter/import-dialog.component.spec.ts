import { TestBed } from '@angular/core/testing';
import cliExportFixture from '../../../../../contracts/fixtures/cli-export.marketplace.json';
import { ImportDialogComponent } from './import-dialog.component';

describe('ImportDialogComponent', () => {
  it('validates pasted JSON, shows rejected rows, and emits imported items on confirmation', async () => {
    await TestBed.configureTestingModule({
      imports: [ImportDialogComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ImportDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const importedSpy: unknown[] = [];
    const closedSpy = vi.fn();
    fixture.componentInstance.imported.subscribe((items) => importedSpy.push(items));
    fixture.componentInstance.closed.subscribe(closedSpy);

    fixture.componentInstance.rawJson.set(
      JSON.stringify([
        ...cliExportFixture,
        { id: 'bad', title: 'Bad URL', url: 'https://evil.example/item' },
      ]),
    );
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Valid listings ready:');
    expect(el.textContent).toContain('Rejected rows:');

    const importBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Import listings'),
    )!;
    importBtn.click();

    expect(importedSpy).toHaveLength(1);
    expect((importedSpy[0] as unknown[]).length).toBe(3);
    expect(closedSpy).toHaveBeenCalledOnce();
  });

  it('closes without emitting when Cancel or Close is clicked and loads JSON files via FileReader', async () => {
    await TestBed.configureTestingModule({
      imports: [ImportDialogComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ImportDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const closedSpy = vi.fn();
    fixture.componentInstance.closed.subscribe(closedSpy);

    const fileInput = (fixture.nativeElement as HTMLElement).querySelector(
      '#json-file-input',
    ) as HTMLInputElement;
    const file = new File([JSON.stringify(cliExportFixture)], 'export.json', {
      type: 'application/json',
    });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fileInput.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 20));
    fixture.detectChanges();
    expect(fixture.componentInstance.parsedPreview().items).toHaveLength(3);

    const cancelBtn = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((b) => b.textContent?.includes('Cancel'))!;
    cancelBtn.click();
    expect(closedSpy).toHaveBeenCalledOnce();
  });
});
