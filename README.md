# YuruPomo

その日の気分に合わせて柔軟に予定を組める、スマホ通知付きのポモドーロ風タイマーです。「仕事◯分→読書◯ページ→仕事◯分」のように、異なる作業や単位を自由に混ぜて組み合わせられます。食事や休憩も一緒に管理し、気まぐれに寄り添うタイマーを目指しています。

## 開発

必要環境: Node.js 20.19+ または 22.12+

```sh
npm install
# .env に GEMINI_API_KEY を設定
npm run dev
```

`.env` はローカル専用です。`.env.example`を参考に、Google AI Studioで作成した`GEMINI_API_KEY`を設定してください。APIキーをブラウザやGitに含めないでください。現在は無料枠のある`gemini-4-hydrogen`を使用しますが、無料枠の上限・対象モデルは変更されることがあります。AI Studioで課金が有効なプロジェクトのキーを使わないでください。

Gemini無料枠では、入力がGoogleの製品改善に使われたり、人による確認対象になったりする可能性があります。実在の個人情報や機密情報を含む予定は送らず、架空・匿名の予定で試してください。詳細は[Gemini API料金](https://aistudio.google.com/docs/pricing)と[利用規約・データ利用](https://aistudio.google.com/docs/terms)を確認してください。

型チェックと本番ビルド:

```sh
npm run build
npm test
```

## 構成

- `index.html`: アプリ画面のHTML
- `src/main.ts`: 画面表示とユーザー操作
- `src/schedule.ts`: 今日のタスク一覧と提案の挿入
- `src/timer.ts`: タイマーの状態と時間計測
- `src/types.ts`: タスクの型定義
- `src/styles.css`: 画面スタイル
- `src/api.ts`: フロントエンドからAI APIへのリクエスト
- `server/index.mjs`: APIキーを使ってGeminiを呼び出すサーバー
- `server/plan.mjs`: AI応答とリクエストの検証
- `vite.config.ts`: 開発時のAPIプロキシ設定

AIは入力文と現在の予定から並び順・作業時間の提案を作ります。提案は確認後に反映されます。Geminiへの送信は`store: false`を指定しますが、無料枠のデータ利用条件は別途適用されます。締切時刻そのものを含むカレンダー登録や、アカウント、予定の永続保存、アプリを閉じた状態でのプッシュ通知はまだ実装していません。
