import { useHtml } from "nukejs";
import type { InputFormField } from "../../../lib/steps/inputForm";

interface WebhookInputFormProps {
    fields: InputFormField[];
    submitLabel: string;
}

// NOTE on why this isn't a `"use client"` component:
//
// `"use client"` hydration is wired up by NukeJS's *page* pipeline — it
// reads source files off disk at build time to find the boundary. Webhook
// pages are rendered via `renderComponent()` outside the page router, and
// per NukeJS's docs that pipeline intentionally produces plain
// server-rendered markup with no hydration wiring (it has to work
// identically on Cloudflare Workers, pre-bundled Vercel functions, etc.,
// where reading source files isn't an option). The docs' own guidance for
// this case is to mount interactive islands "as normal client-side
// widgets" instead of relying on SSR hydration markers — which for a
// dependency-free form like this means real, but framework-agnostic,
// reactivity: a small script injected via `useHtml({ script: [...] })`
// (see the "Script injection & position" section of the NukeJS README).
//
// The form still works with JavaScript disabled (it's a real
// `<form method="POST">`) — the script only adds live validation and a
// disabled/loading submit state on top.
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

    if (summary) summary.textContent = "";
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.textContent;
    submitBtn.textContent = "Submitting…";
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