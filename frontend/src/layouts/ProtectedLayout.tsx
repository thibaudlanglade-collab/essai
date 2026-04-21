/**
 * Layout wrapper for prospect-authenticated routes.
 *
 * Renders a spinner while `useAuth()` resolves, silently returns null
 * while the 401/403 redirect to /expired is being performed, and
 * otherwise renders the nested routes with `{ user }` available via
 * `useOutletContext<AuthContextShape>()`.
 */
import { Outlet } from "react-router-dom";
import { useAuth, type AuthUser } from "@/hooks/useAuth";

export interface AuthContextShape {
  user: AuthUser;
}

export default function ProtectedLayout() {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <div
            className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin"
            aria-hidden="true"
          />
          <p className="text-sm">Chargement de votre espace…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect has been triggered by useAuth (to /expired).
    // Returning null avoids a flash of broken UI during navigation.
    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
          <div className="max-w-md text-center">
            <p className="text-gray-700 mb-2">
              Une erreur est survenue lors du chargement de votre espace.
            </p>
            <p className="text-sm text-gray-500">{error.message}</p>
          </div>
        </div>
      );
    }
    return null;
  }

  const outletContext: AuthContextShape = { user };
  return <Outlet context={outletContext} />;
}
