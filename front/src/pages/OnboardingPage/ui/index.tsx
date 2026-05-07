import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useSwipe } from '@/shared/lib/use-swipe';
import { Button } from '@/shared/ui/Button';

import { slides } from './slides';

import './OnboardingPage.scss';

const STORAGE_KEY = 'vizhu_onboarding_seen';

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir] = useState<'next' | 'prev' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) {
      void navigate('/', { replace: true });
    }
  }, [navigate]);

  const goTo = useCallback(
    (next: number) => {
      if (isAnimating || next === current) {
        return;
      }
      setAnimDir(next > current ? 'next' : 'prev');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrent(next);
        setAnimDir(null);
        setIsAnimating(false);
      }, 320);
    },
    [current, isAnimating],
  );

  const handleCta = () => {
    if (current < slides.length - 1) {
      goTo(current + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, '1');
      void navigate('/');
    }
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (current < slides.length - 1) {
        goTo(current + 1);
      }
    },
    onSwipeRight: () => {
      if (current > 0) {
        goTo(current - 1);
      }
    },
  });

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' && current < slides.length - 1) {
      goTo(current + 1);
    }
    if (e.key === 'ArrowLeft' && current > 0) {
      goTo(current - 1);
    }
  };

  const slide = slides[current];

  return (
    <div className="ob" {...swipeHandlers} onKeyDown={onKeyDown}>
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {`Слайд ${current + 1} из ${slides.length}: ${slide.title}`}
      </p>

      <div
        className={[
          'ob__illustration',
          animDir === 'next' && 'ob__illustration--exit-left',
          animDir === 'prev' && 'ob__illustration--exit-right',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      >
        <slide.Illustration />
      </div>

      <div className="ob__dots" role="tablist" aria-label="Навигация по слайдам">
        {slides.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={i === current}
            aria-label={`Слайд ${i + 1}`}
            className={['ob__dot', i === current && 'ob__dot--active'].filter(Boolean).join(' ')}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      <section
        className={[
          'ob__content',
          animDir === 'next' && 'ob__content--exit-left',
          animDir === 'prev' && 'ob__content--exit-right',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="ob__tag">{slide.tag}</p>
        <h1 className="ob__title">{slide.title}</h1>
        <p className="ob__body">{slide.body}</p>
      </section>

      <div className="ob__footer">
        <Button primary onClick={handleCta}>
          {slide.cta}
        </Button>
      </div>
    </div>
  );
};
