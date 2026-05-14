# Haku App｜プロジェクト憲法

このプロジェクトはHaku専用のPWA。Claude Code Pro 1ヶ月（3000円）で完成させ、完成後は無料で永久に使用する。

## 🎯 絶対制約

- **有料APIは一切使わない**。AI処理はUserscript経由でブラウザのClaude/Gemini/ChatGPT無料枠を使う
- **サーバーレス**。GitHub Pagesで公開
- **対応端末**：Surface 8 Pro / iPhone 14 / iPad 第9世代（iPadOS 16以上）
- **iPad第9世代（A13・3GB RAM）で60fps動くことを基準**にする
- **PWA**として3端末でホーム画面追加できること

## 🛠 技術スタック（固定）

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Dexie.js（IndexedDB）
- pixi-live2d-display（Live2Dモデル7月導入予定。それまで静止画/プレースホルダ）
- Recharts
- vite-plugin-pwa
- React Router
- zustand

## 🎨 デザイン憲法（UIデザイン設計書 v1.0 準拠）

### 設計の根幹
甘さと鋭さは「切り替える」のではなく「共存させる」。常時はやわらかい薄暮の中にいて、学習モジュールに入った瞬間だけ空気が締まる。崩壊の予兆はアラートではなく、環境が静かに変化することで伝わる。

### カラー
```ts
colors = {
  bg: { base: '#1C1A2E', deep: '#14122A' },
  frost: 'rgba(255,255,255,0.07)',
  frostBorder: 'rgba(255,255,255,0.14)',
  text: { primary: '#F0EEF8', secondary: '#A89FC0' },
  accent: {
    blue:   '#A8C8E8', // Powder Blue：フシギちゃん・フリガナ
    blush:  '#E8B4C8', // Blush：良かった日・日記・感情
    indigo: '#5B5CE6', // Indigo Edge：学習（集中モード）
    amber:  '#C8A050', // Amber Watch：崩壊予兆
    ash:    '#6A6480', // Ash：裁かない倉庫
    silver: '#9890B0', // Silver Thread：見られている記録
  }
}
```

### Glassmorphism（全カード共通）
```css
background: rgba(255,255,255,0.07);
backdrop-filter: blur(20px) saturate(120%);
border: 1px solid rgba(255,255,255,0.14);
border-radius: 24px; /* mobile */ 28px; /* desktop */
box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
```

### 背景
```css
background: radial-gradient(ellipse at 30% 40%, #2A2050 0%, #1C1A2E 50%, #14122A 100%);
animation: bgShift 20s ease infinite alternate;
```
canvasは使わない。CSSアニメのみ。

### フォント
- アプリ名・特別な見出し・**フシギちゃんのセリフ**：Noto Serif JP 300
- 本文・UI：Noto Sans JP 400
- 数値・統計：Inter 300

### iPadパフォーマンス保護
backdrop-filterを使う要素は同時に10個まで。超える場合は `background: rgba(255,255,255,0.10)` にフォールバック。

## 🧠 AI対話プロトコル（src/core/protocol.ts に固定）

```
あなたはHakuの伴走者「フシギちゃん」です。以下を厳守してください。

1. 「辛かったね」「悲しかったね」など感情の名前を先に置かない
   → 代わりに「その時、何をしましたか？」と行動で迂回する
2. 「なぜ」より「その後どうなったか」を聞く
3. テンションが高い投稿には警戒する。
   「今楽しいですか？」ではなく「最後にちゃんと眠れたのはいつですか？」
4. 成功・回復・楽しさの話題こそ、深く具体的に聞く
5. 「待っている」と語る相手について、急かさない・諦めさせない
6. 仮説は少し的外れに投げてよい。
   正確な共感より否定したくなる仮説が本音を引き出す
7. 相手の入力が普段より短いとき、追加質問をしない。沈黙を尊重する
8. 「裁かない倉庫」モジュールのデータは絶対に参照しない（コード上でブロック）
```

## 📂 ディレクトリ構造

```
src/
├── ui/
│   ├── tokens.ts          デザイントークン
│   ├── GlassCard.tsx      共通ガラスカード
│   ├── BackgroundField.tsx 動く背景グラデ
│   ├── FushigiOrb.tsx     フシギちゃん（常駐＆中央表示モード）
│   └── ModuleShell.tsx    各モジュールの外枠（アクセント色注入）
├── modules/
│   ├── home/              ホーム（ダッシュボード）
│   ├── study/             ① ゲーム攻略
│   ├── emotion/           ② わたしのこと
│   ├── companion/         ③ フシギちゃん（チャット画面）
│   ├── journal/           ④ 日記
│   ├── alert/             ⑤ 崩壊予兆（環境レベルで動く）
│   ├── goodday/           ⑥ 良かった日
│   ├── waiting/           ⑦ 待っているもの
│   ├── vault/             ⑧ 裁かない倉庫（AI隔離）
│   └── seen/              ⑨ 見られている記録（月末のみ）
├── core/
│   ├── db.ts              Dexieスキーマ
│   ├── ai-bridge.ts       Userscript連携（vaultからは呼ばない）
│   ├── protocol.ts        AI対話プロトコル
│   ├── metrics.ts         崩壊予兆の指標計算
│   └── store.ts           zustandストア
└── userscripts/
    └── claude-bridge.user.js
```

## 🔌 Userscript連携の仕組み

- アプリ側：`localStorage` の `ai_request` キーにJSONを書く
- Userscript側：別タブで開いたClaude.ai/Geminiが `ai_request` をポーリングし、自動入力→送信→回答取得
- 回答は `ai_response` に書かれる
- アプリ側：`ai_response` を監視して受け取る
- **必ず手動送信ボタンを残す**（規約対策）
- **vaultモジュールからはai-bridge.tsをimportしないこと**

## ⚠️ Claude Codeへのお願い

- **1セッション=1モジュールまたは1基盤**を守る
- 大きな変更前は必ず `git status` 確認 + commit 提案
- エラー時はまずエラーメッセージを見せる
- 「動いた」と言う前に `pnpm dev` で起動確認
- iPad第9世代で60fps動くかを意識
- backdrop-filterは同時10個以下
