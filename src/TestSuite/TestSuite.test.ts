import { test } from "node:test";
import * as PATH from "node:path";
import * as ASSERT from "node:assert";

import { TestSuite } from "./TestSuite";

import { mockFiles } from "../test_folder_mock";

test.describe("TestSuite", () => {
    async function run(parallel:number, error = false, invalid = false) {
        // Arrange
        const suite = new TestSuite({
            parallel: parallel,
            include: invalid ? [/mytest/g] : [/mytest-ok/g],
            folder: PATH.dirname(mockFiles["index"]),
            ...(parallel === 0 ? { clearModuleCache: true } : {})
        });

        // Act
        if (error) {
            process.env.ASSERT_NUMBER_1 = "2";
            test.after(() => {
                delete process.env.ASSERT_NUMBER_1
            });
        }
        const result = await suite.run();

        // Assert
        if (error || invalid) {
            ASSERT.equal(result.errors.length, 1, "don't have errors");
        } else {
            ASSERT.equal(result.errors.length, 0, "have errors");
        }
        ASSERT.deepStrictEqual(result.files.sort(), [
            mockFiles["file1.mytest-ok"],
            mockFiles["file2.mytest-ok"],
            ...(invalid ? [mockFiles["file1.mytest-invalid"]] : [])
        ].sort(), "not run all files");
    }
    test("should validate parallel option", async () => {
        ASSERT.throws(() => new TestSuite({
            parallel: -1
        }), {
            message: "Invalid parallel option. Must be >= 0"
        });
    });
    test.describe("parallel", () => {
        test("should run all test files", async () => {
            await run(1);
        });
        test("should error a test file", async () => {
            await run(1, true);
        });
        test("should handle invalid files", async () => {
            await run(1, false, true);
        });
    });
    test.describe("same process", async () => {
        test("should run all test files", async () => {
            await run(0);
        });
        test("should error a test file", async () => {
            await run(0, true);
        });
        test("should handle invalid files", async () => {
            await run(0, false, true);
        });
    });
});