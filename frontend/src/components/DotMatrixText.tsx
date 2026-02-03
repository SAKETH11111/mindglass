import { useEffect, useState, useMemo } from 'react'

// 5x7 dot matrix pattern for each letter (1 = dot, 0 = empty)
const LETTER_PATTERNS: Record<string, number[][]> = {
  P: [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
  ],
  R: [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
    [1,0,1,0,0],
    [1,0,0,1,0],
    [1,0,0,0,1],
  ],
  I: [
    [0,1,1,1,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,1,1,1,0],
  ],
  S: [
    [0,1,1,1,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [0,1,1,1,0],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [1,1,1,1,0],
  ],
  M: [
    [1,0,0,0,1],
    [1,1,0,1,1],
    [1,0,1,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
}

interface DotMatrixTextProps {
  text?: string
  dotWidth?: number
  dotHeight?: number
  dotGap?: number
  letterGap?: number
  activeColor?: string
  inactiveColor?: string
  revealDelay?: number
  className?: string
}

export function DotMatrixText({
  text = 'PRISM',
  dotWidth = 10,
  dotHeight = 14,
  dotGap = 4,
  letterGap = 16,
  activeColor = '#ffffff',
  inactiveColor = 'rgba(255,255,255,0.06)',
  revealDelay = 40,
  className = '',
}: DotMatrixTextProps) {
  const [revealedColumns, setRevealedColumns] = useState(0)

  // Build column-based structure for left-to-right animation
  const { totalColumns } = useMemo(() => {
    const letters = text.split('')
    const cols: { hasDot: boolean; letterIndex: number; row: number; col: number }[][] = []

    // For each column position across all letters
    let globalCol = 0
    letters.forEach((letter, letterIdx) => {
      const pattern = LETTER_PATTERNS[letter] || LETTER_PATTERNS['P']
      const letterWidth = 5

      // For each column in this letter
      for (let c = 0; c < letterWidth; c++) {
        const columnCells: { hasDot: boolean; letterIndex: number; row: number; col: number }[] = []

        // For each row in this column
        for (let r = 0; r < 7; r++) {
          columnCells.push({
            hasDot: pattern[r][c] === 1,
            letterIndex: letterIdx,
            row: r,
            col: globalCol,
          })
        }

        cols.push(columnCells)
        globalCol++
      }

      // Add gap column between letters (except after last letter)
      if (letterIdx < letters.length - 1) {
        const gapCells: { hasDot: boolean; letterIndex: number; row: number; col: number }[] = []
        for (let r = 0; r < 7; r++) {
          gapCells.push({
            hasDot: false,
            letterIndex: letterIdx,
            row: r,
            col: globalCol,
          })
        }
        // We don't add gap to columns array since it has no dots
        // But we need to account for it in spacing
      }
    })

    return { columns: cols, totalColumns: cols.length }
  }, [text])

  useEffect(() => {
    setRevealedColumns(0)
    let currentCol = 0

    const interval = setInterval(() => {
      currentCol++
      setRevealedColumns(currentCol)
      if (currentCol >= totalColumns) {
        clearInterval(interval)
      }
    }, revealDelay)

    return () => clearInterval(interval)
  }, [totalColumns, revealDelay])

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {text.split('').map((letter, letterIndex) => {
        const pattern = LETTER_PATTERNS[letter] || LETTER_PATTERNS['P']

        return (
          <div
            key={letterIndex}
            className="grid"
            style={{
              gridTemplateColumns: `repeat(5, ${dotWidth}px)`,
              gridTemplateRows: `repeat(7, ${dotHeight}px)`,
              gap: `${dotGap}px`,
              marginRight: letterIndex < text.length - 1 ? `${letterGap}px` : '0',
            }}
          >
            {pattern.map((row, rowIndex) =>
              row.map((hasDot, colIndex) => {
                // Calculate which global column this is
                let globalColIndex = 0
                for (let i = 0; i < letterIndex; i++) {
                  globalColIndex += 5 // Each letter is 5 columns wide
                }
                globalColIndex += colIndex

                const isRevealed = hasDot && globalColIndex < revealedColumns

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="rounded-sm transition-all duration-150"
                    style={{
                      width: dotWidth,
                      height: dotHeight,
                      backgroundColor: isRevealed
                        ? activeColor
                        : hasDot
                          ? inactiveColor
                          : 'transparent',
                      boxShadow: isRevealed
                        ? `0 0 ${dotWidth}px ${activeColor}50, 0 0 ${dotWidth * 2}px ${activeColor}30`
                        : 'none',
                      transform: isRevealed ? 'scale(1)' : hasDot ? 'scale(0.85)' : 'scale(0)',
                      opacity: hasDot ? 1 : 0,
                    }}
                  />
                )
              })
            )}
          </div>
        )
      })}
    </div>
  )
}
