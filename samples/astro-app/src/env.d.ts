/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    stream: import('rxjs').Subject<{ tick: number }>;
  }
}
