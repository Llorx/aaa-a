import * as OS from "os";

import { filterFiles, FilterFilesOptions } from "../filterFiles/filterFiles";
import { SpawnTestFileOptions } from "../spawnTestFile/spawnTestFile";
import { parallelize } from "../parallelize/parallelize";
import { MainContext } from "./MainContext";
import { newRoot, RunTestFileOptions } from "../testRunner/testRunner";
import { Formatter } from "../formatters";
import { DefaultFormatter } from "../formatters/default";

export type TestSuiteOptions = {
    parallel:number;
    folder:string;
    formatter:Formatter;
} & FilterFilesOptions & SpawnTestFileOptions & RunTestFileOptions;

const DEFAULT_OPTIONS:TestSuiteOptions = {
    parallel: OS.cpus().length,
    folder: process.cwd(),
    include: [/.*(\b|_)(test)(\b|_).*\.(cjs|mjs|js)$/i],
    exclude: [/\/node_modules\//i],
    prefix: [],
    clearModuleCache: false,
    formatter: new DefaultFormatter()
};
export interface TestSuiteContext {
    getFiles(path:string):Promise<string[]>;
}
export class TestSuite {
    options;
    private _root = newRoot(() => this._run());
    private _result:{
        files:string[],
        errors:unknown[];
    } = {
        files: [],
        errors: []
    };
    constructor(options:Partial<TestSuiteOptions>, readonly context:TestSuiteContext = new MainContext()) {
        this.options = {
            ...DEFAULT_OPTIONS,
            ...options
        };
        if (this.options.parallel < 0) {
            throw new Error("Invalid parallel option. Must be >= 0");
        }
        this._root.setFormatter(this.options.formatter);
    }
    async run() {
        const getPromise = await this._root.run();
        try {
            await getPromise();
        } catch (e) {
            this._result.errors.push(e);
        }
        return this._result;
    }
    async _run() {
        const files = await this.context.getFiles(this.options.folder);
        const testFiles = filterFiles(files, this.options);
        if (this.options.parallel === 0) {
            const errors:unknown[] = [];
            for (const file of testFiles) {
                try {
                    this._root.runTestFile(file, this.options);
                } catch (e) {
                    errors.push(e);
                }
            }
            this._result = {
                files: testFiles,
                errors: errors
            };
        } else {
            const results = await parallelize(this.options.parallel, this._spawnTestFiles(testFiles, this.options));
            this._result = {
                files: testFiles,
                errors: results.filter(result => result.status === "rejected").map(result => result.reason)
            };
        }
    }
    private *_spawnTestFiles(testFiles:string[], options:SpawnTestFileOptions) {
        for (const testFile of testFiles) {
            yield this._root.spawnTestFile(testFile, options);
        }
    }
}