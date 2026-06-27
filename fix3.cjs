const fs = require('fs');

// twistEngine.ts
let twistEng = fs.readFileSync('src/games/blackjack-twist/engine/twistEngine.ts', 'utf-8');
twistEng = twistEng.replace(/import type \{ Card \} from '\.\.\/\.\.\/_shared\/deck'\n/g, '');
twistEng = twistEng.replace(/import \{ getNextTurn \} from '\.\.\/\.\.\/_shared\/turns'\n/g, '');
fs.writeFileSync('src/games/blackjack-twist/engine/twistEngine.ts', twistEng);

// BlackjackTwistPage.tsx
let twist = fs.readFileSync('src/games/blackjack-twist/pages/BlackjackTwistPage.tsx', 'utf-8');
twist = twist.replace(/import \{ Loader2 \} from 'lucide-react'\n/g, '');
twist = twist.replace(/const \{ remaining, drawn \} = drawCards\(gameState\.deck as any, 1\)/g, 'const deck = drawCards(gameState.deck as any, 1)');
fs.writeFileSync('src/games/blackjack-twist/pages/BlackjackTwistPage.tsx', twist);

// blackjackEngine.test.ts
let bjTest = fs.readFileSync('src/games/blackjack/engine/__tests__/blackjackEngine.test.ts', 'utf-8');
bjTest = bjTest.replace(/import \{ BlackjackState, canHit, canStand, nextTurn, dealerPlay, settle, reset \} from '\.\.\/blackjackEngine'/g, "import type { BlackjackState } from '../blackjackEngine'");
fs.writeFileSync('src/games/blackjack/engine/__tests__/blackjackEngine.test.ts', bjTest);

// blackjackService.ts
let bjServ = fs.readFileSync('src/games/blackjack/services/blackjackService.ts', 'utf-8');
bjServ = bjServ.replace(/import type \{ Json \} from '@\/types\/database'\n/g, '');
bjServ = bjServ.replace(/import type \{ Card \} from '\.\.\/types\/blackjack'\n/g, '');
fs.writeFileSync('src/games/blackjack/services/blackjackService.ts', bjServ);

// FourSeasonsPage.tsx
let fSeason = fs.readFileSync('src/games/four-seasons/pages/FourSeasonsPage.tsx', 'utf-8');
fSeason = fSeason.replace(/import \{ Loader2 \} from 'lucide-react'\n/g, '');
fs.writeFileSync('src/games/four-seasons/pages/FourSeasonsPage.tsx', fSeason);
