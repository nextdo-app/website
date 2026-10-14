const API = "https://api.github.com/repos/nextdo-app/nextdo";
const headers = { "Accept": "application/vnd.github+json", "User-Agent": "nextdo-website" };
const safeAssets = (r) => ({
  version: r.tag_name,
  published_at: r.published_at,
  assets: (r.assets ?? []).filter(a => /^Nextdo_[\w.\-]+\.(dmg|exe|msi|AppImage|deb|apk)$/.test(a.name)).map(a => ({
    name: a.name, size: a.size
  }))
});
export async function onRequestGet({ request }) {
  try {
    const [stableResponse, recentResponse] = await Promise.all([
      fetch(API + "/releases/latest", { headers }),
      fetch(API + "/releases?per_page=15", { headers })
    ]);
    if (!stableResponse.ok || !recentResponse.ok) throw new Error("release API unavailable");
    const stable = await stableResponse.json();
    const releases = await recentResponse.json();
    const beta = releases.find(r => !r.draft && r.prerelease && Array.isArray(r.assets) && r.assets.some(a => a.name.endsWith(".dmg")));
    return Response.json({
      stable: safeAssets(stable),
      beta: beta ? safeAssets(beta) : null
    }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=600" } });
  } catch {
    return Response.json({error:"发布信息暂时不可用"}, {status:502,headers:{"Cache-Control":"no-store"}});
  }
}
