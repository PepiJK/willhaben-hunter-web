import { SafeWillhabenUrlPipe } from './safe-willhaben-url.pipe';

describe('SafeWillhabenUrlPipe', () => {
  const pipe = new SafeWillhabenUrlPipe();

  it('allows only https://www.willhaben.at/ URLs', () => {
    expect(pipe.transform('https://www.willhaben.at/iad/d/123/')).toBe(
      'https://www.willhaben.at/iad/d/123/',
    );
    expect(pipe.transform('http://www.willhaben.at/iad/d/123/')).toBeNull();
    expect(pipe.transform('https://evil.example/iad/d/123/')).toBeNull();
    expect(pipe.transform('javascript:alert(1)')).toBeNull();
    expect(pipe.transform(null)).toBeNull();
  });
});
