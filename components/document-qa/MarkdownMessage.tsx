"use client";

import {
  isValidElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315bdc]";


/** Plain text of a React node (used to copy code blocks). */
function nodeToText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(nodeToText).join("");
  }

  if (isValidElement(node)) {
    return nodeToText((node.props as { children?: ReactNode }).children);
  }

  return "";
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const codeElement = Array.isArray(children) ? children[0] : children;

  const codeProps = isValidElement(codeElement)
    ? (codeElement.props as { className?: string; children?: ReactNode })
    : {};

  const language = /language-([\w-]+)/.exec(codeProps.className ?? "")?.[1];
  const text = nodeToText(codeProps.children).replace(/\n$/, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard not available, nothing to do */
    }
  };

  return (
    <div className="mb-3 overflow-hidden rounded-md border border-slate-800 bg-slate-900 last:mb-0">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-1.5">
        <span className="font-mono text-xs font-medium text-slate-400">
          {language ?? "text"}
        </span>

        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Code copied" : "Copy code"}
          className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-slate-400 transition hover:bg-white/10 hover:text-white ${focusRing}`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3.5 w-3.5 ${copied ? "text-emerald-400" : ""}`}
          >
            {copied ? (
              <path d="M20 6 9 17l-5-5" />
            ) : (
              <>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </>
            )}
          </svg>

          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre className="overflow-x-auto p-3.5 text-xs leading-5 text-slate-100">
        <code className="font-mono">{text}</code>
      </pre>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Element styles                                                             */
/* -------------------------------------------------------------------------- */

const smallHeading = ({ children }: { children?: ReactNode }) => (
  <h4 className="mb-1.5 mt-4 text-[13px] font-semibold text-slate-600 first:mt-0">
    {children}
  </h4>
);

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-6 border-b border-slate-200 pb-2 text-base font-semibold tracking-tight text-slate-900 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-5 text-[15px] font-semibold tracking-tight text-slate-900 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-4 text-sm font-semibold text-slate-900 first:mt-0">
      {children}
    </h3>
  ),
  h4: smallHeading,
  h5: smallHeading,
  h6: smallHeading,

  p: ({ children }) => (
    <p className="mb-3 max-w-prose leading-relaxed last:mb-0">{children}</p>
  ),

  // Lists (GitHub-style task lists lose their bullets)
  ul: ({ className, children }) => (
    <ul
      className={`mb-3 space-y-1.5 last:mb-0 [&_ol]:mt-1.5 [&_ul]:mt-1.5 ${
        className?.includes("contains-task-list")
          ? "list-none pl-0"
          : "list-disc pl-5 marker:text-slate-400"
      }`}
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-slate-500 last:mb-0 [&_ol]:mt-1.5 [&_ul]:mt-1.5">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-0.5 leading-relaxed">{children}</li>,
  input: ({ type, checked }) =>
    type === "checkbox" ? (
      <input
        type="checkbox"
        checked={!!checked}
        disabled
        readOnly
        className="mr-2 h-3.5 w-3.5 translate-y-0.5 rounded-sm accent-[#315bdc]"
      />
    ) : null,

  // Inline text
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => (
    <del className="text-slate-400 line-through">{children}</del>
  ),

  a: ({ href, children }) => {
    const external = !!href && !href.startsWith("#");

    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={`inline-flex items-baseline gap-0.5 rounded-sm font-medium text-[#315bdc] underline decoration-[#315bdc]/30 underline-offset-2 transition hover:text-[#274dc4] hover:decoration-[#274dc4] ${focusRing}`}
      >
        {children}

        {external && (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3 shrink-0 self-center opacity-70"
          >
            <path d="M7 7h10v10" />
            <path d="M7 17 17 7" />
          </svg>
        )}
      </a>
    );
  },

  // Note-style quote
  blockquote: ({ children }) => (
    <blockquote className="mb-3 rounded-r-md border-l-4 border-[#315bdc]/50 bg-slate-50 py-2 pl-4 pr-3 text-slate-700 last:mb-0 [&>p]:mb-0">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="my-4 border-slate-200" />,

  // Code: blocks get a header with a copy button, inline code gets a quiet chip
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  code: ({ children }) => (
    <code className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800">
      {children}
    </code>
  ),

  // Tables
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto rounded-md border border-slate-200 last:mb-0">
      <table className="min-w-full border-collapse text-[13px] [&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr:nth-child(even)]:bg-slate-50/60">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-slate-200 bg-slate-50">{children}</thead>
  ),
  th: ({ children, style }) => (
    <th
      style={style}
      scope="col"
      className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-600"
    >
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td
      style={style}
      className="border-b border-slate-100 px-3 py-2 align-top tabular-nums text-slate-700"
    >
      {children}
    </td>
  ),

  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === "string" ? src : undefined}
      alt={alt ?? ""}
      loading="lazy"
      className="my-3 max-w-full rounded-md border border-slate-200"
    />
  ),
};


export default function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="min-w-0 wrap-break-word text-sm leading-relaxed text-slate-700">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}