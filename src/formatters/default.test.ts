import { test } from "node:test";

import { DefaultFormatter } from "./default";
import { FormatType } from ".";

test.describe("default formatter", () => {
    // Arrange
    class LogChecker {
        logs:unknown[][] = [];
        log(...args:unknown[]) {
            this.logs.push(args);
        }
        assert(type:string, check:unknown[][]) {
            if (JSON.stringify(this.logs) !== JSON.stringify(check)) {
                console.log("Expected:", check);
                console.log("Found:", this.logs);
                throw new Error(`${type} logs are different`);
            }
            this.logs.splice(0);
        }
    }
    function newChecker() {
        const logChecker = new LogChecker();
        const formatter = new DefaultFormatter((...args) => logChecker.log(...args));
        let ids = 0;
        const ret = {
            addTest(parent = "") {
                const id = String(++ids);
                formatter.format("", {
                    type: FormatType.ADDED,
                    id: id,
                    test: {
                        parentId: parent,
                        description: id
                    }
                });
                return {
                    id: id,
                    start() {
                        formatter.format("", {
                            type: FormatType.START,
                            id: id
                        });
                    },
                    end(error?:string) {
                        formatter.format("", {
                            type: FormatType.END,
                            id: id,
                            error: error
                        });
                    },
                    addTest() {
                        return ret.addTest(id);
                    }
                }
            },
            assert(...args:Parameters<typeof logChecker.assert>) {
                return logChecker.assert(...args);
            }
        };
        return ret;
    }
    test("should not show logs after start", () => {
        // Arrange
        const checker = newChecker();
        const test1 = checker.addTest();

        // Act
        test1.start();

        // Assert
        checker.assert("After start", []);
    });

    test("should show logs after end", () => {
        // Arrange
        const checker = newChecker();
        const test1 = checker.addTest();

        // Act
        test1.start();
        test1.end();

        // Assert
        checker.assert("After end", [["", "√", test1.id]]);
    });

    test("should show logs after nested started", () => {
        // Arrange
        const checker = newChecker();
        const test1 = checker.addTest();
        const test1child = test1.addTest();

        // Act
        test1.start();
        test1child.start();

        // Assert
        checker.assert("After end", [["", "►", test1.id]]);
    });

    test("should show end logs after nested ended", () => {
        // Arrange
        const checker = newChecker();
        const test1 = checker.addTest();
        const test1child = test1.addTest();

        // Act
        test1.start();
        test1child.start();
        test1child.end();
        test1.end();

        // Assert
        checker.assert("After end", [
            ["", "►", test1.id],
            ["  ", "√", test1child.id],
            ["", "√", test1.id]
        ]);
    });

    test("should show end logs in starting order", () => {
        // Arrange
        const checker = newChecker();
        const test1 = checker.addTest();
        const test2 = checker.addTest();

        // Act
        test1.start();
        test2.start();
        test2.end();
        test1.end();

        // Assert
        checker.assert("After end", [
            ["", "√", test1.id],
            ["", "√", test2.id]
        ]);
    });

    test("should show end logs in nested starting order", () => {
        // Arrange
        const checker = newChecker();
        const test1 = checker.addTest();
        const test1child = test1.addTest();
        const test2 = checker.addTest();
        const test2child1 = test2.addTest();
        const test2child2 = test2.addTest();

        // Act
        test1.start();
        test2.start();
        test2child1.start();
        test2child2.start();
        test2child2.end();
        test2child1.end();
        test2.end();
        test1child.start();
        test1child.end();
        test1.end();

        // Assert
        checker.assert("After end", [
            ['', '►', test1.id],
            ['  ', '√', test1child.id],
            ['', '√', test1.id],
            ['', '►', test2.id],
            ['  ', '√', test2child1.id],
            ['  ', '√', test2child2.id],
            ['', '√', test2.id]
        ]);
    });
});