import { Subject } from 'rxjs';

export function createStream() {
  return new Subject<{ tick: number }>();
}
