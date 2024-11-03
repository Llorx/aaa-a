function textRegex(path:string, regex:RegExp[]) {
    for (const r of regex) {
        if (r.test(path)) {
            return true;
        }
    }
    return false;
}
export type FilterFilesOptions = {
    include:RegExp[];
    exclude:RegExp[];
}
export function filterFiles(files:string[], options:FilterFilesOptions) {
    const result:string[] = [];
    for (const file of files) {
        const fullPathForward = file.replace(/\\/g, "/");
        const fullPathBackward = file.replace(/\//g, "\\");
        if (textRegex(fullPathForward, options.include) || textRegex(fullPathBackward, options.include)) {
            if (!textRegex(fullPathForward, options.exclude) && !textRegex(fullPathBackward, options.exclude)) {
                result.push(file);
            }
        }
    }
    return result;
}