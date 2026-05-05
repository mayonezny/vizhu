import { Link } from 'react-router-dom';

import './HomePage.scss';

export const HomePage = () => (
  <div className="home-page">
    <h1 className="home-page__title">React Frontend Template</h1>
    <p className="home-page__desc">
      A production-ready starter with TanStack Query, Zustand, and Feature Sliced Design.
    </p>
    <div className="home-page__links">
      <Link to="/demo" className="home-page__link home-page__link--primary">
        Open Demo →
      </Link>
      <a
        href="https://feature-sliced.design/"
        target="_blank"
        rel="noreferrer"
        className="home-page__link"
      >
        FSD Docs
      </a>
      <a
        href="https://tanstack.com/query/latest"
        target="_blank"
        rel="noreferrer"
        className="home-page__link"
      >
        TanStack Query
      </a>
      <a
        href="https://zustand.docs.pmnd.rs/"
        target="_blank"
        rel="noreferrer"
        className="home-page__link"
      >
        Zustand
      </a>
    </div>
  </div>
);
