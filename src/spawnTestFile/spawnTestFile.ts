import { spawn } from "child_process";

export type SpawnTestFileOptions = {
    prefix:string[];
};

export function spawnTestFile(path:string, options:SpawnTestFileOptions, cb:(msg:unknown)=>void) {
    return new Promise<void>((resolve, reject) => {
        const testProcess = spawn(process.execPath, [...options.prefix, path], {
            env: process.env,
            stdio: ["ignore", "pipe", "pipe", "ipc"]
        });
        const out:Uint8Array[] = [];
        const err:Uint8Array[] = [];
        testProcess.stdout!.on("data", data => {
            out.push(data);
        });
        testProcess.stderr!.on("data", data => {
            err.push(data);
        });
        testProcess.on("message", cb);
        testProcess.on("error", reject);
        testProcess.on("close", () => {
            if (testProcess.exitCode != 0) {
                reject(new Error(`Test file ended with exit code: ${testProcess.exitCode}. Error: ${Buffer.concat(err).toString()}`));
            } else {
                resolve();
            }
        });
    });
}