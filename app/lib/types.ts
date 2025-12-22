// A tiny helper type alias: we will represent IDs as strings.
// Later, in a database, these might become UUID strings.
export type Id = string;

// We store dates as ISO strings like "2025-12-21" or full timestamps like "2025-12-21T12:34:56.789Z".
// For v0, we'll mostly use a simple date string "YYY-MM-DD".
export type ISODateString = string;

export type Quest = {
    id: Id;
    title: string;
    createdAt: ISODateString;
};

export type Task = {
    id: Id;
    questId: Id; // "foreign key" style reference to the quest that owns this task.
    title: string;
    dueDate: ISODateString;
    completed: boolean;
    createdAt: ISODateString;
}