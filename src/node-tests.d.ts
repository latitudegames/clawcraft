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

declare const console: {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

// Minimal Node globals used in dev scripts compiled by `tsconfig.node-tests.json`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

declare const process: {
  env: Record<string, string | undefined>;
};
