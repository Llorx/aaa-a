import { test } from "node:test";
import * as ASSERT from "node:assert";
import { setTimeout } from "node:timers/promises";

import myTest, { isMessages, newRoot } from "./testRunner";
import { FormatType, Messages } from "../formatters";

import { mockFiles } from "../test_folder_mock";

test.describe("testRunner", async () => {
    // Arrange
    function assert(desc:string, a:unknown, b:unknown) {
        if (a !== b) {
            console.log("expected:", a);
            console.log("found:", b);
            throw new Error(`${desc}: Expected ${a} but found ${b}`);
        }
    }
    function stepped(start = 0) {
        let step = start;
        return {
            clone() {
                return stepped(step);
            },
            up(value:number) {
                if (step !== value) {
                    throw new Error(`Step should be ${value} before increasing. Found ${step}`);
                }
                step++;
            },
            assert(value:number) {
                if (step !== value) {
                    throw new Error(`Step should be ${value}. Found ${step}`);
                }
            }
        }
    }
    function getFormatter() {
        const messages:Messages[] = [];
        let firstId = "";
        const cb = (msg:Messages) => {
            if (!firstId) {
                firstId = msg.id;
            }
            messages.push(msg);
        };
        return {
            cb: cb,
            messages: messages,
            assert(type:string, check:Messages[]) {
                for (const msg of check) {
                    if (msg.id.startsWith("+")) {
                        msg.id = String(eval(`${firstId}${msg.id}`));
                    }
                    if (msg.type === FormatType.ADDED && msg.test.parentId.startsWith("+")) {
                        msg.test.parentId = String(eval(`${firstId}${msg.test.parentId}`));
                    }
                }
                if (JSON.stringify(messages) !== JSON.stringify(check)) {
                    console.log("Expected:", check);
                    console.log("Found:", messages);
                    throw new Error(`${type} logs are different`);
                }
                messages.splice(0);
            }
        };
    }
    await test.describe("Should run in order", async () => {
        test("with X_AFTER", async () => {
            const step = stepped();
            await myTest.test("Should run in order with AFTER_X", {
                ARRANGE() {
                    step.up(0);
                },
                ACT() {
                    step.up(1);
                },
                ASSERT() {
                    step.up(2);
                },
                ARRANGE_AFTER() {
                    step.up(5);
                },
                ACT_AFTER() {
                    step.up(4);
                },
                ASSERT_AFTER() {
                    step.up(3);
                }
            });
        });
        test("within describes", async () => {
            const step = stepped();
            const descDelayed = myTest.describe("describe delayed", async (test) => {
                await setTimeout(10);
                await test.test("test delayed", {
                    ARRANGE() {
                        step.up(0);
                    },
                    ACT() {
                        step.up(1);
                    },
                    ASSERT() {
                        step.up(2);
                    },
                    ARRANGE_AFTER() {
                        step.up(3);
                    }
                });
            });
            const descDelayed2 = myTest.describe("describe delayed 2", (test) => {
                test.test("test delayed", {
                    ARRANGE() {
                        step.up(4);
                    },
                    async ACT() {
                        step.up(5);
                        await setTimeout(10)
                    },
                    ASSERT() {
                        step.up(6);
                    },
                    ARRANGE_AFTER() {
                        step.up(7);
                    }
                });
            });
            const desc = myTest.describe("describe", (test) => {
                test.test("test delayed", {
                    ARRANGE() {
                        step.up(8);
                    },
                    ACT() {
                        step.up(9);
                    },
                    ASSERT() {
                        step.up(10);
                    },
                    ARRANGE_AFTER() {
                        step.up(11);
                    }
                });
            });
            await Promise.all([desc, descDelayed2, descDelayed]);
        });
        test("now allow tests after finishing", async () => {
            // Act
            let errored = false;
            await myTest.describe("describe", test => {
                setTimeout(10).then(() => {
                    test.test("test", {
                        ARRANGE() {
                            return 0;
                        },
                        ACT() {
                            return 0;
                        },
                        ASSERT() {
                            return "ok";
                        }
                    }).catch(() => {
                        errored = true;
                    });
                });
            });
            await setTimeout(50);

            // Assert
            if (!errored) {
                throw new Error("Should error if adding test after finishing");
            }
        });
    });
    test.describe("Should infer data", () => {
        test("from arrange to act, assert and after", async () => {
            await myTest.test("test", {
                ARRANGE() {
                    return { pepe: 123 };
                },
                ACT(arrange) {
                    assert("ACT", arrange.pepe, 123);
                    return arrange.pepe + 1;
                },
                ASSERT(act, arrange) {
                    assert("ASSERT ARRANGE", arrange.pepe, 123);
                    assert("ASSERT ACT", act, 124);
                    return act + arrange.pepe;
                },
                ARRANGE_AFTER(arrange) {
                    assert("AFTER ARRANGE", arrange.pepe, 123);
                },
                ACT_AFTER(act) {
                    assert("AFTER ACT", act, 124);
                },
                ASSERT_AFTER(ass) {
                    assert("AFTER ASSERT", ass, 123 + 124);
                }
            });
        });
        test("from arrange to act, assert and x_after", async () => {
            await myTest.test("test", {
                ARRANGE() {
                    return { pepe: 123 };
                },
                ACT(arrange) {
                    assert("ACT", arrange.pepe, 123);
                    return arrange.pepe + 1;
                },
                ASSERT(act, arrange) {
                    assert("ASSERT ARRANGE", arrange.pepe, 123);
                    assert("ASSERT ACT", act, 124);
                    return act + arrange.pepe;
                },
                ARRANGE_AFTER(arrange) {
                    assert("AFTER ARRANGE", arrange.pepe, 123);
                },
                ACT_AFTER(act) {
                    assert("AFTER ACT", act, 124);
                },
                ASSERT_AFTER(ass) {
                    assert("AFTER ASSERT", ass, 123 + 124);
                }
            });
        });
        test("from arrange to assert and after", async () => {
            await myTest.test("test", {
                ARRANGE() {
                    return { pepe: 123 };
                },
                ASSERT(act, arrange) {
                    assert("ASSERT ARRANGE", arrange.pepe, 123);
                    assert("ASSERT ACT", act, undefined);
                    return arrange.pepe + 1;
                },
                ARRANGE_AFTER(arrange) {
                    assert("AFTER ARRANGE", arrange.pepe, 123);
                },
                ASSERT_AFTER(ass) {
                    assert("AFTER ASSERT", ass, 124);
                },
                ACT_AFTER() {
                    throw new Error("ACT_AFTER should not be called");
                }
            });
        });
        test("from act to assert and after", async () => {
            await myTest.test("test", {
                ACT() {
                    return { pepe: 123 };
                },
                ASSERT(act, arrange) {
                    assert("ASSERT ARRANGE", arrange, undefined);
                    assert("ASSERT ACT", act.pepe, 123);
                    return act.pepe + 1;
                },
                ACT_AFTER(act) {
                    assert("ASSERT ACT", act.pepe, 123);
                },
                ASSERT_AFTER(ass) {
                    assert("AFTER ASSERT", ass, 124);
                },
                ARRANGE_AFTER() {
                    throw new Error("ARRANGE_AFTER should not be called");
                }
            });
        });
        test("from arrange to act and after", async () => {
            await myTest.test("test", {
                ARRANGE() {
                    return { pepe: 123 };
                },
                ACT(arrange) {
                    assert("ACT", arrange.pepe, 123);
                    return arrange.pepe + 1;
                },
                ARRANGE_AFTER(arrange) {
                    assert("AFTER ARRANGE", arrange.pepe, 123);
                },
                ACT_AFTER(act) {
                    assert("AFTER ACT", act, 124);
                },
                ASSERT_AFTER() {
                    throw new Error("ASSERT_AFTER should not be called");
                }
            });
        });
    });
    test.describe("Error managing", () => {
        test("should throw error if describe fails", async () => {
            try {
                await myTest.describe("describe", () => {
                    throw "ok";
                });
                throw new Error("Should throw error");
            } catch (e) {
                if (e !== "ok") {
                    throw e;
                }
            }
        });
        test("should not call any 'after' if arrange fails", async () => {
            let invalidAfterCalled = 0;
            try {
                await myTest.test("test", {
                    ARRANGE() {
                        throw "ok";
                    },
                    ACT() {
                        return 0;
                    },
                    ASSERT() {
                        return 0;
                    },
                    ARRANGE_AFTER() {
                        invalidAfterCalled++;
                    },
                    ACT_AFTER() {
                        invalidAfterCalled++;
                    },
                    ASSERT_AFTER() {
                        invalidAfterCalled++;
                    }
                });
                throw new Error("Should throw error");
            } catch (e) {
                if (e !== "ok") {
                    throw e;
                }
            }
            if (invalidAfterCalled > 0) {
                throw new Error("After should not be called");
            }
        });
        test("should not call 'after' if act fails", async () => {
            let validAfterCalled = 0;
            let invalidAfterCalled = 0;
            try {
                await myTest.test("test", {
                    ARRANGE() {
                        return 0;
                    },
                    ACT() {
                        throw "ok";
                    },
                    ASSERT() {
                        return 0;
                    },
                    ARRANGE_AFTER() {
                        validAfterCalled++;
                    },
                    ACT_AFTER() {
                        invalidAfterCalled++;
                    },
                    ASSERT_AFTER() {
                        invalidAfterCalled++;
                    }
                });
                throw new Error("Should throw error");
            } catch (e) {
                if (e !== "ok") {
                    throw e;
                }
            }
            if (validAfterCalled < 1) {
                throw new Error("After should be called");
            }
            if (invalidAfterCalled) {
                throw new Error("After should not be called");
            }
        });
        test("should call all 'afters' if arrange_after fails", async () => {
            let validAfterCalled = 0;
            try {
                await myTest.test("test", {
                    ARRANGE() {
                        return 0;
                    },
                    ACT() {
                        return 0;
                    },
                    ASSERT() {
                        return 0;
                    },
                    ARRANGE_AFTER() {
                        throw "ok";
                    },
                    ACT_AFTER() {
                        validAfterCalled++;
                    },
                    ASSERT_AFTER() {
                        validAfterCalled++;
                    }
                });
                throw new Error("Should throw error");
            } catch (e) {
                if (e !== "ok") {
                    throw e;
                }
            }
            if (validAfterCalled != 2) {
                throw new Error("After should be called");
            }
        });
        test("should call all 'afters' if act_after fails", async () => {
            let validAfterCalled = 0;
            try {
                await myTest.test("test", {
                    ARRANGE() {
                        return 0;
                    },
                    ACT() {
                        return 0;
                    },
                    ASSERT() {
                        return 0;
                    },
                    ARRANGE_AFTER() {
                        validAfterCalled++;
                    },
                    ACT_AFTER() {
                        throw "ok";
                    },
                    ASSERT_AFTER() {
                        validAfterCalled++;
                    }
                });
                throw new Error("Should throw error");
            } catch (e) {
                if (e !== "ok") {
                    throw e;
                }
            }
            if (validAfterCalled != 2) {
                throw new Error("After should be called");
            }
        });
        test("should call all 'afters' if assert_after fails", async () => {
            let validAfterCalled = 0;
            try {
                await myTest.test("test", {
                    ARRANGE() {
                        return 0;
                    },
                    ACT() {
                        return 0;
                    },
                    ASSERT() {
                        return 0;
                    },
                    ARRANGE_AFTER() {
                        validAfterCalled++;
                    },
                    ACT_AFTER() {
                        validAfterCalled++;
                    },
                    ASSERT_AFTER() {
                        throw "ok";
                    }
                });
                throw new Error("Should throw error");
            } catch (e) {
                if (e !== "ok") {
                    throw e;
                }
            }
            if (validAfterCalled != 2) {
                throw new Error("After should be called");
            }
        });
    });
    test.describe("Should notify parent process", () => {
        // Arrange
        function getProcessSend() {
            const root = newRoot();
            const formatter = getFormatter();
            const oldSend = process.send;
            process.send = (msg:unknown) => {
                if (isMessages(msg)) {
                    formatter.cb(msg.data);
                }
                return true;
            };
            test.after(() => {
                process.send = oldSend;
            });
            return { formatter, root };
        }
        test.test("should work if no existing process", async () => {
            // Arrange
            newRoot();
            const oldProcess = global.process;
            global.process = undefined as any;
            test.after(() => {
                global.process = oldProcess;
                newRoot();
            });

            // Act/Assert (should not crash)
            await myTest.test("test", {
                ARRANGE() {
                    return 0;
                },
                ACT() {
                    return 0;
                },
                ASSERT() {
                    return "ok";
                }
            });
        });

        test.test("process.send is called", async () => {
            // Arrange
            const { formatter, root } = getProcessSend();

            // Act
            await myTest.test("test", {
                ARRANGE() {
                    return 0;
                },
                ACT() {
                    return 0;
                },
                ASSERT() {
                    return "ok";
                }
            });

            // Assert
            formatter.assert("after test", [{
                id: "+0",
                type: FormatType.ADDED,
                test: {
                    parentId: root.id,
                    description: "test"
                }
            }, {
                id: "+0",
                type: FormatType.START
            }, {
                id: "+0",
                type: FormatType.END
            }]);
        });

        test.test("end is called only once", async () => {
            // Arrange
            const { formatter, root } = getProcessSend();

            // Act
            await myTest.describe("describe", test => {
                setTimeout(10).then(() => {
                    test.test("test", {
                        ARRANGE() {
                            return 0;
                        },
                        ACT() {
                            return 0;
                        },
                        ASSERT() {
                            return "ok";
                        }
                    }).catch(() => {});
                });
            });
            await setTimeout(50);

            // Assert
            formatter.assert("after test", [{
                id: "+0",
                type: FormatType.ADDED,
                test: {
                    parentId: root.id,
                    description: "describe"
                }
            }, {
                id: "+0",
                type: FormatType.START
            }, {
                id: "+0",
                type: FormatType.END
            }]);
        });

        test.test("describe end is called only after tests are ended", async () => {
            // Arrange
            const { formatter, root } = getProcessSend();

            // Act
            await myTest.describe("describe", test => {
                test.test("test1", {
                    ARRANGE() {
                        return 0;
                    },
                    ACT() {
                        return 0;
                    },
                    async ASSERT() {
                        await setTimeout(20);
                        return "ok";
                    }
                }).catch(() => {});
                test.test("test2", {
                    ARRANGE() {
                        return 0;
                    },
                    ACT() {
                        return 0;
                    },
                    ASSERT() {
                        return "ok";
                    }
                }).catch(() => {});
            });

            // Assert
            formatter.assert("after test", [{
                id: "+0",
                type: FormatType.ADDED,
                test: {
                    parentId: root.id,
                    description: "describe"
                }
            }, {
                id: "+0",
                type: FormatType.START
            }, {
                id: "+1",
                type: FormatType.ADDED,
                test: {
                    parentId: "+0",
                    description: "test1"
                }
            }, {
                id: "+1",
                type: FormatType.START
            }, {
                id: "+2",
                type: FormatType.ADDED,
                test: {
                    parentId: "+0",
                    description: "test2"
                }
            }, {
                id: "+1",
                type: FormatType.END
            }, {
                id: "+2",
                type: FormatType.START
            }, {
                id: "+2",
                type: FormatType.END
            }, {
                id: "+0",
                type: FormatType.END
            }]);
        });

        test("should show nested error logs", async () => {
            // Arrange
            const { formatter, root } = getProcessSend();

            // Act
            const promise = myTest.describe("describe", test => {
                test.test("test1", {
                    ARRANGE() {
                        return 0;
                    },
                    ACT() {
                        return 0;
                    },
                    async ASSERT() {
                        await setTimeout(20);
                        throw "ok";
                    }
                }).catch(() => {});
                test.test("test2", {
                    ARRANGE() {
                        return 0;
                    },
                    ACT() {
                        return 0;
                    },
                    ASSERT() {
                        return "ok";
                    }
                }).catch(() => {});
            });

            // Assert
            await ASSERT.rejects(promise, e => e === "ok");
            formatter.assert("after test", [{
                id: "+0",
                type: FormatType.ADDED,
                test: {
                    parentId: root.id,
                    description: "describe"
                }
            }, {
                id: "+0",
                type: FormatType.START
            }, {
                id: "+1",
                type: FormatType.ADDED,
                test: {
                    parentId: "+0",
                    description: "test1"
                }
            }, {
                id: "+1",
                type: FormatType.START
            }, {
                id: "+2",
                type: FormatType.ADDED,
                test: {
                    parentId: "+0",
                    description: "test2"
                }
            }, {
                id: "+1",
                type: FormatType.END,
                error: "ok"
            }, {
                id: "+2",
                type: FormatType.START
            }, {
                id: "+2",
                type: FormatType.END
            }, {
                id: "+0",
                type: FormatType.END,
                error: "ok"
            }]);
        });
    });
    test.describe("Should run test files", () => {
        // Assert
        function newFormatter() {
            const formatter = getFormatter();
            const root = newRoot();
            root.setFormatter({
                format: (_fileId, msg) => {
                    formatter.cb(msg);
                }
            });
            test.after(() => newRoot());
            return { formatter, root };
        }
        async function runTest(spawn = false) {
            // Arrange
            const { formatter, root } = newFormatter();
            const rootId = spawn ? "0" : root.id;

            // Act
            if (spawn) {
                await root.spawnTestFile(mockFiles["file1.mytest-ok"], { prefix: [] });
            } else {
                root.runTestFile(mockFiles["file1.mytest-ok"], {
                    clearModuleCache: true
                });
            }
            await root.run();

            // Assert
            formatter.assert("after test", [{
                id: "+0",
                type: FormatType.ADDED,
                test: {
                    parentId: rootId,
                    description: "assertNumber1"
                }
            }, {
                id: "+0",
                type: FormatType.START
            }, {
                id: "+1",
                type: FormatType.ADDED,
                test: {
                    parentId: "+0",
                    description: "should work"
                }
            }, {
                id: "+1",
                type: FormatType.START
            }, {
                id: "+2",
                type: FormatType.ADDED,
                test: {
                    parentId: "+0",
                    description: "should not work"
                }
            }, {
                id: "+1",
                type: FormatType.END
            }, {
                id: "+2",
                type: FormatType.START
            }, {
                id: "+2",
                type: FormatType.END
            }, {
                id: "+0",
                type: FormatType.END
            }]);
        }
        test("should run a test file", async () => {
            await runTest();
        });
        test("should spawn a test file", async () => {
            await runTest(true);
        });
    });
});