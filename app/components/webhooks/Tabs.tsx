import { useHtml } from "nukejs";

interface TabsProps {
    tabs: { label: string; html: string }[];
}

const ACTIVE_CLASSES = ["border-neutral-900", "text-neutral-900"];
const INACTIVE_CLASSES = ["border-transparent", "text-neutral-500"];

// Plain click-to-switch tabs, done the same way WebhookInputForm.tsx does
// its interactivity — a hand-written script rather than React state, since
// webhook-rendered pages aren't hydrated (see that file's long comment for
// why). Delegated to `[data-tabs]` groups rather than an id, so it works
// no matter how many Tabs blocks end up on one page.
export default function Tabs({ tabs }: TabsProps) {
    useHtml({
        script: [
            {
                position: "body",
                content: `
(function () {
  document.querySelectorAll("[data-tabs]").forEach(function (group) {
    if (group.dataset.tabsBound) return;
    group.dataset.tabsBound = "1";
    var buttons = group.querySelectorAll("[data-tab-button]");
    var panels = group.querySelectorAll("[data-tab-panel]");
    buttons.forEach(function (button, i) {
      button.addEventListener("click", function () {
        buttons.forEach(function (b) { b.classList.remove(${ACTIVE_CLASSES.map((c) => `"${c}"`).join(", ")}); b.classList.add(${INACTIVE_CLASSES.map((c) => `"${c}"`).join(", ")}); });
        panels.forEach(function (p) { p.hidden = true; });
        button.classList.add(${ACTIVE_CLASSES.map((c) => `"${c}"`).join(", ")});
        button.classList.remove(${INACTIVE_CLASSES.map((c) => `"${c}"`).join(", ")});
        if (panels[i]) panels[i].hidden = false;
      });
    });
  });
})();
`,
            },
        ],
    });

    if (tabs.length === 0) return null;

    return (
        <div data-tabs role="tablist">
            <div className="flex gap-2 border-b border-neutral-200">
                {tabs.map((tab, i) => (
                    <button
                        key={i}
                        type="button"
                        data-tab-button
                        className={`border-b-2 px-3 py-2 text-sm font-medium ${i === 0 ? ACTIVE_CLASSES.join(" ") : INACTIVE_CLASSES.join(" ")}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {tabs.map((tab, i) => (
                <div key={i} data-tab-panel hidden={i !== 0} className="py-4" dangerouslySetInnerHTML={{ __html: tab.html }} />
            ))}
        </div>
    );
}
