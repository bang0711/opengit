// Per-repo async mutex: serialize writes so two mutations don't race on
// `.git/index.lock`. In-process (single Electron main process) — sufficient here.
const tails = new Map<string, Promise<unknown>>();

export function withRepoLock<T>(
  repoId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = tails.get(repoId) ?? Promise.resolve();
  const run = prev.then(
    () => fn(),
    () => fn(),
  );
  const tail = run.then(
    () => {},
    () => {},
  );
  tails.set(repoId, tail);
  tail.finally(() => {
    if (tails.get(repoId) === tail) tails.delete(repoId);
  });
  return run;
}
