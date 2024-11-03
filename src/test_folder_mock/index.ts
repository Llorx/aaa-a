import * as PATH from "path";

export const mockFiles = {
    "index": __filename,
    "file1": PATH.join(__dirname, "file1.js"),
    "re-evaluation": PATH.join(__dirname, "re-evaluation.js"),
    "file1.mytest-ok": PATH.join(__dirname, "file1.mytest-ok.js"),
    "file1.mytest-invalid": PATH.join(__dirname, "file1.mytest-invalid.js"),
    "file2": PATH.join(__dirname, "test_subfolder_mock", "file2.js"),
    "file2.mytest-ok": PATH.join(__dirname, "test_subfolder_mock", "file2.mytest-ok.js")
};