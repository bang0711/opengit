import "server-only";

// Per-repo async mutex. Git serializes nothing for us: two concurrent writes
// to the same repo race on `.git/index.lock` and corrupt state. Hosting means
// many requests hit the same repo at once, so every mutation runs through here
// and is queued per repoId.
//
// LIMITATION: in-memory, single-process only. Under multiple Node processes
// (PM2 cluster, serverless, multi-pod) this guarantees nothing — back it with
// an external lock (Redis SETNX, advisory file lock on `.git`) keyed by repoId
// before running more than one instance.
const tails = new Map<string, Promise<unknown>>();

/** Run `fn` after any in-flight work for `repoId` settles. Serializes writes. */
export function withRepoLock<T>(
  repoId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = tails.get(repoId) ?? Promise.resolve();
  // Run fn whether the previous holder resolved or rejected — a failed git
  // command must not wedge the queue.
  const run = prev.then(
    () => fn(),
    () => fn(),
  );
  const tail = run.then(
    () => {},
    () => {},
  );
  tails.set(repoId, tail);
  // Drop the entry once we're the tail so the map stays bounded by live repos.
  tail.finally(() => {
    if (tails.get(repoId) === tail) tails.delete(repoId);
  });
  return run;
}
