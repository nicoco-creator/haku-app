// ── カテゴリ定義 ─────────────────────────────────────────────────────────────

import type { AccentName } from '../../ui/tokens'

export interface NewsCategory {
  id: string
  label: string
  emoji: string
  accent: AccentName
  domain: string  // プロンプト内での表現
}

export const NEWS_CATEGORIES: readonly NewsCategory[] = [
  {
    id: 'psychology',
    label: '心理学',
    emoji: '🧠',
    accent: 'blush',
    domain: '心理学・精神医学・脳科学・メンタルヘルス',
  },
  {
    id: 'ai_tech',
    label: 'AI・テクノロジー',
    emoji: '🤖',
    accent: 'indigo',
    domain: 'AI・機械学習・テクノロジー・スタートアップ',
  },
  {
    id: 'business',
    label: '商学・経済',
    emoji: '📈',
    accent: 'amber',
    domain: '経営・マーケティング・経済・ビジネス戦略',
  },
  {
    id: 'culture',
    label: '芸能・カルチャー',
    emoji: '🎭',
    accent: 'blue',
    domain: '芸能・映画・音楽・アート・カルチャー',
  },
  {
    id: 'science',
    label: '科学・自然',
    emoji: '🔬',
    accent: 'silver',
    domain: '科学・医学・宇宙・自然・環境',
  },
  {
    id: 'latest',
    label: '最新ニュース',
    emoji: '📰',
    accent: 'ash',
    domain: '国内・国際・政治・社会・経済の最新ニュース',
  },
]

// ── プロンプト生成 ────────────────────────────────────────────────────────────

/** Gemini向け：写真付きスライドデッキ作成プロンプト */
export function generateSlidesPrompt(categoryId: string): string {
  const cat = NEWS_CATEGORIES.find((c) => c.id === categoryId)
  if (!cat) return ''

  const now     = new Date()
  const dateStr = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()]

  return `# 今日の${cat.label}ニュース スライドデッキ作成

**今日（${dateStr}・${weekday}曜日）の「${cat.domain}」分野の最新ニュースをもとに、わかりやすいスライドデッキを作成してください。**

⚠️ **【必須】Google検索ツールを使い、今日・直近の実際のニュースを調べてから作成してください。**

---

## スライド構成（10〜15枚）

### スライド 1：タイトル
- タイトル：「${dateStr}の${cat.label}ニュース」
- サブタイトル：今日のキーワード3つ
- 関連する写真・イラストを1枚挿入

### スライド 2：今日のハイライト
- 今日の注目ニュース3選を箇条書き
- 関連するグラフまたはイラストを挿入

### スライド 3〜12：各トピックの詳細
（1トピックにつき1〜2枚。以下の形式で）
- 見出し（記事タイトル）
- 概要（箇条書き3〜4点）
- **必ず関連する写真・イラスト・グラフを1枚以上挿入**
- 情報源（媒体名・日付）

### スライド 最終：まとめ
- 今日全体のトレンドと今後の注目点
- 参考文献リスト（URL付き）

---

## 視覚的要件
- 各スライドに関連写真またはイラストを最低1枚
- フォントは大きめ（見出し28pt以上）で読みやすく
- カラーテーマは統一感のあるシンプルなデザイン
- グラフ・図表があればデータを可視化して挿入

完成したらPDF形式でエクスポートできるようにしてください。`
}

/** Claude向け：テキスト調査レポートプロンプト */
export function generateNewsPrompt(categoryId: string): string {
  const cat = NEWS_CATEGORIES.find((c) => c.id === categoryId)
  if (!cat) return ''

  const now     = new Date()
  const dateStr = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()]

  return `# 今日の${cat.label}ニュース調査レポート

今日（${dateStr}・${weekday}曜日）の「${cat.domain}」分野のニュースや最新動向を調査し、以下の形式でレポートにまとめてください。

⚠️ **【重要】必ずWebSearch（ウェブ検索）ツールを使って今日・直近の最新情報を取得してください。記憶や学習データだけで回答しないでください。**

---

## 調査トピック 5件（以下の形式で）

---
### 【1】〈トピックタイトル〉
**📌 情報源:** 媒体名・発行日・URL（できる限り記載）
**📖 概要:** （150字以内で簡潔に）
**💡 なぜ重要か:** （この分野・あなたの生活にとっての意味を150字以内で）
**🔍 深掘りポイント:**
- （補足情報・背景・数字など）
- （関連する概念・人物・組織など）
- （今後の展開・注目すべき点）

---
### 【2】〈トピックタイトル〉
（同形式で）

---
### 【3】〈トピックタイトル〉
（同形式で）

---
### 【4】〈トピックタイトル〉
（同形式で）

---
### 【5】〈トピックタイトル〉
（同形式で）

---

## 📊 今日の${cat.label}トレンドまとめ
（5件を通じた全体の潮流・キーワード・今後のポイントを200字程度で）

---
*調査日時: ${dateStr} / カテゴリ: ${cat.domain}*`
}
