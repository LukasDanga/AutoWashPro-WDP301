import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessage } from '../lib/chatbotService.js';

const WELCOME = 'Xin chào! Tôi là trợ lý AI của AutoWashPro 🚗\nTôi có thể tư vấn dịch vụ và giúp bạn đặt lịch rửa xe. Bạn cần hỗ trợ gì?';

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'bot', text: WELCOME }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, open]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const reply = await sendChatMessage(text);
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: `Xin lỗi, có lỗi xảy ra: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      {open && (
        <div style={{
          width: 360,
          height: 520,
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: 12,
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
        }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚗</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>AutoWashPro AI</div>
              <div style={{ color: '#bfdbfe', fontSize: 11 }}>Trợ lý đặt lịch thông minh</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 2, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f9fafb' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                {msg.role === 'bot' && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>
                )}
                <div style={{
                  maxWidth: '78%',
                  padding: '9px 13px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? '#1d4ed8' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#1f2937',
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
                <div style={{ background: '#fff', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(n => (
                      <div key={n} style={{
                        width: 7, height: 7, borderRadius: '50%', background: '#9ca3af',
                        animation: `chatDot 1.2s ${n * 0.2}s ease-in-out infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ borderTop: '1px solid #e5e7eb', padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-end', background: '#fff', flexShrink: 0 }}>
            <textarea
              ref={(el) => { inputRef.current = el; textareaRef.current = el; }}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKey}
              placeholder="Nhập câu hỏi... (Enter để gửi)"
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                border: '1.5px solid #d1d5db',
                borderRadius: 12,
                padding: '8px 12px',
                fontSize: 13.5,
                fontFamily: 'inherit',
                outline: 'none',
                lineHeight: 1.45,
                maxHeight: 100,
                overflowY: 'auto',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#1d4ed8')}
              onBlur={e => (e.target.style.borderColor = '#d1d5db')}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              title="Gửi"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: !input.trim() || loading ? '#e5e7eb' : '#1d4ed8',
                border: 'none',
                color: !input.trim() || loading ? '#9ca3af' : '#fff',
                cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >➤</button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(p => !p)}
        title={open ? 'Đóng chat' : 'Chat với AI'}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: open ? '#374151' : '#1d4ed8',
          border: 'none',
          color: '#fff',
          fontSize: open ? 22 : 26,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(29,78,216,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s, transform 0.15s',
          transform: open ? 'rotate(0deg)' : 'rotate(0deg)',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? '✕' : '💬'}
      </button>

      <style>{`
        @keyframes chatDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
