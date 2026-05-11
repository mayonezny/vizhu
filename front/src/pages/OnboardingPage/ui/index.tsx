import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useAuthStore } from '@/features/auth';
import { useSwipe } from '@/shared/lib/use-swipe';
import { Button } from '@/shared/ui/Button';

import { slides } from './slides';

import './OnboardingPage.scss';

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const isAuthed = useAuthStore((s) => s.isAuthed);

  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir] = useState<'next' | 'prev' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!isAuthed) {
      void navigate('/auth', { replace: true });
    }
  }, [isAuthed, navigate]);

  // cleanup animation timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const goTo = useCallback(
    (next: number) => {
      if (isAnimating || next === current) {
        return;
      }
      setAnimDir(next > current ? 'next' : 'prev');
      setIsAnimating(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCurrent(next);
        setAnimDir(null);
        setIsAnimating(false);
      }, 320);
    },
    [current, isAnimating],
  );

  // Window-level keyboard listener — надёжнее чем onKeyDown на div без tabIndex
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && current < slides.length - 1) {
        goTo(current + 1);
      }
      if (e.key === 'ArrowLeft' && current > 0) {
        goTo(current - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, goTo]);

  const handleCta = () => {
    if (current < slides.length - 1) {
      goTo(current + 1);
    } else {
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

  const slide = slides[current];

  return (
    <div className="ob" {...swipeHandlers}>
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

      <div
        className={[
          'ob__content',
          animDir === 'next' && 'ob__content--exit-left',
          animDir === 'prev' && 'ob__content--exit-right',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <p className="ob__tag">{slide.tag}</p>
        <h1 className="ob__title">{slide.title}</h1>
        <p className="ob__body">{slide.body}</p>
      </div>

      <div className="ob__footer">
        <Button primary onClick={handleCta}>
          {slide.cta}
        </Button>
      </div>
    </div>
  );
};
