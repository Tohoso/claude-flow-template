import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import type { DriveFile, GoogleDriveConfig, IGoogleDriveAdapter } from '../types/index.js';
import { createLogger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

const logger = createLogger('google-drive');

const TOKEN_PATH = './tokens/google-token.json';

export class GoogleDriveAdapter implements IGoogleDriveAdapter {
  private drive: drive_v3.Drive | null = null;
  private oauth2Client: OAuth2Client;
  private config: GoogleDriveConfig;

  constructor(config: GoogleDriveConfig) {
    this.config = config;
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * OAuth2認証を初期化
   */
  async initialize(): Promise<void> {
    try {
      const tokenData = fs.readFileSync(TOKEN_PATH, 'utf-8');
      const tokens = JSON.parse(tokenData);
      this.oauth2Client.setCredentials(tokens);

      // トークンのリフレッシュを設定
      this.oauth2Client.on('tokens', (tokens) => {
        if (tokens.refresh_token) {
          this.saveTokens(tokens);
        }
      });

      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      logger.info('Google Drive adapter initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Google Drive adapter');
      throw new Error(
        'Google Drive tokens not found. Run "npm run auth:google" to authenticate.'
      );
    }
  }

  private saveTokens(tokens: object): void {
    const dir = path.dirname(TOKEN_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    logger.debug('Tokens saved');
  }

  /**
   * 認証URLを生成
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  /**
   * 認証コードからトークンを取得して保存
   */
  async handleAuthCallback(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    this.saveTokens(tokens);
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    logger.info('Google Drive authentication completed');
  }

  private ensureDrive(): drive_v3.Drive {
    if (!this.drive) {
      throw new Error('Google Drive not initialized. Call initialize() first.');
    }
    return this.drive;
  }

  /**
   * pending フォルダから未処理のレシート画像を取得
   */
  async listPendingReceipts(): Promise<DriveFile[]> {
    const drive = this.ensureDrive();

    return withRetry(
      async () => {
        const response = await drive.files.list({
          q: `'${this.config.pendingFolderId}' in parents and mimeType contains 'image/' and trashed = false`,
          fields: 'files(id, name, mimeType, createdTime)',
          orderBy: 'createdTime',
          pageSize: 100,
        });

        const files = response.data.files || [];
        logger.info({ count: files.length }, 'Found pending receipts');

        return files.map((file) => ({
          id: file.id!,
          name: file.name!,
          mimeType: file.mimeType!,
          createdTime: file.createdTime!,
        }));
      },
      undefined,
      'listPendingReceipts'
    );
  }

  /**
   * ファイルをダウンロード
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    const drive = this.ensureDrive();

    return withRetry(
      async () => {
        const response = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );

        const buffer = Buffer.from(response.data as ArrayBuffer);
        logger.debug({ fileId, size: buffer.length }, 'File downloaded');
        return buffer;
      },
      undefined,
      'downloadFile'
    );
  }

  /**
   * ファイルを処理済みフォルダに移動
   */
  async moveToProcessed(fileId: string, yearMonth: string): Promise<void> {
    const drive = this.ensureDrive();

    return withRetry(
      async () => {
        // 年月別サブフォルダを確認・作成
        const subFolderId = await this.ensureSubFolder(yearMonth);

        // ファイルを移動
        await drive.files.update({
          fileId,
          addParents: subFolderId,
          removeParents: this.config.pendingFolderId,
          fields: 'id, parents',
        });

        logger.info({ fileId, yearMonth }, 'File moved to processed folder');
      },
      undefined,
      'moveToProcessed'
    );
  }

  /**
   * 年月別サブフォルダを確認・作成
   */
  private async ensureSubFolder(yearMonth: string): Promise<string> {
    const drive = this.ensureDrive();

    // サブフォルダが存在するか確認
    const response = await drive.files.list({
      q: `'${this.config.processedFolderId}' in parents and name = '${yearMonth}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // サブフォルダを作成
    const createResponse = await drive.files.create({
      requestBody: {
        name: yearMonth,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [this.config.processedFolderId],
      },
      fields: 'id',
    });

    logger.info({ yearMonth }, 'Created processed subfolder');
    return createResponse.data.id!;
  }
}
