import { test } from "node:test";
import * as ASSERT from "node:assert";

import { TestSuite } from "./TestSuite/TestSuite";

import * as INDEX from "./index";

test.describe("Index", () => {
    test("Should export all testing methods", async () => {
        // Assert
        ASSERT.equal(typeof INDEX.test, "function", "doesn't have test method");
        ASSERT.equal(typeof INDEX.describe, "function", "doesn't have describe method");
        ASSERT.equal(INDEX.default, INDEX.test, "doesn't export defaults");
        ASSERT.equal(INDEX.TestSuite, TestSuite, "doesn't export TestSuite");
    });
});