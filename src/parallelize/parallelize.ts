export async function parallelize<T = unknown>(parallel:number, generator:Generator<Promise<T>>) {
    const res:PromiseSettledResult<T>[] = [];
    const loopPromises = new Array(parallel).fill(0).map(async () => {
        while (true) {
            const next = generator.next();
            if (next.done) {
                break;
            }
            try {
                const value = await next.value;
                res.push({
                    status: "fulfilled",
                    value: value
                });
            } catch (e) {
                res.push({
                    status: "rejected",
                    reason: e
                });
            }
        }
    });
    await Promise.allSettled(loopPromises);
    return res;
}