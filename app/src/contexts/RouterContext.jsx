/**
 * RouterContext — Router leggero basato su History API
 *
 * Sostituisce il pattern viewMode in App.jsx con URL semantici reali.
 * Funziona identicamente a React Router per navigate(), useNavigate(),
 * pulsante "Back" del browser, deep link.
 *
 * Sostituibile con react-router-dom in futuro senza toccare i componenti:
 * basta rimappare useNavigate → react-router useNavigate.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const RouterCtx = createContext(null);

// ─── Normalizza il pathname ───────────────────────────────────────────────────
function getPath() {
  return window.location.pathname || "/";
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function RouterProvider({ children }) {
  const [path, setPath] = useState(getPath);

  // Sincronizza con il pulsante Back / Forward del browser
  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to) => {
    if (to === getPath()) return; // già lì
    window.history.pushState(null, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  const replace = useCallback((to) => {
    window.history.replaceState(null, "", to);
    setPath(to);
  }, []);

  return (
    <RouterCtx.Provider value={{ path, navigate, replace }}>
      {children}
    </RouterCtx.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useRouter() {
  const ctx = useContext(RouterCtx);
  if (!ctx) throw new Error("useRouter deve essere usato dentro <RouterProvider>");
  return ctx;
}

/**
 * Compatibilità futura: stesso nome di React Router.
 * Quando si migrerà, basterà cambiare questo import.
 */
export function useNavigate() {
  return useRouter().navigate;
}

// ─── Componente <Routes> ─────────────────────────────────────────────────────
/**
 * Renderizza il primo figlio <Route> il cui path corrisponde.
 * Supporta match esatto e prefissi (startsWith per rotte annidate).
 */
export function Routes({ children }) {
  const { path } = useRouter();
  const routes = React.Children.toArray(children);

  // Prima cerca match esatto, poi prefisso
  const exact = routes.find((r) => r.props.path === path);
  if (exact) return exact.props.element;

  const prefix = routes.find(
    (r) => r.props.path !== "/" && path.startsWith(r.props.path)
  );
  if (prefix) return prefix.props.element;

  // Fallback: cerca "/"
  const fallback = routes.find((r) => r.props.path === "/");
  return fallback ? fallback.props.element : null;
}

/**
 * <Route path="/foo" element={<Foo />} />
 * Usato solo come descrittore — il rendering avviene in <Routes>.
 */
export function Route({ path, element }) {
  return null;
}

// ─── Componente <Link> ────────────────────────────────────────────────────────
export function Link({ to, children, className, style, ...props }) {
  const { navigate } = useRouter();
  const handleClick = (e) => {
    e.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} onClick={handleClick} className={className} style={style} {...props}>
      {children}
    </a>
  );
}

/**
 * <NavLink> — come Link ma aggiunge className "active" se il path corrisponde.
 */
export function NavLink({ to, children, className = "", activeClassName = "active", exact = false, ...props }) {
  const { path } = useRouter();
  const { navigate } = useRouter();
  const isActive = exact ? path === to : path === to || path.startsWith(to + "/");
  const fullClass = isActive ? `${className} ${activeClassName}`.trim() : className;

  const handleClick = (e) => {
    e.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} onClick={handleClick} className={fullClass} {...props}>
      {children}
    </a>
  );
}
