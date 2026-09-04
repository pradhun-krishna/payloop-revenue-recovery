import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from '../config';

export default function CopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I am the PayLoop Copilot. Ask me anything about your current live data or revenue metrics.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply || "Sorry, I couldn't get an answer." }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', text: "Connection error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-24 w-[56px] h-[56px] rounded-full bg-accent text-white shadow-lg flex items-center justify-center hover:bg-accent/90 transition-transform hover:scale-105"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-24 w-[380px] h-[500px] bg-bg-surface border border-border shadow-xl rounded-xl flex flex-col overflow-hidden z-50">
      {/* Header */}
      <div className="bg-accent px-16 py-12 flex justify-between items-center text-white">
        <div className="flex items-center gap-[8px]">
          <span className="font-semibold text-[14px]">PayLoop Copilot</span>
          <span className="text-[10px] bg-white/20 px-[6px] py-[2px] rounded border border-white/30 tracking-wider">AI</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-16 space-y-12 bg-bg">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-12 text-[13px] leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-bg-elevated text-text-primary border border-border' 
                : 'bg-accent/10 text-text-primary border border-accent/20'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg p-12 text-[13px] bg-accent/10 border border-accent/20 text-accent flex gap-[4px]">
              <span className="animate-bounce">.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-12 bg-bg-surface border-t border-border flex gap-[8px]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your revenue..."
          className="flex-1 bg-bg-elevated border border-border rounded px-12 py-[8px] text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-accent text-white px-12 py-[8px] rounded hover:bg-accent/90 disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  );
}
