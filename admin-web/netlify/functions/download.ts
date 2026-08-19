import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = 'wisam79';
  const repoName = 'grido';
  const downloadType = event.queryStringParameters?.type || 'installer';

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Grido-Netlify-Proxy',
      'Accept': 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    // 1. جلب بيانات أحدث إصدار من GitHub API
    const releaseRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`,
      { headers }
    );

    if (!releaseRes.ok) {
      return {
        statusCode: 302,
        headers: {
          Location: `https://github.com/${repoOwner}/${repoName}/releases/latest`,
        },
      };
    }

    const releaseData = await releaseRes.json();

    // 2. البحث عن ملف المثبت أو الملف التنفيذي
    let asset;
    
    if (downloadType === 'portable') {
      asset = releaseData.assets?.find((a: any) => 
        a.name.toLowerCase() === 'grido studio.exe' || 
        a.name.toLowerCase() === 'gridostudio.exe' ||
        (!a.name.toLowerCase().includes('installer') && !a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe'))
      );
    } else {
      asset = releaseData.assets?.find((a: any) =>
        a.name.toLowerCase().includes('installer') || a.name.toLowerCase().includes('setup')
      );
    }

    if (!asset) {
      asset = releaseData.assets?.find((a: any) =>
        a.name.toLowerCase().endsWith('.exe')
      );
    }

    if (!asset) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'لم يتم العثور على ملف مثبت الإصدار' }),
      };
    }

    // 3. طلب موقع التحميل المباشر مع ضبط redirect: 'manual' للحصول على التوجيه المباشر (AWS S3)
    // يتفادى هذا قيد حجم استجابة Netlify (6MB Limit) ويحقق سرعة تحكم وتحميل قصوى للمستخدم
    const assetHeaders: Record<string, string> = {
      'User-Agent': 'Grido-Netlify-Proxy',
      'Accept': 'application/octet-stream',
    };
    if (token) {
      assetHeaders['Authorization'] = `token ${token}`;
    }

    const binaryRes = await fetch(asset.url, {
      headers: assetHeaders,
      redirect: 'manual',
    });

    const redirectUrl = binaryRes.headers.get('location');
    if (redirectUrl) {
      return {
        statusCode: 302,
        headers: {
          Location: redirectUrl,
          'Cache-Control': 'no-cache',
        },
      };
    }

    // إذا لم يُرجع GitHub توجيه 302، نكتفي بالتوجيه لصفحة الـ Release الرسمية
    return {
      statusCode: 302,
      headers: {
        Location: asset.browser_download_url || `https://github.com/${repoOwner}/${repoName}/releases/latest`,
      },
    };
  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'خطأ غير متوقع في خادم Netlify' }),
    };
  }
};
