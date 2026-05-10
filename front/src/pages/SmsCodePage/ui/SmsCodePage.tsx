import axios from 'axios';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { authApi, useAuthStore } from '@/features/auth';
import { announceRouteChange } from '@/shared/lib/a11y/announcer';
import { Button } from '@/shared/ui/Button';
import { RoundButton } from '@/shared/ui/RoundButton';

import './SmsCodePage.scss';

const CODE_LENGTH = 4;
const RESEND_SECONDS = 42;

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export const SmsCodePage = () => {
  const navigate = useNavigate();
  const phone = useAuthStore((s) => s.phone);
  const login = useAuthStore((s) => s.login);

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const refs = useRef<Array<HTMLInputElement | null>>(Array(CODE_LENGTH).fill(null));

  useEffect(() => {
    announceRouteChange(`Введите код из SMS, отправленного на номер ${phone ?? 'ваш телефон'}`);
    refs.current[0]?.focus();
  }, [phone]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const updateDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
    setError(null);
    if (clean && index < CODE_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        updateDigit(index, '');
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        updateDigit(index - 1, '');
      }
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
      e.preventDefault();
    }
    if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      refs.current[index + 1]?.focus();
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) {
      return;
    }
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    refs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < CODE_LENGTH) {
      setError('Введите все 4 цифры кода');
      refs.current[digits.findIndex((d) => !d)]?.focus();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await authApi.verifyCode(phone ?? '', code);
      login({ phone: data.user.phone, userName: data.user.name });
      void navigate('/auth/welcome', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorCode = err.response?.data?.error;
        if (errorCode === 'code_expired') {
          setError('Код устарел. Нажмите «Отправить ещё раз».');
          setSecondsLeft(0);
        } else {
          setError('Неверный код. Проверьте и попробуйте снова.');
        }
      } else {
        setError('Не удалось проверить код. Попробуйте позже.');
      }
      refs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phone) {
      return;
    }
    try {
      await authApi.requestCode(phone);
      setSecondsLeft(RESEND_SECONDS);
      setDigits(Array(CODE_LENGTH).fill(''));
      setError(null);
      refs.current[0]?.focus();
      announceRouteChange('Код отправлен повторно');
    } catch {
      setError('Не удалось отправить код. Попробуйте позже.');
    }
  };

  const maskedPhone = phone
    ? phone.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5')
    : 'ваш номер';

  return (
    <main id="main-content" className="sms-code" tabIndex={-1} aria-labelledby="sms-title">
      <div className="sms-code__back">
        <RoundButton
          aria-label="Назад"
          icon={<ChevronLeft size={24} />}
          onClick={() => void navigate('/auth/phone')}
        />
      </div>

      <div className="sms-code__head">
        <h1 id="sms-title" className="sms-code__title">
          Код из SMS
        </h1>
        <p className="sms-code__desc">
          На <strong>{maskedPhone}</strong> отправлен {CODE_LENGTH}-значный код.
        </p>
      </div>

      <form
        className="sms-code__form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Форма ввода кода из SMS"
      >
        <fieldset className="sms-code__fieldset" aria-label="Введите 4 цифры кода">
          <legend className="visually-hidden">Код из SMS</legend>
          <div className="sms-code__boxes" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                className={['sms-code__box', error && 'sms-code__box--error']
                  .filter(Boolean)
                  .join(' ')}
                type="text"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength={1}
                value={digit}
                aria-label={`Цифра ${i + 1} из ${CODE_LENGTH}`}
                aria-invalid={error ? 'true' : undefined}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                disabled={isLoading}
                onChange={(e) => updateDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
              />
            ))}
          </div>
          {error && (
            <p className="sms-code__error" role="alert">
              {error}
            </p>
          )}
        </fieldset>

        <div className="sms-code__resend">
          {secondsLeft > 0 ? (
            <p aria-live="polite" aria-atomic="true">
              Отправить ещё раз через{' '}
              <span className="sms-code__timer">{formatTime(secondsLeft)}</span>
            </p>
          ) : (
            <button
              type="button"
              className="sms-code__resend-btn"
              onClick={handleResend}
              aria-label="Отправить код повторно"
            >
              Отправить ещё раз
            </button>
          )}
        </div>

        <Button type="submit" disabled={isLoading} aria-label="Подтвердить код из SMS">
          {isLoading ? 'Проверяем...' : 'Подтвердить'}
        </Button>
      </form>
    </main>
  );
};
