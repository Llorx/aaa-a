import { test } from "node:test";

import { filterFiles } from "./filterFiles";

test.describe("filterFiles", () => {
    // Arrange
    const mockFiles = [
        "my/file/test.js",
        "my/file/my-test.js",
        "my/file/my.test.js",
        "my/file/test-my.js",
        "my/file/test.my.js",
        "my/file/tester.js",
        "my/file/tast.js",
        "my/test/ok1.js",
        "my/test/ok2.js"
    ];
    test("should list all test files", () => {
        // Act
        const files = filterFiles(mockFiles, {
            include: [/.*(\b|_)(test)(\b|_).*\.(cjs|mjs|js)$/i],
            exclude: []
        });

        // Assert
        const testFiles = new Set([
            "my/file/test.js",
            "my/file/my-test.js",
            "my/file/my.test.js",
            "my/file/test-my.js",
            "my/file/test.my.js",
            "my/test/ok1.js",
            "my/test/ok2.js"
        ]);
        for (const file of files) {
            if (!testFiles.delete(file)) {
                throw new Error(`File ${file} should not be included`);
            }
        }
        if (testFiles.size > 0) {
            throw new Error(`Files ${Array.from(testFiles).join(", ")} should be included`);
        }
    });
    test("should exclude test files", () => {
        // Act
        const files = filterFiles(mockFiles, {
            include: [/.*(\b|_)(test)(\b|_).*\.(cjs|mjs|js)$/i],
            exclude: [/ok1/i]
        });

        // Assert
        for (const file of files) {
            if (file.includes("ok1")) {
                throw new Error(`File ${file} should not be included`);
            }
        }
    });
});