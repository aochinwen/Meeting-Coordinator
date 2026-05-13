'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Loader2, Mic, MicOff } from 'lucide-react';
import { ChatMessage } from '@/components/ui/ChatMessage';
import { BookingCard, AvailabilityDay } from '@/components/ui/BookingCard';

type Part = { text: string };
type Message = {
  role: 'user' | 'model';
  parts: Part[];
};

// A chat entry can be a plain message OR an availability card
type ChatEntry =
  | { type: 'message'; message: Message }
  | { type: 'availability'; text: string; availability: AvailabilityDay[]; durationMinutes: number };

// Extend window type for SpeechRecognition cross-browser support
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const MAX_RECORDING_SECONDS = 10;

export default function AssistantPage() {
  const [entries, setEntries] = useState<ChatEntry[]>([
    {
      type: 'message',
      message: {
        role: 'model',
        parts: [{ text: "Hello! I'm your AI scheduling assistant. Tell me what you need — e.g. *\"I need a 2-hour room next week\"* — and I'll show you what's available." }]
      }
    }
  ]);
  // Keep a separate history just for the API (plain messages only)
  const [apiHistory, setApiHistory] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Voice input state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, isLoading]);

  // Detect Web Speech API support
  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognitionAPI);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      // Show combined interim in the input box for live feedback
      setInput((finalTranscript + interim).trimStart());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      stopRecording();
    };

    recognition.onend = () => {
      // Trim trailing whitespace from final transcript
      setInput(prev => prev.trim());
      stopRecording();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setRecordingSeconds(0);

    // Live seconds counter
    timerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);

    // Auto-stop after MAX_RECORDING_SECONDS
    autoStopRef.current = setTimeout(() => {
      stopRecording();
    }, MAX_RECORDING_SECONDS * 1000);
  }, [stopRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      // Clear existing input when starting a fresh voice recording
      setInput('');
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    // If still recording when user hits send, stop first
    if (isRecording) stopRecording();

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const userEntry: ChatEntry = {
      type: 'message',
      message: { role: 'user', parts: [{ text: userMessage }] }
    };
    setEntries(prev => [...prev, userEntry]);

    const historyToSend = [...apiHistory, { role: 'user' as const, parts: [{ text: userMessage }] }];

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // History is everything up to (not including) the current message
          history: apiHistory,
          message: userMessage,
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error("Chat Error:", data.error);
        setEntries(prev => [...prev, {
          type: 'message',
          message: { role: 'model', parts: [{ text: `Sorry, I encountered an error: ${data.error}` }] }
        }]);
      } else if (data.availability && data.availability.length > 0) {
        // Structured response with booking card
        setEntries(prev => [...prev, {
          type: 'availability',
          text: data.text,
          availability: data.availability,
          durationMinutes: data.durationMinutes ?? 60,
        }]);
        // Update API history with just the text
        setApiHistory([
          ...historyToSend,
          { role: 'model', parts: [{ text: data.text }] }
        ]);
      } else {
        // Regular text message
        const modelMsg: Message = { role: 'model', parts: [{ text: data.text }] };
        setEntries(prev => [...prev, { type: 'message', message: modelMsg }]);
        setApiHistory([...historyToSend, modelMsg]);
      }
    } catch (error) {
      console.error("Network Error:", error);
      setEntries(prev => [...prev, {
        type: 'message',
        message: { role: 'model', parts: [{ text: "Sorry, I couldn't reach the server. Please try again later." }] }
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Progress arc for the timer ring (0–10s)
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const progress = recordingSeconds / MAX_RECORDING_SECONDS;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-sm shrink-0">
        <div className="bg-primary/10 p-2 rounded-xl">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-literata text-xl font-medium text-text-primary">AI Booking Assistant</h1>
          <p className="text-sm text-text-tertiary">Natural language room scheduling</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white/40 backdrop-blur-xl border border-white/40 shadow-sm rounded-3xl overflow-hidden flex flex-col relative min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {entries.map((entry, idx) => {
            if (entry.type === 'message') {
              return <ChatMessage key={idx} role={entry.message.role} text={entry.message.parts[0].text} />;
            }

            // Availability card entry
            return (
              <div key={idx} className="flex w-full gap-4 justify-start">
                <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mt-1 shadow-sm">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  {entry.text && (
                    <p className="text-sm text-text-secondary mb-3 leading-relaxed">{entry.text}</p>
                  )}
                  <BookingCard availability={entry.availability} durationMinutes={entry.durationMinutes} />
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex w-full gap-4 justify-start">
              <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mt-1 shadow-sm">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
              <div className="bg-white border border-border backdrop-blur-xl bg-opacity-70 rounded-2xl rounded-tl-sm px-5 py-3 shadow-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse delay-75"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-pulse delay-150"></span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/80 border-t border-white/50 backdrop-blur-md shrink-0 z-10 shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.1)]">
          <form onSubmit={handleSubmit} className="flex items-end gap-3 max-w-3xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? 'Listening…' : 'Ask for a room…'}
              className="flex-1 resize-none rounded-2xl border border-border bg-white px-4 py-3 text-sm font-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all max-h-32 min-h-[44px]"
              rows={1}
            />

            {/* Voice Button */}
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleRecording}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
                className={[
                  'shrink-0 relative flex items-center justify-center rounded-xl transition-all duration-200 h-11 w-11',
                  isRecording
                    ? 'bg-red-500/10 border border-red-400/40 text-red-500 hover:bg-red-500/20'
                    : 'bg-white border border-border text-text-secondary hover:bg-surface hover:text-primary hover:border-primary/30',
                ].join(' ')}
              >
                {isRecording ? (
                  <>
                    {/* Timer ring */}
                    <svg
                      className="absolute inset-0 w-full h-full -rotate-90"
                      viewBox="0 0 36 36"
                      aria-hidden="true"
                    >
                      <circle
                        cx="18"
                        cy="18"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity="0.15"
                        strokeWidth="2"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity="0.7"
                        strokeWidth="2"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                      />
                    </svg>
                    <MicOff className="w-4 h-4 relative z-10" />
                  </>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0 p-2 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors flex items-center justify-center h-11 w-11"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </form>

          {/* Recording status bar */}
          {isRecording && (
            <div className="flex items-center justify-center gap-2 mt-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-500 font-medium tabular-nums">
                Recording {recordingSeconds}s / {MAX_RECORDING_SECONDS}s — click mic to stop
              </span>
            </div>
          )}

          <div className="text-center mt-3">
            <span className="text-[10px] text-text-tertiary">AI can make mistakes. Verify bookings on the Schedule page.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
