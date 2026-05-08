import { Mic } from 'lucide-react';
import { Link } from 'react-router';

import './VoiceButton.scss';

export const VoiceButton = () => (
  <Link to="/dialog" className="voice-btn" aria-label="Нажмите и говорите. Открыть диалог с ИИ">
    <span className="voice-btn__label">Нажмите и говорите</span>
    <span className="voice-btn__mic" aria-hidden="true">
      <Mic size={36} strokeWidth={1.5} />
    </span>
    <span className="voice-btn__hint" aria-hidden="true">
      «Прочитай документ» · «Что вокруг?» · «Это сколько денег?»
    </span>
  </Link>
);
