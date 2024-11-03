import * as FS from "fs";
import * as PATH from "path";

import { TestSuiteContext } from "./TestSuite";

async function recursiveReadDir(folder:string) {
    const res:string[] = [];
    const files = await FS.promises.readdir(folder, {
        withFileTypes: true
    });
    for (const file of files) {
        const path = PATH.join(folder, file.name);
        if (file.isFile()) {
            res.push(path);
        } else {
            try {
                const files = await recursiveReadDir(path);
                res.push(...files);
            } catch (e) {}
        }
    }
    return res;
}
export class MainContext implements TestSuiteContext {
    getFiles(path:string) {
        return recursiveReadDir(path);
    }
}