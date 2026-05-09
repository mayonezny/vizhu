// Средняя скорость русского синтетического голоса — около 140 слов/мин
const WORDS_PER_MINUTE = 140;

export function estimateDialogDuration(messages: { text: string }[]): string {
  const wordCount = messages.reduce((sum, m) => {
    const words = m.text.trim().split(/\s+/);
    return sum + (words[0] ? words.length : 0);
  }, 0);

  const totalSec = Math.max(1, Math.round((wordCount / WORDS_PER_MINUTE) * 60));

  if (totalSec < 60) {
    return `≈ ${totalSec} сек`;
  }

  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `≈ ${min} мин ${sec} сек` : `≈ ${min} мин`;
}
