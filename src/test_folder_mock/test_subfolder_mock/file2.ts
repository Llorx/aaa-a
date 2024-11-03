import * as ASSERT from "node:assert";

export function assertNumber2(n:number) {
    ASSERT.equal(n, 2, "is not number 2");
}