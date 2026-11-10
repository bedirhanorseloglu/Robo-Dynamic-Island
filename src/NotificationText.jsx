import React, { useEffect, useMemo, useState } from 'react';

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const emojiLike = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u;

function getAppleImage(segment, appleEmojiMap) {
  if (!emojiLike.test(segment)) return null;
  const unified = Array.from(segment)
    .filter((character) => character !== '\ufe0e')
    .map((character) => character.codePointAt(0).toString(16))
    .join('-');
  return appleEmojiMap[unified] || null;
}

export default function NotificationText({ text }) {
  const [appleEmojiMap, setAppleEmojiMap] = useState(null);
  const hasEmoji = emojiLike.test(String(text ?? ''));

  useEffect(() => {
    if (!hasEmoji || appleEmojiMap) return undefined;
    let active = true;
    import('./appleEmojiMap.json').then(({ default: map }) => {
      if (active) setAppleEmojiMap(map);
    });
    return () => { active = false; };
  }, [hasEmoji, appleEmojiMap]);

  const parts = useMemo(() => {
    const content = String(text ?? '');
    return Array.from(graphemes.segment(content), ({ segment }) => ({
      segment,
      image: appleEmojiMap ? getAppleImage(segment, appleEmojiMap) : null,
    }));
  }, [text, appleEmojiMap]);

  return parts.map(({ segment, image }, index) => image ? (
    <img
      key={`${index}-${image}`}
      className="notification-emoji-image"
      src={`${import.meta.env.BASE_URL}apple-emoji/64/${image}`}
      alt={segment}
      loading="lazy"
      decoding="async"
      draggable="false"
    />
  ) : (
    <React.Fragment key={index}>{segment}</React.Fragment>
  ));
}
