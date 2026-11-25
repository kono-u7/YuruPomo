import type { ScheduleProposal, Task } from "./types";

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isProposedTask(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  if (
    !("sourceTaskId" in value) ||
    !(value.sourceTaskId === null || isPositiveInteger(value.sourceTaskId)) ||
    !("name" in value) ||
    typeof value.name !== "string" ||
    value.name.trim().length === 0 ||
    value.name.length > 60 ||
    !("kind" in value) ||
    (value.kind !== "minutes" && value.kind !== "pages") ||
    !("amount" in value) ||
    !isPositiveInteger(value.amount) ||
    value.amount > 999 ||
    !("reason" in value) ||
    typeof value.reason !== "string" ||
    value.reason.length > 200
  ) {
    return false;
  }
  return true;
}

export async function requestScheduleProposal(
  request: string,
  tasks: readonly Task[],
): Promise<ScheduleProposal> {
  let response: Response;
  try {
    response = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request,
        tasks,
        localTime: new Date().toLocaleString("ja-JP"),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
  } catch {
    throw new Error("サーバーに接続できません。開発サーバーが起動しているか確認してください。");
  }

  const result: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const errorMessage =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "AIへの問い合わせに失敗しました。";
    throw new Error(errorMessage);
  }

  if (
    typeof result !== "object" ||
    result === null ||
    !("summary" in result) ||
    typeof result.summary !== "string" ||
    !("questions" in result) ||
    !Array.isArray(result.questions) ||
    !result.questions.every((question) => typeof question === "string") ||
    !("tasks" in result) ||
    !Array.isArray(result.tasks) ||
    !result.tasks.every(isProposedTask)
  ) {
    throw new Error("AIから不正な形式の提案が返されました。もう一度お試しください。");
  }

  return {
    summary: result.summary,
    questions: result.questions.filter((question): question is string => typeof question === "string"),
    tasks: result.tasks.filter(isProposedTask),
  } satisfies ScheduleProposal;
}
