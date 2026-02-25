import { useMemo, useState } from 'react'
import './App.css'
import {
  DEFAULT_CASTLING_RIGHTS,
  applyLegalMove,
  createInitialBoard,
  getLegalMoves,
  getNextEnPassantTarget,
  getPieceSymbol,
  hasAnyLegalMove,
  isInCheck,
  oppositeColor,
  updateCastlingRights,
} from './chess'
import type {
  Board,
  CastlingRights,
  Color,
  GeneratedMove,
  PieceType,
  Position,
} from './chess'

type PendingPromotion = {
  from: Position
  to: Position
  move: GeneratedMove
  color: Color
}

function samePos(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col
}

function App() {
  const [board, setBoard] = useState<Board>(createInitialBoard())
  const [turn, setTurn] = useState<Color>('white')
  const [selected, setSelected] = useState<Position | null>(null)
  const [legalMoves, setLegalMoves] = useState<GeneratedMove[]>([])
  const [enPassantTarget, setEnPassantTarget] = useState<Position | null>(null)
  const [castlingRights, setCastlingRights] = useState<CastlingRights>(
    DEFAULT_CASTLING_RIGHTS,
  )
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)

  const gameState = useMemo(() => {
    if (pendingPromotion) {
      return 'promotion'
    }

    const hasMove = hasAnyLegalMove(board, turn, enPassantTarget, castlingRights)
    const check = isInCheck(board, turn)

    if (!hasMove && check) {
      return 'checkmate'
    }

    if (!hasMove && !check) {
      return 'stalemate'
    }

    if (check) {
      return 'check'
    }

    return 'playing'
  }, [board, turn, enPassantTarget, castlingRights, pendingPromotion])

  const statusText = useMemo(() => {
    if (gameState === 'promotion') {
      return 'Choose a piece for promotion'
    }

    if (gameState === 'checkmate') {
      return `Checkmate. ${turn === 'white' ? 'Black' : 'White'} wins.`
    }

    if (gameState === 'stalemate') {
      return 'Stalemate. Draw.'
    }

    if (gameState === 'check') {
      return `${turn === 'white' ? 'White' : 'Black'} to move. Check.`
    }

    return `${turn === 'white' ? 'White' : 'Black'} to move.`
  }, [gameState, turn])

  const trySelect = (pos: Position): void => {
    const piece = board[pos.row][pos.col]
    if (!piece || piece.color !== turn) {
      setSelected(null)
      setLegalMoves([])
      return
    }

    const moves = getLegalMoves(board, pos, turn, enPassantTarget, castlingRights)
    setSelected(pos)
    setLegalMoves(moves)
  }

  const finishMove = (
    from: Position,
    move: GeneratedMove,
    promotionChoice: PieceType | null,
  ): void => {
    const result = applyLegalMove(board, from, move, promotionChoice)

    if (result.needsPromotion) {
      const piece = board[from.row][from.col]
      if (!piece) {
        return
      }

      setPendingPromotion({
        from,
        to: move.to,
        move,
        color: piece.color,
      })
      return
    }

    const nextTurn = oppositeColor(turn)
    const nextEnPassant = getNextEnPassantTarget(result.move.from, result.move.to, result.move.piece)
    const nextRights = updateCastlingRights(castlingRights, result.move)

    setBoard(result.board)
    setTurn(nextTurn)
    setEnPassantTarget(nextEnPassant)
    setCastlingRights(nextRights)
    setSelected(null)
    setLegalMoves([])
  }

  const onCellClick = (row: number, col: number): void => {
    if (gameState === 'checkmate' || gameState === 'stalemate' || pendingPromotion) {
      return
    }

    const pos = { row, col }

    if (!selected) {
      trySelect(pos)
      return
    }

    if (samePos(selected, pos)) {
      setSelected(null)
      setLegalMoves([])
      return
    }

    const selectedMove = legalMoves.find((m) => samePos(m.to, pos))
    if (selectedMove) {
      finishMove(selected, selectedMove, null)
      return
    }

    trySelect(pos)
  }

  const onPromote = (pieceType: PieceType): void => {
    if (!pendingPromotion) {
      return
    }

    finishMove(pendingPromotion.from, pendingPromotion.move, pieceType)
    setPendingPromotion(null)
  }

  const onReset = (): void => {
    setBoard(createInitialBoard())
    setTurn('white')
    setSelected(null)
    setLegalMoves([])
    setEnPassantTarget(null)
    setCastlingRights(DEFAULT_CASTLING_RIGHTS)
    setPendingPromotion(null)
  }

  return (
    <div className="app">
      <h1>Pet project React+TS</h1>
      <div className='status-box'>
      <p className="status">{statusText}</p>
      </div>

      <div className="board">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const pos = { row: rowIndex, col: colIndex }
            const isDark = (rowIndex + colIndex) % 2 === 1
            const isSelected = selected ? samePos(selected, pos) : false
            const isMoveTarget = legalMoves.some((m) => samePos(m.to, pos))

            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                className={`cell ${isDark ? 'dark' : 'light'} ${isSelected ? 'selected' : ''}`}
                type="button"
                onClick={() => onCellClick(rowIndex, colIndex)}
              >
                {isMoveTarget && !piece ? <span className="dot" /> : null}
                {isMoveTarget && piece ? <span className="capture-ring" /> : null}
                <span className={`piece ${piece?.color ?? ''}`}>
                  {piece ? getPieceSymbol(piece) : ''}
                </span>
              </button>
            )
          }),
        )}
      </div>

      <button className="reset" type="button" onClick={onReset}>
        New Game
      </button>

      {pendingPromotion ? (
        <div className="promotion-modal">
          <div className="promotion-card">
            <p className="promotion-text">Choose promotion piece</p>
            <div className="promotion-actions">
              <button type="button" onClick={() => onPromote('queen')}>
                {pendingPromotion.color === 'white' ? '♕' : '♛'} Queen
              </button>
              <button type="button" onClick={() => onPromote('rook')}>
                {pendingPromotion.color === 'white' ? '♖' : '♜'} Rook
              </button>
              <button type="button" onClick={() => onPromote('bishop')}>
                {pendingPromotion.color === 'white' ? '♗' : '♝'} Bishop
              </button>
              <button type="button" onClick={() => onPromote('knight')}>
                {pendingPromotion.color === 'white' ? '♘' : '♞'} Knight
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
