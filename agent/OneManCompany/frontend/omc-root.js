/**
 * omc-root.js — Public URL prefix support for AgentHub mounting.
 *
 * When OneManCompany is served under /oneManCompany (or another OMC_ROOT_PATH),
 * absolute /api and /ws calls must be rewritten. This file must load before
 * other app scripts.
 */
(function initOmcRoot(global) {
  const DEFAULT_ROOT = '/oneManCompany';

  function detectRoot() {
    if (typeof global.__OMC_ROOT_INJECTED__ === 'string') {
      const injected = global.__OMC_ROOT_INJECTED__.trim().replace(/\/$/, '');
      return injected === '/' ? '' : injected;
    }
    const path = global.location && global.location.pathname ? global.location.pathname : '';
    if (path === DEFAULT_ROOT || path.startsWith(DEFAULT_ROOT + '/')) {
      return DEFAULT_ROOT;
    }
    return '';
  }

  const ROOT = detectRoot();
  global.__OMC_ROOT__ = ROOT;

  // Ensure relative CSS/JS resolve under the mount prefix even if the URL
  // somehow lacks a trailing slash (base href is the reliable fix).
  if (ROOT && global.document) {
    const existing = global.document.querySelector('base');
    if (!existing) {
      const base = global.document.createElement('base');
      base.href = ROOT + '/';
      const head = global.document.head;
      if (head) head.insertBefore(base, head.firstChild);
    } else if (!existing.getAttribute('href')) {
      existing.href = ROOT + '/';
    }
  }

  function omcUrl(path) {
    if (path == null || path === '') return ROOT || '/';
    if (/^https?:\/\//i.test(path) || path.startsWith('//')) return path;
    const normalized = path.startsWith('/') ? path : '/' + path;
    return ROOT + normalized;
  }

  global.omcUrl = omcUrl;

  // Patch fetch() for absolute /api and /ws paths.
  if (typeof global.fetch === 'function') {
    const rawFetch = global.fetch.bind(global);
    global.fetch = function omcFetch(input, init) {
      if (typeof input === 'string' && (input.startsWith('/api') || input.startsWith('/ws'))) {
        input = omcUrl(input);
      } else if (global.Request && input instanceof global.Request) {
        const url = input.url;
        try {
          const parsed = new URL(url, global.location.origin);
          if (parsed.origin === global.location.origin &&
              (parsed.pathname.startsWith('/api') || parsed.pathname.startsWith('/ws'))) {
            input = new global.Request(omcUrl(parsed.pathname + parsed.search), input);
          }
        } catch (_) { /* keep original */ }
      }
      return rawFetch(input, init);
    };
  }

  function patchUrlProperty(proto, propName) {
    if (!proto) return;
    const desc = Object.getOwnPropertyDescriptor(proto, propName);
    if (!desc || typeof desc.set !== 'function') return;
    Object.defineProperty(proto, propName, {
      configurable: true,
      enumerable: desc.enumerable,
      get: desc.get,
      set(value) {
        if (typeof value === 'string' && (value.startsWith('/api') || value.startsWith('/ws'))) {
          value = omcUrl(value);
        }
        desc.set.call(this, value);
      },
    });
  }

  patchUrlProperty(global.HTMLImageElement && global.HTMLImageElement.prototype, 'src');
  patchUrlProperty(global.HTMLScriptElement && global.HTMLScriptElement.prototype, 'src');
  patchUrlProperty(global.HTMLLinkElement && global.HTMLLinkElement.prototype, 'href');

  function rewriteTree(rootNode) {
    if (!rootNode || !rootNode.querySelectorAll) return;
    rootNode.querySelectorAll('[src^="/api"], [href^="/api"]').forEach((el) => {
      if (el.hasAttribute('src')) {
        const src = el.getAttribute('src');
        if (src && src.startsWith('/api')) el.setAttribute('src', omcUrl(src));
      }
      if (el.hasAttribute('href')) {
        const href = el.getAttribute('href');
        if (href && href.startsWith('/api')) el.setAttribute('href', omcUrl(href));
      }
    });
  }

  function startObserver() {
    rewriteTree(global.document);
    if (!global.MutationObserver || !global.document) return;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) rewriteTree(node);
        });
      }
    });
    observer.observe(global.document.documentElement, { childList: true, subtree: true });
  }

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }
})(typeof window !== 'undefined' ? window : globalThis);
