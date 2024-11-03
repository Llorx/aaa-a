import { test } from "node:test";
import { setImmediate } from "node:timers/promises";

import { parallelize } from "./parallelize";


function assertArrayEqual<T>(msg:string, a:T[], b:T[]) {
    if (a.length !== b.length) {
        console.log("a", a);
        console.log("b", b);
        throw new Error(`Arrays are not equal: ${msg}`);
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            console.log("a", a);
            console.log("b", b);
            throw new Error(`Arrays are not equal: ${msg}`);
        }
    }
}
test.describe("parallelize", () => {
    test("should run all entries", async () => {
        // Arrange
        const elements = [0, 1, 2, 3, 4];
        function* consumer(elements:number[]) {
            while (true) {
                const n = elements.shift();
                if (n == null) {
                    break;
                }
                yield Promise.resolve(n);
            }
        }

        // Act
        await parallelize(2, consumer(elements));
        assertArrayEqual("generated", elements, []);
    });

    test("should run entries in parallel", async () => {
        // Arrange
        const elements = [0, 1, 2, 3, 4];
        let waiting:(()=>void)[] = [];
        function* waiterConsumer(elements:number[]) {
            while (true) {
                const n = elements.shift();
                if (n == null) {
                    break;
                }
                yield new Promise<void>(resolve => waiting.push(resolve));
            }
        }
        async function runWaiting(assertSize:number) {
            if (waiting.length !== assertSize) {
                throw new Error(`There should be ${assertSize} waiting tasks`);
            }
            waiting.splice(0).forEach(resolve => resolve());
            await setImmediate(); // Wait for promises to resolve
        }

        // Act
        const parallelPromise = parallelize(2, waiterConsumer(elements));

        // Act-Assert
        assertArrayEqual("1st iteration", [2, 3, 4], elements);
        await runWaiting(2);
        assertArrayEqual("2nd iteration", [4], elements);
        await runWaiting(2);
        assertArrayEqual("3rd iteration", [], elements);
        await runWaiting(1);

        await parallelPromise;
    });

    test("should return the states of all the promises", async () => {
        // Arrange
        const elements = [0, -1, 2, -1, 4];
        function* errorConsumer(elements:number[]) {
            while (true) {
                const n = elements.shift();
                if (n == null) {
                    break;
                }
                yield new Promise<number>((resolve, reject) => {
                    if (n === -1) {
                        reject(new Error("Invalid number"));
                    } else {
                        resolve(n);
                    }
                });
            }
        }

        // Act
        const parallelResult = await parallelize(2, errorConsumer(elements));
        
        // Assert
        if (parallelResult.length !== 5) {
            throw new Error("Parallel should return 5 entries");
        }
        for (let i = 0; i < 5; i++) {
            const result = parallelResult[i]!;
            if (i === 1 || i === 3) {
                if (result.status !== "rejected") {
                    throw new Error(`Parallel result ${i} should be rejected`);
                }
            } else if (result.status !== "fulfilled") {
                throw new Error(`Parallel result ${i} should be fulfilled`);
            } else if (result.value !== i) {
                throw new Error(`Parallel result ${i} should be have value ${i}`);
            }
        }
    });
});