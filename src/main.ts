import { requestScheduleProposal } from "./api";
import { addTask, applyProposal, getCurrentTask, getTasks, removeTask, selectTask, toggleTaskDone } from "./schedule";
import { TaskTimer } from "./timer";
import type { ScheduleProposal, Task, TaskKind } from "./types";
import "./styles.css";

function element<T extends Element>(id: string): T {
  const node = document.querySelector<T>(`#${id}`);
  if (!node) throw new Error(`Required element #${id} was not found`);
  return node;
}

const time = element<HTMLDivElement>("time");
const arc = element<SVGCircleElement>("arc");
const nowName = element<HTMLElement>("nowName");
const nowSub = element<HTMLDivElement>("nowSub");
const goButton = element<HTMLButtonElement>("go");
const taskList = element<HTMLUListElement>("list");
const count = element<HTMLSpanElement>("count");
const message = element<HTMLDivElement>("msg");
const askButton = element<HTMLButtonElement>("ask-go");
const proposalPanel = element<HTMLElement>("proposal");
const proposalSummary = element<HTMLParagraphElement>("proposal-summary");
const proposalTasks = element<HTMLUListElement>("proposal-tasks");
const questionsPanel = element<HTMLDivElement>("proposal-questions");
const questionsList = element<HTMLUListElement>("questions-list");
const applyProposalButton = element<HTMLButtonElement>("apply-proposal");
let currentProposal: ScheduleProposal | undefined;

function formatTime(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

function taskLabel(task: Task): string {
  return task.kind === "minutes" ? `${task.amount}分` : `${task.amount}ページ`;
}

function notify(task: Task): void {
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("ひといき", { body: `${task.name}、おつかれさまでした。` });
  }
}

function render(): void {
  const task = getCurrentTask();
  const display = timer.display(task);

  nowName.textContent = task ? `${task.name}・${taskLabel(task)}` : "おつかれさまでした";
  nowSub.textContent = !task
    ? "今日の流れはぜんぶ終わりました"
    : task.kind === "minutes"
      ? timer.isRunning ? "集中しているところ" : "目の前のことだけ。"
      : "読み終えたら、左の○をタップ";
  time.textContent = formatTime(display.seconds);
  arc.setAttribute("stroke-dashoffset", String(289 * (1 - Math.max(0, Math.min(1, display.progress)))));
  goButton.textContent = !task ? "完了" : timer.isRunning ? "一時停止" : "このタスクをはじめる";
  goButton.disabled = !task;
  count.textContent = `${getTasks().length}件・上から順に`;

  taskList.replaceChildren();
  for (const item of getTasks()) {
    const row = document.createElement("li");
    row.className = `${item.id === task?.id ? "sel " : ""}${item.done ? "done" : ""}`;
    row.addEventListener("click", () => {
      selectTask(item.id);
      timer.reset(getCurrentTask());
      render();
    });

    const checkbox = document.createElement("button");
    checkbox.className = "ck";
    checkbox.setAttribute("aria-label", "完了にする");
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
      const wasSelected = getCurrentTask()?.id === item.id;
      const willBeDone = !item.done;
      toggleTaskDone(item.id);
      if (wasSelected && willBeDone) {
        timer.reset(getCurrentTask());
      } else {
        render();
      }
    });

    const text = document.createElement("div");
    text.className = "tx";
    const name = document.createElement("div");
    name.className = "nm";
    name.textContent = item.name;
    text.append(name);

    const label = document.createElement("span");
    label.className = `chip${item.kind === "pages" ? " p" : ""}`;
    label.textContent = taskLabel(item);

    const deleteButton = document.createElement("button");
    deleteButton.className = "x";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", "削除");
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const wasSelected = getCurrentTask()?.id === item.id;
      removeTask(item.id);
      if (wasSelected) {
        timer.reset(getCurrentTask());
      } else {
        render();
      }
    });

    row.append(checkbox, text, label, deleteButton);
    taskList.append(row);
  }
}

const timer = new TaskTimer(
  render,
  () => {
    const completedTask = getCurrentTask();
    if (!completedTask) return;
    toggleTaskDone(completedTask.id);
    notify(completedTask);
    timer.reset(getCurrentTask());
  },
);

