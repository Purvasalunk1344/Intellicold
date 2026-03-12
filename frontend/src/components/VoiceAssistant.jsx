import React, { useState, useEffect, useRef } from 'react';
import './VoiceAssistant.css';

export default function VoiceAssistant({ shipments }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your IntelliCold AI Assistant. How can I help you manage your fleet today?" }
  ]);
  const [speechSupported, setSpeechSupported] = useState(true);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const suggestions = [
    "Which shipment needs immediate attention?",
    "What is the fleet average quality?",
    "Which product has highest spoilage risk?",
    "Recommend action for critical shipments",
    "How many shipments are at risk?"
  ];

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Init Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-IN';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        handleUserMessage(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech error", event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          addMessage('assistant', "Could not hear you, please try again.");
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setSpeechSupported(false);
    }
  }, [shipments, messages]); // Dependencies needed in scope for the handlers

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleUserMessage = async (text) => {
    if (!text.trim() || isProcessing) return;
    
    const userText = text.trim();
    addMessage('user', userText);
    setInputText('');
    setIsProcessing(true);

    const apiKey = process.env.REACT_APP_GROK_API_KEY;
    if (!apiKey || apiKey === 'your_grok_api_key_here') {
      addMessage('assistant', "Please add REACT_APP_GROK_API_KEY to your .env file.");
      setIsProcessing(false);
      return;
    }

    try {
      const fleetContext = {
        total_shipments: shipments.length,
        critical_count: shipments.filter(s => s.risk_level === 'Critical').length,
        high_risk_count: shipments.filter(s => s.risk_level === 'High').length,
        avg_quality: (shipments.reduce((a, s) => a + s.quality_remaining, 0) / shipments.length).toFixed(1),
        shipments: shipments.map(s => ({
          name: s.name,
          product: s.product_type,
          risk: s.risk_level,
          quality: s.quality_remaining,
          hours_safe: s.hours_to_spoilage,
          route: `${s.origin} → ${s.destination}`,
          action: s.recommended_action,
        }))
      };

      // Exclude previous system messages and ensure correct format
      const conversationHistory = messages.map(m => ({ 
         role: m.role, 
         content: m.content 
      }));

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [
            {
              role: 'system',
              content: `You are IntelliCold AI Assistant, an expert in cold chain logistics and perishable goods monitoring. 
              You help logistics managers understand shipment risks, temperature violations, and spoilage predictions.
              Current fleet data: ${JSON.stringify(fleetContext)}
              Answer concisely in 2-3 sentences. Focus on actionable insights.
              If asked about a specific shipment, use the fleet data provided.`
            },
            ...conversationHistory,
            { role: 'user', content: userText }
          ],
          max_tokens: 150,
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices[0].message.content;
      
      addMessage('assistant', reply);
      speak(reply);

    } catch (err) {
      console.error(err);
      addMessage('assistant', "AI service unavailable, please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListen = () => {
    if (!speechSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        // Handle case where it might already be started
        setIsListening(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleUserMessage(inputText);
    }
  };

  return (
    <div className="voice-assistant-container">
      {/* Floating Button */}
      <button 
        className={`va-fab ${isListening ? 'listening' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Open AI Assistant"
      >
        {isProcessing ? (
           <span className="va-spinner">⏳</span>
        ) : isListening ? (
           <div className="va-pulse-ring">🎤</div>
        ) : (
           <span className="va-icon">🎤</span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="va-panel">
          <div className="va-header">
            <span className="va-title">🤖 INTELLICOLD AI ASSISTANT</span>
            <button className="va-close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          
          <div className="va-body">
            <div className="va-messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`va-msg-wrapper ${msg.role}`}>
                  <div className={`va-msg ${msg.role}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="va-msg-wrapper assistant">
                  <div className="va-msg assistant is-typing">
                    <span className="va-dot"></span>
                    <span className="va-dot"></span>
                    <span className="va-dot"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length === 1 && (
              <div className="va-suggestions">
                {suggestions.map((s, i) => (
                  <button key={i} className="va-chip" onClick={() => handleUserMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="va-footer">
            {speechSupported && (
              <button 
                className={`va-mic-btn ${isListening ? 'active' : ''}`} 
                onClick={toggleListen}
                title="Hold to speak"
              >
                🎤
              </button>
            )}
            <input 
              type="text" 
              className="va-input"
              placeholder={isListening ? "Listening..." : "Ask me anything..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isListening || isProcessing}
            />
            <button 
               className="va-send-btn" 
               onClick={() => handleUserMessage(inputText)}
               disabled={!inputText.trim() || isProcessing || isListening}
            >
               ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
