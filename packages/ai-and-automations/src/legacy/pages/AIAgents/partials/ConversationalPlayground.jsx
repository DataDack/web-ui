import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Bot, User, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ConversationalPlayground({ agentName, cfg }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg = { id: crypto.randomUUID(), role: 'user', content: trimmed };
    const assistantMsg = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Playground execution is coming soon. Configure your agent and deploy it to test via the API.',
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearMessages = useCallback(() => setMessages([]), []);

  return (
    <div className='flex h-full flex-col overflow-hidden bg-background'>
      {/* Header */}
      <div className='shrink-0 flex items-center justify-between px-5 py-3 border-b border-border'>
        <div className='flex items-center gap-2'>
          <div className='flex h-6 w-6 items-center justify-center rounded-md bg-[#D4AF37]/15 text-[#D4AF37]'>
            <Bot size={12} />
          </div>
          <span className='text-sm font-semibold text-foreground'>Playground</span>
          <Badge variant='outline' className='text-[9px] px-1.5 h-4 border-amber-500/30 text-amber-500 bg-amber-500/5'>
            Preview
          </Badge>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className='text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1'
          >
            <RefreshCw size={10} />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className='flex-1'>
        <div className='flex flex-col gap-5 px-6 py-6'>
          {messages.length === 0 ? (
            <div className='flex flex-col items-center justify-center min-h-[280px] gap-4 text-center'>
              <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] text-xl font-bold select-none'>
                {(agentName || 'AG').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className='text-base font-semibold'>{agentName || 'Agent'}</p>
                <p className='text-sm text-muted-foreground mt-1'>
                  Send a message to preview the conversation flow
                </p>
              </div>
              {cfg?.model && (
                <Badge variant='outline' className='text-[10px] border-muted-foreground/20 text-muted-foreground'>
                  {cfg.model}
                </Badge>
              )}
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      isUser ? 'bg-muted text-muted-foreground' : 'bg-[#D4AF37]/20 text-[#D4AF37]'
                    }`}
                  >
                    {isUser ? <User size={13} /> : <Bot size={13} />}
                  </div>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-[#D4AF37] text-white rounded-tr-sm'
                        : 'bg-muted/60 text-foreground rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className='shrink-0 px-5 py-4 border-t border-border bg-card/40'>
        <div className='flex items-end gap-2 rounded-xl border border-input bg-background px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#D4AF37]/40 transition-shadow'>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Type a message to preview...'
            rows={1}
            className='flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-28 overflow-y-auto py-0.5'
          />
          <button
            type='button'
            onClick={handleSend}
            disabled={!input.trim()}
            className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37] text-white hover:bg-[#B8860B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
            title='Send'
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
