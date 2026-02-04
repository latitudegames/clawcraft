declare module "node:test" {
  type TestFn = () => void | Promise<void>;
  const test: (name: string, fn: TestFn) => void;
  export default test;
}

declare module "node:assert/strict" {
  type Assert = {
    equal: (actual: unknown, expected: unknown, message?: string) => void;
    deepEqual: (actual: unknown, expected: unknown, message?: string) => void;
    ok: (value: unknown, message?: string) => void;
  };
  const assert: Assert;
  export default assert;
}
