import type {
  AccountItem,
  CreateDealRequest,
  DriveFile,
  ExtractedReceiptData,
  IReceiptProcessor,
  ProcessingResult,
  WalletTransaction,
} from '../types/index.js';
import type { GoogleDriveAdapter } from '../adapters/google-drive.js';
import type { GeminiAdapter } from '../adapters/gemini.js';
import type { FreeeAdapter } from '../adapters/freee.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('receipt-processor');

// 勘定科目コードとIDのマッピング（初回取得後にキャッシュ）
let accountItemCache: Map<string, AccountItem> | null = null;

export class ReceiptProcessor implements IReceiptProcessor {
  constructor(
    private driveAdapter: GoogleDriveAdapter,
    private geminiAdapter: GeminiAdapter,
    private freeeAdapter: FreeeAdapter,
    private companyId: number
  ) {}

  /**
   * 全ての未処理レシートを処理
   */
  async processAll(): Promise<ProcessingResult[]> {
    logger.info('Starting batch processing');
    const results: ProcessingResult[] = [];

    try {
      // 未処理レシートを取得
      const receipts = await this.driveAdapter.listPendingReceipts();

      if (receipts.length === 0) {
        logger.info('No pending receipts found');
        return results;
      }

      logger.info({ count: receipts.length }, 'Processing receipts');

      // 直列処理（重要：並列処理すると freee との1対1対応が崩れる可能性）
      for (const receipt of receipts) {
        try {
          const result = await this.processOne(receipt);
          results.push(result);

          // Rate limit対策：1秒待機
          await this.sleep(1000);
        } catch (error) {
          logger.error({ error, receipt }, 'Failed to process receipt');
          results.push({
            receiptId: receipt.id,
            fileName: receipt.name,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
            processedAt: new Date().toISOString(),
          });
        }
      }

      const successCount = results.filter((r) => r.status === 'success').length;
      const pendingCount = results.filter((r) => r.status === 'pending').length;
      const errorCount = results.filter((r) => r.status === 'error').length;

      logger.info(
        { total: results.length, success: successCount, pending: pendingCount, error: errorCount },
        'Batch processing completed'
      );

      return results;
    } catch (error) {
      logger.error({ error }, 'Batch processing failed');
      throw error;
    }
  }

  /**
   * 1つのレシートを処理
   */
  async processOne(receipt: DriveFile): Promise<ProcessingResult> {
    logger.info({ receiptId: receipt.id, fileName: receipt.name }, 'Processing receipt');

    // 1. 画像をダウンロード
    const imageBuffer = await this.driveAdapter.downloadFile(receipt.id);

    // 2. Gemini で解析
    const extractedData = await this.geminiAdapter.analyzeReceipt(imageBuffer, receipt.name);
    logger.debug({ extractedData }, 'Receipt analyzed');

    // 3. freee の未登録明細を取得
    const transactions = await this.freeeAdapter.getUnregisteredTransactions();

    // 4. マッチング
    const matchResult = this.matchTransaction(extractedData, transactions);

    if (matchResult.status === 'no_match') {
      // 一致なし → pending として保持
      logger.info({ receipt: receipt.name }, 'No matching transaction found, keeping pending');
      return {
        receiptId: receipt.id,
        fileName: receipt.name,
        status: 'pending',
        processedAt: new Date().toISOString(),
      };
    }

    let matchedTransaction = matchResult.matched;

    // 5. 複数候補がある場合は LLM で選択
    if (matchResult.status === 'multiple' && matchResult.candidates.length > 0) {
      matchedTransaction = await this.geminiAdapter.selectBestMatch(
        extractedData,
        matchResult.candidates
      );
    }

    if (!matchedTransaction) {
      return {
        receiptId: receipt.id,
        fileName: receipt.name,
        status: 'pending',
        processedAt: new Date().toISOString(),
      };
    }

    // 6. freee にレシートをアップロード
    const freeeReceipt = await this.freeeAdapter.uploadReceipt(imageBuffer, receipt.name);

    // 7. 勘定科目IDを取得
    const accountItem = await this.getAccountItem(extractedData.suggestedAccountCode);

    // 8. 取引を作成
    const dealRequest: CreateDealRequest = {
      companyId: this.companyId,
      issueDate: matchedTransaction.date,
      type: 'expense',
      details: [
        {
          accountItemId: accountItem.id,
          taxCode: accountItem.defaultTaxCode,
          amount: matchedTransaction.amount,
          description: this.buildDescription(extractedData),
        },
      ],
      payments: [
        {
          amount: matchedTransaction.amount,
          fromWalletableType: matchedTransaction.walletableType,
          fromWalletableId: matchedTransaction.walletableId,
          date: matchedTransaction.date,
        },
      ],
      receiptIds: [freeeReceipt.id],
    };

    const deal = await this.freeeAdapter.createDeal(dealRequest);

    // 9. 明細を消込
    await this.freeeAdapter.registerWalletTransaction(matchedTransaction.id, deal.id);

    // 10. 処理済みフォルダに移動
    const yearMonth = matchedTransaction.date.substring(0, 7); // "YYYY-MM"
    await this.driveAdapter.moveToProcessed(receipt.id, yearMonth);

    logger.info(
      { receiptId: receipt.id, dealId: deal.id, transactionId: matchedTransaction.id },
      'Receipt processed successfully'
    );

    return {
      receiptId: receipt.id,
      fileName: receipt.name,
      status: 'success',
      freeeWalletTxnId: matchedTransaction.id,
      freeeDealId: deal.id,
      freeeReceiptId: freeeReceipt.id,
      processedAt: new Date().toISOString(),
    };
  }

