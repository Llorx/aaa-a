import { TestInfo, Messages, FormatType, Formatter } from "."

const tests = new Map<string, Test>();

class Test {
    readonly children:Test[] = [];
    readonly level:number;
    private _shown = false;
    private _pendingLogs:string[][] = [];
    private _pending = new Set<Test>;
    private _next:Test|null = null;
    startLogged = false;
    ended = false;
    error:string|null = null;
    constructor(readonly out:((...args:any[]) => void)|null, readonly info:TestInfo, readonly parent:Test|null) {
        this.level = parent ? parent.level + 1 : -1;
        if (parent) {
            parent.addChild(this);
        }
    }
    protected startChild(test:Test) {
        if (this._next === test) {
            if (this._shown) {
                test.show();
            }
        } else {
            this._pending.add(test);
        }
    }
    protected endChild(test:Test) {
        if (this._next === test) {
            this._next = this.children[this.children.indexOf(test) + 1] || null;
            test.logEnd();
            if (this._next && this._pending.delete(this._next)) {
                this.startChild(this._next);
                if (this._next.ended) {
                    this.endChild(this._next);
                }
            }
        } else {
            this._pending.add(test);
        }
    }
    protected logStart() {
        if (!this.startLogged) {
            this.startLogged = true; // Flag as mutiple childs can notify this log
            this.log("►", this.info.description);
        }
    }
    protected logEnd() {
        if (this.error) {
            this.log("×", this.info.description);
            this.log(this.error);
        } else {
            this.log("√", this.info.description);
        }
    }
    protected addChild(test:Test) {
        this.children.push(test);
        if (!this._next) {
            this._next = test;
        }
    }
    start() {
        if (this.parent) {
            this.parent.logStart();
            this.parent.startChild(this);
        }
    }
    end(error:string|null) {
        this.ended = true;
        this.error = error;
        if (this.parent) {
            this.parent.endChild(this);
        }
    }
    show() {
        this._shown = true;
        for (const log of this._pendingLogs.splice(0)) {
            this.log(...log);
        }
        for (const child of this.children) {
            child.show();
        }
    }
    log(...args:string[]) {
        if (this._shown) {
            if (this.out) {
                this.out(" ".repeat(this.level * 2), ...args);
            }
        } else {
            this._pendingLogs.push(args);
        }
    }
}

export class DefaultFormatter implements Formatter {
    private readonly _root = new Test(null, {
        parentId: "",
        description: ""
    }, null);
    constructor(private readonly _out = console.log) {
        this._root.show();
    }
    format(fileId:string, msg:Messages):void {
        switch (msg.type) {
            case FormatType.ADDED: {
                const test = new Test(this._out, msg.test, tests.get(`${fileId}_${msg.test.parentId}`) || this._root);
                tests.set(`${fileId}_${msg.id}`, test);
                break;
            }
            case FormatType.START: {
                const test = tests.get(`${fileId}_${msg.id}`);
                if (test) {
                    test.start();
                }
                break;
            }
            case FormatType.END: {
                const test = tests.get(`${fileId}_${msg.id}`);
                if (test) {
                    test.end(msg.error || null);
                }
                break;
            }
        }
    }
}