import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./SpeechBubble.css";

interface SpeechBubbleProps {
  text: string | null;
  onClose: () => void;
}
const BUBBLE_WIDTH = 180; // was 240
const MAX_LINES = 7;
const CHARS_PER_LINE = 24; // was 32 — narrower width fits fewer chars per line
const CHARS_PER_PAGE = MAX_LINES * CHARS_PER_LINE;

// Roughly 300ms per word, with sane floor/ceiling — used per page, not whole text
function getDismissDuration(pageText: string): number {
  const wordCount = pageText.trim().split(/\s+/).length;
  const estimated = wordCount * 300;
  return Math.min(Math.max(estimated, 4500), 20000);
}

// Split text into pages without breaking words mid-way
function paginateText(text: string): string[] {
  const words = text.trim().split(/\s+/);
  const pages: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > CHARS_PER_PAGE && current) {
      pages.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) pages.push(current);

  return pages.length > 0 ? pages : [""];
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  text,
  onClose,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout>>();

  const pages = useMemo(() => (text ? paginateText(text) : []), [text]);
  const totalPages = pages.length;

  // Reset to first page whenever new text arrives
  useEffect(() => {
    setPageIndex(0);
  }, [text]);

  // Auto-advance pages, auto-close on last page
  useEffect(() => {
    if (!text || pages.length === 0) return;

    const currentPageText = pages[pageIndex] ?? "";
    const duration = getDismissDuration(currentPageText);

    autoAdvanceTimer.current = setTimeout(() => {
      if (pageIndex < totalPages - 1) {
        setPageIndex((p) => p + 1);
      } else {
        onClose();
      }
    }, duration);

    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [text, pageIndex, pages, totalPages, onClose]);

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pageIndex < totalPages - 1) setPageIndex((p) => p + 1);
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pageIndex > 0) setPageIndex((p) => p - 1);
  };

  if (!text) {
    return <AnimatePresence />;
  }

  const currentPageText = pages[pageIndex] ?? "";
  const hasMultiplePages = totalPages > 1;

  return (
    <AnimatePresence>
      {text && (
        <motion.div
          className="speech-bubble-container"
          style={{ width: BUBBLE_WIDTH }}
          initial={{ opacity: 0, scale: 0.6, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: -10 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
        >
          <div className="speech-bubble-content">
            <AnimatePresence mode="wait">
              <motion.span
                key={pageIndex}
                className="speech-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {currentPageText}
              </motion.span>
            </AnimatePresence>

            <button
              className="speech-bubble-close"
              onClick={onClose}
              aria-label="Close bubble"
            >
              ×
            </button>

            {hasMultiplePages && (
              <div className="speech-bubble-pagination">
                <button
                  className="speech-bubble-nav-btn"
                  onClick={goPrev}
                  disabled={pageIndex === 0}
                  aria-label="Previous page"
                >
                  ‹
                </button>

                <div className="speech-bubble-dots">
                  {pages.map((_, i) => (
                    <span
                      key={i}
                      className={`speech-bubble-dot ${i === pageIndex ? "active" : ""}`}
                    />
                  ))}
                </div>

                <button
                  className="speech-bubble-nav-btn"
                  onClick={goNext}
                  disabled={pageIndex === totalPages - 1}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            )}
          </div>
          <div className="speech-bubble-tail" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
