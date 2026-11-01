import React, { useMemo } from "react";
import { marked } from "marked";

// Configure marked with GitHub Flavored Markdown and line breaks
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Clean, safe Markdown viewer styled for FlowForge dark theme.
 * @param {{ content: string, style?: React.CSSProperties, className?: string }} props
 */
export default function MarkdownView({ content, style = {}, className = "" }) {
  const html = useMemo(() => {
    if (!content) return "";
    try {
      return marked.parse(content);
    } catch (e) {
      console.warn("Markdown parsing error:", e);
      return content;
    }
  }, [content]);

  return (
    <div
      className={`markdown-body ${className}`}
      style={{
        fontSize: "12px",
        color: "#d4d4d8",
        lineHeight: 1.6,
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
