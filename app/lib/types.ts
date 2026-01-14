// A tiny helper type alias: we will represent IDs as strings.
export type Id = string;

// We store dates as ISO strings like "2025-12-21" (YYYY-MM-DD format).
export type ISODateString = string;

export type Quest = {
  id: Id;
  title: string;
  userId: string;
  createdAt: ISODateString;
  tasks?: Task[];
};

export type Task = {
  id: Id;
  questId: Id;
  title: string;
  dueDate: ISODateString;
  completed: boolean;
  createdAt: ISODateString;
};

// Extended task type with computed status field
export type TaskWithStatus = Task & {
  status: "planned" | "overdue" | "done";
};

// Type for grouping tasks by day
export type DayGroup = {
  date: ISODateString;
  tasks: Task[];
};

// API response wrapper types
export type ApiSuccessResponse<T> = {
  ok: true;
} & T;

export type ApiErrorResponse = {
  ok: false;
  error: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;