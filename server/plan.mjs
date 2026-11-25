export function validatePlanRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("入力内容を確認してください。");
  }
  if (typeof value.request !== "string" || value.request.trim().length === 0 || value.request.length > 1000) {
    throw new Error("相談内容は1〜1000文字で入力してください。");
  }
  if (!Array.isArray(value.tasks) || value.tasks.length > 50) {
    throw new Error("予定は50件以内にしてください。");
  }
  if (typeof value.localTime !== "string" || typeof value.timeZone !== "string") {
    throw new Error("現在時刻の情報がありません。画面を再読み込みしてください。");
  }

  const ids = new Set();
  for (const task of value.tasks) {
    if (
      !task ||
      typeof task !== "object" ||
      !Number.isInteger(task.id) ||
      task.id < 1 ||
      ids.has(task.id) ||
      typeof task.name !== "string" ||
      task.name.length === 0 ||
      task.name.length > 60 ||
      !["minutes", "pages"].includes(task.kind) ||
      !Number.isInteger(task.amount) ||
      task.amount < 1 ||
      task.amount > 999 ||
      typeof task.done !== "boolean"
    ) {
      throw new Error("予定の形式が正しくありません。");
    }
    ids.add(task.id);
  }
  return value;
}

export function validateProposal(value, originalTasks) {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.summary !== "string" ||
    value.summary.length > 500 ||
    !Array.isArray(value.questions) ||
    value.questions.length > 5 ||
    !value.questions.every((question) => typeof question === "string" && question.length <= 200) ||
    !Array.isArray(value.tasks) ||
    value.tasks.length > 50
  ) {
    throw new Error("AIから不正な形式の提案が返されました。");
  }

  const originals = new Map(originalTasks.map((task) => [task.id, task]));
  const seenIds = new Set();
  for (const task of value.tasks) {
    if (
      !task ||
      typeof task !== "object" ||
      !(task.sourceTaskId === null || Number.isInteger(task.sourceTaskId)) ||
      typeof task.name !== "string" ||
      task.name.trim().length === 0 ||
      task.name.length > 60 ||
      !["minutes", "pages"].includes(task.kind) ||
      !Number.isInteger(task.amount) ||
      task.amount < 1 ||
      task.amount > 999 ||
      typeof task.reason !== "string" ||
      task.reason.length > 200
    ) {
      throw new Error("AIから不正な形式のタスクが返されました。");
    }
    if (task.sourceTaskId !== null) {
      const original = originals.get(task.sourceTaskId);
      if (!original || seenIds.has(task.sourceTaskId)) {
        throw new Error("AIの提案に予定の重複または不明なIDがあります。");
      }
      if (
        original.done &&
        (task.name !== original.name || task.kind !== original.kind || task.amount !== original.amount)
      ) {
        throw new Error("完了済みの予定が変更されたため、提案を反映できません。");
      }
      seenIds.add(task.sourceTaskId);
    }
  }

  if (seenIds.size !== originals.size) {
    throw new Error("AIの提案から既存の予定が抜けているため、反映できません。");
  }
  return value;
}

export function extractGeminiOutputText(payload) {
  if (!payload || !Array.isArray(payload.steps)) return "";
  return payload.steps
    .filter((step) => step?.type === "model_output" && Array.isArray(step.content))
    .flatMap((step) => step.content)
    .filter((content) => content?.type === "text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("");
}
