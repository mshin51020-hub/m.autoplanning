# CLAUDE.md — M. AutoPlanning プロジェクトコンテキスト

Claude Codeへの移譲用コンテキストファイルです。このドキュメントを最初に読んでプロジェクト全体を把握してください。

---

## プロジェクト概要

**アプリ名:** M. AutoPlanning（エムドットオートプランニング）
**概要:** ユーザーの身体情報・目標・環境を入力するだけで、パーソナライズされたトレーニングメニューを自動生成するWebアプリ。
**URL:** https://mdotautoplanning.manus.space

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React 19 + Tailwind CSS 4 + shadcn/ui |
| バックエンド | Express 4 + tRPC 11 |
| 型共有 | tRPC（型定義はサーバー側のみ、クライアントは推論） |
| DB | MySQL/TiDB（Drizzle ORM） |
| 認証 | 独自メール/パスワード認証（bcryptjs）+ Manus OAuth（オプション） |
| テスト | Vitest |
| ビルド | Vite（フロントエンド）+ tsx watch（サーバー） |

---

## ディレクトリ構造

```
muscle-plan/
├── client/
│   ├── index.html
│   └── src/
│       ├── _core/hooks/useAuth.ts      # 認証フック
│       ├── components/
│       │   ├── DashboardLayout.tsx     # サイドバー付きレイアウト（全ページ共通）
│       │   ├── AdBanner.tsx            # Google AdSenseプレースホルダー
│       │   ├── AffiliateCard.tsx       # アフィリエイトカード
│       │   ├── DisclaimerModal.tsx     # 免責事項モーダル（初回のみ）
│       │   └── ui/                     # shadcn/uiコンポーネント群
│       ├── pages/
│       │   ├── Home.tsx                # ランディングページ
│       │   ├── AuthPage.tsx            # ログイン/会員登録/パスワードリセット
│       │   ├── ProfileForm.tsx         # メニュー生成フォーム（メイン機能）
│       │   ├── PlanResult.tsx          # 生成結果表示
│       │   ├── MenuResult.tsx          # 週間メニュー表示（旧フロー）
│       │   ├── History.tsx             # 生成履歴一覧
│       │   ├── AdminExerciseWeights.tsx # 管理者：種目・重量管理
│       │   ├── AdminUsers.tsx          # 管理者：ユーザー管理
│       │   ├── AdminContacts.tsx       # 管理者：お問い合わせ管理
│       │   ├── AdminSetupPassword.tsx  # 管理者：初期パスワード設定
│       │   ├── Contact.tsx             # お問い合わせフォーム
│       │   ├── Privacy.tsx             # プライバシーポリシー
│       │   └── Terms.tsx               # 利用規約
│       ├── App.tsx                     # ルーティング
│       ├── index.css                   # グローバルスタイル（近未来デザイン）
│       └── main.tsx                    # エントリーポイント
├── server/
│   ├── _core/                          # フレームワーク基盤（編集不要）
│   │   ├── index.ts                    # Expressサーバー起動
│   │   ├── trpc.ts                     # tRPCセットアップ
│   │   ├── context.ts                  # リクエストコンテキスト
│   │   ├── oauth.ts                    # Manus OAuth
│   │   ├── llm.ts                      # LLMヘルパー（invokeLLM）
│   │   └── env.ts                      # 環境変数定義
│   ├── routers/
│   │   ├── auth.ts                     # 認証ルーター（register/login/logout/me）
│   │   ├── exercise.ts                 # 種目CRUD（管理者専用）
│   │   ├── exercise.test.ts            # 種目テスト
│   │   └── contact.ts                  # お問い合わせルーター
│   ├── routers.ts                      # メインルーター（menu/plan/profile/admin）
│   ├── training-engine.ts              # ★コア：トレーニングメニュー生成エンジン
│   ├── training-engine.test.ts         # エンジンテスト（109件）
│   ├── training-engine-notes.md        # エンジン設計メモ
│   ├── db.ts                           # DBクエリヘルパー
│   └── storage.ts                      # S3ストレージヘルパー
├── drizzle/
│   ├── schema.ts                       # DBスキーマ定義
│   ├── relations.ts                    # Drizzleリレーション
│   └── *.sql                           # マイグレーションSQL（0000〜0015）
├── shared/
│   ├── types.ts                        # 共有型定義
│   ├── const.ts                        # 共有定数
│   └── exerciseMap.ts                  # 種目名マッピング
├── todo.md                             # 実装済み機能の完全な履歴
├── CLAUDE.md                           # このファイル
└── package.json
```