element<HTMLButtonElement>("go").addEventListener("click", () => {
  const task = getCurrentTask();
  if (!task) return;

  if (!timer.isRunning && "Notification" in window && Notification.permission === "default") {
    void Notification.requestPermission();
  }
  timer.toggle(task);
});

element<HTMLButtonElement>("rs").addEventListener("click", () => timer.reset(getCurrentTask()));

element<HTMLButtonElement>("plus").addEventListener("click", () => {
  const nameInput = element<HTMLInputElement>("nm");
  const amountInput = element<HTMLInputElement>("nv");
  const name = nameInput.value.trim();
  const amount = Number.parseInt(amountInput.value, 10);
  if (!name || !(amount > 0)) {
    message.textContent = "タスク名と数を入れてください。";
    return;
  }

  const rawKind = element<HTMLDivElement>("seg").querySelector<HTMLButtonElement>("button.on")?.dataset.k;
  if (rawKind !== "minutes" && rawKind !== "pages") throw new Error("A task kind must be selected");
  const selectedKind: TaskKind = rawKind;
  const hadCurrentTask = Boolean(getCurrentTask() && !getCurrentTask()?.done);
  addTask(name, selectedKind, amount);
  nameInput.value = "";
  message.textContent = "";
  if (hadCurrentTask) {
    render();
  } else {
    timer.reset(getCurrentTask());
  }
});

element<HTMLDivElement>("seg").addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>("button[data-k]");
  if (!button) return;

  element<HTMLDivElement>("seg").querySelectorAll("button").forEach((item) => {
    item.classList.toggle("on", item === button);
  });
  element<HTMLInputElement>("nv").value = button.dataset.k === "minutes" ? "25" : "10";
});

element<HTMLButtonElement>("ask-go").addEventListener("click", () => {
  void createProposal();
});

async function createProposal(): Promise<void> {
  const input = element<HTMLTextAreaElement>("ask");
  const request = input.value.trim();
  if (!request) {
    message.textContent = "やりたいことや締切を入力してください。";
    return;
  }

  askButton.disabled = true;
  askButton.textContent = "AIが予定を考えています…";
  message.textContent = "";
  proposalPanel.hidden = true;
  try {
    currentProposal = await requestScheduleProposal(request, getTasks());
    showProposal(currentProposal);
    message.textContent = "提案を確認して、反映するか選んでください。";
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : "AIへの問い合わせに失敗しました。";
  } finally {
    askButton.disabled = false;
    askButton.textContent = "AIに予定を相談する";
  }
}

function showProposal(proposal: ScheduleProposal): void {
  proposalSummary.textContent = proposal.summary;
  proposalTasks.replaceChildren();
  for (const task of proposal.tasks) {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = `${task.name}・${task.kind === "minutes" ? `${task.amount}分` : `${task.amount}ページ`}`;
    const reason = document.createElement("span");
    reason.textContent = `${task.sourceTaskId === null ? "追加" : "予定"}：${task.reason}`;
    item.append(title, reason);
    proposalTasks.append(item);
  }

  questionsList.replaceChildren();
  for (const question of proposal.questions) {
    const item = document.createElement("li");
    item.textContent = question;
    questionsList.append(item);
  }
  questionsPanel.hidden = proposal.questions.length === 0;
  applyProposalButton.disabled = proposal.questions.length > 0;
  applyProposalButton.title = proposal.questions.length > 0 ? "確認事項に回答してから再度相談してください" : "";
  proposalPanel.hidden = false;
}

applyProposalButton.addEventListener("click", () => {
  if (!currentProposal || currentProposal.questions.length > 0) return;
  applyProposal(currentProposal.tasks);
  currentProposal = undefined;
  proposalPanel.hidden = true;
  element<HTMLTextAreaElement>("ask").value = "";
  message.textContent = "AIの提案を今日の流れに反映しました。";
  timer.reset(getCurrentTask());
});

element<HTMLButtonElement>("dismiss-proposal").addEventListener("click", () => {
  currentProposal = undefined;
  proposalPanel.hidden = true;
});

timer.reset(getCurrentTask());
