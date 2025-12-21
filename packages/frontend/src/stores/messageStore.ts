import { create } from 'zustand';

export type MessageType = 'info' | 'success' | 'warning' | 'error' | 'combat';

export interface Message {
  id: string;
  text: string;
  type: MessageType;
  timestamp: number;
}

interface MessageState {
  messages: Message[];
  addMessage: (text: string, type?: MessageType) => void;
  clearMessages: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],

  addMessage: (text: string, type: MessageType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    const newMessage: Message = {
      id,
      text,
      type,
      timestamp: Date.now(),
    };

    set((state) => {
      // Add new message at the beginning (newest first)
      const updated = [newMessage, ...state.messages];
      // Keep only the last 5 messages
      return { messages: updated.slice(0, 5) };
    });

    // Auto-remove message after 3 seconds (visible) + fade time
    setTimeout(() => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg.id !== id),
      }));
    }, 3000);
  },

  clearMessages: () => set({ messages: [] }),
}));

