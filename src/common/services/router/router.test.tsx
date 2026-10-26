import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  RouteGuard,
  RouterRoot,
  useCurrentPath,
  useNavigation,
  useReturnPath,
  useRouteParams,
} from './router';

function Where() {
  return <output data-testid="path">{useCurrentPath()}</output>;
}

function Nav() {
  const navigation = useNavigation();
  const { id } = useRouteParams<{ id?: string }>();
  return (
    <>
      <span data-testid="id">{id ?? 'none'}</span>
      <button onClick={() => navigation.go('/events/2')}>go</button>
      <button onClick={() => navigation.replace('/history')}>replace</button>
      <button onClick={() => navigation.back()}>back</button>
    </>
  );
}

describe('router service', () => {
  it('renders the app in a browser router', () => {
    render(
      <RouterRoot>
        <Where />
      </RouterRoot>,
    );
    expect(screen.getByTestId('path')).toHaveTextContent('/');
  });

  it('goes forward, replaces and goes back, reading route params', () => {
    render(
      <MemoryRouter initialEntries={['/', '/events/1']}>
        <Routes>
          <Route path="/events/:id" element={<Nav />} />
          <Route path="*" element={<Nav />} />
        </Routes>
        <Where />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('id')).toHaveTextContent('1');
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByTestId('path')).toHaveTextContent('/events/2');
    fireEvent.click(screen.getByText('replace'));
    expect(screen.getByTestId('path')).toHaveTextContent('/history');
    expect(screen.getByTestId('id')).toHaveTextContent('none');
    fireEvent.click(screen.getByText('back'));
    expect(screen.getByTestId('path')).toHaveTextContent('/events/1');
  });

  it('guards a page, remembering where you were headed', () => {
    function Login() {
      return <span data-testid="return">{useReturnPath('/home')}</span>;
    }
    const { unmount } = render(
      <MemoryRouter initialEntries={['/events/9']}>
        <Routes>
          <Route
            path="/events/:id"
            element={
              <RouteGuard when={false} redirectTo="/login">
                secret
              </RouteGuard>
            }
          />
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('return')).toHaveTextContent('/events/9');
    unmount();

    render(
      <MemoryRouter initialEntries={['/events/9']}>
        <Routes>
          <Route
            path="/events/:id"
            element={
              <RouteGuard when redirectTo="/login">
                secret
              </RouteGuard>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('ignores a return path that isn’t one of ours', () => {
    function Login() {
      return <span data-testid="return">{useReturnPath('/home')}</span>;
    }
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/login', state: { from: 'https://evil.example' } }]}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('return')).toHaveTextContent('/home');
  });
});
