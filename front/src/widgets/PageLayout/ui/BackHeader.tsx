interface BackHeaderProps {
  title?: string;
}

export const BackHeader = ({ title }: BackHeaderProps) => (
  <>
    <button onClick={() => history.back()} aria-label="Назад">
      {/* icon */}
    </button>
    {title && <h1 className="page-layout__title">{title}</h1>}
    {/* theme toggle */}
  </>
);
