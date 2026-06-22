import React, { useState, useRef, useEffect, useCallback } from "react";

const ANTHROPIC_API_KEY = "sk-ant-SUA_CHAVE_NOVA";
const SPECIALTIES = [
  { id: "cirurgia", label: "Cirurgia Oral", icon: "🔪", color: "#2d6cdf", bg: "#0d1f3c" },
  { id: "endodontia", label: "Endodontia", icon: "🦷", color: "#2ea043", bg: "#0d1f0d" },
  { id: "periodontia", label: "Periodontia", icon: "🔬", color: "#9b59b6", bg: "#1a0d2e" },
  { id: "protese", label: "Prótese", icon: "⚙️", color: "#e67e22", bg: "#2d1a0d" },
];

const CASES = {
  cirurgia: {
    title: "Dor mandibular intensa",
    patient: "João, 34 anos",
    prompt: `Você é João, 34 anos. Queixa: dor intensa no lado direito da mandíbula há 3 dias, pior à noite. Febre ontem (38.2°C). Histórico: hipertenso (Losartana 50mg). Dente 48 semi-incluso. Trismo leve e linfadenopatia submandibular direita. Diagnóstico real: Pericoronarite aguda com celulite inicial. Conduta ideal: amoxicilina 500mg 8/8h 7 dias, analgesia, clorexidina, após resolução: exodontia do 48.`,
  },
  endodontia: {
    title: "Dor espontânea no superior",
    patient: "Maria, 28 anos",
    prompt: `Você é Maria, 28 anos. Queixa: dor espontânea pulsátil no dente superior esquerdo há 1 semana, piora com calor, melhora com frio. Acorda à noite com dor. Saudável, sem medicações. Dente 26 com restauração extensa de amálgama. Diagnóstico real: Pulpite irreversível sintomática no dente 26. Conduta ideal: tratamento endodôntico. NÃO indicar extração.`,
  },
  periodontia: {
    title: "Sangramento gengival e halitose",
    patient: "Carlos, 52 anos",
    prompt: `Você é Carlos, 52 anos. Queixa: gengiva sangra ao escovar e mau hálito constante. Fumante (1 maço/dia há 20 anos), diabético tipo 2 (HbA1c 8.2%). Bolsas periodontais 5-7mm, mobilidade grau II nos dentes 31 e 41, perda óssea horizontal generalizada. Diagnóstico real: Periodontite estágio III grau C. Conduta ideal: RAR em quadrantes, controle sistêmico, cessação do tabagismo.`,
  },
  protese: {
    title: "Prótese caindo e ferida no palato",
    patient: "Ana, 67 anos",
    prompt: `Você é Ana, 67 anos. Queixa: dentadura caindo e ferida embaixo dela. Edêntula total há 15 anos. Osteoporose (Alendronato há 3 anos). Próteses com desgaste severo, DVO diminuída, lesão eritematosa difusa no palato. Diagnóstico real: Estomatite protética (Candida) + próteses desadaptadas. ALERTA: risco de OMAB. Conduta ideal: nistatina tópica, novas próteses, consultar suspensão do bisfosfonato.`,
  },
};

const SYSTEM_BASE = `Você é um simulador de casos clínicos odontológicos. Interprete o paciente de forma realista.

REGRAS:
1. Você É o paciente. Fale sempre em primeira pessoa.
2. Responda só ao que for perguntado. Não ofereça informações espontaneamente.
3. Seja humano: tenha medos, incertezas, dificuldade para descrever a dor.
4. Quando pedirem exames, descreva os achados como resultado real.
5. Ao receber "FINALIZAR CASO", saia do personagem e dê feedback estruturado:

FEEDBACK CLÍNICO:
✅ Diagnóstico: [correto/parcial/incorreto] — [explicação]
📋 Anamnese: [o que foi bem / o que faltou]
🔬 Exames: [adequados / insuficientes / desnecessários]
💡 Diagnóstico esperado: [diagnóstico correto]
🦷 Conduta ideal: [tratamento completo com posologia]
⚠️ Pontos de atenção: [riscos ou erros]
📈 Nota: [0-10] — [justificativa]

DADOS DO PACIENTE:`;

