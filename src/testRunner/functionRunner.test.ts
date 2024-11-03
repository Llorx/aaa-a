import { test } from "node:test";

import { functionRunner } from "./functionRunner";

test.describe("functionRunner", () => {
    test("Should run valid function", async () => {
        const result = await functionRunner("test", ()=>{}, []);
        if (!result.run || !result.ok) {
            throw new Error("Function should run");
        }
    });
    test("Should get invalid function error", async () => {
        const result = await functionRunner("test", ()=>{ throw "ok" }, []);
        if (!result.run || result.ok) {
            throw new Error("Function should run with aerror");
        }
        if (result.error !== "ok") {
            throw result.error;
        }
    });
    test("Should get value from result", async () => {
        const result = await functionRunner("test", ()=>{ return "ok" }, []);
        if (!result.run || !result.ok) {
            throw new Error("Function should run with aerror");
        }
        if (result.data !== "ok") {
            throw new Error("Function should return ok");
        }
    });
});