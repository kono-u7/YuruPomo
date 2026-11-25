import test from "node:test";
import assert from "node:assert/strict";
import { extractGeminiOutputText, validatePlanRequest, validateProposal } from "./plan.mjs";

const tasks = [
  { id: 1, name: "仕事", kind: "minutes", amount: 25, done: false },
  { id: 2, name: "読書", kind: "pages", amount: 10, done: true },
];

test("validates a schedule request and rejects duplicate task IDs", () => {
  assert.equal(
    validatePlanRequest({
      request: "0時までにレポート提出",
      tasks,
      localTime: "2026/11/25 15:00:00",
      timeZone: "Asia/Tokyo",
    }).tasks.length,
    2,
  );
  assert.throws(
    () => validatePlanRequest({
      request: "相談",
      tasks: [tasks[0], tasks[0]],
      localTime: "today",
      timeZone: "Asia/Tokyo",
    }),
    /予定の形式/,
  );
});

test("accepts a complete proposal while preserving completed tasks", () => {
  const proposal = {
    summary: "締切に向けて仕事を前に移動します。",
    questions: [],
    tasks: [
      { sourceTaskId: 1, name: "レポート作成", kind: "minutes", amount: 60, reason: "締切を優先" },
      { sourceTaskId: 2, name: "読書", kind: "pages", amount: 10, reason: "完了済み" },
      { sourceTaskId: null, name: "提出確認", kind: "minutes", amount: 10, reason: "提出前の確認" },
    ],
  };
  assert.equal(validateProposal(proposal, tasks), proposal);
});

test("rejects proposals that omit tasks, duplicate IDs, or alter completed tasks", () => {
  const base = {
    summary: "予定案",
    questions: [],
    tasks: [
      { sourceTaskId: 1, name: "仕事", kind: "minutes", amount: 25, reason: "そのまま" },
      { sourceTaskId: 2, name: "読書", kind: "pages", amount: 10, reason: "完了済み" },
    ],
  };
  assert.throws(() => validateProposal({ ...base, tasks: base.tasks.slice(0, 1) }, tasks), /抜けている/);
  assert.throws(
    () => validateProposal({ ...base, tasks: [base.tasks[0], base.tasks[0]] }, tasks),
    /重複/,
  );
  assert.throws(
    () => validateProposal({
      ...base,
      tasks: [base.tasks[0], { ...base.tasks[1], amount: 20 }],
    }, tasks),
    /完了済み/,
  );
});

test("extracts only generated text from a Gemini interaction response", () => {
  assert.equal(
    extractGeminiOutputText({
      steps: [
        { type: "thought", content: [{ type: "text", text: "not output" }] },
        { type: "model_output", content: [{ type: "text", text: "{\"summary\":" }, { type: "text", text: "\"ok\"}" }] },
      ],
    }),
    "{\"summary\":\"ok\"}",
  );
  assert.equal(extractGeminiOutputText({ steps: [] }), "");
});
