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
