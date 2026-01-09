import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import type {
  ExtractedReceiptData,
  GeminiConfig,
  IGeminiAdapter,
  WalletTransaction,
} from '../types/index.js';
import { createLogger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

const logger = createLogger('gemini');

const RECEIPT_ANALYSIS_PROMPT = `
あなたはレシート解析の専門家です。
このレシート画像から以下の情報を正確に抽出し、JSON形式で返してください。

## 抽出項目
- date: 日付 (YYYY-MM-DD形式、読み取れない場合は null)
- amount: 合計金額 (税込、数値のみ、読み取れない場合は null)
- storeName: 店舗名 (支店名含む、読み取れない場合は null)
- items: 購入品目のリスト (配列)
- paymentMethod: 支払方法 (現金/クレジットカード/電子マネー等、読み取れない場合は null)
- suggestedCategory: 以下から最適なものを選択
  - 会議費 (打ち合わせ時の飲食)
  - 交際費 (接待)
  - 旅費交通費 (移動関連)
  - 消耗品費 (事務用品等)
  - 通信費 (電話、インターネット)
  - 新聞図書費 (書籍、雑誌)
  - 福利厚生費 (従業員向け)
  - 雑費 (その他)
- suggestedAccountCode: 勘定科目コード (会議費:7620, 交際費:7630, 旅費交通費:7610, 消耗品費:7510, 通信費:7540, 新聞図書費:7560, 福利厚生費:7410, 雑費:7990)
- confidence: 抽出の確信度 (0.0-1.0)

## 注意事項
- 読み取れない項目は null としてください
- 金額は必ず数値で返してください（カンマなし）
- 日付が読み取れない場合は null としてください
- 必ず有効なJSONのみを返してください。説明文は不要です。

## 出力例
{
  "date": "2026-01-09",
  "amount": 1980,
  "storeName": "スターバックス 渋谷店",
  "items": ["カフェラテ", "サンドイッチ"],
  "paymentMethod": "クレジットカード",
  "suggestedCategory": "会議費",
  "suggestedAccountCode": "7620",
  "confidence": 0.95
}
`;

const MATCH_SELECTION_PROMPT = `
あなたは経理のエキスパートです。
以下のレシート情報と、複数の取引候補から最も適切な取引を選んでください。

## レシート情報
{receiptInfo}

## 取引候補
{candidates}

## 回答形式
選択した取引のIDのみを数値で返してください。説明は不要です。
例: 12345
`;

export class GeminiAdapter implements IGeminiAdapter {
  private model: GenerativeModel;

  constructor(config: GeminiConfig) {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = genAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
    });
    logger.info({ model: config.model }, 'Gemini adapter initialized');
  }

  /**
   * レシート画像を解析して情報を抽出
   */
  async analyzeReceipt(imageBuffer: Buffer, fileName: string): Promise<ExtractedReceiptData> {
    return withRetry(
      async () => {
        const base64Image = imageBuffer.toString('base64');
        const mimeType = this.getMimeType(fileName);

        const result = await this.model.generateContent([
          { text: RECEIPT_ANALYSIS_PROMPT },
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
        ]);

        const response = result.response;
        const text = response.text().trim();

        // JSONをパース
        const parsed = this.parseJsonResponse(text);
        logger.info({ fileName, parsed }, 'Receipt analyzed');

        return this.validateAndNormalize(parsed, fileName);
      },
      undefined,
      'analyzeReceipt'
    );
  }

  /**
   * 複数の取引候補から最適なものを選択
   */
  async selectBestMatch(
    receipt: ExtractedReceiptData,
    candidates: WalletTransaction[]
  ): Promise<WalletTransaction> {
    return withRetry(
      async () => {
        const receiptInfo = JSON.stringify(receipt, null, 2);
        const candidatesInfo = candidates
          .map(
            (c) =>
              `ID: ${c.id}, 日付: ${c.date}, 金額: ${c.amount}円, 摘要: ${c.description}`
          )
          .join('\n');

        const prompt = MATCH_SELECTION_PROMPT.replace('{receiptInfo}', receiptInfo).replace(
          '{candidates}',
          candidatesInfo
        );

        const result = await this.model.generateContent(prompt);
        const response = result.response;
        const text = response.text().trim();

        const selectedId = parseInt(text, 10);
        const selected = candidates.find((c) => c.id === selectedId);

        if (!selected) {
          logger.warn({ text, candidates }, 'Invalid selection, using first candidate');
          return candidates[0];
        }

        logger.info({ selectedId, receipt }, 'Best match selected');
        return selected;
      },
      undefined,
      'selectBestMatch'
    );
  }

  private getMimeType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'heic':
        return 'image/heic';
      default:
        return 'image/jpeg';
    }
  }

  private parseJsonResponse(text: string): Record<string, unknown> {
    // コードブロックを除去
    let jsonText = text;
    if (text.includes('```json')) {
      jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (text.includes('```')) {
      jsonText = text.replace(/```\n?/g, '');
    }

    try {
      return JSON.parse(jsonText.trim());
    } catch (error) {
      logger.error({ text, error }, 'Failed to parse JSON response');
      throw new Error('Invalid JSON response from Gemini');
    }
  }

  private validateAndNormalize(
    data: Record<string, unknown>,
    fileName: string
  ): ExtractedReceiptData {
    // ファイル名から日付を推測（フォールバック）
    let fallbackDate: string | null = null;
    const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      fallbackDate = dateMatch[1];
    }

    return {
      date: typeof data.date === 'string' ? data.date : fallbackDate,
      amount: typeof data.amount === 'number' ? data.amount : null,
      storeName: typeof data.storeName === 'string' ? data.storeName : null,
      items: Array.isArray(data.items) ? data.items.map(String) : [],
      paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : null,
      suggestedCategory:
        typeof data.suggestedCategory === 'string' ? data.suggestedCategory : '雑費',
      suggestedAccountCode:
        typeof data.suggestedAccountCode === 'string' ? data.suggestedAccountCode : '7990',
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.5,
    };
  }
}
