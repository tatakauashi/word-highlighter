/**
 * service_worker.ts — バックグラウンド処理
 *
 * chrome.storage.onChanged は content script 側でも直接受信できるため、
 * 現時点では中継ロジックは不要。
 * 将来の拡張に備えてエントリポイントのみ定義しておく。
 */

// Service Worker が正常に登録されたことを確認するためのログ
// （本番ビルドでは console.log は残さないが、初期確認用として記載）
chrome.runtime.onInstalled.addListener(() => {
  // 初回インストール・更新時の処理（現時点では何もしない）
})
