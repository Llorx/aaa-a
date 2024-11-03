import { functionRunner } from "./functionRunner";
import { clearModuleCache, resolvablePromise } from "../utils/utils";
import { Formatter, FormatType, Messages } from "../formatters";
import { DefaultFormatter } from "../formatters/default";
import { spawnTestFile, SpawnTestFileOptions } from "../spawnTestFile/spawnTestFile";

export interface TestInterface<ARR = unknown, ACT = unknown, ASS = unknown> {
    ARRANGE?():ARR;
    ACT?(ARANGE:Awaited<ARR>):ACT;
    ASSERT?(ACT:Awaited<ACT>, ARANGE:Awaited<ARR>):ASS;
    ARRANGE_AFTER?(ARANGE:Awaited<ARR>):unknown;
    ACT_AFTER?(ACT:Awaited<ACT>):unknown;
    ASSERT_AFTER?(ASSERT:Awaited<ASS>):unknown;
}
export type TestFunction = {
    <ARR, ACT, ASS>(description: string, testData: TestInterface<ARR, ACT, ASS>): Promise<void>;
    test:TestFunction;
    describe(description: string, cb: (test:TestFunction) => unknown): Promise<void>;
};
export type RunTestFileOptions = {
    clearModuleCache:boolean;
};

interface Sender {
    send(msg:Messages):void;
}

type RunMonad = {
    run:false;
    data?:undefined;
} | {
    run:true;
    ok:true;
    data:unknown;
} | {
    run:true;
    ok:false;
    error:unknown;
    type:string;
};

