import type { ProposedTask, Task, TaskKind } from "./types";

const initialTasks: Task[] = [
  { id: 1, name: "仕事", kind: "minutes", amount: 25, done: false },
  { id: 2, name: "読書", kind: "pages", amount: 10, done: false },
  { id: 3, name: "仕事", kind: "minutes", amount: 40, done: false },
];

let tasks = initialTasks;
let nextId = 4;
let selectedId = 1;

export function getTasks(): readonly Task[] {
  return tasks;
}

export function getCurrentTask(): Task | undefined {
  return tasks.find((task) => task.id === selectedId);
}

export function selectTask(id: number): void {
  selectedId = id;
}

export function selectNextTask(): void {
  selectedId = tasks.find((task) => !task.done)?.id ?? 0;
}

export function addTask(name: string, kind: TaskKind, amount: number): void {
  tasks.push({ id: nextId++, name, kind, amount, done: false });
  if (!getCurrentTask() || getCurrentTask()?.done) {
    selectNextTask();
  }
}

export function toggleTaskDone(id: number): void {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  task.done = !task.done;
  if (task.done && task.id === selectedId) {
    selectNextTask();
  }
}

export function removeTask(id: number): void {
  tasks = tasks.filter((task) => task.id !== id);
  if (id === selectedId) {
    selectNextTask();
  }
}

export function applyProposal(proposedTasks: ProposedTask[]): void {
  const existingTasks = new Map(tasks.map((task) => [task.id, task]));
  tasks = proposedTasks.map((proposal) => {
    if (proposal.sourceTaskId !== null) {
      const existing = existingTasks.get(proposal.sourceTaskId);
      if (!existing) throw new Error(`Unknown source task: ${proposal.sourceTaskId}`);
      return {
        id: existing.id,
        name: proposal.name,
        kind: proposal.kind,
        amount: proposal.amount,
        done: existing.done,
      };
    }

    return {
      id: nextId++,
      name: proposal.name,
      kind: proposal.kind,
      amount: proposal.amount,
      done: false,
    };
  });

  if (!getCurrentTask() || getCurrentTask()?.done) {
    selectNextTask();
  }
}
