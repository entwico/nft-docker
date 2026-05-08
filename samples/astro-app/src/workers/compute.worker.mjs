import { parentPort, workerData } from 'node:worker_threads';

function fib(n) {
  if (n < 2) return n;
  let a = 0;
  let b = 1;

  for (let i = 2; i <= n; i++) {
    const c = a + b;
    a = b;
    b = c;
  }

  return b;
}

parentPort?.postMessage(fib(workerData?.n ?? 10));
