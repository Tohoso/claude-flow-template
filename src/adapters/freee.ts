import * as fs from 'fs';
import * as path from 'path';
import type {
  AccountItem,
  CreateDealRequest,
  Deal,
  FreeeConfig,
  FreeeReceipt,
  IFreeeAdapter,
  WalletTransaction,
} from '../types/index.js';
import { createLogger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

const logger = createLogger('freee');

const TOKEN_PATH = './tokens/freee-token.json';
const BASE_URL = 'https://api.freee.co.jp/api/1';

interface FreeeTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export class FreeeAdapter implements IFreeeAdapter {
  private config: FreeeConfig;
  private tokens: FreeeTokens | null = null;

  constructor(config: FreeeConfig) {
    this.config = config;
  }

  /**
   * OAuth2認証を初期化
   */
  async initialize(): Promise<void> {
    try {
      const tokenData = fs.readFileSync(TOKEN_PATH, 'utf-8');
      this.tokens = JSON.parse(tokenData);

      // トークンの有効期限を確認
      if (this.tokens && this.tokens.expires_at < Date.now()) {
        await this.refreshToken();
      }

      logger.info('freee adapter initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize freee adapter');
      throw new Error('freee tokens not found. Run "npm run auth:freee" to authenticate.');
    }
  }

  private saveTokens(tokens: FreeeTokens): void {
    const dir = path.dirname(TOKEN_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    this.tokens = tokens;
    logger.debug('Tokens saved');
  }

  /**
   * 認証URLを生成
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      prompt: 'consent',
    });

    return `https://accounts.secure.freee.co.jp/public_api/authorize?${params.toString()}`;
  }

  /**
   * 認証コードからトークンを取得して保存
   */
  async handleAuthCallback(code: string): Promise<void> {
    const response = await fetch('https://accounts.secure.freee.co.jp/public_api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get tokens: ${response.status}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const tokens: FreeeTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    this.saveTokens(tokens);
    logger.info('freee authentication completed');
  }

  /**
   * トークンをリフレッシュ
   */
  private async refreshToken(): Promise<void> {
    if (!this.tokens) {
      throw new Error('No tokens available');
    }

    const response = await fetch('https://accounts.secure.freee.co.jp/public_api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.tokens.refresh_token,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const tokens: FreeeTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    this.saveTokens(tokens);
    logger.debug('Token refreshed');
  }

  private async ensureValidToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('freee not initialized. Call initialize() first.');
    }

    // 5分前にリフレッシュ
    if (this.tokens.expires_at < Date.now() + 5 * 60 * 1000) {
      await this.refreshToken();
    }

    return this.tokens.access_token;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: object,
    isFormData = false
  ): Promise<T> {
    const token = await this.ensureValidToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    let requestBody: string | FormData | undefined;
    if (body) {
      if (isFormData) {
        // FormData の場合はヘッダーを設定しない（ブラウザが自動設定）
        requestBody = body as unknown as FormData;
      } else {
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(body);
      }
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, errorText, endpoint }, 'API request failed');
      throw new Error(`freee API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * 未登録の明細（自動で経理）を取得
   */
  async getUnregisteredTransactions(): Promise<WalletTransaction[]> {
    return withRetry(
      async () => {
        const data = await this.request<{
          wallet_txns: Array<{
            id: number;
            company_id: number;
            date: string;
            amount: number;
            due_amount: number;
            balance: number;
            entry_side: 'income' | 'expense';
            walletable_type: 'credit_card' | 'bank_account' | 'wallet';
            walletable_id: number;
            description: string;
            status: 'unregistered' | 'registered';
          }>;
        }>('GET', `/wallet_txns?company_id=${this.config.companyId}&status=unregistered&limit=100`);

        const transactions = data.wallet_txns.map((t) => ({
          id: t.id,
          companyId: t.company_id,
          date: t.date,
          amount: Math.abs(t.amount),
          dueAmount: t.due_amount,
          balance: t.balance,
          entrySide: t.entry_side,
          walletableType: t.walletable_type,
          walletableId: t.walletable_id,
          description: t.description,
          status: t.status,
        }));

        logger.info({ count: transactions.length }, 'Fetched unregistered transactions');
        return transactions;
      },
      undefined,
      'getUnregisteredTransactions'
    );
  }

  /**
   * 勘定科目一覧を取得
   */
  async getAccountItems(): Promise<AccountItem[]> {
    return withRetry(
      async () => {
        const data = await this.request<{
          account_items: Array<{
            id: number;
            name: string;
            shortcut: string;
            shortcut_num: string;
            default_tax_code: number;
            categories: string[];
          }>;
        }>('GET', `/account_items?company_id=${this.config.companyId}`);

        return data.account_items.map((a) => ({
          id: a.id,
          name: a.name,
          shortcut: a.shortcut,
          shortcutNum: a.shortcut_num,
          defaultTaxCode: a.default_tax_code,
          categories: a.categories,
        }));
      },
      undefined,
      'getAccountItems'
    );
  }

  /**
   * 取引を作成
   */
  async createDeal(data: CreateDealRequest): Promise<Deal> {
    return withRetry(
      async () => {
        const requestBody = {
          company_id: data.companyId,
          issue_date: data.issueDate,
          type: data.type,
          details: data.details.map((d) => ({
            account_item_id: d.accountItemId,
            tax_code: d.taxCode,
            amount: d.amount,
            description: d.description,
          })),
          payments: data.payments.map((p) => ({
            amount: p.amount,
            from_walletable_type: p.fromWalletableType,
            from_walletable_id: p.fromWalletableId,
            date: p.date,
          })),
          receipt_ids: data.receiptIds,
        };

        const result = await this.request<{
          deal: {
            id: number;
            company_id: number;
            issue_date: string;
            type: 'income' | 'expense';
          };
        }>('POST', '/deals', requestBody);

        logger.info({ dealId: result.deal.id }, 'Deal created');
        return {
          id: result.deal.id,
          companyId: result.deal.company_id,
          issueDate: result.deal.issue_date,
          type: result.deal.type,
          details: data.details,
          payments: data.payments,
        };
      },
      undefined,
      'createDeal'
    );
  }

  /**
   * レシート画像をアップロード
   */
  async uploadReceipt(imageBuffer: Buffer, fileName: string): Promise<FreeeReceipt> {
    return withRetry(
      async () => {
        const token = await this.ensureValidToken();

        // Node.js の FormData を使用
        const formData = new FormData();
        formData.append('company_id', this.config.companyId.toString());
        formData.append('receipt', new Blob([imageBuffer]), fileName);

        const response = await fetch(`${BASE_URL}/receipts`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }

        const result = (await response.json()) as {
          receipt: {
            id: number;
            status: 'unconfirmed' | 'confirmed';
            file_src: string;
          };
        };

        logger.info({ receiptId: result.receipt.id, fileName }, 'Receipt uploaded');
        return {
          id: result.receipt.id,
          status: result.receipt.status,
          fileSrc: result.receipt.file_src,
        };
      },
      undefined,
      'uploadReceipt'
    );
  }

  /**
   * 取引にレシートを紐付け
   */
  async attachReceiptToDeal(dealId: number, receiptIds: number[]): Promise<void> {
    return withRetry(
      async () => {
        await this.request('PUT', `/deals/${dealId}`, {
          company_id: this.config.companyId,
          receipt_ids: receiptIds,
        });

        logger.info({ dealId, receiptIds }, 'Receipts attached to deal');
      },
      undefined,
      'attachReceiptToDeal'
    );
  }

  /**
   * 明細を取引として登録（自動で経理の消込）
   */
  async registerWalletTransaction(walletTxnId: number, dealId: number): Promise<void> {
    return withRetry(
      async () => {
        // 明細と取引を紐付け
        await this.request('POST', `/wallet_txns/${walletTxnId}/registrations`, {
          company_id: this.config.companyId,
          deal_id: dealId,
        });

        logger.info({ walletTxnId, dealId }, 'Wallet transaction registered');
      },
      undefined,
      'registerWalletTransaction'
    );
  }
}
