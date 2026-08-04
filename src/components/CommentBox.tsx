import { useState, type FC } from 'react'

interface CommentBoxProps {
  onSubmit: (text: string) => void
  onCancel: () => void
}

export const CommentBox: FC<CommentBoxProps> = ({ onSubmit, onCancel }) => {
  const [text, setText] = useState('')

  return (
    <div className="comment-box">
      <textarea
        maxLength={250}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Share a thought about this moment..."
      />
      <div className="comment-actions">
        <span>{text.length}/250</span>
        <div className="comment-actions-buttons">
          <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              if (!text.trim()) {
                return
              }
              onSubmit(text.trim())
              setText('')
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
