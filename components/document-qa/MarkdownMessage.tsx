"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownMessage({
  content,
}: {
  content: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-2 mt-4 text-base font-semibold text-slate-900 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-2 mt-4 text-sm font-semibold text-slate-900 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-1.5 mt-3 text-sm font-semibold text-slate-800 first:mt-0">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-3 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="pl-0.5">{children}</li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-900">
            {children}
          </strong>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline hover:text-blue-700"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-2 border-slate-300 pl-3 text-slate-600">
            {children}
          </blockquote>
        ),
        code: ({ className, children }) =>
          className ? (
            <code className="block overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {children}
            </code>
          ) : (
            <code className="rounded bg-slate-200 px-1 py-0.5 text-xs text-slate-800">
              {children}
            </code>
          ),
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-slate-200 px-2.5 py-1.5">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}