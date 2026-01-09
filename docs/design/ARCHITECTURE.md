# Architecture Document

> **SPARC Methodology - Pseudocode/Architecture Phase**
>
> This document defines the technical architecture and design decisions.

## 1. System Overview

### 1.1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        freee-receipt-flow Architecture                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────────┐
│   iPhone     │     │ Google Drive │     │         Backend Server           │
│              │     │              │     │                                  │
│ ┌──────────┐ │     │ ┌──────────┐ │     │  ┌────────────────────────────┐  │
│ │ Action   │ │     │ │ pending/ │ │     │  │      Scheduler (cron)      │  │
│ │ Button   │─┼────▶│ │          │◀┼─────┼─▶│      (1 hour interval)     │  │
│ └──────────┘ │     │ └──────────┘ │     │  └────────────┬───────────────┘  │
│      │       │     │              │     │               │                  │
│      ▼       │     │ ┌──────────┐ │     │               ▼                  │
│ ┌──────────┐ │     │ │processed/│ │     │  ┌────────────────────────────┐  │
│ │ Shortcut │ │     │ │          │ │     │  │    Receipt Processor       │  │
│ │ (iOS)    │─┼────▶│ └──────────┘ │     │  │                            │  │
│ └──────────┘ │     │              │     │  │  1. Fetch from Drive       │  │
└──────────────┘     └──────────────┘     │  │  2. Analyze with Gemini    │  │
                                          │  │  3. Match with freee       │  │
                                          │  │  4. Register & attach      │  │
                                          │  │  5. Move to processed      │  │
                                          │  └────────────┬───────────────┘  │
                                          │               │                  │
                                          └───────────────┼──────────────────┘
                                                          │
                     ┌────────────────────────────────────┼────────────────┐
                     │                                    │                │
                     ▼                                    ▼                ▼
              ┌─────────────┐                    ┌─────────────┐   ┌─────────────┐
              │ Gemini API  │                    │  freee API  │   │   SQLite    │
              │ (Vision)    │                    │             │   │   (State)   │
              └─────────────┘                    └─────────────┘   └─────────────┘
```

### 1.2. Processing Flow (Sequential)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Sequential Processing Flow                            │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐
  │  Start  │
  └────┬────┘
       │
       ▼
  ┌─────────────────────────────────┐
  │ 1. Fetch pending receipts       │
  │    from Google Drive            │
  └────────────┬────────────────────┘
               │
               ▼
  ┌─────────────────────────────────┐
  │ 2. For each receipt (SEQUENTIAL)│◀──────────────────────────┐
  └────────────┬────────────────────┘                           │
               │                                                │
               ▼                                                │
  ┌─────────────────────────────────┐                           │
  │ 3. Analyze with Gemini 2.5 Flash│                           │
  │    - Extract date               │                           │
  │    - Extract amount             │                           │
  │    - Extract store name         │                           │
  │    - Suggest account category   │                           │
  └────────────┬────────────────────┘                           │
               │                                                │
               ▼                                                │
  ┌─────────────────────────────────┐                           │
  │ 4. Fetch freee "自動で経理" list │                           │
  └────────────┬────────────────────┘                           │
               │                                                │
               ▼                                                │
  ┌─────────────────────────────────┐                           │
  │ 5. Match receipt to transaction │                           │
  └────────────┬────────────────────┘                           │
               │                                                │
       ┌───────┴───────┬───────────────┐                        │
       │               │               │                        │
       ▼               ▼               ▼                        │
  ┌─────────┐    ┌───────────┐   ┌──────────┐                   │
  │ 1 Match │    │ N Matches │   │ 0 Match  │                   │
  └────┬────┘    └─────┬─────┘   └────┬─────┘                   │
       │               │              │                         │
       │               ▼              │                         │
       │    ┌───────────────────┐     │                         │
       │    │ LLM selects best  │     │                         │
       │    │ candidate         │     │                         │
       │    └─────────┬─────────┘     │                         │
       │              │               │                         │
       └──────┬───────┘               │                         │
              │                       │                         │
              ▼                       ▼                         │
  ┌─────────────────────────┐   ┌──────────────┐                │
  │ 6. Register to freee    │   │ Keep pending │                │
  │    - Attach receipt     │   │ (retry next) │                │
  │    - Set account code   │   └──────────────┘                │
  │    - Add memo           │                                   │
  └───────────┬─────────────┘                                   │
              │                                                 │
              ▼                                                 │
  ┌─────────────────────────────────┐                           │
  │ 7. Move to processed folder     │                           │
  └────────────┬────────────────────┘                           │
               │                                                │
               └─────────── Next receipt ───────────────────────┘
```

