export const enum FormatType {
    ADDED,
    START,
    END
}
export type TestInfo = {
    parentId:string;
    description:string;
};
export type MessageBase = {
    id:string;
};
export type MessageAdded = MessageBase & {
    type:FormatType.ADDED;
    test:TestInfo;
};
export type MessageStart = MessageBase & {
    type:FormatType.START;
};
export type MessageEnd = MessageBase & {
    type:FormatType.END;
    error?:string;
};
export type Messages = MessageAdded | MessageStart | MessageEnd;

export interface Formatter {
    format(fileId:string, msg:Messages):void;
}