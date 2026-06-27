import { supabase } from '@/lib/supabase'
import type { BlackjackGame, BlackjackPlayer, BlackjackActionType } from '../types/blackjack'
import { deal, nextTurn, dealerPlay, canHit, canStand, drawCards, calculateScore, reset } from '../engine/blackjackEngine'

export const blackjackService = {
  /**
   * Initializes a new blackjack game for a given room.
   */
  async createGame(roomId: string, userIds: string[]) {
    // Check if game already exists
    const { data: existing } = await supabase
      .from('blackjack_games')
      .select('id')
      .eq('room_id', roomId)
      .maybeSingle()

    if (existing) {
      return existing.id
    }

    const { data: game, error: gameError } = await supabase
      .from('blackjack_games')
      .insert({ room_id: roomId })
      .select('id')
      .single()

    if (gameError) throw new Error(gameError.message)

    // Insert players
    const playersToInsert = userIds.map((userId, index) => ({
      game_id: game.id,
      user_id: userId,
      seat: index,
    }))

    const { error: playersError } = await supabase
      .from('blackjack_players')
      .insert(playersToInsert)

    if (playersError) throw new Error(playersError.message)

    return game.id
  },

  /**
   * Load the current state of a game.
   */
  async loadGame(roomId: string): Promise<{ game: BlackjackGame | null; players: BlackjackPlayer[] }> {
    const { data: game, error: gameError } = await supabase
      .from('blackjack_games')
      .select('*')
      .eq('room_id', roomId)
      .maybeSingle()

    if (gameError) throw new Error(gameError.message)
    if (!game) return { game: null, players: [] }

    const { data: players, error: playersError } = await supabase
      .from('blackjack_players')
      .select('*')
      .eq('game_id', game.id)
      .order('seat', { ascending: true })

    if (playersError) throw new Error(playersError.message)

    return { game: game as unknown as BlackjackGame, players: players as unknown as BlackjackPlayer[] }
  },

  /**
   * Starts a new round.
   */
  async startRound(game: BlackjackGame, players: BlackjackPlayer[]) {
    const { game: newGameState, players: newPlayersState } = deal(game, players)

    // Move to next turn
    const firstTurn = nextTurn(newPlayersState)
    let status = newGameState.status
    if (firstTurn) {
      status = 'player_turn'
    } else {
      // everyone got blackjack? Go to dealer
      status = 'dealer_turn'
    }

    // Update game
    const { error: gErr } = await supabase
      .from('blackjack_games')
      .update({
        status,
        deck: newGameState.deck,
        dealer_hand: newGameState.dealer_hand,
        dealer_score: newGameState.dealer_score,
        current_turn: firstTurn
      })
      .eq('id', game.id)

    if (gErr) throw new Error(gErr.message)

    // Update players
    for (const p of newPlayersState) {
      await supabase
        .from('blackjack_players')
        .update({
          hand: p.hand,
          score: p.score,
          state: p.state,
          blackjack: p.blackjack,
          standing: p.standing
        })
        .eq('game_id', game.id)
        .eq('user_id', p.user_id)
    }

    await this.logAction(game.id, game.current_turn || players[0].user_id, 'deal')
    
    // If we immediately go to dealer turn (e.g. all players had blackjack)
    if (status === 'dealer_turn') {
      await this.runDealerTurn(game.id)
    }
  },

  /**
   * Player hits.
   */
  async hit(gameId: string, userId: string) {
    // Reload state to ensure consistency
    const { data: game } = await supabase.from('blackjack_games').select('*').eq('id', gameId).single()
    const { data: p } = await supabase.from('blackjack_players').select('*').eq('game_id', gameId).eq('user_id', userId).single()
    
    if (!game || !p) throw new Error('Game or player not found')

    if (!canHit(p as unknown as BlackjackPlayer, game as unknown as BlackjackGame)) throw new Error('Cannot hit right now')

    const draw = drawCards(game.deck as any, 1)
    const newHand = [...(p.hand as any[]), ...draw.drawn] as any
    const newScore = calculateScore(newHand)
    const busted = newScore > 21

    const updatedPlayer = {
      ...p,
      hand: newHand,
      score: newScore,
      busted,
      state: busted ? 'done' : p.state
    }

    await supabase.from('blackjack_players').update({
      hand: newHand,
      score: newScore,
      busted,
      state: updatedPlayer.state
    }).eq('game_id', gameId).eq('user_id', userId)

    await supabase.from('blackjack_games').update({ deck: draw.remainingDeck }).eq('id', gameId)

    await this.logAction(gameId, userId, 'hit')

    if (busted) {
      await this.advanceTurn(gameId)
    }
  },

  /**
   * Player stands.
   */
  async stand(gameId: string, userId: string) {
    const { data: game } = await supabase.from('blackjack_games').select('*').eq('id', gameId).single()
    const { data: p } = await supabase.from('blackjack_players').select('*').eq('game_id', gameId).eq('user_id', userId).single()
    
    if (!game || !p) throw new Error('Game or player not found')
    if (!canStand(p as unknown as BlackjackPlayer, game as unknown as BlackjackGame)) throw new Error('Cannot stand right now')

    await supabase.from('blackjack_players').update({
      standing: true,
      state: 'done'
    }).eq('game_id', gameId).eq('user_id', userId)

    await this.logAction(gameId, userId, 'stand')
    await this.advanceTurn(gameId)
  },

  /**
   * Moves turn to next player or dealer.
   */
  async advanceTurn(gameId: string) {
    await supabase.from('blackjack_games').select('*').eq('id', gameId).single()
    const { data: players } = await supabase.from('blackjack_players').select('*').eq('game_id', gameId).order('seat', { ascending: true })

    const nextTurnId = nextTurn(players as unknown as BlackjackPlayer[])
    
    if (nextTurnId) {
      await supabase.from('blackjack_games').update({ current_turn: nextTurnId }).eq('id', gameId)
    } else {
      // Move to dealer turn
      await supabase.from('blackjack_games').update({ status: 'dealer_turn', current_turn: null }).eq('id', gameId)
      await this.runDealerTurn(gameId)
    }
  },

  /**
   * Run dealer's logic and settle.
   */
  async runDealerTurn(gameId: string) {
    const { data: game } = await supabase.from('blackjack_games').select('*').eq('id', gameId).single()
    if (game!.status !== 'dealer_turn') return

    const playedGame = dealerPlay(game as unknown as BlackjackGame)

    await supabase.from('blackjack_games').update({
      deck: playedGame.deck,
      dealer_hand: playedGame.dealer_hand,
      dealer_score: playedGame.dealer_score,
      status: 'settlement'
    }).eq('id', gameId)

    // In a real app we could calculate payouts here, but we just leave it in 'settlement' 
    // for the UI to display results.
  },

  /**
   * Resets the round.
   */
  async resetRound(gameId: string) {
    const { data: game } = await supabase.from('blackjack_games').select('*').eq('id', gameId).single()
    const { data: players } = await supabase.from('blackjack_players').select('*').eq('game_id', gameId)

    const resetState = reset(game as unknown as BlackjackGame, players as unknown as BlackjackPlayer[])

    await supabase.from('blackjack_games').update({
      status: resetState.game.status,
      deck: resetState.game.deck,
      dealer_hand: resetState.game.dealer_hand,
      dealer_score: resetState.game.dealer_score,
      current_turn: resetState.game.current_turn,
      round: resetState.game.round
    }).eq('id', gameId)

    for (const p of resetState.players) {
      await supabase.from('blackjack_players').update({
        hand: p.hand,
        score: p.score,
        state: p.state,
        blackjack: p.blackjack,
        busted: p.busted,
        standing: p.standing
      }).eq('game_id', gameId).eq('user_id', p.user_id)
    }

    await this.logAction(gameId, game!.current_turn || players![0].user_id, 'reset')
  },

  async logAction(gameId: string, userId: string, type: BlackjackActionType, payload: Record<string, unknown> | null = null) {
    await supabase.from('blackjack_actions').insert({
      game_id: gameId,
      user_id: userId,
      type,
      payload: payload as any
    })
  }
}
