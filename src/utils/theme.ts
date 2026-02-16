
/**
 * Helper to get current CSS variable values for Canvas usage.
 */

// キャッシュ用のマップ（頻繁なDOMアクセスを避けるため）


export function getThemeColor(variableName: string, fallback: string = '#000000'): string {
    // 完全に動的に取得するため、キャッシュは適宜クリアするか、
    // ここでは「テーマ切り替え時にページ全体がリレンダリングされる」前提で
    // 毎回取得するか、パフォーマンスとのトレードオフ。
    // Canvas描画ループ(60fps)内で呼ぶと重いので、
    // useEffect内で一度だけ取得してRefに保存するパターンが推奨される。

    // ここでは単純に getComputedStyle をラップする。
    // 呼び出し側で useEffect 内で呼ぶこと。
    if (typeof window === 'undefined') return fallback;

    const val = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    return val || fallback;
}

/**
 * HSL色指定などをCanvasで使える文字列に変換するヘルパーが必要ならここに追加
 * (現状はHEXコードが返ってくる前提)
 */
