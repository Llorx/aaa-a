import { test } from "node:test";
import * as PATH from "node:path";
import * as ASSERT from "node:assert";

import { spawnTestFile } from "./spawnTestFile";

test.describe("spawnTestFile", () => {
    test("Should spawn new process", async () => {
        await spawnTestFile(PATH.join(__dirname, "spawnTestFile.mock.test.js"), {prefix:[]}, () => {});
    });
    test("Should fail with exit code", async () => {
        await ASSERT.rejects(
            spawnTestFile(PATH.join(__dirname, "not_test_file.js"),
            {prefix:[]},
            () => {}),
            e => e instanceof Error && e.message.includes("Cannot find module")
        );
    });
    test("Should spawn with a prefix", async () => {
        await ASSERT.rejects(
            spawnTestFile(PATH.join(__dirname, "not_test_file.js"),
            {prefix:["--aaa-a-prefix-test"]},
            () => {}),
            e => e instanceof Error && e.message.includes("bad option: --aaa-a-prefix-test")
        );
    });
});