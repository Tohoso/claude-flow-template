# Specification Document

> **SPARC Methodology - Specification Phase**
>
> This document defines the project requirements, constraints, and success criteria.

## 1. Project Overview

### 1.1. Project Name

**freee-receipt-flow**

### 1.2. Description

iPhoneで撮影したレシート画像をGoogle Drive経由で取得し、Gemini 2.5 Flash で解析後、freee会計の「自動で経理」機能と照合して経理処理を自動化するシステム。

### 1.3. Goals

1. レシート撮影から経理登録までの手作業を最小化する
2. 勘定科目の自動判定により入力ミスを削減する
3. 1時間以内に経理処理が完了する仕組みを構築する

### 1.4. Non-Goals

1. レシート以外の経理書類（請求書、見積書等）の処理
2. 複数の会計ソフトへの対応（freee専用）
3. リアルタイム処理（バッチ処理で十分）

---

## 2. Requirements

### 2.1. Functional Requirements

| ID | Requirement | Priority | Status |
|:---|:---|:---:|:---:|
| FR-001 | Google Drive の指定フォルダからレシート画像を取得する | High | Pending |
| FR-002 | Gemini 2.5 Flash でレシート画像から情報を抽出する（日付、金額、店舗名、品目） | High | Pending |
| FR-003 | freee API で「自動で経理」の未処理リストを取得する | High | Pending |
| FR-004 | 抽出情報とfreeeの取引を照合し、一致する取引を特定する | High | Pending |
| FR-005 | 一致した取引にレシート画像を添付し、勘定科目等を登録する | High | Pending |
| FR-006 | 処理済みレシートを処理済みフォルダに移動する | Medium | Pending |
| FR-007 | 一致する取引がない場合、次回処理まで保留（pending）にする | Medium | Pending |
| FR-008 | 複数候補がある場合、LLMで最適な取引を判定する | Medium | Pending |
| FR-009 | 1時間ごとに定期実行する | Medium | Pending |
| FR-010 | 処理結果のログを記録する | Low | Pending |

### 2.2. Non-Functional Requirements

| ID | Requirement | Target | Status |
|:---|:---|:---|:---:|
| NFR-001 | 処理速度 | 1レシートあたり10秒以内 | Pending |
| NFR-002 | 可用性 | 99%（月間ダウンタイム7時間以内） | Pending |
| NFR-003 | セキュリティ | OAuth 2.0認証、APIキーの安全な管理 | Pending |
| NFR-004 | コスト | Gemini API 月額$10以内 | Pending |

---

## 3. Constraints

### 3.1. Technical Constraints

- Google Drive API の Rate Limit（1000 requests/100 seconds/user）
- freee API の Rate Limit（3000 requests/hour）
- Gemini API の Rate Limit と課金体系
- 直列処理必須（freeeとの1対1対応を保証するため）

### 3.2. Business Constraints

- 個人事業主向け（単一freeeアカウント）
- 日本円のレシートのみ対応

### 3.3. Timeline

| Milestone | Description | Status |
|:---|:---|:---:|
| Phase 1 | 基本フロー実装（Drive取得→Gemini解析→freee登録） | Pending |
| Phase 2 | エラーハンドリング、リトライ機構 | Pending |
| Phase 3 | 定期実行、ログ機能 | Pending |

---

## 4. Success Criteria

### 4.1. Acceptance Criteria

- [ ] Google Drive からレシート画像を取得できる
- [ ] Gemini でレシート情報（日付、金額、店舗名）を90%以上の精度で抽出できる
- [ ] freeeの未処理取引と正しく照合できる
- [ ] 勘定科目が適切に設定される
- [ ] 処理済みファイルが正しく移動される

### 4.2. Key Performance Indicators (KPIs)

| KPI | Target | Measurement Method |
|:---|:---|:---|
| レシート処理成功率 | 95%以上 | 成功数/総処理数 |
| 照合精度 | 90%以上 | 正しく照合された数/照合試行数 |
| 勘定科目正答率 | 85%以上 | 正しい科目数/登録数 |

---

## 5. Stakeholders

| Role | Name/Team | Responsibility |
|:---|:---|:---|
| Product Owner | ユーザー本人 | 要件定義、受入確認 |
| Developer | Claude | 設計・実装 |

---

## 6. User Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Flow                                      │
└─────────────────────────────────────────────────────────────────────────┘

1. [iPhone] アクションボタン押下
      │
      ▼
2. [iPhone] カメラ起動 → レシート撮影
      │
      ▼
3. [iPhone Shortcut] 写真をGoogle Driveの指定フォルダに保存
   ファイル名: YYYY-MM-DD_HH-MM-SS.jpg
      │
      ▼
4. [Backend] 定期実行（1時間毎）
      │
      ├─── Google Drive から未処理画像を取得
      │
      ├─── Gemini 2.5 Flash で画像解析
      │    ・日付
      │    ・金額
      │    ・店舗名
      │    ・品目（推定）
      │
      ├─── freee「自動で経理」リストを取得
      │
      ├─── 解析結果と取引を照合
      │    ├─── 一致: 登録処理へ
      │    ├─── 複数候補: LLMで判定
      │    └─── 不一致: pending（次回再処理）
      │
      ├─── freeeに登録
      │    ・レシート画像添付
      │    ・勘定科目設定
      │    ・メモ追記
      │
      └─── 処理済みフォルダに移動
```

---

## 7. References

- [Architecture Document](./ARCHITECTURE.md)
- [API Specification](../specs/API.md)
- [freee API Documentation](https://developer.freee.co.jp/docs)
- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [Gemini API Documentation](https://ai.google.dev/docs)

---

*Last Updated: 2026-01-09*
