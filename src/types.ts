export type TaskKind = "minutes" | "pages";

export interface Task {
  id: number;
  name: string;
  kind: TaskKind;
  amount: number;
  done: boolean;
}

export interface ProposedTask {
  sourceTaskId: number | null;
  name: string;
  kind: TaskKind;
  amount: number;
  reason: string;
}

export interface ScheduleProposal {
  summary: string;
  questions: string[];
  tasks: ProposedTask[];
}
