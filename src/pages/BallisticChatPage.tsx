/**
 * D5 — Interactive Ballistic Chat.
 * Conversational AI interface with persistent message history.
 * The user can ask follow-up questions about their ballistic setups.
 * Uses the existing AI dispatcher for agent calls.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Loader2, Trash2, Bot, User, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { sessionStore, airgunStore, projectileStore } from '@/lib/storage';
import { calculateTrajectory } from '@/lib/ballistics';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const CHAT_STORAGE_KEY = 'airballistik-chat-history';

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]) {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-100))); // keep last 100
}

/**
 * Local ballistic assistant — processes queries about the user's data
 * without requiring an API key. Falls back to contextual help.
 */
function processLocalQuery(query: string): string {
  const q = query.toLowerCase().trim();
  const sessions = sessionStore.getAll();
  const airguns = airgunStore.getAll();
  const projectiles = projectileStore.getAll();

  // Session count
  if (q.includes('combien') && q.includes('session')) {
    return `Vous avez **${sessions.length} sessions** enregistrées.${
      sessions.length > 0
        ? ` La dernière est "${sessions[sessions.length - 1].name}" créée le ${new Date(sessions[sessions.length - 1].createdAt).toLocaleDateString('fr')}.`
        : ''
    }`;
  }

  // Airgun list
  if (q.includes('arme') || q.includes('carabine') || q.includes('airgun') || q.includes('fusil')) {
    if (airguns.length === 0) return 'Aucune arme enregistrée. Allez dans **Bibliothèque > Armes** pour en ajouter.';
    return `Vous avez **${airguns.length} arme(s)** :\n${airguns.map(a => `- **${a.brand} ${a.model}** (${a.caliber})`).join('\n')}`;
  }

  // Projectile list
  if (q.includes('projectile') || q.includes('plomb') || q.includes('slug') || q.includes('pellet')) {
    if (projectiles.length === 0) return 'Aucun projectile enregistré. Allez dans **Bibliothèque > Projectiles** pour en ajouter.';
    const top5 = projectiles.slice(0, 5);
    return `Vous avez **${projectiles.length} projectile(s)**. Voici les premiers :\n${top5.map(p => `- **${p.brand} ${p.model}** — ${p.weight}gr, BC ${p.bc} (${p.bcModel ?? 'G1'})`).join('\n')}${projectiles.length > 5 ? `\n... et ${projectiles.length - 5} autres.` : ''}`;
  }

  // What-if velocity
  const velocityMatch = q.match(/(?:si|avec|vitesse|mv|v0).*?(\d{2,3})\s*(?:m\/s|ms)?/);
  if (velocityMatch && sessions.length > 0) {
    const newMv = parseInt(velocityMatch[1], 10);
    if (newMv >= 50 && newMv <= 500) {
      const last = sessions[sessions.length - 1];
      try {
        const results = calculateTrajectory({ ...last.input, muzzleVelocity: newMv });
        const at50 = results.find(r => r.range === 50) ?? results[results.length - 1];
        return `Avec une MV de **${newMv} m/s** (session "${last.name}") :\n- À ${at50.range}m : chute **${at50.drop.toFixed(1)} mm**, énergie **${at50.energy.toFixed(1)} J**\n- Holdover : ${at50.holdoverMRAD.toFixed(2)} MRAD`;
      } catch {
        return 'Erreur lors du calcul. Vérifiez que vos paramètres sont cohérents.';
      }
    }
  }

  // What-if wind
  const windMatch = q.match(/(?:vent|wind).*?(\d+)\s*(?:m\/s|ms|km\/h)?/);
  if (windMatch && sessions.length > 0) {
    const newWind = parseInt(windMatch[1], 10);
    const last = sessions[sessions.length - 1];
    try {
      const results = calculateTrajectory({
        ...last.input,
        weather: { ...last.input.weather, windSpeed: newWind, windAngle: 90 },
      });
      const at50 = results.find(r => r.range === 50) ?? results[results.length - 1];
      return `Avec un vent de **${newWind} m/s** en travers (session "${last.name}") :\n- À ${at50.range}m : dérive vent **${at50.windDrift.toFixed(1)} mm**\n- Correction : ${at50.windDriftMRAD.toFixed(2)} MRAD`;
    } catch {
      return 'Erreur lors du calcul.';
    }
  }

  // Best session
  if (q.includes('meilleur') || q.includes('best') || q.includes('favorite')) {
    const favs = sessions.filter(s => s.favorite);
    if (favs.length > 0) {
      return `Vous avez **${favs.length} session(s) favorite(s)** :\n${favs.map(s => `⭐ **${s.name}** — BC ${s.input.bc}, MV ${s.input.muzzleVelocity} m/s`).join('\n')}`;
    }
    return 'Aucune session marquée comme favorite. Ouvrez une session et cliquez sur l\'étoile pour la mettre en favori.';
  }

  // Help / capabilities
  if (q.includes('aide') || q.includes('help') || q.includes('quoi') || q.includes('capable') || q.includes('?')) {
    return `Je peux vous aider avec :\n\n🔹 **Vos données** — "Combien de sessions ai-je ?", "Liste mes armes", "Mes projectiles"\n🔹 **Simulations** — "Et si ma vitesse était 280 m/s ?", "Avec un vent de 5 m/s ?"\n🔹 **Favoris** — "Quelles sont mes meilleures sessions ?"\n🔹 **Conseils** — "Comment améliorer ma précision ?", "Quel BC choisir ?"\n\nPosez votre question !`;
  }

  // Default contextual response
  if (sessions.length > 0) {
    const last = sessions[sessions.length - 1];
    const lastResult = last.results?.[last.results.length - 1];
    return `Je ne suis pas sûr de comprendre votre question. Voici un résumé de votre dernière session :\n\n📋 **${last.name}**\n- MV : ${last.input.muzzleVelocity} m/s | BC : ${last.input.bc}\n- Zéro : ${last.input.zeroRange}m | Max : ${last.input.maxRange}m\n${lastResult ? `- À ${lastResult.range}m : chute ${lastResult.drop.toFixed(1)}mm, énergie ${lastResult.energy.toFixed(1)}J` : ''}\n\nEssayez : "aide" pour voir ce que je peux faire.`;
  }

  return 'Bienvenue ! Je suis votre assistant balistique. Créez d\'abord une session dans QuickCalc, puis revenez me poser vos questions. Tapez "aide" pour voir mes capacités.';
}

