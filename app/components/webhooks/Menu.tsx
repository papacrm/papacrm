import { Link, useHtml } from "nukejs";

export interface MenuLink {
    label: string;
    href: string;
}

interface MenuProps {
    links: MenuLink[];
    // "horizontal" (default) lays links out in a row, like a typical top
    // nav; "vertical" stacks them, for a sidebar or a mobile-style menu.
    orientation?: "horizontal" | "vertical";
}

// A plain link list, used both as its own block inside a View and as the
// link-rendering piece Navbar/Footer reuse. Uses NukeJS's <Link>, which
// would normally give client-side navigation once/if the page is
// hydrated — but Menu only ever renders on webhook-rendered pages (View,
// Navbar, Footer all live under components/webhooks/), and those pages
// are never hydrated (see the long comment in WebhookInputForm.tsx for
// why). Without help, <Link> just degrades to a plain <a href> there —
// clicking a menu link does a full browser reload.
//
// So Menu wires up the same no-full-reload navigation WebhookInputForm
// uses for its submit, applied to clicks instead of a form submit: same
// swapInPage (replace `[data-webhook-page]`, re-run any scripts on the
// new page — including this one, so links on the next page get the same
// treatment), same fetch-then-fall-back-to-a-real-navigation shape. On
// top of that it does a history.pushState (a click really does go to a
// new URL, unlike the form's same-URL submit) and listens for
// popstate so browser back/forward also swap in place. If JS is
// unavailable, or something about the click isn't a plain in-app
// navigation, the click is left alone and the underlying <a href> just
// navigates normally.
export default function Menu({ links, orientation = "horizontal" }: MenuProps) {
    useHtml({
        script: [
            {
                position: "body",
                content: `
(function () {
  document.querySelectorAll("[data-menu]").forEach(function (menu) {
    if (menu.dataset.menuBound) return;
    menu.dataset.menuBound = "1";

    menu.addEventListener("click", function (e) {
      var link = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!link || !menu.contains(link)) return;

      // Only intercept a plain left-click that isn't asking to open in a
      // new tab/window — everything else (middle click, ctrl/cmd/shift/
      // alt click, an explicit target) is left to the browser.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
        (link.target && link.target !== "_self")
      ) {
        return;
      }

      var url;
      try {
        url = new URL(link.href, window.location.href);
      } catch (err) {
        return;
      }

      // Cross-origin links (or a download/mailto/tel-style link, which
      // won't resolve to an http(s) URL matching our origin) navigate
      // normally.
      if (url.origin !== window.location.origin) return;

      // A same-page hash link (e.g. "#section") has nothing to fetch —
      // let the browser jump to it.
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) {
        return;
      }

      e.preventDefault();
      navigateTo(url.pathname + url.search + url.hash, true);
    });
  });

  // Swaps in the target page — parsed from a full renderComponent() HTML
  // response — without a full browser navigation. Identical in shape to
  // WebhookInputForm's swapInPage: same [data-webhook-page] swap, same
  // re-execution of the next page's <script> tags (this one included, so
  // menu links on the swapped-in page get bound too).
  function swapInPage(html) {
    var nextDoc = new DOMParser().parseFromString(html, "text/html");
    var nextRoot = nextDoc.querySelector("[data-webhook-page]");
    var currentRoot = document.querySelector("[data-webhook-page]");
    if (!nextRoot || !currentRoot) return false;

    document.title = nextDoc.title;
    currentRoot.replaceWith(nextRoot);

    nextDoc.querySelectorAll("body script").forEach(function (oldScript) {
      var script = document.createElement("script");
      for (var i = 0; i < oldScript.attributes.length; i++) {
        var attr = oldScript.attributes[i];
        script.setAttribute(attr.name, attr.value);
      }
      script.textContent = oldScript.textContent;
      document.body.appendChild(script);
    });

    return true;
  }

  function navigateTo(href, pushState) {
    fetch(href, { headers: { Accept: "text/html" }, credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        return res.text();
      })
      .then(function (html) {
        if (!swapInPage(html)) throw new Error("Unrecognized response");
        if (pushState) history.pushState({ __webhookNav: true }, "", href);
      })
      .catch(function () {
        // Fall back to a real navigation so the click still gets you
        // there even if the in-place swap couldn't be done.
        window.location.href = href;
      });
  }

  // Bound once, on window, so repeated script re-injection (every
  // swapInPage clones every <script> tag on the new page, including this
  // one) doesn't stack up duplicate listeners.
  if (!window.__webhookMenuPopstateBound) {
    window.__webhookMenuPopstateBound = true;
    window.addEventListener("popstate", function () {
      navigateTo(window.location.pathname + window.location.search + window.location.hash, false);
    });
  }
})();
`,
            },
        ],
    });

    if (links.length === 0) return null;

    return (
        <nav data-menu className={orientation === "vertical" ? "flex flex-col gap-3" : "flex flex-wrap gap-5"}>
            {links.map((link, i) => (
                <Link key={i} href={link.href} className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}
