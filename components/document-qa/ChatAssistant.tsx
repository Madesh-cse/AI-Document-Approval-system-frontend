"use client";

import { isAxiosError } from "axios";
import {
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  askDocumentQuestion,
  type DocumentQAResponse,
} from "@/services/documentService";
import MarkdownMessage from "./MarkdownMessage";

interface ChatAssistantProps {
  selectedDocumentId: number | null;
}

interface ChatMessage {
  id: number;
  type: "user" | "assistant";
  content: string;
  createdAt: number;
  sources?: DocumentQAResponse["sources"];
}

const suggestions = [
  "What are the main topics covered in this document?",
  "What is the title of this document?",
  "Who are the organizations mentioned?",
  "Give me a summary of this document.",
];

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315bdc]";

// ── Icons (inline SVG, self-contained) ────────────────────────────────────
const ICONS: Record<string, ReactNode> = {
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  sparkles: (
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  ),
  file: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8M16 13H8M16 17H8" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </>
  ),
  shield_check: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  alert: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  chevron_right: <path d="m9 18 6-6-6-6" />,
  loader: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
};

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
    >
      {ICONS[name]}
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────
const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

/** Same page / document cited twice is shown once */
function uniqueSources(sources: DocumentQAResponse["sources"] | undefined) {
  if (!sources) return [];

  const seen = new Set<string>();

  return sources.filter((source) => {
    const key = `${source.document_id}-${source.page ?? ""}`;

    if (seen.has(key)) return false;

    seen.add(key);

    return true;
  });
}

function getQuestionError(error: unknown) {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot reach the server. Check your connection and try again.";
    }

    const detail = error.response.data?.detail;

    if (typeof detail === "string" && detail) return detail;
  }

  return "Unable to get an answer from this document.";
}

// ── Small pieces ──────────────────────────────────────────────────────────
function Avatar({ kind }: { kind: "user" | "assistant" }) {
  if (kind === "assistant") {
    return (
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#315bdc] ring-1 ring-inset ring-blue-100">
        <Icon name="sparkles" className="h-4 w-4" />
      </span>
    );
  }

  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-600">
      You
    </span>
  );
}

function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="The assistant is searching the document"
      className="flex items-start gap-3"
    >
      <Avatar kind="assistant" />

      <div className="flex items-center gap-3 rounded-xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span className="flex items-center gap-1" aria-hidden="true">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              style={{ animationDelay: `${delay}ms` }}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none"
            />
          ))}
        </span>

        <span className="text-sm text-slate-500">
          Searching the document...
        </span>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────
