import { QuickActionButton } from './QuickActionButton';
import { QUICK_ACTIONS } from './quickActions';
import { VoiceButton } from './VoiceButton';

import './HomePage.scss';

export const HomePage = () => (
  <div className="home-page">
    <VoiceButton />

    <section aria-labelledby="quick-actions-heading" className="home-page__quick-actions">
      <h2 id="quick-actions-heading" className="home-page__section-title">
        Быстрые действия
      </h2>
      <ul className="home-page__grid" role="list">
        {QUICK_ACTIONS.map(({ id, label, prompt, Icon, ariaLabel }) => (
          <li key={id}>
            <QuickActionButton label={label} prompt={prompt} Icon={Icon} ariaLabel={ariaLabel} />
          </li>
        ))}
      </ul>
    </section>
  </div>
);
