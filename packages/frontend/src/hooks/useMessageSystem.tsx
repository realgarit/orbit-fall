import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type MessageType = 'info' | 'success' | 'warning' | 'error' | 'combat';

export interface Message {
  id: string;
  text: string;
  type: MessageType;
  timestamp: number;
}

interface MessageContextType {
  messages: Message[];
  addMessage: (text: string, type?: MessageType) => void;
  clearMessages: () => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = useCallback((text: string, type: MessageType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    const newMessage: Message = {
      id,
      text,
      type,
      timestamp: Date.now(),
    };

    setMessages((prev) => {
      // Add new message at the beginning (newest first)
      const updated = [newMessage, ...prev];
      // Keep only the last 5 messages
      return updated.slice(0, 5);
    });

    // Auto-remove message after 3 seconds (visible) + fade time
    setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, 3000);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <MessageContext.Provider value={{ messages, addMessage, clearMessages }}>
      {children}
    </MessageContext.Provider>
  );
}

export function useMessageSystem() {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessageSystem must be used within a MessageProvider');
  }
  return context;
}
