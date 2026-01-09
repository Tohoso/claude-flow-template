/**
 * Google Drive OAuth2 認証スクリプト
 *
 * 使い方:
 *   npm run auth:google
 *
 * ブラウザで認証後、リダイレクトURLからcodeパラメータをコピーして入力してください。
 */

import * as readline from 'readline';
import { config } from '../config/index.js';
import { GoogleDriveAdapter } from '../adapters/google-drive.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('=== Google Drive OAuth2 認証 ===\n');

  const adapter = new GoogleDriveAdapter(config.googleDrive);

  // 認証URLを生成
  const authUrl = adapter.getAuthUrl();

  console.log('以下のURLをブラウザで開いて認証してください:\n');
  console.log(authUrl);
  console.log('\n認証後、リダイレクトURLから "code" パラメータの値をコピーしてください。');
  console.log('例: http://localhost:3000/callback?code=XXXXX の XXXXX 部分\n');

  const code = await question('認証コードを入力してください: ');

  if (!code.trim()) {
    console.error('認証コードが入力されませんでした。');
    process.exit(1);
  }

  try {
    await adapter.handleAuthCallback(code.trim());
    console.log('\n✓ 認証が完了しました！トークンは tokens/google-token.json に保存されました。');
  } catch (error) {
    console.error('\n✗ 認証に失敗しました:', error);
    process.exit(1);
  }

  rl.close();
}

main();
