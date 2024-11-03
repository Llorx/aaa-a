import TR from "./testRunner/testRunner";

export type { TestSuiteOptions, TestSuiteContext } from "./TestSuite/TestSuite";
export type { TestInterface, TestFunction, Test } from "./testRunner/testRunner";

export default TR;

export const test = TR.test;
export const describe = TR.describe;
export { TestSuite } from "./TestSuite/TestSuite";