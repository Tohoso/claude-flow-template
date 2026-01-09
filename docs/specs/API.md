# API Specification

> **SPARC Methodology - Specification Phase (API Details)**
>
> This document defines the external APIs used and internal interfaces.

## 1. Overview

このシステムは自前のAPIを公開せず、以下の外部APIを利用するバッチ処理システムです。

### 1.1. External APIs Used

| API | Purpose | Documentation |
|:---|:---|:---|
| Google Drive API v3 | レシート画像の取得・移動 | [Reference](https://developers.google.com/drive/api/reference) |
| Gemini API | 画像解析・テキスト抽出 | [Reference](https://ai.google.dev/api) |
| freee API | 経理情報の取得・登録 | [Reference](https://developer.freee.co.jp/reference) |

---

## 2. Google Drive API

### 2.1. Authentication

OAuth 2.0 を使用。必要なスコープ：

```
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/drive.metadata.readonly
```

### 2.2. Used Endpoints

#### ファイル一覧取得

```
GET https://www.googleapis.com/drive/v3/files
```

**Query Parameters:**

| Parameter | Value | Description |
|:---|:---|:---|
| `q` | `'<folder_id>' in parents and mimeType contains 'image/'` | pending フォルダ内の画像 |
| `fields` | `files(id,name,mimeType,createdTime)` | 取得するフィールド |
| `orderBy` | `createdTime` | 作成日時順 |

**Response:**

```json
{
  "files": [
    {
      "id": "1ABC...xyz",
      "name": "2026-01-09_10-30-00.jpg",
      "mimeType": "image/jpeg",
      "createdTime": "2026-01-09T10:30:00.000Z"
    }
  ]
}
```

#### ファイルダウンロード

```
GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media
```

**Response:** Binary image data

#### ファイル移動（フォルダ変更）

```
PATCH https://www.googleapis.com/drive/v3/files/{fileId}
```

**Query Parameters:**

| Parameter | Value | Description |
|:---|:---|:---|
| `addParents` | `<processed_folder_id>` | 移動先フォルダ |
| `removeParents` | `<pending_folder_id>` | 元フォルダ |

---

## 3. Gemini API

### 3.1. Authentication

API Key を使用（環境変数 `GEMINI_API_KEY`）

### 3.2. Used Endpoints

#### 画像解析（generateContent）

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
```

**Headers:**

```
Content-Type: application/json
x-goog-api-key: <API_KEY>
```

**Request Body:**

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "このレシート画像から以下の情報をJSON形式で抽出してください:\n- date: 日付 (YYYY-MM-DD)\n- amount: 合計金額 (数値)\n- storeName: 店舗名\n- items: 品目リスト\n- suggestedCategory: 推定される経費カテゴリ\n- suggestedAccountCode: 推定される勘定科目コード"
        },
        {
          "inlineData": {
            "mimeType": "image/jpeg",
            "data": "<base64_encoded_image>"
          }
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.1,
    "topK": 1,
    "topP": 1,
    "maxOutputTokens": 2048,
    "responseMimeType": "application/json"
  }
}
```

**Response:**

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "{\"date\":\"2026-01-09\",\"amount\":1980,\"storeName\":\"スターバックス 渋谷店\",\"items\":[\"カフェラテ\",\"サンドイッチ\"],\"suggestedCategory\":\"会議費\",\"suggestedAccountCode\":\"7620\"}"
          }
        ]
      }
    }
  ]
}
```

### 3.3. Prompt Template

```typescript
const RECEIPT_ANALYSIS_PROMPT = `
あなたはレシート解析の専門家です。
このレシート画像から以下の情報を正確に抽出し、JSON形式で返してください。

## 抽出項目
- date: 日付 (YYYY-MM-DD形式)
- amount: 合計金額 (税込、数値のみ)
- storeName: 店舗名 (支店名含む)
- items: 購入品目のリスト
- paymentMethod: 支払方法 (現金/クレジットカード/電子マネー等)
- suggestedCategory: 以下から最適なものを選択
  - 会議費 (打ち合わせ時の飲食)
  - 交際費 (接待)
  - 旅費交通費 (移動関連)
  - 消耗品費 (事務用品等)
  - 通信費 (電話、インターネット)
  - 新聞図書費 (書籍、雑誌)
  - 雑費 (その他)
- suggestedAccountCode: 勘定科目コード
- confidence: 抽出の確信度 (0.0-1.0)

## 注意事項
- 読み取れない項目は null としてください
- 金額は必ず数値で返してください（カンマなし）
- 日付が読み取れない場合はファイル名から推測してください
`;
```

---

## 4. freee API

### 4.1. Authentication

OAuth 2.0 を使用。必要なスコープ：

```
read write
```

### 4.2. Base URL

```
https://api.freee.co.jp/api/1
```

### 4.3. Used Endpoints

#### 自動で経理リスト取得

```
GET /api/1/wallet_txns
```

**Query Parameters:**

| Parameter | Type | Description |
|:---|:---|:---|
| `company_id` | integer | 事業所ID（必須） |
| `status` | string | `unregistered`（未登録のみ） |
| `limit` | integer | 取得件数（最大100） |

**Response:**

```json
{
  "wallet_txns": [
    {
      "id": 12345,
      "company_id": 1,
      "date": "2026-01-09",
      "amount": 1980,
      "due_amount": 1980,
      "balance": 50000,
      "entry_side": "expense",
      "walletable_type": "credit_card",
      "walletable_id": 100,
      "description": "ｽﾀｰﾊﾞｯｸｽ ｼﾌﾞﾔ",
      "status": "unregistered"
    }
  ]
}
```

#### 取引登録

```
POST /api/1/deals
```

**Request Body:**

```json
{
  "company_id": 1,
  "issue_date": "2026-01-09",
  "type": "expense",
  "details": [
    {
      "account_item_id": 100,
      "tax_code": 1,
      "amount": 1980,
      "description": "スターバックス 渋谷店 - カフェラテ、サンドイッチ"
    }
  ],
  "payments": [
    {
      "amount": 1980,
      "from_walletable_type": "credit_card",
      "from_walletable_id": 100,
      "date": "2026-01-09"
    }
  ]
}
```

**Response:**

```json
{
  "deal": {
    "id": 67890,
    "company_id": 1,
    "issue_date": "2026-01-09",
    "type": "expense",
    "details": [...],
    "payments": [...]
  }
}
```

#### 証憑ファイルアップロード

```
POST /api/1/receipts
```

**Request Body (multipart/form-data):**

| Field | Type | Description |
|:---|:---|:---|
| `company_id` | integer | 事業所ID |
| `receipt` | file | レシート画像 |

**Response:**

```json
{
  "receipt": {
    "id": 11111,
    "status": "unconfirmed",
    "file_src": "https://..."
  }
}
```

#### 証憑を取引に紐付け

```
PUT /api/1/deals/{deal_id}
```

**Request Body:**

```json
{
  "company_id": 1,
  "receipt_ids": [11111]
}
```

#### 勘定科目一覧取得

```
GET /api/1/account_items
```

**Query Parameters:**

| Parameter | Type | Description |
|:---|:---|:---|
| `company_id` | integer | 事業所ID（必須） |

**Response:**

```json
{
  "account_items": [
    {
      "id": 100,
      "name": "会議費",
      "shortcut": "kaigi",
      "shortcut_num": "7620",
      "default_tax_code": 1,
      "categories": ["expense"]
    }
  ]
}
```

---

## 5. Internal Interfaces

### 5.1. Type Definitions

```typescript
// レシート情報（Gemini解析結果）
interface ExtractedReceiptData {
  date: string | null;           // "2026-01-09"
  amount: number | null;         // 1980
  storeName: string | null;      // "スターバックス 渋谷店"
  items: string[];               // ["カフェラテ", "サンドイッチ"]
  paymentMethod: string | null;  // "クレジットカード"
  suggestedCategory: string;     // "会議費"
  suggestedAccountCode: string;  // "7620"
  confidence: number;            // 0.95
}