async function callClaude(systemPrompt, messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || "";
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "4px 2px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#8b949e", animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [specialty, setSpecialty] = useState(null);
  const [casesUsed, setCasesUsed] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startCase = async (sp) => {
    setSpecialty(sp);
    setScreen("case");
    setMessages([]);
    setFinished(false);
    setLoading(true);
    setCasesUsed((n) => n + 1);
    try {
      const reply = await callClaude(SYSTEM_BASE + "\n" + CASES[sp.id].prompt, [
        { role: "user", content: "Olá, sou estudante de odontologia. O que está sentindo?" },
      ]);
      setMessages([{ role: "assistant", content: reply, isFeedback: false }]);
    } catch {
      setMessages([{ role: "assistant", content: "Erro ao conectar. Verifique sua chave de API.", isFeedback: false }]);
    }
    setLoading(false);
  };

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    const isFinalizing = text.toUpperCase().includes("FINALIZAR");
    const newMsgs = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const reply = await callClaude(
        SYSTEM_BASE + "\n" + CASES[specialty.id].prompt,
        newMsgs.map((m) => ({ role: m.role, content: m.content }))
      );
      setMessages((prev) => [...prev, { role: "assistant", content: reply, isFeedback: isFinalizing }]);
      if (isFinalizing) setFinished(true);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Erro de conexão.", isFeedback: false }]);
    }
    setLoading(false);
  }, [input, loading, messages, specialty]);

  const s = {
    root: { minHeight: "100vh", background: "#0d1117", color: "#e6edf3", fontFamily: "'Inter',sans-serif" },
    homeWrap: { maxWidth: 480, margin: "0 auto", padding: "48px 20px", display: "flex", flexDirection: "column", gap: 24 },
    heroTitle: { fontSize: 32, fontWeight: 800, letterSpacing: "-1px", background: "linear-gradient(135deg,#e6edf3 40%,#79b8ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    heroSub: { fontSize: 14, color: "#8b949e", lineHeight: 1.6 },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    card: (sp) => ({ padding: "18px 14px", borderRadius: 14, border: `1px solid ${sp.color}44`, background: sp.bg, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }),
    freeBadge: (sp) => ({ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, border: `1px solid ${sp.color}55`, color: sp.color, background: sp.color + "15", alignSelf: "flex-start" }),
    tip: { fontSize: 13, color: "#8b949e", background: "#161b22", border: "1px solid #21262d", borderRadius: 12, padding: "14px 16px", lineHeight: 1.6 },
    caseWrap: { maxWidth: 720, margin: "0 auto", padding: "0 16px", display: "flex", flexDirection: "column", height: "100vh" },
    caseHeader: { padding: "16px 0", borderBottom: "1px solid #21262d", display: "flex", alignItems: "center", gap: 12 },
    backBtn: { padding: "6px 12px", borderRadius: 8, border: "1px solid #30363d", background: "transparent", color: "#8b949e", cursor: "pointer", fontSize: 13 },
    msgList: { flex: 1, overflowY: "auto", padding: "20px 0", display: "flex", flexDirection: "column", gap: 12 },
    msgRow: (isUser) => ({ display: "flex", alignItems: "flex-end", gap: 8, justifyContent: isUser ? "flex-end" : "flex-start" }),
    avatar: (type) => ({ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, background: type === "user" ? "linear-gradient(135deg,#2d6cdf,#1a3d8a)" : type === "feedback" ? "#1a3d1a" : "#21262d", border: type === "feedback" ? "1px solid #2ea043" : type === "patient" ? "1px solid #30363d" : "none" }),
    bubble: (isUser, isFeedback) => ({ maxWidth: "75%", padding: "10px 13px", borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px", border: `1px solid ${isUser ? "#2d6cdf40" : isFeedback ? "#2ea04340" : "#21262d"}`, background: isUser ? "linear-gradient(135deg,#1c3564,#0d2048)" : isFeedback ? "#0d1f0d" : "#161b22", fontSize: 14, lineHeight: 1.6, color: "#e6edf3", whiteSpace: "pre-wrap", wordBreak: "break-word" }),
    inputArea: { padding: "12px 0 24px", borderTop: "1px solid #21262d" },
    inputRow: { display: "flex", gap: 8, alignItems: "flex-end" },
    textarea: { flex: 1, background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "10px 14px", color: "#e6edf3", fontSize: 14, resize: "none", fontFamily: "inherit", lineHeight: 1.5, outline: "none" },
    sendBtn: (disabled) => ({ width: 42, height: 42, background: "linear-gradient(135deg,#2d6cdf,#1a3d8a)", border: "none", borderRadius: 12, color: "#fff", fontSize: 18, cursor: "pointer", opacity: disabled ? 0.4 : 1 }),
    doneBtn: { width: "100%", padding: 13, background: "linear-gradient(135deg,#2d6cdf,#1a3d8a)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 12 },
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
        textarea::placeholder { color: #484f58; } textarea:focus { border-color: #2d6cdf !important; }
        @keyframes typingDot { 0%,100%{opacity:.3;transform:translateY(0)} 50%{opacity:1;transform:translateY(-3px)} }
      `}</style>

      {screen === "home" && (
        <div style={s.homeWrap}>
          <div>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🦷</div>
            <h1 style={s.heroTitle}>DentCase</h1>
            <p style={{ ...s.heroSub, marginTop: 8 }}>Simule casos clínicos com pacientes virtuais e treine seu raciocínio diagnóstico</p>
          </div>
          <p style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Escolha uma especialidade</p>
          <div style={s.grid}>
            {SPECIALTIES.map((sp) => (
              <button key={sp.id} style={s.card(sp)} onClick={() => startCase(sp)}>
                <span style={{ fontSize: 26 }}>{sp.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3" }}>{sp.label}</span>
                <span style={s.freeBadge(sp)}>Grátis</span>
              </button>
            ))}
          </div>
          <div style={s.tip}>
            💡 Converse com o paciente, peça exames e forme seu diagnóstico. Escreva <strong style={{ color: "#79b8ff" }}>FINALIZAR CASO</strong> para receber feedback com nota.
          </div>
          {casesUsed > 0 && <p style={{ fontSize: 12, color: "#484f58", textAlign: "center" }}>{casesUsed} caso{casesUsed > 1 ? "s" : ""} simulado{casesUsed > 1 ? "s" : ""}</p>}
        </div>
      )}

      {screen === "case" && specialty && (
        <div style={s.caseWrap}>
          <div style={s.caseHeader}>
            <button style={s.backBtn} onClick={() => setScreen("home")}>← Voltar</button>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{CASES[specialty.id].title}</div>
              <div style={{ fontSize: 12, color: "#8b949e" }}>{specialty.icon} {CASES[specialty.id].patient} · {specialty.label}</div>
            </div>
          </div>
          <div style={s.msgList}>
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div key={i} style={s.msgRow(isUser)}>
                  {!isUser && <div style={s.avatar(msg.isFeedback ? "feedback" : "patient")}>{msg.isFeedback ? "📋" : "🤒"}</div>}
                  <div style={s.bubble(isUser, msg.isFeedback)}>{msg.content}</div>
                  {isUser && <div style={s.avatar("user")}>👨‍⚕️</div>}
                </div>
              );
            })}
            {loading && (
              <div style={s.msgRow(false)}>
                <div style={s.avatar("patient")}>🤒</div>
                <div style={s.bubble(false, false)}><TypingDots /></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {!finished ? (
            <div style={s.inputArea}>
              <div style={s.inputRow}>
                <textarea style={s.textarea} rows={2} placeholder="Pergunte ao paciente ou peça um exame..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <button style={s.sendBtn(loading || !input.trim())} onClick={send} disabled={loading || !input.trim()}>↑</button>
              </div>
              <p style={{ fontSize: 11, color: "#484f58", textAlign: "center", marginTop: 8 }}>Digite <strong style={{ color: "#79b8ff" }}>FINALIZAR CASO</strong> para receber seu feedback</p>
            </div>
          ) : (
            <button style={s.doneBtn} onClick={() => setScreen("home")}>← Novo caso</button>
          )}
        </div>
      )}
    </div>
  );
  }
