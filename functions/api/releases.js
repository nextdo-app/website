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
    version: "v0.1.9-beta.11",
    published_at: "2026-10-23T07:17:18Z",
    assets: [
      { name: "Nextdo_0.1.9-beta.11_aarch64.dmg", size: 7628288, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.11/Nextdo_0.1.9-beta.11_aarch64.dmg" },
      { name: "Nextdo_0.1.9-beta.11_x64.dmg", size: 7828992, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.11/Nextdo_0.1.9-beta.11_x64.dmg" },
      { name: "Nextdo_0.1.9-beta.11_x64-setup.exe", size: 4455965, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.11/Nextdo_0.1.9-beta.11_x64-setup.exe" },
      { name: "Nextdo_0.1.9-beta.11_amd64.AppImage", size: 83028472, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.11/Nextdo_0.1.9-beta.11_amd64.AppImage" },
      { name: "Nextdo_0.1.9-beta.11_amd64.deb", size: 7890512, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.11/Nextdo_0.1.9-beta.11_amd64.deb" },
      { name: "Nextdo_0.1.9-beta.11_android_arm64-v8a.apk", size: 36917735, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.11/Nextdo_0.1.9-beta.11_android_arm64-v8a.apk" },
      { name: "Nextdo_0.1.9-beta.11_android_armeabi-v7a.apk", size: 29920779, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.11/Nextdo_0.1.9-beta.11_android_armeabi-v7a.apk" },
      { name: "Nextdo_0.1.9-beta.11_android_x86.apk", size: 37960999, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.11/Nextdo_0.1.9-beta.11_android_x86.apk" },
      { name: "Nextdo_0.1.9-beta.11_android_x86_64.apk", size: 37444727, download_url: "https://github.com/nextdo-app/nextdo/releases/download/v0.1.9-beta.11/Nextdo_0.1.9-beta.11_android_x86_64.apk" }
    ]
  }
};

const compareReleases = (a, b) => {
  const parse = (v) => {
    const m = (v || "").match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?/);
    if (!m) return null;
    const parts = (m[4] || "").split(".").map(p => /^\d+$/.test(p) ? parseInt(p, 10) : p);
    return {
      major: parseInt(m[1], 10),
      minor: parseInt(m[2], 10),
      patch: parseInt(m[3], 10),
      prerelease: m[4] ? parts : null
    };
  };
  const pa = parse(a.tag_name || a.version);
  const pb = parse(b.tag_name || b.version);
  if (pa && pb) {
    if (pb.major !== pa.major) return pb.major - pa.major;
    if (pb.minor !== pa.minor) return pb.minor - pa.minor;
    if (pb.patch !== pa.patch) return pb.patch - pa.patch;
    if (!pb.prerelease && pa.prerelease) return 1;
    if (pb.prerelease && !pa.prerelease) return -1;
    if (pb.prerelease && pa.prerelease) {
      const len = Math.max(pb.prerelease.length, pa.prerelease.length);
      for (let i = 0; i < len; i++) {
        const pA = pa.prerelease[i];
        const pB = pb.prerelease[i];
        if (pA === undefined) return 1;
        if (pB === undefined) return -1;
        if (typeof pA === "number" && typeof pB === "number") {
          if (pB !== pA) return pB - pA;
        } else {
          const c = String(pB).localeCompare(String(pA), undefined, { numeric: true });
          if (c !== 0) return c;
        }
      }
    }
  } else {
    const cmp = (b.tag_name || b.version || "").localeCompare(a.tag_name || a.version || "", undefined, { numeric: true });
    if (cmp !== 0) return cmp;
  }
  return new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0);
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
      fetch(API + "/releases?per_page=20", { headers }).catch(() => null)
    ]);

    if (!stableResponse?.ok || !recentResponse?.ok) {
      return Response.json(FALLBACK_DATA, { headers: jsonHeaders });
    }

    const stable = await stableResponse.json();
    const releases = await recentResponse.json();
    const betaReleases = Array.isArray(releases)
      ? releases
          .filter(r => !r.draft && r.prerelease && Array.isArray(r.assets) && r.assets.some(a => a.name.endsWith(".dmg") || a.name.endsWith(".exe") || a.name.endsWith(".apk") || a.name.endsWith(".AppImage")))
          .sort(compareReleases)
      : [];
    const beta = betaReleases[0] || null;

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
