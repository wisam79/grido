import type { Handler } from '@netlify/functions';

const CHECKSUMS_ASSET = 'grido-checksums.txt';
const SIGNATURE_ASSET = 'grido-checksums.txt.sig';

/**
 * يستخرج أول سطر غير فارغ من ملف توقيع خام (base64) — يتجاهل التعليقات
 * والأسطر الفارغة كي يبقى التوقيع قابلاً للقراءة البشرية في ملف الإصدار.
 */
function parseSignatureContent(content: string): string {
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    return line;
  }
  return '';
}

/**
 * يستخرج بصمة SHA-256 الخاصة بملف المثبت من محتوى ملف البصمات
 * بصيغة "<sha256>  <filename>" لكل سطر.
 */
function parseInstallerChecksum(content: string): string {
  let fallback = '';
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const fileName = parts[parts.length - 1].toLowerCase();
    if (fileName.includes('installer') || fileName.includes('setup')) {
      return parts[0].toLowerCase();
    }
    if (fileName.endsWith('.exe') && !fallback) {
      fallback = parts[0].toLowerCase();
    }
  }
  return fallback;
}

export const handler: Handler = async () => {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = 'wisam79';
  const repoName = 'grido';

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Grido-Netlify-Proxy',
      'Accept': 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const releaseRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`,
      { headers }
    );

    if (!releaseRes.ok) {
      return {
        statusCode: releaseRes.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tag_name: 'v1.0.0',
          body: '',
          download_url: 'https://grido.cloud-ip.cc/api/download',
          sha256: '',
          signature: '',
        }),
      };
    }

    const releaseData = await releaseRes.json();

    // 🛡️ جلب بصمة المثبت من أصل grido-checksums.txt المرفوع مع الإصدار
    let installerSHA256 = '';
    try {
      const assets: Array<{ name: string; url: string; browser_download_url: string }> =
        Array.isArray(releaseData.assets) ? releaseData.assets : [];
      const checksumAsset = assets.find((a) => a.name === CHECKSUMS_ASSET);
      if (checksumAsset) {
        const assetHeaders: Record<string, string> = {
          'User-Agent': 'Grido-Netlify-Proxy',
          'Accept': 'application/octet-stream',
        };
        if (token) {
          assetHeaders['Authorization'] = `token ${token}`;
        }
        const checksumRes = await fetch(checksumAsset.url, {
          headers: assetHeaders,
          redirect: 'follow',
        });
        if (checksumRes.ok) {
          installerSHA256 = parseInstallerChecksum(await checksumRes.text());
        }
      }
    } catch (checksumErr) {
      // فشل جلب البصمة لا يعطّل التحديث — التطبيق يسجل تحذيراً ويتابع (توافقية مع الإصدارات القديمة)
      console.error('Failed to fetch checksums asset:', checksumErr);
    }

    // 🔏 توقيع Ed25519 على بصمة المثبت — يُقرأ من أصل منفصل ويُمرَّر في الحقل
    // `signature`. العميل يفرضه متى كان مفتاح عام مثبّتاً في البناء، وإلا
    // فتظل البصمة وحدها هي الحاكمة (سلوك الإصدارات القديمة).
    let installerSignature = '';
    try {
      const assets: Array<{ name: string; url: string }> = Array.isArray(releaseData.assets)
        ? releaseData.assets
        : [];
      const signatureAsset = assets.find((a) => a.name === SIGNATURE_ASSET);
      if (signatureAsset) {
        const assetHeaders: Record<string, string> = {
          'User-Agent': 'Grido-Netlify-Proxy',
          'Accept': 'application/octet-stream',
        };
        if (token) {
          assetHeaders['Authorization'] = `token ${token}`;
        }
        const signatureRes = await fetch(signatureAsset.url, {
          headers: assetHeaders,
          redirect: 'follow',
        });
        if (signatureRes.ok) {
          installerSignature = parseSignatureContent(await signatureRes.text());
        }
      }
    } catch (signatureErr) {
      // غياب التوقيع لا يعطّل الكشف عن التحديث: الخلفية ترفض التثبيت بنفسها
      // برسالة صريحة إن كان مفتاح عام مثبّتاً في البناء (Fail-closed هناك).
      console.error('Failed to fetch signature asset:', signatureErr);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
      body: JSON.stringify({
        tag_name: releaseData.tag_name || 'v1.0.0',
        body: releaseData.body || '',
        download_url: 'https://grido.cloud-ip.cc/api/download',
        sha256: installerSHA256,
        signature: installerSignature,
      }),
    };
  } catch {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Server error fetching version' }),
    };
  }
};
