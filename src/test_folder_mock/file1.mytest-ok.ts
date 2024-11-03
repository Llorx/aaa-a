import * as ASSERT from "node:assert";

import test from "..";
import { assertNumber1 } from "./file1";

test.describe("assertNumber1", (test) => {
    test("should work", {
        ASSERT() {
            // env for testing from "outside"
            assertNumber1(process.env.ASSERT_NUMBER_1 != null ? Number(process.env.ASSERT_NUMBER_1) : 1);
        }
    });
    test("should not work", {
        ASSERT() {
            ASSERT.throws(() => assertNumber1(2));
        }
    });
});