---

## 2. Technology Stack

### 2.1. Backend

| Technology | Version | Purpose |
|:---|:---|:---|
| Node.js | 20 LTS | Runtime environment |
| TypeScript | 5.x | Type-safe development |
| @google/generative-ai | latest | Gemini API client |
| googleapis | latest | Google Drive API client |
| freee-api-sdk | latest | freee API client |
| node-cron | latest | Scheduled execution |
| better-sqlite3 | latest | Local state management |

### 2.2. Infrastructure

| Technology | Purpose |
|:---|:---|
| Docker | Containerization |
| Docker Compose | Local development |
| Railway / Render / VPS | Hosting (選択肢) |
| GitHub Actions | CI/CD |

### 2.3. External Services

| Service | Purpose | Auth Method |
|:---|:---|:---|
| Google Drive API | Receipt storage | OAuth 2.0 |
| Gemini API | Image analysis | API Key |
| freee API | Accounting operations | OAuth 2.0 |

---

## 3. Design Patterns

### 3.1. Architectural Patterns

- **Batch Processing**: 1時間ごとの定期実行でレシートを一括処理
- **Queue-like Processing**: Google Driveのフォルダ構造でキュー状態を管理
- **Retry Pattern**: 照合失敗時は次回バッチで再処理

### 3.2. Design Patterns

| Pattern | Location | Purpose |
|:---|:---|:---|
| Repository | `src/repositories/` | データアクセス抽象化 |
| Service | `src/services/` | ビジネスロジック |
| Adapter | `src/adapters/` | 外部API抽象化 |
| Factory | `src/factories/` | オブジェクト生成 |

---

## 4. Data Architecture

### 4.1. Data Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Data Model                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│   ProcessedReceipt  │         │   ProcessingLog     │
├─────────────────────┤         ├─────────────────────┤
│ id: string (PK)     │────────▶│ id: string (PK)     │
│ driveFileId: string │         │ receiptId: string   │
│ fileName: string    │         │ status: string      │
│ processedAt: Date   │         │ message: string     │
│ freeeTransactionId  │         │ createdAt: Date     │
│ matchConfidence     │         └─────────────────────┘
│ extractedData: JSON │
└─────────────────────┘

┌─────────────────────┐
│   AccountMapping    │
├─────────────────────┤
│ id: string (PK)     │
│ storeName: string   │
│ category: string    │
│ accountCode: string │
│ taxCategory: string │
└─────────────────────┘
```

### 4.2. Extracted Receipt Data (JSON)

```typescript
interface ExtractedReceiptData {
  date: string;           // "2026-01-09"
  amount: number;         // 1980
  storeName: string;      // "スターバックス 渋谷店"
  items: string[];        // ["カフェラテ", "サンドイッチ"]
  paymentMethod?: string; // "クレジットカード"
  suggestedCategory: string;    // "会議費"
  suggestedAccountCode: string; // "7620"
  confidence: number;     // 0.95
  rawText: string;        // OCR raw output
}
```

### 4.3. Google Drive Folder Structure

```
Google Drive/
└── freee-receipts/
    ├── pending/           # 未処理レシート
    │   ├── 2026-01-09_10-30-00.jpg
    │   └── 2026-01-09_12-45-30.jpg
    └── processed/         # 処理済みレシート
        └── 2026-01/
            ├── 2026-01-08_09-00-00.jpg
            └── 2026-01-08_14-20-00.jpg
