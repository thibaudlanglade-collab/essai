/**
 * Dashboard Emails page — wraps the existing EmailsView (mailbox) component
 * and exposes it under /dashboard/emails.
 *
 * EmailsView itself handles three states internally:
 * - Gmail not connected → presentation page (with a connect CTA now)
 * - User clicks "Visualiser" → demo mailbox with scripted emails
 * - Gmail connected → real mailbox (live Gmail via backend)
 */
import EmailsView from "../components/Emails/EmailsView";

export default function EmailsPage() {
  return <EmailsView onExit={() => { /* no-op inside dashboard shell */ }} />;
}
