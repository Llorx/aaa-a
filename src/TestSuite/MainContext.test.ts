import { test } from "node:test";
import * as PATH from "node:path";
import * as ASSERT from "node:assert";

import { MainContext } from "./MainContext";

import { mockFiles } from "../test_folder_mock";

test.describe("MainContext", () => {
    test("Should receive all files", async () => {
        // Arrange
        const context = new MainContext();
        const test_folder_mock = PATH.dirname(mockFiles["index"]);

        // Act
        const files = await context.getFiles(test_folder_mock);

        // Assert
        ASSERT.deepStrictEqual(files.sort(), Object.values(mockFiles).sort(), "Not received all files");
    });
});