import { useNavigate, useRevalidator, useSearchParams } from "react-router-dom";
import { type Href, hrefToPath } from "./link";

export { useSearchParams };

// Drop-in for next/navigation's useRouter: push/replace navigate, refresh
// re-runs the active route loaders (react-router revalidation).
export function useRouter() {
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  return {
    push: (href: Href) => navigate(hrefToPath(href)),
    replace: (href: Href) => navigate(hrefToPath(href), { replace: true }),
    back: () => navigate(-1),
    refresh: () => revalidate(),
  };
}
