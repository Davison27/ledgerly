export function fakeLatency<T>(value: T, ms = 320): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}