let ids = 0;
class Test {
    private _promise = resolvablePromise();
    private _tests:Test[] = [];
    private _pending:Test[] = [];
    private _finished = false;
    readonly id = String(ids++);
    constructor(readonly _send:(msg:Messages)=>void, readonly description:string, readonly data?:TestInterface|((test:TestFunction)=>unknown)) {}
    async run() {
        try {
            this._send({
                id: this.id,
                type: FormatType.START
            });
            if (typeof this.data === "object") {
                await this._runTest(this.data);
            } else {
                await this._runDescribe(this.data);
            }
            const res = await this._awaitSubtests();
            const firstError = res.find(result => result.status === "rejected");
            if (firstError) {
                throw firstError.reason;
            }
            this._send({
                id: this.id,
                type: FormatType.END
            });
            this._promise.resolve();
        } catch (e) {
            this._send({
                id: this.id,
                type: FormatType.END,
                error: String(e)
            });
            this._promise.reject(e);
        }
        this._finished = true;
        return () => this._promise; // Not await. The promise should only be awaited if the runner needs to
    }
    describe(description:string, cb:(test:TestFunction)=>unknown) {
        return this._add(description, cb);
    }
    test(description:string, testData:TestInterface) {
        return this._add(description, testData);
    }
    private _add(description:string, testData:TestInterface|((test:TestFunction)=>unknown)) {
        const test = new Test(this._send, description, testData);
        if (this._finished) {
            test._promise.reject(new Error("Adding a new test after the job has finished"));
            return test._promise;
        }
        this._tests.push(test);
        this._pending.push(test);
        this._send({
            id: test.id,
            type: FormatType.ADDED,
            test: {
                parentId: this.id,
                description: test.description
            }
        });
        if (this._pending.length === 1) {
            this._runPending();
        }
        return test._promise;
    }
    private async _runPending() {
        while (this._pending.length > 0) {
            const test = this._pending[0]!;
            try {
                await test.run();
            } finally {
                this._pending.shift();
            }
        }
    }
    private _awaitSubtests() {
        return Promise.allSettled(this._tests.map(test => test._promise));
    }
    private async _runDescribe(cb?:(test:TestFunction)=>unknown) {
        const result = await functionRunner("describe", cb, [buildTestFunction(this)]);
        if (result.run && !result.ok) {
            throw result.error;
        }
    }
    private async _runTest(test:TestInterface) {
        const arrangeResult = await functionRunner("ARRANGE", test.ARRANGE, []);
        if (arrangeResult.run && !arrangeResult.ok) {
            await this._after(test);
            throw arrangeResult.error;
        }

        const actResult = await functionRunner("ACT", test.ACT, [arrangeResult.data]);
        if (actResult.run && !actResult.ok) {
            await this._after(test, arrangeResult);
            throw actResult.error;
        }

        const assertResult = await functionRunner("ASSERT", test.ASSERT, [actResult.data, arrangeResult.data]);
        if (assertResult.run && !assertResult.ok) {
            await this._after(test, arrangeResult, actResult);
            throw assertResult.error;
        }

        const afterResult = await this._after(test, arrangeResult, actResult, assertResult);
        if (afterResult.run && !afterResult.ok) {
            throw afterResult.error;
        }
    }
    private async _after(test:TestInterface, arrangeResult?:RunMonad, actResult?:RunMonad, assertResult?:RunMonad):Promise<RunMonad> {
        let doneError:RunMonad|null = null;
        if (assertResult && assertResult.run && !("error" in assertResult)) {
            const afterResult = await functionRunner("ASSERT_AFTER", test.ASSERT_AFTER, [assertResult.data]);
            if (afterResult.run && !afterResult.ok && !doneError) {
                doneError = afterResult;
            }
        }
        if (actResult && actResult.run && !("error" in actResult)) {
            const afterResult = await functionRunner("ACT_AFTER", test.ACT_AFTER, [actResult.data]);
            if (afterResult.run && !afterResult.ok && !doneError) {
                doneError = afterResult;
            }
        }
        if (arrangeResult && arrangeResult.run && !("error" in arrangeResult)) {
            const afterResult = await functionRunner("ARRANGE_AFTER", test.ARRANGE_AFTER, [arrangeResult.data]);
            if (afterResult.run && !afterResult.ok && !doneError) {
                doneError = afterResult;
            }
        }
        return doneError || {
            run: false
        };
    }
}
class Root extends Test implements Sender {
    formatter:Formatter|null = null;
    constructor(cb?:()=>unknown) {
        super(msg => this.send(msg), "", cb);
    }
    send(msg:Messages) {
        if (msg.id === this.id) {
            return; // Root doesn't notify about himself
        }
        if (this.formatter) {
            this.processFormatter("", msg);
        } else {
            if (typeof process === "undefined") {
                global.process = {} as any;
            }
            if (process.send) {
                process.send({
                    type: "testRunner",
                    data: msg
                });
            } else {
                this.processFormatter("", msg);
            }
        }
    }
    processFormatter(fileId:string, msg:Messages) {
        if (!this.formatter) {
            this.formatter = new DefaultFormatter();
        }
        this.formatter.format(fileId, msg);
    }
    setFormatter(formatter:Formatter) {
        this.formatter = formatter;
    }
    runTestFile(file:string, options:RunTestFileOptions) {
        if (options.clearModuleCache) {
            clearModuleCache(file);
        }
        return require(file);
    }
    spawnTestFile(file:string, options:SpawnTestFileOptions) {
        return spawnTestFile(file, options, msg => {
            if (isMessages(msg)) {
                this.processFormatter(file, msg.data);
            }
        });
    }
}
export function isMessages(msg:unknown):msg is { data: Messages } {
    return !!msg && typeof msg === "object" && "type" in msg && msg.type === "testRunner" && "data" in msg;
}

let root:Root|null;

function tryNewRoot<T>(myTest:T|null) {
    if (myTest) {
        return myTest;
    }
    if (!root) {
        root = newRoot(()=>{});
    }
    return root;
}
function buildTestFunction(myTest:Test|null):TestFunction {
    function test<ARR, ACT, ASS>(description:string, testData:TestInterface<ARR, ACT, ASS>) {
        return tryNewRoot(myTest).test(description, testData);
    }
    test.test = test;
    test.describe = function describe(description:string, cb:(test:TestFunction)=>unknown) {
        return tryNewRoot(myTest).describe(description, cb);
    };
    return test;
}
export function newRoot(cb?:()=>unknown) {
    return root = new Root(cb);
}

export default buildTestFunction(null);
export type { Test };