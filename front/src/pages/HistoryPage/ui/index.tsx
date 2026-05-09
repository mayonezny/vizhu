import { ArrowUpRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { REQUEST_TYPE_LABELS, useHistory } from '@/entities/history';
import { useSttMutation } from '@/features/ai-dialog';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { formatTime, groupByDate } from '@/shared/lib/date';
import { Button } from '@/shared/ui/Button';
import { SearchBar } from '@/shared/ui/SearchBar';
import { VoiceRecordOverlay } from '@/widgets/VoiceRecordOverlay';

import './HistoryPage.scss';

export const HistoryPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);

  const { data: entries = [], isLoading } = useHistory();
  const sttMutation = useSttMutation();

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return entries;
    }
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.messages.some((m) => m.text.toLowerCase().includes(q)),
    );
  }, [entries, query]);

  const groups = useMemo(() => groupByDate(filtered, (e) => e.createdAt), [filtered]);

  const handleVoiceSend = async (blob: Blob, mimeType: string) => {
    setVoiceOpen(false);
    try {
      const { text } = await sttMutation.mutateAsync({ blob, mimeType });
      setQuery(text);
      announceRouteChange(`Поиск: ${text}`);
    } catch {
      announceRouteChange('Ошибка распознавания речи. Попробуйте ещё раз.');
    }
  };

  return (
    <div className="history-page">
      <div className="history-page__search-bar">
        <SearchBar
          placeholder="Поиск по истории"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onVoiceSearch={() => setVoiceOpen(true)}
          isListening={voiceOpen}
        />
      </div>

      {isLoading && (
        <p className="history-page__empty" role="status" aria-live="polite">
          Загрузка…
        </p>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="history-page__empty" aria-live="polite">
          {query ? 'Ничего не найдено' : 'История пуста'}
        </p>
      )}

      {groups.map(({ label, items }) => (
        <section
          key={label}
          className="history-page__group"
          aria-labelledby={`history-group-${label}`}
        >
          <h2 id={`history-group-${label}`} className="history-page__group-title">
            {label}
          </h2>
          <ul className="history-page__list" role="list">
            {items.map((entry) => (
              <li key={entry.id}>
                <Button
                  spread
                  subtitle={`${REQUEST_TYPE_LABELS[entry.type]} • ${formatTime(entry.createdAt)}`}
                  icon={<ArrowUpRight size={24} aria-hidden="true" />}
                  aria-label={`${entry.title}, ${REQUEST_TYPE_LABELS[entry.type]}, ${formatTime(entry.createdAt)}`}
                  onClick={() => void navigate(`/history/${entry.id}`)}
                >
                  {entry.title}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {voiceOpen && (
        <VoiceRecordOverlay
          onClose={() => setVoiceOpen(false)}
          onSend={handleVoiceSend}
          isSending={sttMutation.isPending}
        />
      )}
    </div>
  );
};
