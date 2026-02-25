export type Color = 'white' | 'black'

export type PieceType =
  | 'pawn'
  | 'rook'
  | 'knight'
  | 'bishop'
  | 'queen'
  | 'king'

export type Piece = {
  type: PieceType
  color: Color
}

export type BoardCell = Piece | null
export type Board = BoardCell[][]

export type Position = {
  row: number
  col: number
}

export type CastlingRights = {
  whiteKingSide: boolean
  whiteQueenSide: boolean
  blackKingSide: boolean
  blackQueenSide: boolean
}

export type Move = {
  from: Position
  to: Position
  piece: Piece
  captured: Piece | null
  isEnPassant: boolean
  isCastling: boolean
}

export type GeneratedMove = {
  to: Position
  isEnPassant?: boolean
  isCastling?: boolean
}

export const DEFAULT_CASTLING_RIGHTS: CastlingRights = {
  whiteKingSide: true,
  whiteQueenSide: true,
  blackKingSide: true,
  blackQueenSide: true,
}

export function createInitialBoard(): Board {
  const boardSize = 8
  const board: Board = []

  const backRank: PieceType[] = [
    'rook',
    'knight',
    'bishop',
    'queen',
    'king',
    'bishop',
    'knight',
    'rook',
  ]

  for (let row = 0; row < boardSize; row++) {
    const currentRow: BoardCell[] = []

    for (let col = 0; col < boardSize; col++) {
      let cell: BoardCell = null

      if (row === 0) {
        cell = { type: backRank[col], color: 'black' }
      } else if (row === 1) {
        cell = { type: 'pawn', color: 'black' }
      } else if (row === 6) {
        cell = { type: 'pawn', color: 'white' }
      } else if (row === 7) {
        cell = { type: backRank[col], color: 'white' }
      }

      currentRow.push(cell)
    }

    board.push(currentRow)
  }

  return board
}

export function oppositeColor(color: Color): Color {
  return color === 'white' ? 'black' : 'white'
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
}

export function isInsideBoard(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8
}

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col
}

function getPieceAt(board: Board, pos: Position): Piece | null {
  if (!isInsideBoard(pos)) {
    return null
  }

  return board[pos.row][pos.col]
}

function pushIfValid(
  board: Board,
  fromPiece: Piece,
  target: Position,
  moves: GeneratedMove[],
): void {
  if (!isInsideBoard(target)) {
    return
  }

  const occupant = getPieceAt(board, target)
  if (!occupant || occupant.color !== fromPiece.color) {
    moves.push({ to: target })
  }
}

function getSlidingMoves(
  board: Board,
  from: Position,
  piece: Piece,
  directions: Array<{ row: number; col: number }>,
): GeneratedMove[] {
  const moves: GeneratedMove[] = []

  for (const dir of directions) {
    let r = from.row + dir.row
    let c = from.col + dir.col

    while (isInsideBoard({ row: r, col: c })) {
      const target = { row: r, col: c }
      const occupant = getPieceAt(board, target)

      if (!occupant) {
        moves.push({ to: target })
      } else {
        if (occupant.color !== piece.color) {
          moves.push({ to: target })
        }
        break
      }

      r += dir.row
      c += dir.col
    }
  }

  return moves
}

function getPawnMoves(
  board: Board,
  from: Position,
  piece: Piece,
  enPassantTarget: Position | null,
): GeneratedMove[] {
  const moves: GeneratedMove[] = []
  const direction = piece.color === 'white' ? -1 : 1
  const startRow = piece.color === 'white' ? 6 : 1

  const oneStep = { row: from.row + direction, col: from.col }
  if (isInsideBoard(oneStep) && !getPieceAt(board, oneStep)) {
    moves.push({ to: oneStep })

    const twoStep = { row: from.row + direction * 2, col: from.col }
    if (from.row === startRow && !getPieceAt(board, twoStep)) {
      moves.push({ to: twoStep })
    }
  }

  for (const dc of [-1, 1]) {
    const capturePos = { row: from.row + direction, col: from.col + dc }
    if (!isInsideBoard(capturePos)) {
      continue
    }

    const occupant = getPieceAt(board, capturePos)
    if (occupant && occupant.color !== piece.color) {
      moves.push({ to: capturePos })
      continue
    }

    if (enPassantTarget && samePosition(capturePos, enPassantTarget)) {
      moves.push({ to: capturePos, isEnPassant: true })
    }
  }

  return moves
}

function getKnightMoves(board: Board, from: Position, piece: Piece): GeneratedMove[] {
  const moves: GeneratedMove[] = []
  const jumps = [
    { row: -2, col: -1 },
    { row: -2, col: 1 },
    { row: -1, col: -2 },
    { row: -1, col: 2 },
    { row: 1, col: -2 },
    { row: 1, col: 2 },
    { row: 2, col: -1 },
    { row: 2, col: 1 },
  ]

  for (const jump of jumps) {
    pushIfValid(
      board,
      piece,
      { row: from.row + jump.row, col: from.col + jump.col },
      moves,
    )
  }

  return moves
}