```

---

## 5. Module Structure

```
src/
├── index.ts                 # Entry point
├── config/
│   ├── index.ts            # Configuration loader
│   └── constants.ts        # Constants
├── adapters/
│   ├── google-drive.ts     # Google Drive API adapter
│   ├── gemini.ts           # Gemini API adapter
│   └── freee.ts            # freee API adapter
├── services/
│   ├── receipt-processor.ts    # Main processing logic
│   ├── receipt-analyzer.ts     # Gemini analysis
│   ├── transaction-matcher.ts  # freee matching
│   └── account-suggester.ts    # Account code suggestion
├── repositories/
│   ├── receipt.ts          # Receipt data access
│   └── log.ts              # Log data access
├── types/
│   └── index.ts            # TypeScript interfaces
├── utils/
│   ├── logger.ts           # Logging utility
│   └── retry.ts            # Retry utility
└── scheduler.ts            # Cron scheduler
```

---

## 6. Security Architecture

### 6.1. Authentication

| Service | Method | Storage |
|:---|:---|:---|
| Google Drive | OAuth 2.0 | `credentials.json` + token refresh |
| Gemini | API Key | Environment variable |
| freee | OAuth 2.0 | `credentials.json` + token refresh |

### 6.2. Secret Management

```
.env (gitignored)
├── GEMINI_API_KEY=xxx
├── GOOGLE_CLIENT_ID=xxx
├── GOOGLE_CLIENT_SECRET=xxx
├── FREEE_CLIENT_ID=xxx
├── FREEE_CLIENT_SECRET=xxx
└── FREEE_COMPANY_ID=xxx

tokens/ (gitignored)
├── google-token.json
└── freee-token.json
```

### 6.3. Data Protection

- 画像データはGoogle Driveに保存（ローカルに永続保存しない）
- OAuth トークンは暗号化して保存
- ログに個人情報（金額、店舗名）を含めない設定可能

---

## 7. Deployment Architecture

### 7.1. Environments

| Environment | Purpose | Hosting |
|:---|:---|:---|
| Development | Local development | Docker Compose |
| Production | Live environment | Railway / Render / VPS |

### 7.2. Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### 7.3. CI/CD Pipeline

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Push   │───▶│  Lint   │───▶│  Test   │───▶│  Build  │
└─────────┘    └─────────┘    └─────────┘    └────┬────┘
                                                  │
                                                  ▼
                              ┌─────────┐    ┌─────────┐
                              │ Deploy  │◀───│  Docker │
                              │ (prod)  │    │  Build  │
                              └─────────┘    └─────────┘
```

---

## 8. Architectural Decision Records (ADRs)

### ADR-001: Google Drive for Receipt Storage

- **Status**: Accepted
- **Context**: iPhoneからのレシート画像保存先が必要
- **Decision**: Google Driveを使用（iCloudは公式APIがないため）
- **Consequences**: iPhoneショートカットからGoogle Driveへの保存設定が必要

### ADR-002: Gemini 2.5 Flash for Image Analysis

- **Status**: Accepted
- **Context**: レシート画像から情報を抽出する必要がある
- **Decision**: Gemini 2.5 Flash を採用（コスト効率と精度のバランス）
- **Consequences**: Google AI Studio でAPIキー取得が必要

### ADR-003: Sequential Processing

- **Status**: Accepted
- **Context**: freeeの取引とレシートを1対1で対応させる必要がある
- **Decision**: 並列処理ではなく直列処理を採用
- **Consequences**: 処理時間は長くなるが、データ整合性を保証

### ADR-004: SQLite for State Management

- **Status**: Accepted
- **Context**: 処理済みレシートの状態管理が必要
- **Decision**: SQLiteを使用（シンプルで依存関係が少ない）
- **Consequences**: スケールアウトには向かないが、個人利用には十分

---

## 9. Error Handling Strategy

### 9.1. Error Categories

| Category | Example | Action |
|:---|:---|:---|
| Transient | API timeout, rate limit | Retry with backoff |
| Permanent | Invalid image, auth error | Log and skip |
| Critical | DB corruption | Alert and stop |

### 9.2. Retry Strategy

```typescript
const retryConfig = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000], // Exponential backoff
  retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'RATE_LIMIT']
};
```

---

## 10. References

- [Specification Document](./SPECIFICATION.md)
- [API Specification](../specs/API.md)
- [freee API Reference](https://developer.freee.co.jp/reference)
- [Google Drive API Reference](https://developers.google.com/drive/api/reference)
- [Gemini API Reference](https://ai.google.dev/api)

---

*Last Updated: 2026-01-09*
