export type RunMonad = {
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

export async function functionRunner<T extends (...args:any[])=>unknown>(type:string, cb:T|undefined, args:Parameters<T>):Promise<RunMonad> {
    if (!cb) {
        return {
            run: false
        };
    }
    try {
        const res = await cb(...args);
        return {
            run: true,
            ok: true,
            data: res
        };
    } catch (e) {
        return {
            run: true,
            ok: false,
            error: e,
            type: type
        };
    }
}