function getKingMoves(
  board: Board,
  from: Position,
  piece: Piece,
  castlingRights: CastlingRights,
): GeneratedMove[] {
  const moves: GeneratedMove[] = []

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) {
        continue
      }

      pushIfValid(board, piece, { row: from.row + dr, col: from.col + dc }, moves)
    }
  }

  if (piece.color === 'white' && from.row === 7 && from.col === 4) {
    if (
      castlingRights.whiteKingSide &&
      !board[7][5] &&
      !board[7][6] &&
      !isSquareAttacked(board, { row: 7, col: 4 }, 'black') &&
      !isSquareAttacked(board, { row: 7, col: 5 }, 'black') &&
      !isSquareAttacked(board, { row: 7, col: 6 }, 'black')
    ) {
      moves.push({ to: { row: 7, col: 6 }, isCastling: true })
    }

    if (
      castlingRights.whiteQueenSide &&
      !board[7][1] &&
      !board[7][2] &&
      !board[7][3] &&
      !isSquareAttacked(board, { row: 7, col: 4 }, 'black') &&
      !isSquareAttacked(board, { row: 7, col: 3 }, 'black') &&
      !isSquareAttacked(board, { row: 7, col: 2 }, 'black')
    ) {
      moves.push({ to: { row: 7, col: 2 }, isCastling: true })
    }
  }

  if (piece.color === 'black' && from.row === 0 && from.col === 4) {
    if (
      castlingRights.blackKingSide &&
      !board[0][5] &&
      !board[0][6] &&
      !isSquareAttacked(board, { row: 0, col: 4 }, 'white') &&
      !isSquareAttacked(board, { row: 0, col: 5 }, 'white') &&
      !isSquareAttacked(board, { row: 0, col: 6 }, 'white')
    ) {
      moves.push({ to: { row: 0, col: 6 }, isCastling: true })
    }

    if (
      castlingRights.blackQueenSide &&
      !board[0][1] &&
      !board[0][2] &&
      !board[0][3] &&
      !isSquareAttacked(board, { row: 0, col: 4 }, 'white') &&
      !isSquareAttacked(board, { row: 0, col: 3 }, 'white') &&
      !isSquareAttacked(board, { row: 0, col: 2 }, 'white')
    ) {
      moves.push({ to: { row: 0, col: 2 }, isCastling: true })
    }
  }

  return moves
}

function getPseudoLegalMoves(
  board: Board,
  from: Position,
  enPassantTarget: Position | null,
  castlingRights: CastlingRights,
): GeneratedMove[] {
  const piece = getPieceAt(board, from)
  if (!piece) {
    return []
  }

  switch (piece.type) {
    case 'pawn':
      return getPawnMoves(board, from, piece, enPassantTarget)
    case 'knight':
      return getKnightMoves(board, from, piece)
    case 'bishop':
      return getSlidingMoves(board, from, piece, [
        { row: -1, col: -1 },
        { row: -1, col: 1 },
        { row: 1, col: -1 },
        { row: 1, col: 1 },
      ])
    case 'rook':
      return getSlidingMoves(board, from, piece, [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 },
      ])
    case 'queen':
      return getSlidingMoves(board, from, piece, [
        { row: -1, col: -1 },
        { row: -1, col: 1 },
        { row: 1, col: -1 },
        { row: 1, col: 1 },
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 },
      ])
    case 'king':
      return getKingMoves(board, from, piece, castlingRights)
    default:
      return []
  }
}

function applyMoveOnBoard(board: Board, from: Position, move: GeneratedMove): Board {
  const next = cloneBoard(board)
  const piece = next[from.row][from.col]

  if (!piece) {
    return next
  }

  next[from.row][from.col] = null

  if (move.isEnPassant) {
    next[from.row][move.to.col] = null
  }

  if (move.isCastling && piece.type === 'king') {
    if (move.to.col === 6) {
      next[move.to.row][5] = next[move.to.row][7]
      next[move.to.row][7] = null
    } else if (move.to.col === 2) {
      next[move.to.row][3] = next[move.to.row][0]
      next[move.to.row][0] = null
    }
  }

  next[move.to.row][move.to.col] = piece
  return next
}

function getAttackSquares(board: Board, from: Position): Position[] {
  const piece = getPieceAt(board, from)
  if (!piece) {
    return []
  }

  if (piece.type === 'pawn') {
    const direction = piece.color === 'white' ? -1 : 1
    const attacks: Position[] = []

    for (const dc of [-1, 1]) {
      const target = { row: from.row + direction, col: from.col + dc }
      if (isInsideBoard(target)) {
        attacks.push(target)
      }
    }

    return attacks
  }

  if (piece.type === 'king') {
    const attacks: Position[] = []

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) {
          continue
        }

        const target = { row: from.row + dr, col: from.col + dc }
        if (isInsideBoard(target)) {
          attacks.push(target)
        }
      }
    }

    return attacks
  }

  const pseudo = getPseudoLegalMoves(
    board,
    from,
    null,
    {
      whiteKingSide: false,
      whiteQueenSide: false,
      blackKingSide: false,
      blackQueenSide: false,
    },
  )

  return pseudo.map((m) => m.to)
}

