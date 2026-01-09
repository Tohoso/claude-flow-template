/**
 * Type definitions for freee-receipt-flow
 */

// =============================================================================
// Google Drive Types
// =============================================================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
}

// =============================================================================
// Gemini Analysis Types
// =============================================================================

export interface ExtractedReceiptData {
  /** 日付 (YYYY-MM-DD形式) */
  date: string | null;
  /** 合計金額 (税込) */
  amount: number | null;
  /** 店舗名 */
  storeName: string | null;
  /** 購入品目リスト */
  items: string[];
  /** 支払方法 */
  paymentMethod: string | null;
  /** 推定カテゴリ */
  suggestedCategory: string;
  /** 推定勘定科目コード */
  suggestedAccountCode: string;
  /** 抽出の確信度 (0.0-1.0) */
  confidence: number;
}

// =============================================================================
// freee API Types
// =============================================================================

export type WalletableType = 'credit_card' | 'bank_account' | 'wallet';

export interface WalletTransaction {
  id: number;
  companyId: number;
  date: string;
  amount: number;
  dueAmount: number;
  balance: number;
  entrySide: 'income' | 'expense';
  walletableType: WalletableType;
  walletableId: number;
  description: string;
  status: 'unregistered' | 'registered';
}

export interface AccountItem {
  id: number;
  name: string;
  shortcut: string;
  shortcutNum: string;
  defaultTaxCode: number;
  categories: string[];
}

export interface CreateDealRequest {
  companyId: number;
  issueDate: string;
  type: 'income' | 'expense';
  details: DealDetail[];
  payments: DealPayment[];
  receiptIds?: number[];
}

export interface DealDetail {
  accountItemId: number;
  taxCode: number;
  amount: number;
  description: string;
}

export interface DealPayment {
  amount: number;
  fromWalletableType: WalletableType;
  fromWalletableId: number;
  date: string;
}

export interface Deal {
  id: number;
  companyId: number;
  issueDate: string;
  type: 'income' | 'expense';
  details: DealDetail[];
  payments: DealPayment[];
}

export interface FreeeReceipt {
  id: number;
  status: 'unconfirmed' | 'confirmed';
  fileSrc: string;
}

// =============================================================================
// Processing Types
// =============================================================================

export type MatchStatus = 'matched' | 'multiple_candidates' | 'no_match';

export interface MatchResult {
  receipt: DriveFile;
  extractedData: ExtractedReceiptData;
  matchedTransaction: WalletTransaction | null;
  candidates: WalletTransaction[];
  matchConfidence: number;
  status: MatchStatus;
}

export type ProcessingStatus = 'success' | 'pending' | 'error';

export interface ProcessingResult {
  receiptId: string;
  fileName: string;
  status: ProcessingStatus;
  freeeWalletTxnId?: number;
  freeeDealId?: number;
  freeeReceiptId?: number;
  error?: string;
  processedAt: string;
}

// =============================================================================
// Database Types
// =============================================================================

export interface ProcessedReceiptRecord {
  id: string;
  driveFileId: string;
  fileName: string;
  processedAt: string;
  freeeWalletTxnId: number | null;
  freeeDealId: number | null;
  freeeReceiptId: number | null;
  matchConfidence: number;
  extractedData: string; // JSON string
}

export interface ProcessingLogRecord {
  id: string;
  receiptId: string;
  status: ProcessingStatus;
  message: string;
  createdAt: string;
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  pendingFolderId: string;
  processedFolderId: string;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface FreeeConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  companyId: number;
}

export interface AppConfig {
  googleDrive: GoogleDriveConfig;
  gemini: GeminiConfig;
  freee: FreeeConfig;
  cronSchedule: string;
  logLevel: string;
}

// =============================================================================
// Adapter Interfaces
// =============================================================================

export interface IGoogleDriveAdapter {
  listPendingReceipts(): Promise<DriveFile[]>;
  downloadFile(fileId: string): Promise<Buffer>;
  moveToProcessed(fileId: string, yearMonth: string): Promise<void>;
}

export interface IGeminiAdapter {
  analyzeReceipt(imageBuffer: Buffer, fileName: string): Promise<ExtractedReceiptData>;
  selectBestMatch(
    receipt: ExtractedReceiptData,
    candidates: WalletTransaction[]
  ): Promise<WalletTransaction>;
}

export interface IFreeeAdapter {
  getUnregisteredTransactions(): Promise<WalletTransaction[]>;
  getAccountItems(): Promise<AccountItem[]>;
  createDeal(data: CreateDealRequest): Promise<Deal>;
  uploadReceipt(imageBuffer: Buffer, fileName: string): Promise<FreeeReceipt>;
  attachReceiptToDeal(dealId: number, receiptIds: number[]): Promise<void>;
  registerWalletTransaction(walletTxnId: number, dealId: number): Promise<void>;
}

export interface IReceiptProcessor {
  processAll(): Promise<ProcessingResult[]>;
  processOne(receipt: DriveFile): Promise<ProcessingResult>;
}
