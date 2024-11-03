#!/usr/bin/env node
import { TestSuite } from "./TestSuite/TestSuite";

const suite = new TestSuite({});
suite.run().then(() => {
    console.log("done");
}).catch(e => {
    console.error(e);
});