export default function ChatAssistant({
  selectedDocumentId,
}: ChatAssistantProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const idRef = useRef(0);
  const documentRef = useRef(selectedDocumentId);

  const nextId = () => {
    idRef.current += 1;

    return idRef.current;
  };

  // New document = new conversation
  useEffect(() => {
    documentRef.current = selectedDocumentId;

    setMessages([]);
    setError("");
    setFailedQuestion(null);
    setLoading(false);
    setQuestion("");
  }, [selectedDocumentId]);

  // Keep the newest message in view
  useEffect(() => {
    const list = listRef.current;

    if (!list) return;

    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, loading, error]);

  // Grow the text box with its content (max ~6 lines)
  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [question]);

  const ask = async (text: string, addUserMessage: boolean) => {
    const documentId = selectedDocumentId;

    if (!documentId || loading) {
      return;
    }

    if (addUserMessage) {
      setMessages((previous) => [
        ...previous,
        {
          id: nextId(),
          type: "user",
          content: text,
          createdAt: Date.now(),
        },
      ]);
    }

    setError("");
    setFailedQuestion(null);
    setLoading(true);

    try {
      const response = await askDocumentQuestion(documentId, text);

      // The user switched documents while waiting - drop this answer
      if (documentRef.current !== documentId) return;

      setMessages((previous) => [
        ...previous,
        {
          id: nextId(),
          type: "assistant",
          content: response.answer,
          sources: response.sources,
          createdAt: Date.now(),
        },
      ]);
    } catch (requestError) {
      console.error("Document Q&A failed:", requestError);

      if (documentRef.current !== documentId) return;

      setError(getQuestionError(requestError));
      setFailedQuestion(text);
    } finally {
      if (documentRef.current === documentId) {
        setLoading(false);
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || !selectedDocumentId || loading) {
      return;
    }

    setQuestion("");
    void ask(trimmedQuestion, true);
  };

  // Enter sends, Shift + Enter adds a new line
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setQuestion(suggestion);
    textareaRef.current?.focus();
  };

  const handleCopy = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);

      setCopiedId(message.id);

      setTimeout(
        () => setCopiedId((current) => (current === message.id ? null : current)),
        1800,
      );
    } catch {
      /* clipboard not available - nothing to do */
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setError("");
    setFailedQuestion(null);
  };

  const hasDocument = selectedDocumentId !== null;
  const canSend = hasDocument && question.trim().length > 0 && !loading;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#315bdc] text-white shadow-sm">
            <Icon name="shield_check" className="h-4.5 w-4.5" />
          </span>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">
              Document Assistant
            </h2>

            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              {hasDocument ? (
                <>
                  <span>Scoped to document #{selectedDocumentId}</span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Retrieval augmented
                  </span>
                </>
              ) : (
                "Select a document to begin"
              )}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearConversation}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 ${focusRing}`}
          >
            <Icon name="trash" className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </header>

      {/* Conversation */}
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-4 py-6 sm:px-6"
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
          {/* No document selected */}
          {!hasDocument && (
            <div className="my-auto text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Icon name="file" className="h-6 w-6" />
              </span>

              <p className="mt-4 text-sm font-semibold text-slate-700">
                Select a document
              </p>

              <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                Choose a document from the left to start asking questions.
              </p>
            </div>
          )}

          {/* Welcome + suggested prompts */}
          {hasDocument && messages.length === 0 && !loading && !error && (
            <div className="my-auto">
              <div className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#315bdc] ring-1 ring-inset ring-blue-100">
                  <Icon name="sparkles" className="h-6 w-6" />
                </span>

                <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
                  Ask anything about this document
                </h3>

                <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-slate-500">
                  I answer using the selected document only. Ask about its
                  content, topics, summary, or other information contained in
                  it.
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestion(suggestion)}
                    className={`group flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#315bdc] hover:shadow-md ${focusRing}`}
                  >
                    <span className="text-sm leading-5 text-slate-700">
                      {suggestion}
                    </span>

                    <Icon
                      name="chevron_right"
                      className="mt-0.5 h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#315bdc]"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => {
            const sources = uniqueSources(message.sources);

            if (message.type === "user") {
              return (
                <div
                  key={message.id}
                  className="flex flex-row-reverse items-start gap-3"
                >
                  <Avatar kind="user" />

                  <div className="flex min-w-0 max-w-[85%] flex-col items-end">
                    <div className="mb-1.5 flex items-center gap-2 text-xs">
                      <span className="text-slate-400">
                        {formatTime(message.createdAt)}
                      </span>

                      <span className="font-semibold text-slate-800">You</span>
                    </div>

                    <div className="whitespace-pre-wrap wrap-break-words rounded-xl rounded-tr-sm bg-[#315bdc] px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className="flex items-start gap-3">
                <Avatar kind="assistant" />

                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-800">
                      DocIntel Assistant
                    </span>

                    <span className="text-slate-400">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>

                  <div className="rounded-xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm">
                    <MarkdownMessage content={message.content} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(message)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 ${focusRing}`}
                    >
                      <Icon
                        name={copiedId === message.id ? "check" : "copy"}
                        className={`h-3.5 w-3.5 ${copiedId === message.id ? "text-emerald-600" : ""}`}
                      />
                      {copiedId === message.id ? "Copied" : "Copy"}
                    </button>

                    {sources.length > 0 && (
                      <>
                        <span
                          aria-hidden="true"
                          className="h-3 w-px bg-slate-200"
                        />

                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          <Icon name="book" className="h-3 w-3" />
                          Sources
                        </span>

                        {sources.map((source, index) => (
                          <span
                            key={`${source.document_id}-${source.page}-${index}`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 shadow-sm"
                          >
                            <span className="flex h-4 w-4 items-center justify-center rounded bg-blue-50 text-[10px] font-bold text-[#315bdc]">
                              {index + 1}
                            </span>

                            {source.page
                              ? `Page ${source.page}`
                              : `Document #${source.document_id}`}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && <TypingIndicator />}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            >
              <Icon name="alert" className="mt-0.5 h-4 w-4 text-red-600" />

              <p className="flex-1 text-sm text-red-700">{error}</p>

              {failedQuestion && (
                <button
                  type="button"
                  onClick={() => void ask(failedQuestion, false)}
                  disabled={loading}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 ${focusRing}`}
                >
                  <Icon name="refresh" className="h-3.5 w-3.5" />
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {/* Quick follow-ups once a conversation has started */}
          {hasDocument && messages.length > 0 && (
            <div
              className="mb-3 flex gap-2 overflow-x-auto pb-1"
              aria-label="Suggested questions"
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSuggestion(suggestion)}
                  className={`shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm transition hover:border-[#315bdc] hover:text-[#315bdc] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit}>
            <div
              className={`flex items-end gap-2 rounded-xl border p-2 shadow-sm transition focus-within:border-[#315bdc] focus-within:ring-2 focus-within:ring-[#315bdc]/20 ${
                hasDocument
                  ? "border-slate-300 bg-white"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!hasDocument}
                aria-label="Ask a question about this document"
                placeholder={
                  hasDocument
                    ? "Ask a question about this document..."
                    : "Select a document first..."
                }
                className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
              />

              <button
                type="submit"
                disabled={!canSend}
                aria-label={loading ? "Waiting for answer" : "Send question"}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#315bdc] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#274dc4] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 ${focusRing}`}
              >
                <Icon
                  name={loading ? "loader" : "send"}
                  className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
                />

                <span>{loading ? "Thinking..." : "Send"}</span>
              </button>
            </div>
          </form>

          <p className="mt-2 text-center text-[11px] text-slate-400">
            Answers are generated from the selected document. Verify critical
            details.
            <span className="hidden sm:inline">
              {" "}
              · Enter to send · Shift + Enter for a new line
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}