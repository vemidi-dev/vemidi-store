"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import { uploadBlogInlineImage } from "@/app/admin/blog-inline-image-actions";
import {
  BlogRichText,
  blogTextColors,
  formatBlogInlineImageMarkdown,
  type BlogTextColor,
} from "@/lib/content/blog-rich-text";

type BlogRichTextEditorProps = {
  name: string;
  defaultValue?: string;
  required?: boolean;
  rows?: number;
  className?: string;
  helperClassName?: string;
  postId?: string | null;
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

function insertImageBlock(value: string, start: number, end: number, markdown: string) {
  const beforeNeedsBreak = start > 0 && value[start - 1] !== "\n";
  const afterNeedsBreak = end < value.length && value[end] !== "\n";
  const prefix = beforeNeedsBreak ? "\n\n" : start > 0 ? "\n" : "";
  const suffix = afterNeedsBreak ? "\n\n" : "\n";
  const inserted = `${prefix}${markdown}${suffix}`;

  return {
    value: `${value.slice(0, start)}${inserted}${value.slice(end)}`,
    start: start + inserted.length,
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
  postId = null,
}: BlogRichTextEditorProps) {
  const [value, setValue] = useState(defaultValue);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUploadTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const selectionRef = useRef<{ start: number; end: number }>({
    start: defaultValue.length,
    end: defaultValue.length,
  });
  valueRef.current = value;
  const hasPreview = value.trim().length > 0;
  const toolbarButtonClass =
    "rounded-md border border-boutique-line bg-white px-2.5 py-1.5 text-xs font-semibold text-boutique-ink transition hover:border-boutique-accent/50 hover:bg-boutique-bg disabled:cursor-not-allowed disabled:opacity-50";

  const preview = useMemo(() => <BlogRichText content={value} />, [value]);

  function rememberSelection() {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    selectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }

  function applyChange(next: { value: string; start: number; end: number }) {
    setValue(next.value);
    selectionRef.current = { start: next.start, end: next.end };
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(next.start, next.end);
    });
  }

  function withSelection(callback: (value: string, start: number, end: number) => ReturnType<typeof insertAround>) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? selectionRef.current.start ?? value.length;
    const end = textarea?.selectionEnd ?? selectionRef.current.end ?? value.length;
    applyChange(callback(value, start, end));
  }

  function applyColor(color: BlogTextColor) {
    withSelection((currentValue, start, end) =>
      insertAround(currentValue, start, end, `{color:${color}}`, "{/color}"),
    );
  }

  function handleAddImageClick() {
    rememberSelection();
    setUploadError(null);
    fileInputRef.current?.click();
  }

  function handleImageFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    const altInput = window.prompt(
      "Alt текст за снимката (препоръчително, може да остане празно):",
      "",
    );
    if (altInput === null) {
      return;
    }

    const formData = new FormData();
    formData.set("image", file);
    formData.set("alt", altInput);
    if (postId) {
      formData.set("postId", postId);
    }

    startUploadTransition(async () => {
      setUploadError(null);
      const result = await uploadBlogInlineImage(formData);
      if (!result.ok) {
        setUploadError(result.message);
        return;
      }

      const markdown = formatBlogInlineImageMarkdown(result.alt, result.url);
      const { start, end } = selectionRef.current;
      applyChange(insertImageBlock(valueRef.current, start, end, markdown));
      setMode("edit");
    });
  }

  return (
    <div className="mt-2 max-h-[72vh] overflow-hidden rounded-xl border border-boutique-line bg-boutique-paper">
      <input type="hidden" name={name} value={value} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleImageFileChange}
      />
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-boutique-line bg-boutique-paper px-3 py-2">
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
          <button
            type="button"
            className={toolbarButtonClass}
            disabled={isUploading}
            onClick={handleAddImageClick}
          >
            {isUploading ? "Качване…" : "Добави снимка"}
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
      {uploadError ? (
        <p className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {uploadError}
        </p>
      ) : null}
      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
          required={required}
          rows={rows}
          value={value}
          onSelect={rememberSelection}
          onClick={rememberSelection}
          onKeyUp={rememberSelection}
          onChange={(event) => setValue(event.target.value)}
          className={`${className ?? ""} mt-0 max-h-[52vh] min-h-72 overflow-y-auto rounded-none border-0 bg-white focus:ring-0`}
        />
      ) : (
        <div className="max-h-[52vh] min-h-72 overflow-y-auto bg-white px-4 py-4">
          {hasPreview ? preview : <p className="text-sm text-boutique-muted">Няма текст за преглед.</p>}
        </div>
      )}
      <p className={`${helperClassName ?? ""} px-3 pb-3 pt-2`}>
        Може да използвате bold, italic, H2/H3, списък, линк, inline снимки и ограничени цветове от бранд палитрата.
        Снимките се вмъкват на текущата позиция като отделен блок; alt текстът е по избор, но е препоръчителен.
      </p>
    </div>
  );
}
