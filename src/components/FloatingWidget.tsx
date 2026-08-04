import { useEffect, useMemo, useState, type FC } from 'react'
import { CommentBox } from './CommentBox'
import { EmojiBar } from './EmojiBar'
import { Timeline } from './Timeline'
import { useFeedback } from '../hooks/useFeedback'

interface FloatingWidgetProps {
  sessionId: string
  title: string
  url: string
  video: HTMLVideoElement | null
}

export const FloatingWidget: FC<FloatingWidgetProps> = ({ sessionId, title, url, video }) => {
  const [expanded, setExpanded] = useState(true)
  const [commentMode, setCommentMode] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [position, setPosition] = useState({ x: 24, y: 24 })
  const { feedback, addEmoji, addComment, editComment, removeFeedback, clear } = useFeedback(sessionId, title, url)

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) {
        return
      }
      setPosition((current) => ({
        x: Math.max(8, Math.min(window.innerWidth - 320, current.x + event.movementX)),
        y: Math.max(8, Math.min(window.innerHeight - 240, current.y + event.movementY)),
      }))
    }

    const onPointerUp = () => setDragging(false)

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [dragging])

  const handleEmoji = (emoji: string) => {
    if (!video) {
      return
    }
    void addEmoji(emoji, video.currentTime)
  }

  const handleComment = (text: string) => {
    if (!video) {
      return
    }
    void addComment(text, video.currentTime)
    setCommentMode(false)
  }

  const jumpTo = (timestamp: number) => {
    if (video) {
      video.currentTime = timestamp
    }
  }

  const handleExport = async () => {
    const payload = {
      movie: title,
      sessionId,
      feedback,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `filmmetrics-feedback-${sessionId}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const timelinePreview = useMemo(() => feedback.slice(0, 6), [feedback])

  return (
    <div className="floating-widget" style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
      <div className="widget-handle" onPointerDown={() => setDragging(true)}>
        <strong>FilmMetrics Feedback</strong>
        <button type="button" className="mini-btn" onClick={() => setExpanded((value) => !value)}>
          {expanded ? '−' : '+'}
        </button>
      </div>
      {expanded ? (
        <div className="widget-body">
          <div className="widget-header-row">
            <span>React at the current moment</span>
            <button type="button" className="ghost-btn" onClick={() => setCommentMode((value) => !value)}>
              {commentMode ? 'Hide comment' : 'Add comment'}
            </button>
          </div>
          <EmojiBar onSelect={handleEmoji} />
          {commentMode ? <CommentBox onSubmit={handleComment} onCancel={() => setCommentMode(false)} /> : null}
          <div className="widget-actions-row">
            <button type="button" className="ghost-btn" onClick={handleExport}>Export Feedback</button>
            <button type="button" className="ghost-btn" onClick={() => void clear()}>Clear Feedback</button>
          </div>
          <div className="timeline-preview">
            <h4>Timeline Preview</h4>
            <Timeline feedback={timelinePreview} onJump={jumpTo} onEdit={(id, text) => void editComment(id, text)} onDelete={(id) => void removeFeedback(id)} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
