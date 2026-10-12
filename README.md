# ⚓ Batalha Naval - Multiplayer em Tempo Real

Jogo clássico de **Batalha Naval** 100% web e multiplayer por turnos em tempo real, construído com **React**, **TypeScript**, **Tailwind CSS** e **Firebase Firestore**.

O jogo conta com sistema de salas compartilháveis via link ou código de 6 dígitos, posicionamento tático em grade 10x10 com gráficos vetoriais detalhados de cada embarcação de guerra, névoa de guerra com segredo absoluto da frota inimiga até o fim da partida, efeitos sonoros sintetizados via Web Audio API e modo de treino solo contra Inteligência Artificial.

---

## 🚀 Funcionalidades

- **Multiplayer em Tempo Real (Firestore)**:
  - Criação de salas protegidas com código curto (ex: `NV-892`).
  - Compartilhamento de link direto de convite em 1 clique (`?room=CODIGO`).
  - Sincronização instantânea de turnos e ataques via ouvintes em tempo real (`onSnapshot`).
- **Peças e Embarcações com Gráficos Navais**:
  - Cada célula do navio renderiza graficamente sua parte real: Proa com quebra-ondas/tubos de torpedo, conveses de voo com pistas (Porta-aviões), torres duplas de artilharia pesada (Encouraçado), torres de periscópio (Submarino) e hélices na popa.
  - Danos de combate visíveis: o segmento atingido fica chamuscado sob chamas e fumaça animada.
  - Ilustrações completas das classes de navio no estaleiro e na telemetria.
- **Névoa de Guerra & Revelação Segura**:
  - As posições dos navios do oponente permanecem estritamente secretas durante todo o combate através das regras de segurança do Firestore (`firestore.rules`).
  - Ao término da partida, todas as embarcações secretas do adversário são totalmente reveladas na grade do radar para inspeção tática.
- **Áudio Sintetizado Nativo (Web Audio API)**:
  - Disparos de canhão naval, explosões profundas com ruído branco, impacto na água (*splash*), sirene de navio afundado e fanfarra de vitória (sem dependência de arquivos externos).
- **Modo Treino Solo vs IA**:
  - Jogue imediatamente contra um Almirante Virtual que utiliza algoritmo de busca e destruição por paridade e sondagem ortogonal de alvos atingidos.
- **Painel Tático & Rádio**:
  - Registro de combate em tempo real com histórico cronológico de disparos e mensagens rápidas de rádio naval.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Efeitos de Vitória**: [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Backend / Real-time**: [Firebase Firestore](https://firebase.google.com/docs/firestore) & [Firebase Authentication](https://firebase.google.com/docs/auth)

---

## 📦 Como Rodar Localmente

### 1. Clonar o repositório e instalar dependências
```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd batalha-naval
npm install
```

### 2. Configurar o Firebase (Via .env ou JSON)

Você pode configurar o Firebase de duas formas:

#### Opção A: Variáveis de Ambiente no `.env` (Recomendado para GitHub / Vercel)
Crie um arquivo `.env` baseado no `.env.example`:

```env
VITE_FIREBASE_API_KEY="sua-api-key"
VITE_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="seu-projeto"
VITE_FIREBASE_STORAGE_BUCKET="seu-projeto.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="seu-sender-id"
VITE_FIREBASE_APP_ID="seu-app-id"
VITE_FIREBASE_MEASUREMENT_ID="seu-measurement-id"
VITE_FIREBASE_DATABASE_ID="(default)"
```

#### Opção B: Arquivo `firebase-applet-config.json`
Ou mantenha o arquivo `firebase-applet-config.json` na raiz com o mesmo formato:

```json
{
  "projectId": "seu-projeto-id",
  "appId": "seu-app-id",
  "apiKey": "sua-api-key",
  "authDomain": "seu-projeto-id.firebaseapp.com",
  "firestoreDatabaseId": "(default)",
  "storageBucket": "seu-projeto-id.firebasestorage.app",
  "messagingSenderId": "seu-sender-id"
}
```

### 3. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```

Abra o navegador em `http://localhost:3000`.

---

## 🚢 Regras da Frota Naval

| Embarcação | Tamanho | Células | Descrição |
| :--- | :---: | :---: | :--- |
| **Porta-aviões** | 5 | 5 | Nau-capitânia com pista de decolagem |
| **Encouraçado** | 4 | 4 | Navio de linha blindado com canhões duplos |
| **Cruzador** | 3 | 3 | Navio veloz de escolta e ataque |
| **Submarino** | 3 | 3 | Embarcação submersível furtiva |
| **Contratorpedeiro** | 2 | 2 | Patrulheiro ágil de resposta rápida |

*Total: 5 navios, 17 células.*
