"use client";

import { useMemo, useRef, useState } from "react";

import { BlogRichText, blogTextColors, type BlogTextColor } from "@/lib/content/blog-rich-text";

type BlogRichTextEditorProps = {
  name: string;
  defaultValue?: string;
  required?: boolean;
  rows?: number;
  className?: string;
  helperClassName?: string;
};

function insertAround(value: string, start: number, end: number, before: string, after = before) {
  const selection = value.slice(start, end);
  const fallback = "текст";
  const inner = selection || fallback;
  return {
    value: `${value.slice(0, start)}${before}${inner}${after}${value.slice(end)}`,
    start: start + before.length,
    end: start + before.length + inner.length,
  };
}

function insertLinePrefix(value: string, start: number, end: number, prefix: string) {
  const selection = value.slice(start, end) || "Заглавие";
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const needsPrefix = !value.slice(lineStart, lineStart + prefix.length).startsWith(prefix);
  const inserted = needsPrefix ? `${prefix}${selection}` : selection;
  return {
    value: `${value.slice(0, start)}${inserted}${value.slice(end)}`,
    start: start + (needsPrefix ? prefix.length : 0),
    end: start + inserted.length,
  };
}

function insertList(value: string, start: number, end: number) {
  const selection = value.slice(start, end) || "Първа точка\nВтора точка";
  const inserted = selection
    .split("\n")
    .map((line) => (line.trim().startsWith("- ") ? line : `- ${line}`))
    .join("\n");

  return {
    value: `${value.slice(0, start)}${inserted}${value.slice(end)}`,
    start,
    end: start + inserted.length,
  };
}

export function BlogRichTextEditor({
  name,
  defaultValue = "",
  required,
  rows = 9,
  className,
  helperClassName,
}: BlogRichTextEditorProps) {
  const [value, setValue] = useState(defaultValue);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasPreview = value.trim().length > 0;
  const toolbarButtonClass =
    "rounded-md border border-boutique-line bg-white px-2.5 py-1.5 text-xs font-semibold text-boutique-ink transition hover:border-boutique-accent/50 hover:bg-boutique-bg";

  const preview = useMemo(() => <BlogRichText content={value} />, [value]);

  function applyChange(next: { value: string; start: number; end: number }) {
    setValue(next.value);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(next.start, next.end);
    });
  }

  function withSelection(callback: (value: string, start: number, end: number) => ReturnType<typeof insertAround>) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    applyChange(callback(value, start, end));
  }

  function applyColor(color: BlogTextColor) {
    withSelection((currentValue, start, end) =>
      insertAround(currentValue, start, end, `{color:${color}}`, "{/color}"),
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-boutique-line bg-boutique-paper">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-boutique-line px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={toolbarButtonClass} onClick={() => withSelection((text, start, end) => insertAround(text, start, end, "**"))}>
            B
          </button>
          <button type="button" className={toolbarButtonClass} onClick={() => withSelection((text, start, end) => insertAround(text, start, end, "*"))}>
            I
          </button>
          <button type="button" className={toolbarButtonClass} onClick={() => withSelection((text, start, end) => insertLinePrefix(text, start, end, "## "))}>
            H2
          </button>
          <button type="button" className={toolbarButtonClass} onClick={() => withSelection((text, start, end) => insertLinePrefix(text, start, end, "### "))}>
            H3
          </button>
          <button type="button" className={toolbarButtonClass} onClick={() => withSelection(insertList)}>
            Списък
          </button>
          <button type="button" className={toolbarButtonClass} onClick={() => withSelection((text, start, end) => insertAround(text, start, end, "[", "](/produkti)"))}>
            Линк
          </button>
          <div className="flex flex-wrap items-center gap-1 pl-1">
            {blogTextColors.map((color) => (
              <button
                key={color.key}
                type="button"
                title={color.label}
                aria-label={color.label}
                className="grid h-8 w-8 place-items-center rounded-md border border-boutique-line bg-white transition hover:border-boutique-accent/50"
                onClick={() => applyColor(color.key)}
              >
                <span className={`h-3.5 w-3.5 rounded-full ${color.swatchClassName}`} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex rounded-md border border-boutique-line bg-white p-0.5 text-xs font-semibold">
          <button
            type="button"
            className={`rounded px-2.5 py-1 ${mode === "edit" ? "bg-boutique-ink text-white" : "text-boutique-muted"}`}
            onClick={() => setMode("edit")}
          >
            Редакция
          </button>
          <button
            type="button"
            className={`rounded px-2.5 py-1 ${mode === "preview" ? "bg-boutique-ink text-white" : "text-boutique-muted"}`}
            onClick={() => setMode("preview")}
          >
            Преглед
          </button>
        </div>
      </div>
      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
          name={name}
          required={required}
          rows={rows}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={`${className ?? ""} mt-0 rounded-none border-0 bg-white focus:ring-0`}
        />
      ) : (
        <div className="min-h-56 bg-white px-4 py-4">
          {hasPreview ? preview : <p className="text-sm text-boutique-muted">Няма текст за преглед.</p>}
        </div>
      )}
      <p className={`${helperClassName ?? ""} px-3 pb-3 pt-2`}>
        Може да използвате bold, italic, H2/H3, списък, линк и ограничени цветове от бранд палитрата.
      </p>
    </div>
  );
}