---

## データベーススキーマ（drizzle/schema.ts）

主要テーブル：

| テーブル | 用途 |
|---|---|
| `users` | ユーザー情報（id, email, password_hash, role, disclaimerAgreedAt） |
| `profiles` | トレーニングプロフィール（userId, goal, age, weight, height, experienceLevel等） |
| `generated_menus` | 生成済みメニュー（userId, profileSnapshot, planData, createdAt） |
| `exercises` | 種目マスター（name, muscleGroup, equipment, difficulty, compound等） |
| `exercise_weights` | 種目別推奨重量（exerciseId, baseWeight, 性別別係数等） |
| `global_settings` | グローバル設定（性別別デフォルト係数等） |
| `contacts` | お問い合わせ（name, email, category, message, isRead） |

---

## トレーニングエンジン（server/training-engine.ts）★最重要

### 概要

ルールベースのトレーニングメニュー生成エンジン。約1400行。

### 主要な関数

| 関数 | 役割 |
|---|---|
| `generateTrainingPlan(profile, duration)` | メインエントリーポイント。1週間/1ヶ月/3〜12ヶ月プランを生成 |
| `generateWeeklyMenu(profile, weightMap?, dbExercises?)` | 週間メニューを生成 |
| `buildSplitFromTargets(targets, days, preference)` | 部位・日数から分割法を決定 |
| `selectExercises(group, count, profile, dbExercises?, seed?)` | 部位別種目選択 |
| `getSetsAndReps(template, profile)` | セット数・レップ数・休憩時間を計算 |
| `buildExercise(template, profile, weightMap?)` | 種目オブジェクトを構築（重量計算含む） |
| `getAgeFactor(age)` | 年齢による重量補正係数 |

### 目標別の設計（重要）

```
muscle_gain（筋肥大）: 部位分割法 → targetMusclesに基づいて日ごとに部位を割り当て
strength（筋力向上）: 部位分割法 → BIG3（スクワット・デッドリフト・ベンチプレス）優先
fat_loss（脂肪燃焼）: 全身法強制 → fat_loss専用プール（17種目）から直接選択、HIIT形式
endurance（持久力向上）: 全身法強制 → endurance専用プール（15種目）から直接選択、サーキット形式
health（健康維持）: 全身法強制 → health専用プール（20種目）から直接選択、週ごとにシャッフル
```

### 全身法目標の種目選択ロジック（generateWeeklyMenu内）

```typescript
if (isFullBodyGoal) {
  // 部位ループを廃止し、goalTagsでフィルタした専用プールから直接選択
  const goalPool = EXERCISE_DB.filter(ex => ex.goalTags?.includes(profile.goal));
  // 設備・難易度でフィルタ後、必要数だけ選択
}
```

### EXERCISE_DB の種目構造

```typescript
interface ExerciseTemplate {
  name: string;
  muscleGroup: string;       // "胸" | "背中" | "肩" | "脚" | "腹筋" | "全身" | ...
  equipment: string[];       // ["bodyweight"] | ["dumbbell"] | ["barbell"] | ...
  difficulty: string[];      // ["beginner"] | ["intermediate"] | ["advanced"] | 複数可
  compound: boolean;
  goalTags?: string[];       // ["fat_loss"] | ["endurance"] | ["health"] | 複数可
}
```

---

## 認証フロー

