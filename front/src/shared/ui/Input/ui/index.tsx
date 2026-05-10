import { forwardRef, type InputHTMLAttributes, useId } from 'react';

import './Input.scss';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

/**
 * Универсальный инпут.
 *
 * Высота контейнера постоянна — слоты для label и сообщения всегда занимают место,
 * но скрыты через visibility:hidden если контент не передан.
 * Это гарантирует, что соседние элементы не прыгают при появлении ошибки.
 *
 * Для screen reader'ов:
 * - label связана с input через htmlFor/id (aria-label не используем — нужна видимая метка)
 * - ошибка объявляется через aria-describedby + role="alert" (объявляется сразу при появлении)
 * - aria-invalid="true" сигнализирует состояние ошибки
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id: externalId, className, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;
    const messageId = `${id}-msg`;

    const hasLabel = Boolean(label);
    const hasMessage = Boolean(error ?? hint);

    return (
      <div className={['input-field', className].filter(Boolean).join(' ')}>
        <div className="input-field__label-slot" aria-hidden={!hasLabel || undefined}>
          {hasLabel && (
            <label htmlFor={id} className="input-field__label">
              {label}
            </label>
          )}
        </div>

        <input
          ref={ref}
          id={id}
          className={['input-field__control', error && 'input-field__control--error']
            .filter(Boolean)
            .join(' ')}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          {...props}
        />

        <div className="input-field__message-slot">
          {hasMessage && (
            <span
              id={messageId}
              className={[
                'input-field__message',
                error ? 'input-field__message--error' : 'input-field__message--hint',
              ].join(' ')}
              role={error ? 'alert' : undefined}
            >
              {error ?? hint}
            </span>
          )}
        </div>
      </div>
    );
  },
);

Input.displayName = 'Input';
