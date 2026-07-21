/* 豹豹机 285：GitHub Pages 本地壳缓存。普通桌面启动优先读缓存；带 ?v= 的更新地址强制联网。 */
const CACHE_NAME = "baobao-shell-v285";
const SHELL = ["./", "./index.html", "./apple-touch-icon.png", "./baobao-manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of SHELL) {
      try { await cache.add(new Request(url, { cache: "reload" })); } catch (_) {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith("baobao-shell-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

async function fetchAndStore(request, cacheKey) {
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(cacheKey || request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const forceUpdate = url.searchParams.has("v") || url.searchParams.has("fresh");
    event.respondWith((async () => {
      const canonical = new Request(new URL("./index.html", self.registration.scope).href);
      if (forceUpdate) {
        try { return await fetchAndStore(request, canonical); }
        catch (_) { return (await caches.match(canonical)) || Response.error(); }
      }
      const cached = await caches.match(canonical) || await caches.match("./");
      if (cached) return cached;
      try { return await fetchAndStore(request, canonical); }
      catch (_) { return Response.error(); }
    })());
    return;
  }

  if (["script", "style", "image", "manifest", "font"].includes(request.destination)) {
    event.respondWith((async () => {
      const cached = await caches.match(request, { ignoreSearch: true });
      if (cached) return cached;
      try { return await fetchAndStore(request, request); }
      catch (_) { return Response.error(); }
    })());
  }
});
