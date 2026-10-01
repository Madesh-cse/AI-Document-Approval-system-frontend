"use client";

import { FormEvent, useEffect, useState } from "react";

import { Icon } from "../Dashboard/Icon";
import {
  askDocumentQuestion,
  DocumentQAResponse,
} from "@/services/documentService";
import MarkdownMessage from "./MarkdownMessage";

interface ChatAssistantProps {
  selectedDocumentId: number | null;
}

interface ChatMessage {
  id: number;
  type: "user" | "assistant";
  content: string;
  sources?: DocumentQAResponse["sources"];
}

const suggestions = [
  "What are the main topics covered in this document?",
  "What is the title of this document?",
  "Who are the organizations mentioned?",
  "Give me a summary of this document.",
];

export default function ChatAssistant({
  selectedDocumentId,
}: ChatAssistantProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMessages([]);
    setError("");
  }, [selectedDocumentId]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || !selectedDocumentId || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      type: "user",
      content: trimmedQuestion,
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const response = await askDocumentQuestion(
        selectedDocumentId,
        trimmedQuestion,
      );

      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: response.answer,
        sources: response.sources,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (error) {
      console.error("Document Q&A failed:", error);

      setError(
        "Unable to get an answer from this document.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setQuestion(suggestion);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 bg-white px-6 py-3.5">
        <Icon
          name="shield_check"
          className="h-4 w-4 text-blue-600"
        />

        <div>
          <span className="text-sm font-semibold text-slate-800">
            Document assistant
          </span>

          <span className="ml-2 text-xs text-slate-400">
            {selectedDocumentId
              ? `Scoped to document #${selectedDocumentId} · retrieval augmented`
              : "Select a document to begin"}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {!selectedDocumentId && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Icon
                name="file"
                className="mx-auto h-8 w-8 text-slate-300"
              />

              <p className="mt-3 text-sm font-medium text-slate-600">
                Select a document
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Choose a document from the left to start asking
                questions.
              </p>
            </div>
          </div>
        )}

        {selectedDocumentId &&
          messages.length === 0 && (
            <div className="flex max-w-3xl items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                AI
              </div>

              <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm">
                I can answer questions using the selected
                document. Ask me about its content, topics,
                summary, or other information contained in it.
              </div>
            </div>
          )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex max-w-3xl items-start gap-3 ${
              message.type === "user"
                ? "ml-auto flex-row-reverse"
                : ""
            }`}
          >
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                message.type === "user"
                  ? "bg-slate-200 text-slate-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {message.type === "user" ? "You" : "AI"}
            </div>

            <div className="min-w-0">
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  message.type === "user"
                    ? "rounded-tr-sm bg-blue-600 text-white"
                    : "rounded-tl-sm border border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                {message.type === "assistant" ? (
                  <MarkdownMessage
                    content={message.content}
                  />
                ) : (
                  <span className="whitespace-pre-wrap">
                    {message.content}
                  </span>
                )}
              </div>

              {message.type === "assistant" &&
                message.sources &&
                message.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Sources
                    </span>

                    {message.sources.map(
                      (source, index) => (
                        <span
                          key={`${source.document_id}-${source.page}-${index}`}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500"
                        >
                          {source.page
                            ? `Page ${source.page}`
                            : `Document #${source.document_id}`}
                        </span>
                      ),
                    )}
                  </div>
                )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex max-w-3xl items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              AI
            </div>

            <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 shadow-sm">
              Searching the document...
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={!selectedDocumentId || loading}
              onClick={() =>
                handleSuggestion(suggestion)
              }
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              disabled={!selectedDocumentId || loading}
              placeholder={
                selectedDocumentId
                  ? "Ask a question about this document..."
                  : "Select a document first..."
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>

          <button
            type="submit"
            disabled={
              !selectedDocumentId ||
              !question.trim() ||
              loading
            }
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Icon
              name="send"
              className="h-4 w-4"
            />

            <span>
              {loading ? "Thinking..." : "Send"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}