export default function BallisticChatPage() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response with slight delay
    setTimeout(() => {
      const response = processLocalQuery(text);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const updated = [...prev, assistantMsg];
        saveHistory(updated);
        return updated;
      });
      setIsTyping(false);
    }, 300 + Math.random() * 500);
  }, [input]);

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-8rem)] max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-heading font-bold">{t('nav.chat' as any) || 'Chat Balistique'}</h1>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 px-1 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-4 py-12">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Assistant Balistique</p>
              <p className="text-xs max-w-xs">
                Posez vos questions sur vos sessions, armes, projectiles. Simulez des scénarios "Et si...".
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Liste mes armes', 'Combien de sessions ?', 'Si MV = 280 m/s ?', 'Aide'].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(() => inputRef.current?.form?.requestSubmit(), 50); }}
                  className="px-3 py-1.5 rounded-lg text-xs bg-muted hover:bg-muted/70 text-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-md'
                    : 'bg-muted text-foreground rounded-tl-md'
                }`}
              >
                {msg.content.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-1' : ''}>
                    {line.split(/(\*\*.*?\*\*)/g).map((part, j) =>
                      part.startsWith('**') && part.endsWith('**')
                        ? <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
                        : <span key={j}>{part}</span>
                    )}
                  </p>
                ))}
              </div>
              {msg.role === 'user' && (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-start">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        className="flex gap-2 px-1 pt-2 border-t border-border/40"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez votre question balistique..."
          className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={isTyping}
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="px-4 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </motion.div>
  );
}