1. **独自認証**（メイン）: `/api/auth/register` → `/api/auth/login` → JWT Cookie
2. **Manus OAuth**（サブ）: `/api/oauth/callback` → セッションCookie
3. ゲスト利用可能: `menu.generate` は `publicProcedure`（ログイン不要）。結果は `sessionStorage` に保存。

### ロール

- `user`: 一般ユーザー
- `admin`: 管理者（種目管理・ユーザー管理・お問い合わせ管理）

---

## ProfileForm の目標別UI制御

```typescript
// 部位選択・強度選択を非表示にする目標
const FULL_BODY_GOALS = ["fat_loss", "endurance", "health"];

// endurance は強度選択も非表示（サーキット固定）
const showIntensityCard = goal !== "endurance";

// strength のみ BIG3 1RM 入力欄を表示
const showOneRepMaxCard = goal === "strength";
```

---

## デザインシステム

**テーマ:** 近未来・インダストリアル・ダークネイビー + オレンジアクセント
**フォント:** Orbitron（見出し）+ Noto Sans JP（本文）
**カラー:** `--primary: oklch(0.65 0.2 45)` （オレンジ）、`--background: oklch(0.08 0.02 240)` （ダークネイビー）
**アニメーション:** float・pulse-glow・fade-up-in・scanline・スクロールリビール（useScrollReveal）

---

## 環境変数（本番環境では自動注入）

```
DATABASE_URL          # MySQL/TiDB接続文字列
JWT_SECRET            # セッションCookie署名
VITE_APP_ID           # Manus OAuth アプリID
OAUTH_SERVER_URL      # Manus OAuth バックエンドURL
VITE_OAUTH_PORTAL_URL # Manus ログインポータルURL
BUILT_IN_FORGE_API_URL # Manus 組み込みAPI URL
BUILT_IN_FORGE_API_KEY # Manus 組み込みAPI キー（サーバー側）
VITE_FRONTEND_FORGE_API_KEY # Manus 組み込みAPI キー（フロントエンド側）
```

---

## テスト実行

```bash
pnpm test          # Vitest（109件）
pnpm build         # 本番ビルド確認
npx tsc --noEmit   # TypeScript型チェック
```

---

## 既知の制約・注意事項

1. **`server/_core/` は編集しない**: フレームワーク基盤。OAuth・tRPC・Viteブリッジが含まれる。
2. **静的アセットはS3に保存**: `client/public/` や `client/src/assets/` に画像を置くとデプロイタイムアウトになる。
3. **DB種目とEXERCISE_DB**: 管理者がDBに種目を登録した場合、エンジンはDB種目を優先使用する。ただし全身法目標（fat_loss/endurance/health）では、DB種目に `goalTags` がないため、`EXERCISE_DB` の専用種目を必ずマージして使用する。
4. **ゲスト結果の保存**: ログイン前の生成結果は `sessionStorage` に保存され、ログイン後にDBへ移行される。
5. **管理者パスワード**: 初回は `/admin/setup-password` で設定。`role=admin` かつ `password_hash=null` のユーザーのみアクセス可能。

---

## 主要な実装済み機能一覧

詳細は `todo.md` を参照。主要機能：

- ルールベーストレーニングメニュー生成（5目標 × 複数分割法 × 強度3段階）
- 目標別専用種目プール（fat_loss/endurance/health）
- 体重・性別・年齢・トレーニング歴に基づく推奨重量自動計算
- 管理者による種目・重量・係数のCRUD管理
- 独自認証（メール/パスワード）+ Manus OAuth
- ゲスト利用対応（ログイン不要でメニュー生成可能）
- 免責事項モーダル（初回のみ、DB記録）
- お問い合わせフォーム（管理者既読管理付き）
- プライバシーポリシー・利用規約ページ
- Google AdSenseプレースホルダー・アフィリエイトカード
- SEO対応（title・meta description・sitemap.xml・robots.txt）
- 近未来デザイン（Orbitron + ダークネイビー + オレンジアクセント）
