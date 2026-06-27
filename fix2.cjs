const fs = require('fs');

// 1. useGenericGame.ts
let useGenericGame = fs.readFileSync('src/games/_shared/useGenericGame.ts', 'utf-8');
useGenericGame = useGenericGame.replace(/\(_payload\)/g, '(payload)');
// Only disable eslint for the first unused payload
useGenericGame = useGenericGame.replace('(payload) => {\n        // Here we could trigger a callback', '(_payload) => {\n        // Here we could trigger a callback');
fs.writeFileSync('src/games/_shared/useGenericGame.ts', useGenericGame);

// 2. BlackjackTwistPage.tsx
let twist = fs.readFileSync('src/games/blackjack-twist/pages/BlackjackTwistPage.tsx', 'utf-8');
twist = twist.replace(/import { Loader2 } from 'lucide-react'\n/g, ``);
twist = twist.replace(/const { remaining, drawn } = drawCards\(gameState.deck as any, 1\)/g, `const { remaining } = drawCards(gameState.deck as any, 1)`);
fs.writeFileSync('src/games/blackjack-twist/pages/BlackjackTwistPage.tsx', twist);

// 3. twistEngine.ts
let twistEng = fs.readFileSync('src/games/blackjack-twist/engine/twistEngine.ts', 'utf-8');
twistEng = twistEng.replace(/import type { Card } from '..\/..\/_shared\/deck'/g, ``);
fs.writeFileSync('src/games/blackjack-twist/engine/twistEngine.ts', twistEng);

// 4. blackjackEngine.test.ts
let bjTest = fs.readFileSync('src/games/blackjack/engine/__tests__/blackjackEngine.test.ts', 'utf-8');
bjTest = bjTest.replace(/import type { BlackjackState } from '\.\.\/blackjackEngine'/g, ``);
fs.writeFileSync('src/games/blackjack/engine/__tests__/blackjackEngine.test.ts', bjTest);

// 5. blackjackService.ts
let bjServ = fs.readFileSync('src/games/blackjack/services/blackjackService.ts', 'utf-8');
bjServ = bjServ.replace(/const \{ remaining, drawn \} = drawCards\(gameState.deck, 1\)/g, `const { remaining, drawn } = drawCards(gameState.deck as Card[], 1)`);
fs.writeFileSync('src/games/blackjack/services/blackjackService.ts', bjServ);

// 6. FourSeasonsPage.tsx
let fSeason = fs.readFileSync('src/games/four-seasons/pages/FourSeasonsPage.tsx', 'utf-8');
fSeason = fSeason.replace(/if \(roomLoading\) \{\n    return <div>Loading room...<\/div>\n  \}/g, ``);
// Wait, I already removed roomLoading in the previous script but I also removed it from useRoom! Wait, FourSeasonsPage has `if (roomLoading)`?
// Let me just remove `roomLoading` from the destructured useRoom
fSeason = fSeason.replace(/const \{ data: room, isLoading: roomLoading \} = useRoom/g, `const { data: room } = useRoom`);
fs.writeFileSync('src/games/four-seasons/pages/FourSeasonsPage.tsx', fSeason);
