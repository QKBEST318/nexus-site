/** 极简断言 / tiny assertion helper shared by the test bundle. */
const fail: string[] = [];
let passed = 0;

export function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log("  ✓ " + name);
  } else {
    fail.push(name + (detail ? `  (${detail})` : ""));
    console.log("  ✗ " + name + (detail ? `  (${detail})` : ""));
  }
}

export function done(): void {
  console.log(`\n  ${passed} passed, ${fail.length} failed`);
  if (fail.length) {
    for (const f of fail) console.log("  FAILED: " + f);
    process.exitCode = 1;
  }
}

export const failures = fail;
export const passedCount = () => passed;
