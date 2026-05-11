import { Mic, Search } from 'lucide-react';
import { type InputHTMLAttributes } from 'react';

import { RoundButton } from '@/shared/ui/RoundButton';

import './SearchBar.scss';

type SearchBarProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  onVoiceSearch?: () => void;
  isListening?: boolean;
};

export const SearchBar = ({
  onVoiceSearch,
  isListening = false,
  className,
  placeholder = 'Поиск',
  ...inputProps
}: SearchBarProps) => (
  <div className={['search-bar', className].filter(Boolean).join(' ')} role="search">
    <span className="search-bar__icon" aria-hidden="true">
      <Search size={24} />
    </span>
    <input
      type="search"
      className="search-bar__input"
      placeholder={placeholder}
      aria-label={placeholder}
      {...inputProps}
    />
    {onVoiceSearch && (
      <RoundButton
        className="search-bar__mic"
        variant="filled"
        icon={<Mic size={24} aria-hidden="true" />}
        aria-label={isListening ? 'Остановить голосовой поиск' : 'Поиск голосом'}
        onClick={onVoiceSearch}
      />
    )}
  </div>
);
