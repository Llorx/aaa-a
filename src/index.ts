import TR from "./testRunner/testRunner";

export type { TestSuiteOptions, TestSuiteContext } from "./TestSuite/TestSuite";
export type { TestInterface, TestFunction, Test, After, DescribeCallback } from "./testRunner/testRunner";

export { TestSuite } from "./TestSuite/TestSuite";
export { monad, asyncMonad } from "./monad/monad";

export default TR;
export const test = TR.test;
export const describe = TR.describe;