// Google Drive ファイル情報
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
}

// freee 取引情報
interface WalletTransaction {
  id: number;
  date: string;
  amount: number;
  description: string;
  walletableType: 'credit_card' | 'bank_account' | 'wallet';
  walletableId: number;
  status: 'unregistered' | 'registered';
}

// マッチング結果
interface MatchResult {
  receipt: DriveFile;
  extractedData: ExtractedReceiptData;
  matchedTransaction: WalletTransaction | null;
  candidates: WalletTransaction[];
  matchConfidence: number;
  status: 'matched' | 'multiple_candidates' | 'no_match';
}

// 処理結果
interface ProcessingResult {
  receiptId: string;
  status: 'success' | 'pending' | 'error';
  freeeTransactionId?: number;
  freeeDealId?: number;
  error?: string;
  processedAt: string;
}
```

### 5.2. Service Interfaces

```typescript
// Google Drive Adapter
interface IGoogleDriveAdapter {
  listPendingReceipts(): Promise<DriveFile[]>;
  downloadFile(fileId: string): Promise<Buffer>;
  moveToProcessed(fileId: string): Promise<void>;
}

// Gemini Adapter
interface IGeminiAdapter {
  analyzeReceipt(imageBuffer: Buffer, fileName: string): Promise<ExtractedReceiptData>;
  selectBestMatch(
    receipt: ExtractedReceiptData,
    candidates: WalletTransaction[]
  ): Promise<WalletTransaction>;
}

