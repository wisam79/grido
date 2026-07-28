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
        }),
      };
    }

    const releaseData = await releaseRes.json();

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
