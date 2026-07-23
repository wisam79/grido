import type { Handler } from '@netlify/functions';

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

    // 1. جلب بيانات أحدث إصدار من GitHub API
    const releaseRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`,
      { headers }
    );

    if (!releaseRes.ok) {
      // إذا كان التوكن غير موجود أو تم الوصول للحد وكان الريبو عاماً، نحاول التوجيه المباشر
      return {
        statusCode: 302,
        headers: {
          Location: `https://github.com/${repoOwner}/${repoName}/releases/latest/download/GridoStudio-installer.exe`,
        },
      };
    }

    const releaseData = await releaseRes.json();
    
    // البحث عن ملف المثبت
    const asset = releaseData.assets?.find((a: any) =>
      a.name.toLowerCase().includes('installer') || a.name.toLowerCase().includes('gridostudio')
    );

    if (!asset) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'لم يتم العثور على ملف مثبت الإصدار' }),
      };
    }

    // 2. طلب تحميل ملف الـ binary باستخدام API url والتوكن المشفر للسيرفر
    const assetHeaders: Record<string, string> = {
      'User-Agent': 'Grido-Netlify-Proxy',
      'Accept': 'application/octet-stream',
    };
    if (token) {
      assetHeaders['Authorization'] = `token ${token}`;
    }

    const binaryRes = await fetch(asset.url, { headers: assetHeaders, redirect: 'follow' });

    if (binaryRes.status === 302 || binaryRes.status === 301) {
      const redirectUrl = binaryRes.headers.get('location');
      if (redirectUrl) {
        return {
          statusCode: 302,
          headers: { Location: redirectUrl },
        };
      }
    }

    if (!binaryRes.ok) {
      return {
        statusCode: binaryRes.status,
        body: JSON.stringify({ error: 'فشل تحميل ملف المثبت من خادم GitHub' }),
      };
    }

    const arrayBuffer = await binaryRes.arrayBuffer();
    const base64Content = Buffer.from(arrayBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${asset.name || 'GridoStudio-installer.exe'}"`,
        'Cache-Control': 'public, max-age=3600',
      },
      body: base64Content,
      isBase64Encoded: true,
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'خطأ غير متوقع في خادم Netlify' }),
    };
  }
};
