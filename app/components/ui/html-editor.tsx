import * as React from "react";
import {
    Bold,
    Italic,
    Underline,
    Link2,
    Image,
    List,
    ListOrdered,
    Code,
    Quote,
    Heading1,
    Heading2,
    Heading3,
    Minus,
    Undo2,
    Redo2,
    Pencil,
    Code2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

export interface HtmlEditorProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
    className?: string;
}

// A lightweight, shadcn-styled HTML editor for HTML fields (e.g. the Page
// step's body). Two views, toggled top-right:
//   - "Edit" (default): a contentEditable WYSIWYG surface — the toolbar
//     buttons format the text in place via document.execCommand, the way a
//     real editor's buttons do, instead of typing tags by hand.
//   - "Code": the raw HTML source in a plain <textarea>, for when you want
//     to hand-edit markup directly. Toolbar buttons insert/wrap tags here
//     instead.
// Both views stay in sync with the same controlled `value`/`onChange`, so
// this remains a drop-in replacement for a plain textarea from the outside.

function setTextareaValue(el: HTMLTextAreaElement, next: string) {
    // Not a controlled-value update: dispatching a real "input" event is
    // what makes React's onChange (and the surrounding form's controlled
    // `value`) pick up the change, same as a real keystroke would.
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(el, next);
    el.dispatchEvent(new Event("input", { bubbles: true }));
}

function emitChange(onChange: HtmlEditorProps["onChange"], html: string) {
    if (!onChange) return;
    // Synthetic change event carrying the new HTML as `target.value`, so
    // callers can keep treating this exactly like a textarea's onChange.
    const fakeEvent = {
        target: { value: html },
        currentTarget: { value: html },
    } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
    onChange(fakeEvent);
}

type CodeAction =
    | { kind: "wrap"; before: string; after: string; placeholder: string }
    | { kind: "linePrefix"; prefix: string; placeholder: string }
    | { kind: "insert"; text: string; cursorOffset?: number };

type ToolbarItem = {
    icon: React.ElementType;
    label: string;
    edit: (el: HTMLDivElement) => void;
    code: CodeAction;
};

function promptUrl(message: string): string | null {
    const url = window.prompt(message, "https://");
    return url && url.trim() ? url.trim() : null;
}

const TOOLBAR: Array<ToolbarItem | { divider: true }> = [
    {
        icon: Bold,
        label: "Bold",
        edit: () => document.execCommand("bold"),
        code: { kind: "wrap", before: "<strong>", after: "</strong>", placeholder: "bold text" },
    },
    {
        icon: Italic,
        label: "Italic",
        edit: () => document.execCommand("italic"),
        code: { kind: "wrap", before: "<em>", after: "</em>", placeholder: "italic text" },
    },
    {
        icon: Underline,
        label: "Underline",
        edit: () => document.execCommand("underline"),
        code: { kind: "wrap", before: "<u>", after: "</u>", placeholder: "underlined text" },
    },
    { divider: true },
    {
        icon: Heading1,
        label: "Heading 1",
        edit: () => document.execCommand("formatBlock", false, "<h1>"),
        code: { kind: "linePrefix", prefix: "<h1>", placeholder: "Heading 1" },
    },
    {
        icon: Heading2,
        label: "Heading 2",
        edit: () => document.execCommand("formatBlock", false, "<h2>"),
        code: { kind: "linePrefix", prefix: "<h2>", placeholder: "Heading 2" },
    },
    {
        icon: Heading3,
        label: "Heading 3",
        edit: () => document.execCommand("formatBlock", false, "<h3>"),
        code: { kind: "linePrefix", prefix: "<h3>", placeholder: "Heading 3" },
    },
    { divider: true },
    {
        icon: Link2,
        label: "Link",
        edit: () => {
            const url = promptUrl("Link URL");
            if (url) document.execCommand("createLink", false, url);
        },
        code: { kind: "wrap", before: '<a href="https://">', after: "</a>", placeholder: "link text" },
    },
    {
        icon: Image,
        label: "Image",
        edit: () => {
            const url = promptUrl("Image URL");
            if (url) document.execCommand("insertImage", false, url);
        },
        code: { kind: "insert", text: '<img src="https://" alt="" />', cursorOffset: 10 },
    },
    { divider: true },
    {
        icon: List,
        label: "Bulleted list",
        edit: () => document.execCommand("insertUnorderedList"),
        code: { kind: "insert", text: "<ul>\n  <li>Item</li>\n</ul>", cursorOffset: 9 },
    },
    {
        icon: ListOrdered,
        label: "Numbered list",
        edit: () => document.execCommand("insertOrderedList"),
        code: { kind: "insert", text: "<ol>\n  <li>Item</li>\n</ol>", cursorOffset: 9 },
    },
    {
        icon: Quote,
        label: "Blockquote",
        edit: () => document.execCommand("formatBlock", false, "<blockquote>"),
        code: { kind: "wrap", before: "<blockquote>\n  ", after: "\n</blockquote>", placeholder: "Quote" },
    },
    {
        icon: Code,
        label: "Code",
        edit: () => {
            const text = window.getSelection()?.toString() || "code";
            document.execCommand("insertHTML", false, `<code>${text}</code>`);
        },
        code: { kind: "wrap", before: "<code>", after: "</code>", placeholder: "code" },
    },
    {
        icon: Minus,
        label: "Horizontal rule",
        edit: () => document.execCommand("insertHorizontalRule"),
        code: { kind: "insert", text: "<hr />\n" },
    },
];

