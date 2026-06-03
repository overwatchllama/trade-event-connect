import { MouseEvent, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BreadcrumbLink } from "@/components/ui/breadcrumb";

interface SmartCrumbLinkProps {
  /** Default destination if we can't go back in history. */
  to: string;
  children: ReactNode;
  className?: string;
}

/**
 * Breadcrumb link that uses `history.back()` when the user actually arrived
 * from `to` (tracked via `location.state.from`). This preserves the prior
 * page's component state (filters, search, scroll) instead of remounting.
 */
const SmartCrumbLink = ({ to, children, className }: SmartCrumbLinkProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: string } | null)?.from;
  const canGoBack = typeof from === "string" && from.split("?")[0] === to;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!canGoBack) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(-1);
  };

  return (
    <BreadcrumbLink asChild>
      <Link to={canGoBack && from ? from : to} onClick={handleClick} className={className}>
        {children}
      </Link>
    </BreadcrumbLink>
  );
};

export default SmartCrumbLink;
