import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  signInAnonymously,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  loginWithGoogle,
  logoutUser,
  onAuthStateChanged,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  AttackRecord,
  Coordinate,
  PlacedShip,
  PlayerRole,
  RoomData,
} from './types/game';
import {
  coordLabel,
  deserializeFleet,
  encodeAttack,
  evaluateAttack,
  generateRandomFleet,
  getSmartAiAttack,
  parseAttack,
  serializeFleet,
} from './lib/battleshipLogic';
import { soundController } from './lib/audio';
import { Navbar } from './components/Navbar';
import { FleetPlacement } from './components/FleetPlacement';
import { RadarGrid } from './components/RadarGrid';
import { CombatLog } from './components/CombatLog';
import { VictoryModal } from './components/VictoryModal';
import {
  Swords,
  PlusCircle,
  LogIn,
  Bot,
  Copy,
  Check,
  Share2,
  Users,
  Shield,
  Crosshair,
  Volume2,
  Anchor,
  Loader2,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [playerName, setPlayerName] = useState<string>('Comandante');

  // Navigation & mode
  const [gameMode, setGameMode] = useState<'lobby' | 'waiting' | 'placing' | 'battle' | 'finished'>('lobby');
  const [isAiMode, setIsAiMode] = useState<boolean>(false);

  // Multiplayer room state
  const [roomId, setRoomId] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [myRole, setMyRole] = useState<PlayerRole>('host');
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Fleets & Combat
  const [myFleet, setMyFleet] = useState<PlacedShip[]>([]);
  const [revealedOpponentFleet, setRevealedOpponentFleet] = useState<PlacedShip[]>([]);
  const [showEndgameModal, setShowEndgameModal] = useState<boolean>(false);

  // AI Mode specific state
  const [aiFleet, setAiFleet] = useState<PlacedShip[]>([]);
  const [aiAttacks, setAiAttacks] = useState<AttackRecord[]>([]); // Attacks by AI on player
  const [playerAttacksOnAi, setPlayerAttacksOnAi] = useState<AttackRecord[]>([]); // Attacks by player on AI
  const [aiTurn, setAiTurn] = useState<boolean>(false);

  // Ref to hold current fleet so Firestore snapshot listener always has latest values
  const myFleetRef = useRef<PlacedShip[]>([]);
  useEffect(() => {
    myFleetRef.current = myFleet;
  }, [myFleet]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      setUser(usr);
      if (usr) {
        setPlayerName(usr.displayName || 'Comandante');
      } else {
        // Sign in anonymously as a fallback so every visitor can create/join rooms immediately
        try {
          const anon = await signInAnonymously(auth);
          setUser(anon.user);
        } catch {
          // ignore
        }
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Check URL query parameters for ?room=CODE
  useEffect(() => {
    if (!authReady) return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setJoinCodeInput(roomParam.toUpperCase());
    }
  }, [authReady]);

  // Real-time Firestore Room Listener
  useEffect(() => {
    if (!roomId || isAiMode) return;

    const roomPath = `rooms/${roomId}`;
    const unsubscribe = onSnapshot(
      doc(db, 'rooms', roomId),
      async (snap) => {
        if (!snap.exists()) {
          console.warn('Room does not exist anymore');
          setGameMode('lobby');
          setRoomData(null);
          return;
        }

        const data = snap.data() as RoomData;
        setRoomData(data);

        // State Machine transitions based on Firestore data
        if (data.status === 'waiting') {
          setGameMode('waiting');
        } else if (data.status === 'placing') {
          // Both players arrived, placing ships
          if (data.hostReady && data.guestReady) {
            // Both are ready -> transition to battle!
            const nextTurn = data.currentTurn || 'host';
            soundController.playSonar();
            // Host can finalize transition to battle status in Firestore
            if (myRole === 'host') {
              try {
                await updateDoc(doc(db, 'rooms', roomId), {
                  status: 'battle',
                  currentTurn: nextTurn,
                  updatedAt: new Date().toISOString(),
                });
              } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, roomPath);
              }
            }
          } else {
            setGameMode('placing');
          }
        } else if (data.status === 'battle') {
          setGameMode('battle');
        } else if (data.status === 'finished') {
          setGameMode('finished');
          setShowEndgameModal(true);

          // Fetch opponent's revealed board now that match has concluded!
          const opponentRole = myRole === 'host' ? 'guest' : 'host';
          const opponentBoardPath = `rooms/${roomId}/boards/${opponentRole}`;
          try {
            const oppBoardSnap = await getDoc(doc(db, 'rooms', roomId, 'boards', opponentRole));
            if (oppBoardSnap.exists()) {
              const oppData = oppBoardSnap.data();
              const deserialized = deserializeFleet(oppData.fleet || []);
              setRevealedOpponentFleet(deserialized);
            }
          } catch (err) {
            console.warn('Error reading opponent board:', err);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, roomPath);
      }
    );

    return () => unsubscribe();
  }, [roomId, isAiMode, myRole]);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      soundController.playClick();
      const usr = await loginWithGoogle();
      setUser(usr);
      if (usr.displayName) setPlayerName(usr.displayName);
      setLobbyError('');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Falha ao autenticar com o Google.';
      setLobbyError(msg);
    }
  };

  const handleLogout = async () => {
    soundController.playClick();
    await logoutUser();
    setUser(null);
    setGameMode('lobby');
  };

  // Generate a random 6-character room code like "NV-892"
  const generateRoomCode = () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const nums = '23456789';
    const l1 = letters[Math.floor(Math.random() * letters.length)];
    const l2 = letters[Math.floor(Math.random() * letters.length)];
    const n1 = nums[Math.floor(Math.random() * nums.length)];
    const n2 = nums[Math.floor(Math.random() * nums.length)];
    const n3 = nums[Math.floor(Math.random() * nums.length)];
    return `${l1}${l2}-${n1}${n2}${n3}`;
  };

  const [lobbyError, setLobbyError] = useState<string>('');

  // 1. Create Room (Host)
  const handleCreateRoom = async () => {
    setLobbyError('');
    setIsSubmitting(true);
    soundController.playClick();

    let currentUser = user;
    if (!currentUser) {
      try {
        currentUser = await loginWithGoogle();
        setUser(currentUser);
        if (currentUser.displayName) {
          setPlayerName(currentUser.displayName);
        }
      } catch (authErr: unknown) {
        console.error('Auth error on create room:', authErr);
        setIsSubmitting(false);
        const msg = authErr instanceof Error ? authErr.message : 'É necessário fazer login com o Google para criar uma sala multiplayer online.';
        setLobbyError(msg);
        return;
      }
    }

    if (!currentUser) {
      setIsSubmitting(false);
      setLobbyError('Usuário não autenticado. Faça login para continuar.');
      return;
    }

    const newCode = generateRoomCode();
    const newRoomId = `room_${newCode.replace('-', '')}`;
    const roomPath = `rooms/${newRoomId}`;

    const newRoom: RoomData = {
      id: newRoomId,
      code: newCode,
      hostUid: currentUser.uid,
      hostName: playerName || currentUser.displayName || 'Comandante Host',
      guestUid: null,
      guestName: null,
      status: 'waiting',
      hostReady: false,
      guestReady: false,
      currentTurn: 'host',
      winner: 'none',
      hostAttacks: [],
      guestAttacks: [],
      lastAction: 'Sala de batalha criada. Aguardando oponente...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'rooms', newRoomId), newRoom);
      setRoomId(newRoomId);
      setRoomCode(newCode);
      setMyRole('host');
      setIsAiMode(false);
      setGameMode('waiting');
      soundController.playSonar();
    } catch (err: unknown) {
      console.error('Error creating room in Firestore:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('permission') || errMsg.includes('insufficient permissions')) {
        setLobbyError(
          'Permissão negada no Firestore: Você precisa publicar as regras de segurança no Console do Firebase (Firestore Database > aba Regras) do seu projeto "batalha--naval".'
        );
      } else {
        setLobbyError('Erro ao registrar a sala no Firebase Firestore. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Join Room (Guest)
  const handleJoinRoom = async () => {
    if (!joinCodeInput.trim()) {
      setJoinError('Por favor, digite o código da sala.');
      return;
    }
    setJoinError('');
    setLobbyError('');
    setIsSubmitting(true);
    soundController.playClick();

    let currentUser = user;
    if (!currentUser) {
      try {
        currentUser = await loginWithGoogle();
        setUser(currentUser);
        if (currentUser.displayName) {
          setPlayerName(currentUser.displayName);
        }
      } catch (authErr: unknown) {
        console.error('Auth error on join room:', authErr);
        setIsSubmitting(false);
        const msg = authErr instanceof Error ? authErr.message : 'É necessário fazer login com o Google para entrar na sala.';
        setJoinError(msg);
        return;
      }
    }

    if (!currentUser) {
      setIsSubmitting(false);
      setJoinError('Usuário não autenticado. Faça login para continuar.');
      return;
    }

    const formattedCode = joinCodeInput.trim().toUpperCase();
    const candidateId = `room_${formattedCode.replace('-', '')}`;

    try {
      let targetDocId = candidateId;
      let roomSnap = await getDoc(doc(db, 'rooms', candidateId));

      if (!roomSnap.exists()) {
        const testSnap = await getDoc(doc(db, 'rooms', formattedCode));
        if (testSnap.exists()) {
          targetDocId = formattedCode;
          roomSnap = testSnap;
        } else {
          setJoinError('Sala não encontrada. Verifique o código e tente novamente.');
          setIsSubmitting(false);
          return;
        }
      }

      const rData = roomSnap.data() as RoomData;
      if (rData.status !== 'waiting' && rData.guestUid !== currentUser.uid) {
        setJoinError('Esta partida já está em andamento ou a sala já foi preenchida.');
        setIsSubmitting(false);
        return;
      }

      // Join as guest
      await updateDoc(doc(db, 'rooms', targetDocId), {
        guestUid: currentUser.uid,
        guestName: playerName || currentUser.displayName || 'Comandante Convidado',
        status: 'placing',
        updatedAt: new Date().toISOString(),
        lastAction: `${playerName || currentUser.displayName} entrou na sala! Posicionem suas frotas.`,
      });

      setRoomId(targetDocId);
      setRoomCode(rData.code);
      setMyRole('guest');
      setIsAiMode(false);
      setGameMode('placing');
      soundController.playSonar();
    } catch (err) {
      console.error('Error joining room in Firestore:', err);
      setJoinError('Erro ao conectar à sala. Verifique o código e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Start AI Practice Mode
  const handleStartAiMode = () => {
    soundController.playClick();
    setIsAiMode(true);
    setMyRole('host');
    setRoomCode('TREINO-IA');
    setAiFleet(generateRandomFleet());
    setAiAttacks([]);
    setPlayerAttacksOnAi([]);
    setAiTurn(false);
    setGameMode('placing');
    soundController.playSonar();
  };

  // 4. Confirm Fleet Ready (Both AI & Multiplayer)
  const handleConfirmReady = async (fleet: PlacedShip[]) => {
    setMyFleet(fleet);
    myFleetRef.current = fleet;

    if (isAiMode) {
      // In AI Mode, immediately proceed to battle!
      setGameMode('battle');
      soundController.playLaunch();
      return;
    }

    if (!roomId || !user) return;
    setIsSubmitting(true);

    try {
      // Save secret fleet to /rooms/{roomId}/boards/{role}
      // Security rules: only owner can read during battle; both can read when finished!
      const boardPath = `rooms/${roomId}/boards/${myRole}`;
      await setDoc(doc(db, 'rooms', roomId, 'boards', myRole), {
        roomId,
        playerId: user.uid,
        role: myRole,
        fleet: serializeFleet(fleet),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update room readiness
      const roomUpdate: Partial<RoomData> = {
        updatedAt: new Date().toISOString(),
      };

      if (myRole === 'host') {
        roomUpdate.hostReady = true;
      } else {
        roomUpdate.guestReady = true;
      }

      // If opponent is already ready, transition to battle!
      const currentGuestReady = myRole === 'guest' ? true : roomData?.guestReady;
      const currentHostReady = myRole === 'host' ? true : roomData?.hostReady;

      if (currentGuestReady && currentHostReady) {
        roomUpdate.status = 'battle';
        roomUpdate.currentTurn = 'host';
        roomUpdate.lastAction = 'Frotas posicionadas! A batalha começou. Host dispara primeiro!';
      } else {
        roomUpdate.lastAction = `${playerName} está pronto! Aguardando oponente...`;
      }

      await updateDoc(doc(db, 'rooms', roomId), roomUpdate);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rooms/${roomId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Execute Attack Move
  const handleFireAttack = async (coord: Coordinate) => {
    if (isAiMode) {
      // AI Mode attack execution
      if (aiTurn || gameMode !== 'battle') return;

      soundController.playLaunch();
      const evalResult = evaluateAttack(coord, aiFleet, playerAttacksOnAi);

      const newPlayerAttack: AttackRecord = {
        x: coord.x,
        y: coord.y,
        result: evalResult.result,
        sunkShipName: evalResult.sunkShipName,
        timestamp: Date.now(),
      };

      const updatedPlayerAttacks = [...playerAttacksOnAi, newPlayerAttack];
      setPlayerAttacksOnAi(updatedPlayerAttacks);

      if (evalResult.result === 'hit') {
        if (evalResult.sunkShipName) {
          soundController.playShipSunk();
        } else {
          soundController.playExplosion();
        }
      } else {
        soundController.playSplash();
      }

      // Check win condition
      if (evalResult.allSunk) {
        soundController.playVictory();
        setRevealedOpponentFleet(aiFleet);
        setGameMode('finished');
        setShowEndgameModal(true);
        return;
      }

      // Switch turn to AI with brief simulated thinking delay
      setAiTurn(true);
      setTimeout(() => {
        handleAiTurnExecution(updatedPlayerAttacks);
      }, 900);
      return;
    }

    // Multiplayer Mode attack execution
    if (!roomId || !roomData || !user) return;
    const isMyTurn = (myRole === 'host' && roomData.currentTurn === 'host') ||
                     (myRole === 'guest' && roomData.currentTurn === 'guest');

    if (!isMyTurn || roomData.status !== 'battle') return;

    soundController.playLaunch();
    setIsSubmitting(true);

    try {
      // Retrieve opponent's board to evaluate attack
      // Note: During active battle, the client evaluates their attack against the target board
      // To strictly adhere to privacy rules, each attack is registered:
      // Let's resolve the attack by reading the board doc or through attack verification
      const opponentRole = myRole === 'host' ? 'guest' : 'host';
      const myAttacksList = myRole === 'host' ? roomData.hostAttacks : roomData.guestAttacks;
      const parsedPastAttacks = myAttacksList.map(parseAttack).filter((a): a is AttackRecord => a !== null);

      // In peer turn execution:
      // Let's read opponent's board to resolve hit
      // Wait, let's verify if getDoc on boards/{opponentRole} is permitted or if opponent resolves:
      // If the rule allows finished matches to read, what about during battle?
      // Let's check our firestore.rules:
      // In firestore.rules: boards can be read if existing().playerId == request.auth.uid OR status == 'finished'.
      // Therefore, if the attacker cannot read the defender's board, how does the defender resolve?
      // Simple! The attacker writes `pendingAttack: { by: myRole, x: coord.x, y: coord.y }`.
      // When defender's onSnapshot detects `pendingAttack`, defender checks `myFleetRef.current`,
      // records the hit/miss into attacker's attacks list in the room, and flips the turn!
      // This is 100% compliant with zero-trust information hiding!
      // But what if the defender is waiting? Let's check if we can do that or if we update the room:
      await updateDoc(doc(db, 'rooms', roomId), {
        pendingAttack: {
          by: myRole,
          x: coord.x,
          y: coord.y,
          timestamp: Date.now(),
        },
        lastAction: `${playerName} disparou torpedo nas coordenadas ${coordLabel(coord.x, coord.y)}!`,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Listener for incoming attacks to resolve against local fleet (Multiplayer defense resolver)
  useEffect(() => {
    if (!roomId || isAiMode || !roomData) return;
    const pending = (roomData as unknown as { pendingAttack?: { by: PlayerRole; x: number; y: number; timestamp: number } }).pendingAttack;

    if (!pending) return;

    // If pending attack is directed at ME (e.g. pending.by !== myRole)
    if (pending.by !== myRole) {
      const incomingCoord: Coordinate = { x: pending.x, y: pending.y };
      const currentFleet = myFleetRef.current;
      const opponentRole = pending.by;

      // Existing attacks from opponent
      const opponentAttacksRaw = opponentRole === 'host' ? roomData.hostAttacks : roomData.guestAttacks;
      const parsedOpponentAttacks = opponentAttacksRaw.map(parseAttack).filter((a): a is AttackRecord => a !== null);

      // Evaluate against my own secret fleet!
      const evalResult = evaluateAttack(incomingCoord, currentFleet, parsedOpponentAttacks);

      const attackRecord: AttackRecord = {
        x: incomingCoord.x,
        y: incomingCoord.y,
        result: evalResult.result,
        sunkShipName: evalResult.sunkShipName,
      };

      const encoded = encodeAttack(attackRecord);

      // Play sound locally on receipt of attack
      if (evalResult.result === 'hit') {
        if (evalResult.sunkShipName) {
          soundController.playShipSunk();
        } else {
          soundController.playExplosion();
        }
      } else {
        soundController.playSplash();
      }

      // Update room in Firestore
      const updatedAttacks = [...opponentAttacksRaw, encoded];
      const roomUpdate: Record<string, unknown> = {
        pendingAttack: null, // clear pending
        currentTurn: myRole, // switch turn to me
        updatedAt: new Date().toISOString(),
      };

      if (opponentRole === 'host') {
        roomUpdate.hostAttacks = updatedAttacks;
      } else {
        roomUpdate.guestAttacks = updatedAttacks;
      }

      // If all my ships are sunk, opponent wins!
      if (evalResult.allSunk) {
        roomUpdate.winner = opponentRole;
        roomUpdate.status = 'finished';
        roomUpdate.lastAction = `Todas as embarcações de ${playerName} foram afundadas! Fim de jogo!`;
      } else if (evalResult.sunkShipName) {
        roomUpdate.lastAction = `ALERTA: ${playerName} teve seu ${evalResult.sunkShipName} AFUNDADO!`;
      } else if (evalResult.result === 'hit') {
        roomUpdate.lastAction = `FOGO! Ataque em ${coordLabel(incomingCoord.x, incomingCoord.y)} atingiu uma embarcação!`;
      } else {
        roomUpdate.lastAction = `ÁGUA! Ataque em ${coordLabel(incomingCoord.x, incomingCoord.y)} atingiu o oceano.`;
      }

      updateDoc(doc(db, 'rooms', roomId), roomUpdate).catch((err) => {
        console.error('Error resolving pending attack:', err);
      });
    }
  }, [roomData, myRole, roomId, isAiMode, playerName]);

  // AI turn execution in Practice Mode
  const handleAiTurnExecution = (currentAttacksOnAi: AttackRecord[]) => {
    soundController.playLaunch();
    const nextTarget = getSmartAiAttack(aiAttacks);
    const evalResult = evaluateAttack(nextTarget, myFleet, aiAttacks);

    const newAiAttack: AttackRecord = {
      x: nextTarget.x,
      y: nextTarget.y,
      result: evalResult.result,
      sunkShipName: evalResult.sunkShipName,
      timestamp: Date.now(),
    };

    const updatedAiAttacks = [...aiAttacks, newAiAttack];
    setAiAttacks(updatedAiAttacks);

    if (evalResult.result === 'hit') {
      if (evalResult.sunkShipName) {
        soundController.playShipSunk();
      } else {
        soundController.playExplosion();
      }
    } else {
      soundController.playSplash();
    }

    if (evalResult.allSunk) {
      // AI won
      setRevealedOpponentFleet(aiFleet);
      setGameMode('finished');
      setShowEndgameModal(true);
      return;
    }

    // Switch turn back to human
    setAiTurn(false);
  };

  // Broadcast Tactical Radio Chat
  const handleSendRadio = async (message: string) => {
    soundController.playClick();
    if (isAiMode) return;
    if (!roomId) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        lastAction: `[Rádio] ${playerName}: "${message}"`,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  };

  // Rematch handler
  const handleRematch = async () => {
    soundController.playClick();
    setShowEndgameModal(false);
    setRevealedOpponentFleet([]);

    if (isAiMode) {
      handleStartAiMode();
      return;
    }

    if (!roomId) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'placing',
        hostReady: false,
        guestReady: false,
        hostAttacks: [],
        guestAttacks: [],
        winner: 'none',
        currentTurn: 'host',
        lastAction: 'Revanche iniciada! Reposicione sua frota.',
        updatedAt: new Date().toISOString(),
      });
      setGameMode('placing');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  // Exit back to lobby
  const handleExitToLobby = () => {
    soundController.playClick();
    setGameMode('lobby');
    setRoomId('');
    setRoomCode('');
    setRoomData(null);
    setMyFleet([]);
    setRevealedOpponentFleet([]);
    setShowEndgameModal(false);
  };

  // Copy share invite link
  const copyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      soundController.playClick();
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Parse current attacks for render
  const myAttacks: AttackRecord[] = isAiMode
    ? playerAttacksOnAi
    : myRole === 'host'
    ? (roomData?.hostAttacks || []).map(parseAttack).filter((a): a is AttackRecord => a !== null)
    : (roomData?.guestAttacks || []).map(parseAttack).filter((a): a is AttackRecord => a !== null);

  const opponentAttacks: AttackRecord[] = isAiMode
    ? aiAttacks
    : myRole === 'host'
    ? (roomData?.guestAttacks || []).map(parseAttack).filter((a): a is AttackRecord => a !== null)
    : (roomData?.hostAttacks || []).map(parseAttack).filter((a): a is AttackRecord => a !== null);

  const isMyTurnInBattle = isAiMode
    ? !aiTurn
    : myRole === 'host'
    ? roomData?.currentTurn === 'host'
    : roomData?.currentTurn === 'guest';

  const isWinner = isAiMode
    ? myAttacks.some((a) => a.sunkShipName) && !opponentAttacks.some((a) => a.sunkShipName && myFleet.every((s) => s.coordinates.length === 0))
    : roomData?.winner === myRole;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navbar with Room ID & Auth */}
      <Navbar
        user={user}
        roomCode={roomCode}
        onLogin={handleGoogleLogin}
        onLogout={handleLogout}
        onBackToMenu={handleExitToLobby}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* LOBBY VIEW */}
        {gameMode === 'lobby' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full py-8">
            {/* Hero Banner */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold mb-4 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Anchor className="w-3.5 h-3.5 text-cyan-400" />
                <span>BATALHA NAVAL MULTIPLAYER EM TEMPO REAL</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-wider text-slate-100 mb-3">
                Comando Naval <span className="text-cyan-400">Tático</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto">
                Posicione estrategicamente seus navios de guerra, gere um código de
                sala para convidar um amigo e destrua a frota inimiga em turnos
                simultâneos pelo Firestore.
              </p>
            </div>

            {/* Lobby Error Alert Banner */}
            {lobbyError && (
              <div className="w-full max-w-xl mb-6 p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{lobbyError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLobbyError('')}
                  className="text-red-400 hover:text-red-200 font-bold px-2 py-0.5 rounded hover:bg-red-900/40"
                >
                  ✕
                </button>
              </div>
            )}

            {/* User Account / Nickname Bar */}
            <div className="w-full max-w-xl mb-8 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label htmlFor="nickname" className="text-xs font-mono text-slate-400 uppercase font-bold shrink-0">
                  Comandante:
                </label>
                <input
                  id="nickname"
                  type="text"
                  maxLength={20}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Nome do Almirante"
                  className="flex-1 sm:w-44 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-cyan-300 font-semibold focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="w-full sm:w-auto flex items-center justify-end">
                {user ? (
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="truncate max-w-[150px]">Google Conectado</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-semibold transition"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Conectar Google</span>
                  </button>
                )}
              </div>
            </div>

            {/* Game Mode Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {/* Card 1: Create Room */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 transition-all duration-200 flex flex-col justify-between shadow-[0_0_20px_rgba(6,182,212,0.08)] group">
                <div>
                  <div className="p-3 w-12 h-12 rounded-xl bg-cyan-950/90 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wide mb-1">
                    Criar Sala
                  </h2>
                  <p className="text-xs text-slate-400 mb-6">
                    Gere uma nova sala com código exclusivo e link de convite para jogar com outro participante.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : user ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Criar Nova Sala</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Entrar com Google & Criar</span>
                    </>
                  )}
                </button>
              </div>

              {/* Card 2: Join Room */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-700 hover:border-cyan-500/50 transition-all duration-200 flex flex-col justify-between group">
                <div>
                  <div className="p-3 w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wide mb-1">
                    Entrar em Sala
                  </h2>
                  <p className="text-xs text-slate-400 mb-4">
                    Insira o código de 6 caracteres fornecido pelo seu oponente.
                  </p>

                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => {
                      setJoinCodeInput(e.target.value.toUpperCase());
                      setJoinError('');
                    }}
                    placeholder="EX: NV-892"
                    maxLength={10}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center text-sm font-mono font-bold tracking-widest text-cyan-300 focus:outline-none focus:border-cyan-400 mb-2 uppercase"
                  />
                  {joinError && (
                    <p className="text-[11px] text-red-400 mb-2">{joinError}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleJoinRoom}
                  disabled={isSubmitting || !joinCodeInput.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-50 text-slate-100 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>Conectar à Sala</span>
                    </>
                  )}
                </button>
              </div>

              {/* Card 3: Solo AI Practice */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-400 transition-all duration-200 flex flex-col justify-between shadow-[0_0_20px_rgba(16,185,129,0.08)] group">
                <div>
                  <div className="p-3 w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                    <Bot className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wide mb-1">
                    Treino vs IA
                  </h2>
                  <p className="text-xs text-slate-400 mb-6">
                    Jogue agora mesmo contra um Almirante Virtual com algoritmo de busca tática sem esperar ninguém.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartAiMode}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition"
                >
                  <Swords className="w-4 h-4" />
                  <span>Jogar Solo vs IA</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WAITING FOR OPPONENT VIEW */}
        {gameMode === 'waiting' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full py-12 text-center">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-2xl w-full">
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-950 border border-cyan-500/50 mb-5">
                <Users className="w-10 h-10 text-cyan-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-100 mb-1">
                Aguardando Oponente...
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-6">
                Compartilhe o código ou envie o link direto para seu amigo entrar na partida.
              </p>

              {/* Glowing Code Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 mb-5">
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-widest mb-1">
                  Código da Sala
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-cyan-300">
                  {roomCode}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Link Copiado para Área de Transferência!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Copiar Link de Convite</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleExitToLobby}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
                >
                  Cancelar e Voltar ao Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FLEET PLACEMENT VIEW */}
        {gameMode === 'placing' && (
          <div className="flex-1 flex flex-col justify-center">
            <FleetPlacement
              onConfirmReady={handleConfirmReady}
              isLoading={isSubmitting}
            />
          </div>
        )}

        {/* ACTIVE BATTLE VIEW */}
        {(gameMode === 'battle' || gameMode === 'finished') && (
          <div className="flex-1 flex flex-col gap-4">
            {/* Turn Status Alert Banner */}
            <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg transition-all ${
              isMyTurnInBattle
                ? 'bg-emerald-950/60 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'bg-amber-950/60 border-amber-500/40'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isMyTurnInBattle ? 'bg-emerald-900/60 text-emerald-400' : 'bg-amber-900/60 text-amber-400'
                }`}>
                  <Crosshair className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className={isMyTurnInBattle ? 'text-emerald-300' : 'text-amber-300'}>
                      {isMyTurnInBattle ? 'SEU TURNO DE DISPARO' : 'TURNO DO OPONENTE'}
                    </span>
                    {isMyTurnInBattle && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {isMyTurnInBattle
                      ? 'Selecione uma coordenada no Radar Inimigo para lançar o ataque.'
                      : isAiMode
                      ? 'O Almirante IA está calculando trajetória de tiro...'
                      : 'Aguardando ação tática do oponente...'}
                  </p>
                </div>
              </div>

              {/* Status Action Marquee */}
              <div className="text-xs font-mono px-3 py-1 rounded bg-slate-950/80 border border-slate-800 text-slate-300 max-w-sm truncate text-center sm:text-right">
                {roomData?.lastAction || 'Batalha naval em andamento'}
              </div>
            </div>

            {/* Battle Layout: Two Grids + Combat Log */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Grid 1: Radar Inimigo (Attack) */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <RadarGrid
                  title="RADAR INIMIGO (ÁREA DE ATAQUE)"
                  subtitle={isMyTurnInBattle ? 'Clique para disparar míssil' : 'Aguardando seu turno...'}
                  mode="attack"
                  attacks={myAttacks}
                  revealedFleet={revealedOpponentFleet}
                  isMyTurn={isMyTurnInBattle}
                  onCellClick={handleFireAttack}
                />
              </div>

              {/* Grid 2: Sua Frota (Defense) */}
              <div className="lg:col-span-4 flex flex-col items-center">
                <RadarGrid
                  title="SUA FROTA (DEFESA)"
                  subtitle="Seus navios e ataques sofridos"
                  mode="defense"
                  fleet={myFleet}
                  attacks={opponentAttacks}
                />
              </div>

              {/* Column 3: Combat Log & Telemetry */}
              <div className="lg:col-span-3 flex flex-col h-full">
                <CombatLog
                  myAttacks={myAttacks}
                  opponentAttacks={opponentAttacks}
                  myFleet={myFleet}
                  myRoleName={playerName}
                  opponentRoleName={isAiMode ? 'Almirante IA' : roomData?.guestName || 'Oponente'}
                  onSendRadioMessage={handleSendRadio}
                />
              </div>
            </div>
          </div>
        )}

        {/* VICTORY / DEFEAT MODAL */}
        {showEndgameModal && (
          <VictoryModal
            isWinner={isWinner}
            winnerName={
              isAiMode
                ? isWinner ? playerName : 'Almirante IA'
                : roomData?.winner === 'host'
                ? roomData.hostName
                : roomData?.guestName || 'Oponente'
            }
            myAttacks={myAttacks}
            opponentAttacks={opponentAttacks}
            onRematch={handleRematch}
            onExit={handleExitToLobby}
            onInspectBoard={() => setShowEndgameModal(false)}
          />
        )}
      </main>
    </div>
  );
}
