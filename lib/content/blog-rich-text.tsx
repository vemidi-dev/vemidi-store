import Link from "next/link";
import type { ReactNode } from "react";

export type BlogTextColor = "accent" | "sage" | "ochre" | "muted";

export const blogTextColors: {
  key: BlogTextColor;
  label: string;
  className: string;
  swatchClassName: string;
}[] = [
  {
    key: "accent",
    label: "Топъл акцент",
    className: "text-boutique-accent",
    swatchClassName: "bg-boutique-accent",
  },
  {
    key: "sage",
    label: "Зелен акцент",
    className: "text-boutique-sage-deep",
    swatchClassName: "bg-boutique-sage-deep",
  },
  {
    key: "ochre",
    label: "Златист акцент",
    className: "text-boutique-ochre",
    swatchClassName: "bg-boutique-ochre",
  },
  {
    key: "muted",
    label: "Приглушен текст",
    className: "text-boutique-muted",
    swatchClassName: "bg-boutique-muted",
  },
];

const colorClassByKey = new Map(
  blogTextColors.map((color) => [color.key, color.className]),
);

type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; children: InlineToken[] }
  | { type: "italic"; children: InlineToken[] }
  | { type: "link"; href: string; children: InlineToken[] }
  | { type: "color"; color: BlogTextColor; children: InlineToken[] };

type BlockToken =
  | { type: "paragraph"; children: InlineToken[] }
  | { type: "heading"; level: 2 | 3; children: InlineToken[] }
  | { type: "list"; items: InlineToken[][] };

function isAllowedUrl(href: string) {
  return (
    href.startsWith("/") ||
    href.startsWith("https://") ||
    href.startsWith("http://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let index = 0;

  function pushText(value: string) {
    if (!value) return;
    const previous = tokens[tokens.length - 1];
    if (previous?.type === "text") {
      previous.value += value;
      return;
    }
    tokens.push({ type: "text", value });
  }

  while (index < text.length) {
    const rest = text.slice(index);
    const colorMatch = rest.match(/^\{color:(accent|sage|ochre|muted)\}([\s\S]+?)\{\/color\}/);
    if (colorMatch) {
      tokens.push({
        type: "color",
        color: colorMatch[1] as BlogTextColor,
        children: parseInline(colorMatch[2] ?? ""),
      });
      index += colorMatch[0].length;
      continue;
    }

    const boldMatch = rest.match(/^\*\*([\s\S]+?)\*\*/);
    if (boldMatch) {
      tokens.push({ type: "bold", children: parseInline(boldMatch[1] ?? "") });
      index += boldMatch[0].length;
      continue;
    }

    const italicMatch = rest.match(/^\*([^*\n]+?)\*/);
    if (italicMatch) {
      tokens.push({ type: "italic", children: parseInline(italicMatch[1] ?? "") });
      index += italicMatch[0].length;
      continue;
    }

    const linkMatch = rest.match(/^\[([^\]\n]+?)\]\(([^)\s]+?)\)/);
    if (linkMatch) {
      const href = linkMatch[2] ?? "";
      if (isAllowedUrl(href)) {
        tokens.push({
          type: "link",
          href,
          children: parseInline(linkMatch[1] ?? ""),
        });
        index += linkMatch[0].length;
        continue;
      }
    }

    const nextSpecial = rest.search(/(\{color:(?:accent|sage|ochre|muted)\}|\*\*|\*|\[[^\]\n]+?\]\([^)\s]+?\))/);
    const length = nextSpecial > 0 ? nextSpecial : 1;
    pushText(rest.slice(0, length));
    index += length;
  }

  return tokens;
}

export function parseBlogRichText(text: string): BlockToken[] {
  const blocks: BlockToken[] = [];
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    if (paragraph.startsWith("### ")) {
      blocks.push({ type: "heading", level: 3, children: parseInline(paragraph.slice(4).trim()) });
      continue;
    }

    if (paragraph.startsWith("## ")) {
      blocks.push({ type: "heading", level: 2, children: parseInline(paragraph.slice(3).trim()) });
      continue;
    }

    const lines = paragraph.split("\n").map((line) => line.trim());
    if (lines.every((line) => line.startsWith("- ") && line.length > 2)) {
      blocks.push({
        type: "list",
        items: lines.map((line) => parseInline(line.slice(2).trim())),
      });
      continue;
    }

    blocks.push({ type: "paragraph", children: parseInline(paragraph) });
  }

  return blocks;
}

function renderInline(tokens: InlineToken[], keyPrefix: string): ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.type === "text") return token.value;
    if (token.type === "bold") {
      return (
        <strong key={key} className="font-semibold text-boutique-ink">
          {renderInline(token.children, key)}
        </strong>
      );
    }
    if (token.type === "italic") {
      return (
        <em key={key} className="italic">
          {renderInline(token.children, key)}
        </em>
      );
    }
    if (token.type === "link") {
      const isExternal = token.href.startsWith("http://") || token.href.startsWith("https://");
      if (token.href.startsWith("/")) {
        return (
          <Link key={key} href={token.href} className="font-semibold text-boutique-sage-deep underline underline-offset-4">
            {renderInline(token.children, key)}
          </Link>
        );
      }
      return (
        <a
          key={key}
          href={token.href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noreferrer" : undefined}
          className="font-semibold text-boutique-sage-deep underline underline-offset-4"
        >
          {renderInline(token.children, key)}
        </a>
      );
    }
    return (
      <span key={key} className={colorClassByKey.get(token.color)}>
        {renderInline(token.children, key)}
      </span>
    );
  });
}

export function BlogRichText({ content }: { content: string }) {
  const blocks = parseBlogRichText(content);

  if (!blocks.length) return null;

  return (
    <div className="space-y-6 break-words text-base leading-8 text-boutique-muted">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Tag = block.level === 2 ? "h2" : "h3";
          return (
            <Tag
              key={index}
              className={
                block.level === 2
                  ? "pt-3 font-heading text-3xl leading-tight text-boutique-ink"
                  : "pt-2 font-heading text-2xl leading-tight text-boutique-ink"
              }
            >
              {renderInline(block.children, `h-${index}`)}
            </Tag>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="space-y-2 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="list-disc pl-1">
                  {renderInline(item, `li-${index}-${itemIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        return <p key={index}>{renderInline(block.children, `p-${index}`)}</p>;
      })}
    </div>
  );
}
