const API = "https://api.github.com/repos/nextdo-app/nextdo";
const headers = { "Accept": "application/vnd.github+json", "User-Agent": "nextdo-website" };

// Safe fallback release metadata if GitHub API is unavailable or rate-limited
const FALLBACK_DATA = {
  stable: {
    version: "v0.1.7",
    published_at: "2026-10-18T10:00:00Z",
    assets: [
      { name: "Nextdo_0.1.7_aarch64.dmg", size: 7549747, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.7/Nextdo_0.1.7_aarch64.dmg" },
      { name: "Nextdo_0.1.7_x64.dmg", size: 7759462, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.7/Nextdo_0.1.7_x64.dmg" },
      { name: "Nextdo_0.1.7_x64-setup.exe", size: 4404019, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.7/Nextdo_0.1.7_x64-setup.exe" },
      { name: "Nextdo_0.1.7_x64_en-US.msi", size: 4980736, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.7/Nextdo_0.1.7_x64_en-US.msi" },
      { name: "Nextdo_0.1.7_amd64.AppImage", size: 83047200, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.7/Nextdo_0.1.7_amd64.AppImage" },
      { name: "Nextdo_0.1.7_amd64.deb", size: 7864320, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.7/Nextdo_0.1.7_amd64.deb" },
      { name: "Nextdo_0.1.7_android_arm64-v8a.apk", size: 36909875, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.7/Nextdo_0.1.7_android_arm64-v8a.apk" },
      { name: "Nextdo_0.1.7_android_armeabi-v7a.apk", size: 29884416, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.7/Nextdo_0.1.7_android_armeabi-v7a.apk" }
    ]
  },
  beta: {
    version: "v0.1.9-beta.8",
    published_at: "2026-10-21T09:44:38Z",
    assets: [
      { name: "Nextdo_0.1.9-beta.8_aarch64.dmg", size: 7549747, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.8/Nextdo_0.1.9-beta.8_aarch64.dmg" },
      { name: "Nextdo_0.1.9-beta.8_x64.dmg", size: 7759462, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.8/Nextdo_0.1.9-beta.8_x64.dmg" },
      { name: "Nextdo_0.1.9-beta.8_x64-setup.exe", size: 4404019, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.8/Nextdo_0.1.9-beta.8_x64-setup.exe" },
      { name: "Nextdo_0.1.9-beta.8_amd64.AppImage", size: 83047200, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.8/Nextdo_0.1.9-beta.8_amd64.AppImage" },
      { name: "Nextdo_0.1.9-beta.8_amd64.deb", size: 7864320, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.8/Nextdo_0.1.9-beta.8_amd64.deb" },
      { name: "Nextdo_0.1.9-beta.8_android_arm64-v8a.apk", size: 36909875, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.8/Nextdo_0.1.9-beta.8_android_arm64-v8a.apk" },
      { name: "Nextdo_0.1.9-beta.8_android_armeabi-v7a.apk", size: 29884416, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.8/Nextdo_0.1.9-beta.8_android_armeabi-v7a.apk" }
    ]
  }
};

const safeAssets = (r) => ({
  version: r.tag_name,
  published_at: r.published_at,
  html_url: r.html_url,
  assets: (r.assets ?? [])
    .filter(a => /^Nextdo_[\w.\-]+\.(dmg|exe|msi|AppImage|deb|apk)$/.test(a.name))
    .map(a => ({
      name: a.name,
      size: a.size,
      download_url: a.browser_download_url
    }))
});

export async function onRequestGet() {
  const jsonHeaders = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=300, s-maxage=600"
  };

  try {
    const [stableResponse, recentResponse] = await Promise.all([
      fetch(API + "/releases/latest", { headers }).catch(() => null),
      fetch(API + "/releases?per_page=15", { headers }).catch(() => null)
    ]);

    if (!stableResponse?.ok || !recentResponse?.ok) {
      return Response.json(FALLBACK_DATA, { headers: jsonHeaders });
    }

    const stable = await stableResponse.json();
    const releases = await recentResponse.json();
    const beta = Array.isArray(releases)
      ? releases.find(r => !r.draft && r.prerelease && Array.isArray(r.assets) && r.assets.some(a => a.name.endsWith(".dmg")))
      : null;

    return Response.json({
      stable: safeAssets(stable),
      beta: beta ? safeAssets(beta) : FALLBACK_DATA.beta
    }, { headers: jsonHeaders });
  } catch {
    return Response.json(FALLBACK_DATA, { headers: jsonHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
