# freee-receipt-flow

iPhoneで撮影したレシート画像を自動で経理処理するシステム。

```
iPhone → Google Drive → Gemini 解析 → freee 登録
```

## 概要

1. **iPhone** でアクションボタンを押してレシート撮影
2. **ショートカット** で Google Drive に自動保存
3. **バックエンド** が1時間ごとにレシートを処理
4. **Gemini 2.5 Flash** で画像から情報抽出
5. **freee** の「自動で経理」と照合して登録

## クイックスタート

### 1. 依存関係インストール

```bash
npm install
```

### 2. 環境変数設定

```bash
cp .env.example .env
# .env を編集して各APIキー・IDを設定
```

### 3. OAuth 認証

```bash
# Google Drive 認証
npm run auth:google

# freee 認証
npm run auth:freee
```

### 4. 起動

```bash
# 開発モード
npm run dev

# 本番モード
npm run build && npm start

# Docker
docker compose up -d
```

## 必要な準備

### Google Cloud Console

1. プロジェクト作成
2. Google Drive API 有効化
3. OAuth 2.0 クライアント ID 作成
4. 認証情報を `.env` に設定

### Google AI Studio

1. [aistudio.google.com](https://aistudio.google.com) でAPIキー取得
2. `.env` の `GEMINI_API_KEY` に設定

### freee

1. [freee開発者サイト](https://developer.freee.co.jp) でアプリ作成
2. 認証情報を `.env` に設定
3. 事業所IDを確認して設定

### Google Drive

```
マイドライブ/
└── freee-receipts/
    ├── pending/      ← レシート保存先
    └── processed/    ← 処理済み
```

各フォルダのIDを `.env` に設定

### iPhone

[ショートカット設定ガイド](docs/guides/IPHONE_SHORTCUT.md) を参照

## 環境変数

| 変数名 | 説明 |
|:---|:---|
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth シークレット |
| `GOOGLE_PENDING_FOLDER_ID` | 未処理フォルダID |
| `GOOGLE_PROCESSED_FOLDER_ID` | 処理済みフォルダID |
| `GEMINI_API_KEY` | Gemini API キー |
| `FREEE_CLIENT_ID` | freee アプリ クライアントID |
| `FREEE_CLIENT_SECRET` | freee アプリ シークレット |
| `FREEE_COMPANY_ID` | freee 事業所ID |
| `CRON_SCHEDULE` | 実行スケジュール（デフォルト: 毎時） |

## 処理フロー

```
┌─────────────────────────────────────────────────────────────────┐
│                         処理フロー                               │
└─────────────────────────────────────────────────────────────────┘

1. Google Drive から未処理レシートを取得
   │
2. 各レシートを直列で処理（並列不可：freee との1対1対応のため）
   │
   ├── Gemini で画像解析
   │   ├── 日付
   │   ├── 金額
   │   ├── 店舗名
   │   ├── 品目
   │   └── 勘定科目（推定）
   │
   ├── freee「自動で経理」リストを取得
   │
   ├── 金額・日付・摘要でマッチング
   │   ├── 1件一致 → 登録
   │   ├── 複数候補 → Gemini で選択
   │   └── 0件 → 次回に持ち越し
   │
   ├── freee に登録
   │   ├── レシート画像アップロード
   │   ├── 取引作成（勘定科目設定）
   │   └── 明細と紐付け
   │
   └── 処理済みフォルダに移動

3. ログ出力・次回実行を待機
```

## コマンド

```bash
npm run dev          # 開発モード（ホットリロード）
npm run build        # ビルド
npm start            # 本番実行
npm run auth:google  # Google 認証
npm run auth:freee   # freee 認証
npm test             # テスト
npm run lint         # リント
```

## Docker

```bash
# ビルド & 起動
docker compose up -d

# ログ確認
docker compose logs -f

# 停止
docker compose down
```

## ディレクトリ構成

```
src/
├── adapters/           # 外部API連携
│   ├── google-drive.ts
│   ├── gemini.ts
│   └── freee.ts
├── services/           # ビジネスロジック
│   └── receipt-processor.ts
├── config/             # 設定
├── types/              # 型定義
├── utils/              # ユーティリティ
├── scripts/            # 認証スクリプト
└── index.ts            # エントリポイント

docs/
├── design/
│   ├── SPECIFICATION.md  # 要件定義
│   └── ARCHITECTURE.md   # 技術設計
├── specs/
│   └── API.md            # API仕様
└── guides/
    └── IPHONE_SHORTCUT.md  # ショートカット設定
```

## トラブルシューティング

### 認証エラー

```bash
# トークンを削除して再認証
rm -rf tokens/
npm run auth:google
npm run auth:freee
```

### マッチングがうまくいかない

- freee 側の明細が同期されているか確認
- 金額の誤差（±10円）を確認
- 店舗名の表記ゆれを確認

### Rate Limit エラー

- freee API: 3000 req/hour（自動で1秒間隔に制限）
- Gemini API: Tier に依存

## ライセンス

MIT

---

*Gemini 2.5 Flash × freee API × Google Drive*
