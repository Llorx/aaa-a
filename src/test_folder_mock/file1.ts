import * as ASSERT from "node:assert";

export function assertNumber1(n:number) {
    ASSERT.equal(n, 1, "is not number 1");
}