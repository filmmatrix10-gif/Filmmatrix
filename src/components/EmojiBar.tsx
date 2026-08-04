import type { FC } from 'react'

interface EmojiBarProps {
  onSelect: (emoji: string) => void
}

const emojis = ['😊', '😢', '😕', '⭐', '❤️']

export const EmojiBar: FC<EmojiBarProps> = ({ onSelect }) => {
  return (
    <div className="emoji-bar">
      {emojis.map((emoji) => (
        <button key={emoji} type="button" className="emoji-pill" onClick={() => onSelect(emoji)}>
          {emoji}
        </button>
      ))}
    </div>
  )
}
