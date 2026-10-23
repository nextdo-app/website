const API = "https://api.github.com/repos/nextdo-app/nextdo";
const GITHUB_REPO = "https://github.com/nextdo-app/nextdo";
const headers = {
  "Accept": "application/vnd.github+json",
  "User-Agent": "nextdo-website"
};
const allowed = /^Nextdo_[A-Za-z0-9._-]+\.(dmg|exe|msi|AppImage|deb|apk)$/;
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


export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel") || "stable";
  const filename = url.searchParams.get("file");
  const stream = url.searchParams.get("stream") === "1" || url.searchParams.get("stream") === "true";

  // If no filename provided, redirect to releases page
  if (!filename) {
    const targetUrl = channel === "beta" ? `${GITHUB_REPO}/releases` : `${GITHUB_REPO}/releases/latest`;
    return Response.redirect(targetUrl, 302);
  }

  if (!allowed.test(filename) && !/^[A-Za-z0-9._-]+\.(dmg|exe|msi|AppImage|deb|apk)$/.test(filename)) {
    return new Response("Invalid filename requested", { status: 400 });
  }

  try {
    // Extract platform suffix (e.g. "aarch64.dmg", "x64-setup.exe", "amd64.AppImage")
    const suffix = filename.startsWith("Nextdo_") ? filename.replace(/^Nextdo_[^_]+_/, "") : filename;

    // Fetch release metadata
    const [stableRes, recentRes] = await Promise.all([
      fetch(`${API}/releases/latest`, { headers }).catch(() => null),
      fetch(`${API}/releases?per_page=20`, { headers }).catch(() => null)
    ]);

    const stableData = stableRes && stableRes.ok ? await stableRes.json() : null;
    const recentData = recentRes && recentRes.ok ? await recentRes.json() : [];
    const sortedRecent = Array.isArray(recentData) ? [...recentData].sort(compareReleases) : [];

    let targetRelease = null;
    if (channel === "beta") {
      targetRelease = sortedRecent.find(r => !r.draft && r.prerelease && Array.isArray(r.assets) && r.assets.length > 0) || stableData;
    } else {
      targetRelease = stableData || sortedRecent.find(r => !r.draft && !r.prerelease) || sortedRecent[0];
    }

    // Find asset: first exact match by filename
    let asset = targetRelease?.assets?.find(a => a.name === filename);

    // If not found in target release, check all recent releases for exact filename
    if (!asset && Array.isArray(sortedRecent)) {
      for (const rel of sortedRecent) {
        const match = rel.assets?.find(a => a.name === filename);
        if (match) {
          asset = match;
          targetRelease = rel;
          break;
        }
      }
    }

    // If still not found, match by platform suffix in target release (avoids 404 when version in link differs)
    if (!asset && targetRelease?.assets) {
      asset = targetRelease.assets.find(a => a.name.endsWith(`_${suffix}`) || a.name === suffix);
    }

    // If still not found, check any recent release for suffix match
    if (!asset && Array.isArray(sortedRecent)) {
      for (const rel of sortedRecent) {
        const match = rel.assets?.find(a => a.name.endsWith(`_${suffix}`) || a.name === suffix);
        if (match) {
          asset = match;
          break;
        }
      }
    }

    if (asset && asset.browser_download_url) {
      // If streaming is not explicitly requested, or if file is large (> 40MB), 302 redirect directly to GitHub CDN
      if (!stream || (asset.size && asset.size > 40 * 1024 * 1024)) {
        return Response.redirect(asset.browser_download_url, 302);
      }

      // Optional stream proxy
      try {
        const upstream = await fetch(asset.browser_download_url, {
          headers: { "User-Agent": "nextdo-website" },
          redirect: "follow"
        });
        if (upstream.ok && upstream.body) {
          const outHeaders = new Headers();
          outHeaders.set("Content-Type", "application/octet-stream");
          outHeaders.set("Content-Disposition", `attachment; filename="${asset.name}"`);
          outHeaders.set("Cache-Control", "public, max-age=3600");
          if (upstream.headers.get("content-length")) {
            outHeaders.set("Content-Length", upstream.headers.get("content-length"));
          }
          return new Response(upstream.body, { status: 200, headers: outHeaders });
        }
      } catch {
        // Fall back to redirect if stream proxying fails
      }
      return Response.redirect(asset.browser_download_url, 302);
    }

    // Construct direct release asset URL if release tag is known
    if (targetRelease?.tag_name) {
      const directUrl = `${GITHUB_REPO}/releases/download/${targetRelease.tag_name}/${filename}`;
      return Response.redirect(directUrl, 302);
    }

    // Final fallback: redirect to releases page
    return Response.redirect(`${GITHUB_REPO}/releases`, 302);
  } catch {
    return Response.redirect(`${GITHUB_REPO}/releases`, 302);
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
