import React, { useEffect, useState } from 'react';
import { useMessageSystem } from '../hooks/useMessageSystem';
import '../styles/messages.css';

export function MessageSystem() {
  const { messages } = useMessageSystem();
  const [visibleMessages, setVisibleMessages] = useState<Map<string, boolean>>(new Map());

  // Handle fade-in for new messages
  useEffect(() => {
    messages.forEach((msg) => {
      setVisibleMessages((prev) => {
        // If message is already tracked, don't recreate timeout
        if (prev.has(msg.id)) {
          return prev;
        }
        
        // Mark as visible immediately
        const next = new Map(prev).set(msg.id, true);
        
        // After 3 seconds, start fade-out
        setTimeout(() => {
          setVisibleMessages((current) => {
            const updated = new Map(current);
            updated.set(msg.id, false);
            return updated;
          });
        }, 3000);
        
        return next;
      });
    });

    // Clean up old messages from visibleMessages
    const messageIds = new Set(messages.map((m) => m.id));
    setVisibleMessages((prev) => {
      const next = new Map();
      prev.forEach((value, id) => {
        if (messageIds.has(id)) {
          next.set(id, value);
        }
      });
      return next;
    });
  }, [messages]);

  return (
    <div className="game-message-system">
      {messages.map((message, index) => {
        const isVisible = visibleMessages.get(message.id) ?? true;
        return (
          <div
            key={message.id}
            className={`game-message game-message-${message.type} ${isVisible ? 'visible' : 'fading'}`}
            style={{
              top: `${50 + index * 24}px`, // Start at 50px (below top bar), each message 24px apart
            }}
          >
            {message.text}
          </div>
        );
      })}
    </div>
  );
}
