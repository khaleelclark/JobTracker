import Box from "@mui/material/Box";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  markdown: string;
}

export function MarkdownContent({ markdown }: MarkdownContentProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: "0.55rem",
        "& p, & ul, & ol, & pre": { margin: 0 },
        "& ul, & ol": { paddingLeft: "1.25rem" },
        "& code": {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: "0.9em",
          background: "rgba(15, 74, 134, 0.08)",
          border: "1px solid rgba(15, 74, 134, 0.16)",
          borderRadius: "6px",
          padding: "0.06rem 0.3rem",
        },
        "& pre": {
          padding: "0.75rem",
          borderRadius: "10px",
          background: "rgba(15, 74, 134, 0.08)",
          border: "1px solid rgba(15, 74, 134, 0.16)",
          overflowX: "auto",
        },
        "& pre code": {
          background: "transparent",
          border: 0,
          borderRadius: 0,
          padding: 0,
        },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => {
            const safeHref = href ?? "";
            const isExternal = /^https?:\/\//i.test(safeHref);
            return (
              <a href={safeHref} {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {children}
              </a>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </Box>
  );
}