function applyCodeAction(el: HTMLTextAreaElement, action: CodeAction) {
    const { selectionStart, selectionEnd, value } = el;
    const selected = value.slice(selectionStart, selectionEnd);

    if (action.kind === "wrap") {
        const inner = selected || action.placeholder;
        const next = value.slice(0, selectionStart) + action.before + inner + action.after + value.slice(selectionEnd);
        setTextareaValue(el, next);
        const selStart = selectionStart + action.before.length;
        requestAnimationFrame(() => {
            el.focus();
            el.selectionStart = selStart;
            el.selectionEnd = selStart + inner.length;
        });
        return;
    }

    if (action.kind === "linePrefix") {
        const closeTag = `</${action.prefix.slice(1, -1)}>`;
        const inner = selected || action.placeholder;
        const next = value.slice(0, selectionStart) + action.prefix + inner + closeTag + value.slice(selectionEnd);
        setTextareaValue(el, next);
        const selStart = selectionStart + action.prefix.length;
        requestAnimationFrame(() => {
            el.focus();
            el.selectionStart = selStart;
            el.selectionEnd = selStart + inner.length;
        });
        return;
    }

    const next = value.slice(0, selectionStart) + action.text + value.slice(selectionEnd);
    setTextareaValue(el, next);
    const cursor = selectionStart + (action.cursorOffset ?? action.text.length);
    requestAnimationFrame(() => {
        el.focus();
        el.selectionStart = el.selectionEnd = cursor;
    });
}

type HistoryEntry = { value: string; selectionStart: number; selectionEnd: number };

