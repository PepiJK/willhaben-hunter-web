import { Pipe, PipeTransform } from '@angular/core';
import { isSafeWillhabenUrl } from '../../core/import/json-import';

@Pipe({
  name: 'safeWillhabenUrl',
})
export class SafeWillhabenUrlPipe implements PipeTransform {
  transform(url: string | null | undefined): string | null {
    if (!url || !isSafeWillhabenUrl(url)) {
      return null;
    }
    return url;
  }
}
