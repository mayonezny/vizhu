import './RadioCardGroup.scss';

export type RadioCardOption<T extends string = string> = {
  value: T;
  label: string;
  subtitle?: string;
};

type RadioCardGroupProps<T extends string = string> = {
  name: string;
  options: RadioCardOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
};

export const RadioCardGroup = <T extends string>({
  name,
  options,
  value,
  onChange,
  className,
}: RadioCardGroupProps<T>) => (
  <div role="radiogroup" className={['radio-card-group', className].filter(Boolean).join(' ')}>
    {options.map((opt) => {
      const checked = value === opt.value;
      return (
        <label
          key={opt.value}
          className={['radio-card', checked && 'radio-card--checked'].filter(Boolean).join(' ')}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={checked}
            onChange={() => onChange(opt.value)}
            className="visually-hidden"
            aria-label={opt.subtitle ? `${opt.label}. ${opt.subtitle}` : opt.label}
          />
          <span className="radio-card__indicator" aria-hidden="true" />
          <span className="radio-card__content">
            <span className="radio-card__label">{opt.label}</span>
            {opt.subtitle && <span className="radio-card__subtitle">{opt.subtitle}</span>}
          </span>
        </label>
      );
    })}
  </div>
);
