import * as ASSERT from "node:assert";

import test from "../..";
import { assertNumber2 } from "./file2";

test.describe("assertNumber2", (test) => {
    test("should work", {
        ASSERT() {
            assertNumber2(2);
        }
    });
    test("should not work", {
        ASSERT() {
            ASSERT.throws(() => assertNumber2(1));
        }
    });
});