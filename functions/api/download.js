const API = "https://api.github.com/repos/nextdo-app/nextdo";
const headers = {"Accept":"application/vnd.github+json","User-Agent":"nextdo-website"};
const allowed = /^Nextdo_[A-Za-z0-9._-]+\.(dmg|exe|msi|AppImage|deb|apk)$/;
export async function onRequestGet({request}) {
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel");
  const filename = url.searchParams.get("file");
  if (!["stable","beta"].includes(channel) || !filename || !allowed.test(filename)) {
    return new Response("Invalid download request", {status:400});
  }
  try {
    const path = channel === "stable" ? "/releases/latest" : "/releases?per_page=15";
    const metaResponse = await fetch(API + path, {headers});
    if (!metaResponse.ok) throw new Error("Release metadata unavailable");
    const data = await metaResponse.json();
    const release = channel === "stable" ? data : data.find(r => !r.draft && r.prerelease && r.assets?.some(a => a.name === filename));
    const asset = release?.assets?.find(a => a.name === filename);
    if (!asset || !asset.browser_download_url?.startsWith("https://github.com/nextdo-app/nextdo/releases/download/")) {
      return new Response("Installer not found in current release", {status:404});
    }
    const upstream = await fetch(asset.browser_download_url, {headers: {"User-Agent":"nextdo-website"}, redirect:"follow"});
    if (!upstream.ok || !upstream.body) throw new Error("Installer upstream unavailable");
    const out = new Headers();
    out.set("Content-Type","application/octet-stream");
    out.set("Content-Disposition", "attachment; filename=\"" + filename + "\"");
    out.set("Cache-Control","private, no-store");
    if (upstream.headers.get("content-length")) out.set("Content-Length",upstream.headers.get("content-length"));
    return new Response(upstream.body, {status:200,headers:out});
  } catch {
    return new Response("Download temporarily unavailable. Please retry later.",{status:502,headers:{"Cache-Control":"no-store"}});
  }
}
