import { create } from "zustand";

import {
  askDocumentQuestion,
  getDocumentQAHistory,
  type ConversationMessage,
} from "@/services/documentService";

interface DocumentChatState {
  activeDocumentId: number | null;
  messagesByDocument: Record<number, ConversationMessage[]>;
  loadingHistory: boolean;
  sendingMessage: boolean;
  error: string | null;

  loadHistory: (documentId: number) => Promise<void>;
  askQuestion: (documentId: number, question: string) => Promise<void>;
  clearDocumentChat: (documentId: number) => void;
}

export const useDocumentChatStore = create<DocumentChatState>(
  (set) => ({
    activeDocumentId: null,
    messagesByDocument: {},
    loadingHistory: false,
    sendingMessage: false,
    error: null,

    loadHistory: async (documentId: number) => {
      set({
        activeDocumentId: documentId,
        loadingHistory: true,
        error: null,
      });

      try {
        const history = await getDocumentQAHistory(documentId);

        set((state) => ({
          messagesByDocument: {
            ...state.messagesByDocument,
            [documentId]: history.messages,
          },
          loadingHistory: false,
        }));
      } catch {
        set({
          loadingHistory: false,
          error: "Failed to load conversation history.",
        });
      }
    },

    askQuestion: async (
      documentId: number,
      question: string,
    ) => {
      const trimmedQuestion = question.trim();

      if (!trimmedQuestion) {
        return;
      }

      const temporaryMessage: ConversationMessage = {
        id: Date.now(),
        role: "user",
        content: trimmedQuestion,
        created_at: new Date().toISOString(),
      };

      set((state) => ({
        sendingMessage: true,
        error: null,
        messagesByDocument: {
          ...state.messagesByDocument,
          [documentId]: [
            ...(state.messagesByDocument[documentId] ?? []),
            temporaryMessage,
          ],
        },
      }));

      try {
        const response = await askDocumentQuestion(
          documentId,
          trimmedQuestion,
        );

        const assistantMessage: ConversationMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: response.answer,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          sendingMessage: false,
          messagesByDocument: {
            ...state.messagesByDocument,
            [documentId]: [
              ...(state.messagesByDocument[documentId] ?? []),
              assistantMessage,
            ],
          },
        }));
      } catch {
        set((state) => {
          const messages =
            state.messagesByDocument[documentId] ?? [];

          return {
            sendingMessage: false,
            error: "Failed to get an answer.",
            messagesByDocument: {
              ...state.messagesByDocument,
              [documentId]: messages.filter(
                (message) =>
                  message.id !== temporaryMessage.id,
              ),
            },
          };
        });
      }
    },

    clearDocumentChat: (documentId: number) => {
      set((state) => ({
        messagesByDocument: {
          ...state.messagesByDocument,
          [documentId]: [],
        },
      }));
    },
  }),
);