const HtmlEditor = React.forwardRef<HTMLTextAreaElement, HtmlEditorProps>(
    ({ className, onKeyDown, onChange, value, placeholder, rows = 10, ...props }, ref) => {
        const [mode, setMode] = React.useState<"edit" | "code">("edit");
        const editableRef = React.useRef<HTMLDivElement | null>(null);
        const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
        const lastEmitted = React.useRef<string | null>(null);

        const codeHistoryRef = React.useRef<HistoryEntry[]>([]);
        const codeHistoryIndexRef = React.useRef(-1);
        const skipCodeHistoryRef = React.useRef(false);

        React.useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

        const stringValue = typeof value === "string" ? value : "";

        // Keep the contentEditable's DOM in sync with the controlled value,
        // but only when the change came from outside (e.g. switching to a
        // different node/field) — not from our own onInput, or every
        // keystroke would reset the caret to the start.
        React.useEffect(() => {
            const el = editableRef.current;
            if (!el || mode !== "edit") return;
            if (stringValue === lastEmitted.current) return;
            el.innerHTML = stringValue;
            lastEmitted.current = stringValue;
        }, [stringValue, mode]);

        function handleEditInput(e: React.FormEvent<HTMLDivElement>) {
            const html = e.currentTarget.innerHTML;
            lastEmitted.current = html;
            emitChange(onChange, html);
        }

        function handleEditKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
            onKeyDown?.(e as unknown as React.KeyboardEvent<HTMLTextAreaElement>);
            if (e.defaultPrevented) return;
            if (e.key === "Tab") {
                e.preventDefault();
                document.execCommand("insertText", false, "  ");
            }
        }

        function runEditAction(item: ToolbarItem) {
            const el = editableRef.current;
            if (!el) return;
            el.focus();
            item.edit(el);
            const html = el.innerHTML;
            lastEmitted.current = html;
            emitChange(onChange, html);
        }

        function pushCodeHistory(entry: HistoryEntry) {
            const history = codeHistoryRef.current;
            history.splice(codeHistoryIndexRef.current + 1);
            history.push(entry);
            if (history.length > 100) history.shift();
            codeHistoryIndexRef.current = history.length - 1;
        }

        function handleCodeChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
            onChange?.(e);
            if (skipCodeHistoryRef.current) {
                skipCodeHistoryRef.current = false;
                return;
            }
            pushCodeHistory({ value: e.target.value, selectionStart: e.target.selectionStart, selectionEnd: e.target.selectionEnd });
        }

        function restoreCodeHistory(entry: HistoryEntry) {
            const el = textareaRef.current;
            if (!el) return;
            skipCodeHistoryRef.current = true;
            setTextareaValue(el, entry.value);
            requestAnimationFrame(() => {
                el.focus();
                el.selectionStart = entry.selectionStart;
                el.selectionEnd = entry.selectionEnd;
            });
        }

        function handleCodeUndo() {
            if (codeHistoryIndexRef.current <= 0) return;
            codeHistoryIndexRef.current -= 1;
            restoreCodeHistory(codeHistoryRef.current[codeHistoryIndexRef.current]);
        }

        function handleCodeRedo() {
            if (codeHistoryIndexRef.current >= codeHistoryRef.current.length - 1) return;
            codeHistoryIndexRef.current += 1;
            restoreCodeHistory(codeHistoryRef.current[codeHistoryIndexRef.current]);
        }

        function handleCodeKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
            onKeyDown?.(e);
            if (e.defaultPrevented) return;

            if (e.key === "Tab") {
                e.preventDefault();
                const el = e.currentTarget;
                const { selectionStart, selectionEnd, value: v } = el;
                const next = `${v.slice(0, selectionStart)}  ${v.slice(selectionEnd)}`;
                setTextareaValue(el, next);
                requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = selectionStart + 2;
                });
                return;
            }

            const isMod = e.metaKey || e.ctrlKey;
            if (isMod && e.key.toLowerCase() === "z") {
                e.preventDefault();
                if (e.shiftKey) handleCodeRedo();
                else handleCodeUndo();
            } else if (isMod && e.key.toLowerCase() === "y") {
                e.preventDefault();
                handleCodeRedo();
            }
        }

        function handleUndo() {
            if (mode === "edit") {
                editableRef.current?.focus();
                document.execCommand("undo");
                const html = editableRef.current?.innerHTML ?? "";
                lastEmitted.current = html;
                emitChange(onChange, html);
            } else {
                handleCodeUndo();
            }
        }

        function handleRedo() {
            if (mode === "edit") {
                editableRef.current?.focus();
                document.execCommand("redo");
                const html = editableRef.current?.innerHTML ?? "";
                lastEmitted.current = html;
                emitChange(onChange, html);
            } else {
                handleCodeRedo();
            }
        }

        return (
            <div className={cn("overflow-hidden rounded-md border border-input bg-transparent shadow-sm", className)}>
                <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted px-1.5 py-1.5">
                    {TOOLBAR.map((item, i) =>
                        "divider" in item ? (
                            <span key={`div-${i}`} className="mx-1 h-4 w-px bg-border" />
                        ) : (
                            <button
                                key={item.label}
                                type="button"
                                title={item.label}
                                aria-label={item.label}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => (mode === "edit" ? runEditAction(item) : textareaRef.current && applyCodeAction(textareaRef.current, item.code))}
                                className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                            >
                                <item.icon className="h-3.5 w-3.5" />
                            </button>
                        ),
                    )}

                    <span className="mx-1 h-4 w-px bg-border" />

                    <button
                        type="button"
                        title="Undo"
                        aria-label="Undo"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleUndo}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    >
                        <Undo2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        title="Redo"
                        aria-label="Redo"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleRedo}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    >
                        <Redo2 className="h-3.5 w-3.5" />
                    </button>

                    <div className="ml-auto flex items-center gap-0.5">
                        <button
                            type="button"
                            title="Edit"
                            aria-label="Edit view"
                            onClick={() => setMode("edit")}
                            className={cn(
                                "inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium transition-colors",
                                mode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                        </button>
                        <button
                            type="button"
                            title="Code"
                            aria-label="Code view"
                            onClick={() => setMode("code")}
                            className={cn(
                                "inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium transition-colors",
                                mode === "code" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <Code2 className="h-3.5 w-3.5" />
                            Code
                        </button>
                    </div>
                </div>

                <div className={cn(mode === "edit" ? "block" : "hidden")}>
                    <div
                        ref={editableRef}
                        contentEditable
                        suppressContentEditableWarning
                        data-placeholder={placeholder ?? ""}
                        onInput={handleEditInput}
                        onKeyDown={handleEditKeyDown}
                        style={{ minHeight: `${Math.max(200, (typeof rows === "number" ? rows : 10) * 20)}px` }}
                        className={cn(
                            "w-full overflow-auto bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground outline-none",
                            "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground",
                            "[&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:first:mt-0",
                            "[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:first:mt-0",
                            "[&_h3]:mb-1.5 [&_h3]:mt-2.5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:first:mt-0",
                            "[&_p]:mb-2",
                            "[&_a]:text-primary [&_a]:underline",
                            "[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5",
                            "[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5",
                            "[&_blockquote]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
                            "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
                            "[&_hr]:my-3 [&_hr]:border-border",
                            "[&_img]:my-2 [&_img]:max-w-full",
                        )}
                    />
                </div>

                <textarea
                    ref={textareaRef}
                    rows={rows}
                    spellCheck={false}
                    value={value}
                    placeholder={placeholder}
                    onChange={handleCodeChange}
                    onKeyDown={handleCodeKeyDown}
                    className={cn(
                        "block w-full resize-y bg-transparent px-3 py-2 font-mono text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
                        mode === "code" ? "block" : "hidden",
                    )}
                    style={{ minHeight: "200px" }}
                    {...props}
                />
            </div>
        );
    },
);
HtmlEditor.displayName = "HtmlEditor";

export { HtmlEditor };