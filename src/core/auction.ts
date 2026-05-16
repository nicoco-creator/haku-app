/**
 * 不安の買い取り査定ロジック
 * 入力テキストをネガティブキーワードと文字数でスコアリングし、
 * 静けさの欠片の買い取り額とフシギちゃんのセリフを返す。
 */

// ── ネガティブキーワード定義（カテゴリ別スコア） ────────────────────────────

const KEYWORDS: readonly { word: string; score: number }[] = [
  // ── 自己否定（高スコア）
  { word: '自分が嫌',   score: 22 },
  { word: '嫌い',       score: 16 },
  { word: 'だめ',       score: 13 },
  { word: 'ダメ',       score: 13 },
  { word: '失敗',       score: 11 },
  { word: 'できない',   score: 13 },
  { word: 'できなかった', score: 13 },
  { word: '無能',       score: 20 },
  { word: '無価値',     score: 22 },
  { word: '価値ない',   score: 22 },
  { word: '意味ない',   score: 16 },
  { word: 'どうせ',     score: 11 },
  { word: 'もうだめ',   score: 20 },
  { word: 'もう終わり', score: 20 },
  { word: '最低',       score: 14 },
  // ── 不安・恐怖
  { word: '不安',       score: 13 },
  { word: '怖い',       score: 13 },
  { word: '恐怖',       score: 16 },
  { word: '焦り',       score: 11 },
  { word: '焦る',       score: 11 },
  { word: '心配',       score:  9 },
  { word: 'パニック',   score: 16 },
  { word: '怯え',       score: 13 },
  { word: 'びくびく',   score: 11 },
  // ── 認知の歪み（全か無か思考・過度の一般化）
  { word: '絶対',       score:  9 },
  { word: 'いつも',     score:  9 },
  { word: '必ず',       score:  7 },
  { word: 'ありえない', score: 11 },
  { word: '最悪',       score: 13 },
  { word: '全部',       score:  7 },
  { word: 'みんな',     score:  7 },
  { word: '誰も',       score:  9 },
  { word: 'どこも',     score:  7 },
  { word: 'すべて',     score:  7 },
  // ── 疲弊・燃え尽き
  { word: '疲れた',     score: 11 },
  { word: 'しんどい',   score: 13 },
  { word: 'もう無理',   score: 20 },
  { word: '限界',       score: 16 },
  { word: 'つらい',     score: 13 },
  { word: '辛い',       score: 13 },
  { word: '苦しい',     score: 13 },
  { word: '嫌だ',       score:  9 },
  { word: '息苦しい',   score: 16 },
  { word: '消えたい',   score: 28 },
  { word: 'いなくなりたい', score: 28 },
  // ── ネガティブ反芻
  { word: 'ずっと',     score:  7 },
  { word: 'また',       score:  5 },
  { word: '繰り返し',   score:  9 },
  { word: 'なんで',     score:  5 },
  { word: 'なぜ',       score:  5 },
  { word: 'どうして',   score:  5 },
  // ── 孤独・孤立
  { word: '孤独',       score: 14 },
  { word: '一人',       score:  9 },
  { word: 'ひとり',     score:  9 },
  { word: '誰にも',     score: 11 },
  { word: '誰もいない', score: 14 },
  { word: '置いていかれ', score: 16 },
]

// ── 査定グレード ──────────────────────────────────────────────────────────────

type Grade = 'low' | 'medium' | 'high' | 'very_high'

// ── フシギちゃんのセリフ（グレード別・複数種） ───────────────────────────────

const FUSHIGI_QUOTES: Record<Grade, readonly string[]> = {
  low: [
    '……ふむ。小さな引っかかりですね。でも、引っかかりにも値段がつきます。【{N}シャード】で買い取りましょう。',
    '軽そうに見えて、案外ずっと持ってたんじゃないですか。【{N}シャード】です。どうぞ手放してください。',
    'これは……意外と根が深いですね。表向きは小さくても。【{N}シャード】で引き取ります。',
    'うん。こういう小さなものが、じわじわ効いてくるんです。【{N}シャード】でお預かりします。',
  ],
  medium: [
    '……なるほど。これは、かなりのものを持ってきましたね。【{N}シャード】で買い取りましょう。契約成立です。それはもう、あなたの所有物ではありません。',
    'これは……なかなか重たいですね。【{N}シャード】。そう、それだけの価値があります。ありがとう、受け取りました。',
    '……ちゃんと見えます。あなたが抱えていたもの。【{N}シャード】でお返しします。……えっ、逆だ。えーと、買い取ります。',
    'こういうものは、ひとりで持っていると腐っていくんです。【{N}シャード】。賢い選択ですよ、手放すのは。',
  ],
  high: [
    '……これは、かなり深いところから持ってきたんですね。【{N}シャード】。あなたが長いこと抱えていたぶんの値段です。',
    'こんなものを一人で抱えていたんですか。……【{N}シャード】で買い取ります。今すぐ渡してください。',
    '……重かったですね。本当に。これを持ったまま毎日過ごしていたんですか。【{N}シャード】。精一杯の値段です。',
    'よくここまで運んできましたね。だいぶ遠いところから来たはずです。【{N}シャード】でお引き取りします。',
  ],
  very_high: [
    '……。これは。……重かったですね。ずいぶん長いこと、一人で。【{N}シャード】。これが私にできる最大の値段です。受け取ってください。',
    'こんなに深いものを、よく持ってきてくれました。……【{N}シャード】。あなたがこれを手放すことに、それだけの価値があります。',
    '……黙ってもいいですか。少しだけ。……。【{N}シャード】。これは、単なる値段じゃなくて、私からのお礼のつもりです。',
    'こんなに大きなものを……ひとりで、ずっと。……【{N}シャード】。本当に、おつかれさまでした。',
  ],
}

// ── 査定ロジック ──────────────────────────────────────────────────────────────

export interface AssessmentResult {
  shards: number
  quote: string
  grade: Grade
}

export function assessAnxiety(text: string): AssessmentResult {
  // ベーススコア（文字数ベース、最大25）
  let score = Math.min(25, Math.floor(text.length / 3))

  // キーワードボーナス（重複カウントなし）
  const matched = new Set<string>()
  for (const kw of KEYWORDS) {
    if (!matched.has(kw.word) && text.includes(kw.word)) {
      score += kw.score
      matched.add(kw.word)
    }
  }

  // 5の倍数に丸めてクランプ
  const shards = Math.min(200, Math.max(10, Math.round(score / 5) * 5))

  // グレード判定
  const grade: Grade = shards < 30 ? 'low'
                     : shards < 70 ? 'medium'
                     : shards < 130 ? 'high'
                     :               'very_high'

  // ランダムにセリフを選んで shard 数を埋め込む
  const pool  = FUSHIGI_QUOTES[grade]
  const raw   = pool[Math.floor(Math.random() * pool.length)]
  const quote = raw.replace('{N}', String(shards))

  return { shards, quote, grade }
}
