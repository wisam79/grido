import type { Handler } from '@netlify/functions';

const CHECKSUMS_ASSET = 'grido-checksums.txt';

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
      }),
    };
  } catch (err: any) {
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
