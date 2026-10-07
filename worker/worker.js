// ページの表示回数と /go/ のクリックを、配信側（Cloudflare Workers）で数える。
// タグ・Cookie なし。記録は 1 回ごとに「時刻（自動）・種類・パス・国・参照元のドメイン」だけ（IP・UA は記録しない）。
// 正本: sata-portfolio/worker/worker.js（minecraft-mod/site/worker/worker.js は同じ中身の写し）。
const BOT = /bot|crawl|spider|slurp|preview|monitor|curl|wget|python|headless|lighthouse/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/go/')) {
      const to = (env.LINKS || {})[url.pathname.slice(4)];
      if (!to) return new Response('unknown link', { status: 404 });
      count(request, env, 'go', url.pathname);
      return Response.redirect(to, 302);
    }
    const res = await env.ASSETS.fetch(request);
    const page = (request.headers.get('accept') || '').includes('text/html');
    if (page && (res.status === 200 || res.status === 304)) count(request, env, 'view', url.pathname);
    return res;
  },
};

function count(request, env, kind, path) {
  if (request.method !== 'GET' || BOT.test(request.headers.get('user-agent') || '')) return;
  let ref = '';
  try { ref = new URL(request.headers.get('referer')).hostname; } catch {}
  try {
    env.VIEWS.writeDataPoint({
      indexes: [env.SITE || ''],
      blobs: [kind, path.slice(0, 200), request.cf?.country || '', ref],
    });
  } catch {} // 数え損ねてもページは返す
}
