const fs = require('fs');

// 1. useGenericGame.ts
let useGenericGame = fs.readFileSync('src/games/_shared/useGenericGame.ts', 'utf-8');
useGenericGame = useGenericGame.replace(/\(payload\)/g, '(_payload)');
fs.writeFileSync('src/games/_shared/useGenericGame.ts', useGenericGame);

// 2. BlackjackTwistPage.tsx
let twist = fs.readFileSync('src/games/blackjack-twist/pages/BlackjackTwistPage.tsx', 'utf-8');
twist = twist.replace(/import { TwistState, applyCardEffect, resolveGame, validateMove, calculateScore } from '.\/engine\/twistEngine'/g, `import type { TwistState } from '../engine/twistEngine'\nimport { applyCardEffect, resolveGame, validateMove, calculateScore } from '../engine/twistEngine'`);
twist = twist.replace(/import { useRoom } from '@\/hooks\/useLobby'\n/g, ``);
twist = twist.replace(/import { Loader2 } from 'lucide-react'\n/g, ``);
twist = twist.replace(/const { data: room, isLoading: roomLoading } = useRoom\(roomId \?\? ''\)\n  const { gameState, isHost, updateGameState, emitEvent, isUpdating } = useGenericGame<TwistState>\(roomId \?\? ''\)/g, `const { gameState, updateGameState, emitEvent, isUpdating } = useGenericGame<TwistState>(roomId ?? '')`);
twist = twist.replace(/if \(roomLoading\) \{\n    return \(\n      <div className="flex h-\[calc\(100vh-4rem\)\] items-center justify-center">\n        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" \/>\n      <\/div>\n    \)\n  \}/g, ``);
fs.writeFileSync('src/games/blackjack-twist/pages/BlackjackTwistPage.tsx', twist);

// 3. twistEngine.ts
let twistEng = fs.readFileSync('src/games/blackjack-twist/engine/twistEngine.ts', 'utf-8');
twistEng = twistEng.replace(/import { Card } from '..\/..\/_shared\/deck'/g, `import type { Card } from '../../_shared/deck'`);
twistEng = twistEng.replace(/import { getNextTurn } from '..\/..\/_shared\/turns'\n/g, ``);
fs.writeFileSync('src/games/blackjack-twist/engine/twistEngine.ts', twistEng);

// 4. PlayerSeat.tsx
let playerSeat = fs.readFileSync('src/games/blackjack/components/PlayerSeat.tsx', 'utf-8');
playerSeat = playerSeat.replace(/isMyTurn, /g, ``);
fs.writeFileSync('src/games/blackjack/components/PlayerSeat.tsx', playerSeat);

// 5. blackjackEngine.test.ts
let bjTest = fs.readFileSync('src/games/blackjack/engine/__tests__/blackjackEngine.test.ts', 'utf-8');
bjTest = bjTest.replace(/import { BlackjackState, canHit, canStand, nextTurn, dealerPlay, settle, reset } from '\.\.\/blackjackEngine'/g, `import type { BlackjackState } from '../blackjackEngine'`);
fs.writeFileSync('src/games/blackjack/engine/__tests__/blackjackEngine.test.ts', bjTest);

// 6. blackjackService.ts
let bjServ = fs.readFileSync('src/games/blackjack/services/blackjackService.ts', 'utf-8');
if (!bjServ.includes(`import type { Card }`)) {
  bjServ = `import type { Card } from '../types/blackjack'\n` + bjServ;
}
if (!bjServ.includes(`import type { Json }`)) {
  bjServ = `import type { Json } from '@/types/database'\n` + bjServ;
}
fs.writeFileSync('src/games/blackjack/services/blackjackService.ts', bjServ);

// 7. FourSeasonsPage.tsx
let fSeason = fs.readFileSync('src/games/four-seasons/pages/FourSeasonsPage.tsx', 'utf-8');
fSeason = fSeason.replace(/import { initFourSeasons, tryPlayToFoundation, tryPlayToTableau, drawFromStock, endTurn } from '\.\.\/engine\/fourSeasonsEngine'\n/g, ``);
fSeason = fSeason.replace(/const { gameState, isHost, updateGameState, emitEvent, isUpdating } = useGenericGame<FourSeasonsState>\(roomId \?\? ''\)/g, `const { gameState, updateGameState, emitEvent, isUpdating } = useGenericGame<FourSeasonsState>(roomId ?? '')`);
fs.writeFileSync('src/games/four-seasons/pages/FourSeasonsPage.tsx', fSeason);