// freee Adapter
interface IFreeeAdapter {
  getUnregisteredTransactions(): Promise<WalletTransaction[]>;
  createDeal(data: CreateDealRequest): Promise<Deal>;
  uploadReceipt(imageBuffer: Buffer, fileName: string): Promise<Receipt>;
  attachReceiptToDeal(dealId: number, receiptId: number): Promise<void>;
  getAccountItems(): Promise<AccountItem[]>;
}

// Main Processor
interface IReceiptProcessor {
  processAll(): Promise<ProcessingResult[]>;
  processOne(receipt: DriveFile): Promise<ProcessingResult>;
}
```

---

## 6. Error Codes

### 6.1. Application Error Codes

| Code | Description | Action |
|:---|:---|:---|
| `DRIVE_AUTH_ERROR` | Google Drive認証エラー | トークン再取得 |
| `DRIVE_FILE_NOT_FOUND` | ファイルが見つからない | スキップ |
| `GEMINI_ANALYSIS_FAILED` | 画像解析失敗 | リトライ後スキップ |
| `GEMINI_INVALID_RESPONSE` | 解析結果が不正 | スキップ |
| `FREEE_AUTH_ERROR` | freee認証エラー | トークン再取得 |
| `FREEE_RATE_LIMIT` | Rate Limit超過 | 待機後リトライ |
| `FREEE_REGISTER_FAILED` | 登録失敗 | リトライ |
| `NO_MATCH_FOUND` | 該当取引なし | pending保持 |
| `MULTIPLE_MATCHES` | 複数候補あり | LLM判定 |

### 6.2. External API Rate Limits

| API | Rate Limit | Strategy |
|:---|:---|:---|
| Google Drive | 1000 req/100s/user | 十分余裕あり |
| Gemini | Tier依存 | Exponential backoff |
| freee | 3000 req/hour | 1req/sec制限実装 |

---

## 7. Configuration

### 7.1. Environment Variables

```bash
# Google Drive
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/callback
GOOGLE_PENDING_FOLDER_ID=xxx
GOOGLE_PROCESSED_FOLDER_ID=xxx

# Gemini
GEMINI_API_KEY=xxx

# freee
FREEE_CLIENT_ID=xxx
FREEE_CLIENT_SECRET=xxx
FREEE_REDIRECT_URI=http://localhost:3000/freee/callback
FREEE_COMPANY_ID=xxx

# Application
CRON_SCHEDULE="0 * * * *"  # 毎時0分
LOG_LEVEL=info
NODE_ENV=production
```

---

*Last Updated: 2026-01-09*
