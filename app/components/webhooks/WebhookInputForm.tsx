import { useHtml } from "nukejs";
import type { InputFormField } from "../../../lib/steps/inputForm";

interface WebhookInputFormProps {
    fields: InputFormField[];
    submitLabel: string;
}

// NOTE on why this isn't a `"use client"` component, and how the
// no-full-reload transition to the next step's page works:
//
// `"use client"` hydration — and with it, `useRouter()`'s SPA navigation —
// is wired up by NukeJS's *page* pipeline: it reads source files off disk
// at build time to find the boundary and mounts a client bundle at a
// `data-hydrate-id` placeholder. Webhook pages are rendered via
// `renderComponent()` outside the page router, and per NukeJS's docs that
// pipeline intentionally produces plain server-rendered markup with none of
// that wiring (it has to work identically on Cloudflare Workers,
// pre-bundled Vercel functions, etc., where reading source files off disk
// isn't an option). `useRouter()` can only be called inside a "use client"
// component, so it isn't reachable here either.
//
// The docs' own guidance for this case is to mount interactive islands "as
// normal client-side widgets" instead of relying on SSR hydration markers.
// So the form → next-step transition is done the same way NukeJS's own SPA
// navigation is: intercept the browser's default (full-reload) navigation,
// fetch the new page, and swap the relevant DOM in place. Concretely: the
// submit is intercepted, the workflow's next step is fetched over the wire
// instead of letting the browser navigate, and the response — itself a
// full `renderComponent()`-rendered page, e.g. a Static Page step's
// StaticPage.tsx — has its `[data-webhook-page]` content swapped into the
// current document (see `swapInPage` below). If JS is
// unavailable, or the fetch fails, the form still works: it's a real
// `<form method="POST">` and falls back to a normal (full-reload)
// submission.
export default function WebhookInputForm({ fields, submitLabel }: WebhookInputFormProps) {
    useHtml({
        script: [
            {
                position: "body",
                content: `
(function () {
  // The script is injected at the end of <body> (position: "body"), not
  // necessarily right next to the form, so it's found by a data attribute
  // rather than DOM adjacency.
  var form = document.querySelector("[data-webhook-form]");
  if (!form) return;

  var submitBtn = form.querySelector("[data-submit]");
  var summary = form.querySelector("[data-form-error]");

  function fieldError(input) {
    if (input.required && !input.value.trim()) return "Required.";
    if (input.type === "email" && input.value && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(input.value)) {
      return "Enter a valid email address.";
    }
    return "";
  }

  function validateField(input) {
    var msg = fieldError(input);
    var errorEl = form.querySelector('[data-error-for="' + input.name + '"]');
    if (errorEl) errorEl.textContent = msg;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }

  // Live reactivity: validate as the person types/changes a field, not
  // just on submit — errors appear and clear in real time.
  form.querySelectorAll("input").forEach(function (input) {
    input.addEventListener("input", function () { validateField(input); });
    input.addEventListener("blur", function () { validateField(input); });
  });

  // Swaps in the next step's page — parsed from a full renderComponent()
  // HTML response — without a full browser navigation. Mirrors what
  // NukeJS's own client-side router does for <Link>/useRouter navigations
  // (title + content swap, no reload), just done by hand since that
  // machinery isn't wired up outside the page router.
  function swapInPage(html) {
    var nextDoc = new DOMParser().parseFromString(html, "text/html");
    var nextRoot = nextDoc.querySelector("[data-webhook-page]");
    var currentRoot = document.querySelector("[data-webhook-page]");
    if (!nextRoot || !currentRoot) return false;

    document.title = nextDoc.title;
    currentRoot.replaceWith(nextRoot);

    // If the next step is itself reactive (e.g. another Input Form step),
    // its <script> — injected via that page's own useHtml({ script }) call
    // — needs to be re-executed: scripts inserted via replaceWith()/
    // innerHTML never auto-run, so each is cloned into a fresh <script>
    // element, which does.
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

  form.addEventListener("submit", function (e) {
    var valid = true;
    form.querySelectorAll("input").forEach(function (input) {
      if (!validateField(input)) valid = false;
    });

    if (!valid) {
      e.preventDefault();
      if (summary) summary.textContent = "Fix the highlighted fields before submitting.";
      var firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Always prevent the browser's own (full-reload) submission — the
    // fetch below replays it. If anything goes wrong, the catch/else
    // branches fall back to a real, unintercepted form.submit().
    e.preventDefault();

    if (summary) summary.textContent = "";
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.textContent;
    submitBtn.textContent = "Submitting…";

    var body = new URLSearchParams(new FormData(form));

    fetch(form.action || window.location.href, {
      method: "POST",
      body: body,
      headers: { Accept: "text/html" },
      credentials: "same-origin",
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        return res.text();
      })
      .then(function (html) {
        if (!swapInPage(html)) throw new Error("Unrecognized response");
      })
      .catch(function () {
        // Fall back to a real navigation so the workflow still completes
        // even if the in-place swap couldn't be done (e.g. very old
        // browser, or the response wasn't a page NukeJS rendered).
        HTMLFormElement.prototype.submit.call(form);
      });
  });
})();
`,
            },
        ],
    });

    return (
        <form method="POST" data-webhook-form className="flex flex-col gap-4" noValidate>
            <div data-form-error className="text-sm text-red-600" role="alert" />
            {fields.map((field) => (
                <div key={field.name} className="flex flex-col gap-1.5">
                    <label htmlFor={`field-${field.name}`} className="text-sm font-medium">
                        {field.label ?? field.name}
                        {field.required && <span className="text-red-600"> *</span>}
                    </label>
                    <input
                        id={`field-${field.name}`}
                        name={field.name}
                        type={field.type ?? "text"}
                        required={field.required}
                        className="h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                    />
                    <p data-error-for={field.name} className="text-xs text-red-600" />
                </div>
            ))}
            <button
                type="submit"
                data-submit
                className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:pointer-events-none disabled:opacity-50"
            >
                {submitLabel}
            </button>
        </form>
    );
}