  /**
   * レシート情報と取引をマッチング
   */
  private matchTransaction(
    receipt: ExtractedReceiptData,
    transactions: WalletTransaction[]
  ): {
    status: 'matched' | 'multiple' | 'no_match';
    matched: WalletTransaction | null;
    candidates: WalletTransaction[];
  } {
    if (!receipt.amount) {
      return { status: 'no_match', matched: null, candidates: [] };
    }

    // 金額でフィルタ（±10円の誤差を許容）
    const amountTolerance = 10;
    const amountMatches = transactions.filter(
      (t) => Math.abs(t.amount - receipt.amount!) <= amountTolerance
    );

    if (amountMatches.length === 0) {
      return { status: 'no_match', matched: null, candidates: [] };
    }

    if (amountMatches.length === 1) {
      return { status: 'matched', matched: amountMatches[0], candidates: [] };
    }

    // 日付でさらに絞り込み
    if (receipt.date) {
      const dateMatches = amountMatches.filter((t) => t.date === receipt.date);

      if (dateMatches.length === 1) {
        return { status: 'matched', matched: dateMatches[0], candidates: [] };
      }

      if (dateMatches.length > 1) {
        // 摘要で絞り込み
        const descMatches = this.filterByDescription(dateMatches, receipt);
        if (descMatches.length === 1) {
          return { status: 'matched', matched: descMatches[0], candidates: [] };
        }
        return { status: 'multiple', matched: null, candidates: descMatches.length > 0 ? descMatches : dateMatches };
      }
    }

    // 摘要で絞り込み
    const descMatches = this.filterByDescription(amountMatches, receipt);
    if (descMatches.length === 1) {
      return { status: 'matched', matched: descMatches[0], candidates: [] };
    }

    return {
      status: 'multiple',
      matched: null,
      candidates: descMatches.length > 0 ? descMatches : amountMatches,
    };
  }

  /**
   * 摘要で取引を絞り込み
   */
  private filterByDescription(
    transactions: WalletTransaction[],
    receipt: ExtractedReceiptData
  ): WalletTransaction[] {
    if (!receipt.storeName) {
      return transactions;
    }

    const storeName = receipt.storeName.toLowerCase();
    const storeNameNormalized = this.normalizeString(storeName);

    return transactions.filter((t) => {
      const desc = t.description.toLowerCase();
      const descNormalized = this.normalizeString(desc);

      // 部分一致
      return (
        desc.includes(storeName) ||
        storeName.includes(desc) ||
        descNormalized.includes(storeNameNormalized) ||
        storeNameNormalized.includes(descNormalized)
      );
    });
  }

  /**
   * 文字列を正規化（全角→半角、カタカナ→ひらがな等）
   */
  private normalizeString(str: string): string {
    return str
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/[ァ-ン]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60))
      .replace(/[\s　]/g, '');
  }

  /**
   * 勘定科目を取得（キャッシュ付き）
   */
  private async getAccountItem(shortcutNum: string): Promise<AccountItem> {
    if (!accountItemCache) {
      const items = await this.freeeAdapter.getAccountItems();
      accountItemCache = new Map(items.map((item) => [item.shortcutNum, item]));
    }

    const item = accountItemCache.get(shortcutNum);
    if (!item) {
      // デフォルト: 雑費
      const defaultItem = accountItemCache.get('7990');
      if (defaultItem) {
        return defaultItem;
      }
      // 雑費もない場合は最初の経費科目を使用
      const expenseItem = Array.from(accountItemCache.values()).find((i) =>
        i.categories.includes('expense')
      );
      if (expenseItem) {
        return expenseItem;
      }
      throw new Error('No expense account item found');
    }

    return item;
  }

  /**
   * 取引の摘要を生成
   */
  private buildDescription(receipt: ExtractedReceiptData): string {
    const parts: string[] = [];

    if (receipt.storeName) {
      parts.push(receipt.storeName);
    }

    if (receipt.items.length > 0) {
      parts.push(receipt.items.slice(0, 3).join('、'));
    }

    return parts.join(' - ') || '経費';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