export function isSquareAttacked(board: Board, square: Position, byColor: Color): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (!piece || piece.color !== byColor) {
        continue
      }

      const attacks = getAttackSquares(board, { row, col })
      if (attacks.some((pos) => samePosition(pos, square))) {
        return true
      }
    }
  }

  return false
}

function findKing(board: Board, color: Color): Position | null {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row, col }
      }
    }
  }

  return null
}

export function isInCheck(board: Board, color: Color): boolean {
  const kingPos = findKing(board, color)
  if (!kingPos) {
    return false
  }

  return isSquareAttacked(board, kingPos, oppositeColor(color))
}

export function getLegalMoves(
  board: Board,
  from: Position,
  turn: Color,
  enPassantTarget: Position | null,
  castlingRights: CastlingRights,
): GeneratedMove[] {
  const piece = getPieceAt(board, from)
  if (!piece || piece.color !== turn) {
    return []
  }

  const pseudoMoves = getPseudoLegalMoves(board, from, enPassantTarget, castlingRights)

  return pseudoMoves.filter((move) => {
    const next = applyMoveOnBoard(board, from, move)
    return !isInCheck(next, turn)
  })
}

export function applyLegalMove(
  board: Board,
  from: Position,
  move: GeneratedMove,
  promotionChoice: PieceType | null,
): { board: Board; move: Move; needsPromotion: boolean } {
  const piece = getPieceAt(board, from)
  if (!piece) {
    throw new Error('No piece at source square')
  }

  const captured = move.isEnPassant ? board[from.row][move.to.col] : board[move.to.row][move.to.col]

  const next = applyMoveOnBoard(board, from, move)
  const movedPiece = next[move.to.row][move.to.col]

  const isPromotionSquare =
    movedPiece?.type === 'pawn' && (move.to.row === 0 || move.to.row === 7)

  if (isPromotionSquare && promotionChoice) {
    next[move.to.row][move.to.col] = {
      type: promotionChoice,
      color: movedPiece.color,
    }
  }

  return {
    board: next,
    move: {
      from,
      to: move.to,
      piece,
      captured,
      isEnPassant: Boolean(move.isEnPassant),
      isCastling: Boolean(move.isCastling),
    },
    needsPromotion: Boolean(isPromotionSquare && !promotionChoice),
  }
}

export function getNextEnPassantTarget(from: Position, to: Position, piece: Piece): Position | null {
  if (piece.type !== 'pawn') {
    return null
  }

  if (Math.abs(from.row - to.row) !== 2) {
    return null
  }

  return {
    row: (from.row + to.row) / 2,
    col: from.col,
  }
}

export function updateCastlingRights(
  rights: CastlingRights,
  move: Move,
): CastlingRights {
  const next = { ...rights }

  if (move.piece.type === 'king') {
    if (move.piece.color === 'white') {
      next.whiteKingSide = false
      next.whiteQueenSide = false
    } else {
      next.blackKingSide = false
      next.blackQueenSide = false
    }
  }

  if (move.piece.type === 'rook') {
    if (move.from.row === 7 && move.from.col === 0) {
      next.whiteQueenSide = false
    }
    if (move.from.row === 7 && move.from.col === 7) {
      next.whiteKingSide = false
    }
    if (move.from.row === 0 && move.from.col === 0) {
      next.blackQueenSide = false
    }
    if (move.from.row === 0 && move.from.col === 7) {
      next.blackKingSide = false
    }
  }

  if (move.captured && move.captured.type === 'rook') {
    if (move.to.row === 7 && move.to.col === 0) {
      next.whiteQueenSide = false
    }
    if (move.to.row === 7 && move.to.col === 7) {
      next.whiteKingSide = false
    }
    if (move.to.row === 0 && move.to.col === 0) {
      next.blackQueenSide = false
    }
    if (move.to.row === 0 && move.to.col === 7) {
      next.blackKingSide = false
    }
  }

  return next
}

export function hasAnyLegalMove(
  board: Board,
  turn: Color,
  enPassantTarget: Position | null,
  castlingRights: CastlingRights,
): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (!piece || piece.color !== turn) {
        continue
      }

      const moves = getLegalMoves(board, { row, col }, turn, enPassantTarget, castlingRights)
      if (moves.length > 0) {
        return true
      }
    }
  }

  return false
}

export function getPieceSymbol(piece: Piece): string {
  if (piece.color === 'white') {
    if (piece.type === 'king') return '♔'
    if (piece.type === 'queen') return '♕'
    if (piece.type === 'rook') return '♖'
    if (piece.type === 'bishop') return '♗'
    if (piece.type === 'knight') return '♘'
    return '♙'
  }

  if (piece.type === 'king') return '♚'
  if (piece.type === 'queen') return '♛'
  if (piece.type === 'rook') return '♜'
  if (piece.type === 'bishop') return '♝'
  if (piece.type === 'knight') return '♞'
  return '♟'
}
