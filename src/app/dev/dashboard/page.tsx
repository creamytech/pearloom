// Dev-only visual harness for the dashboard home cockpit
// (design-system v2). Renders the prop-driven cockpit pieces with
// sample data so the look can be verified without an auth session
// or a selected site. Not linked from the product.
import { DevDashboardClient } from './DevDashboardClient';

export const dynamic = 'force-static';

export default function DevDashboardPage() {
  return <DevDashboardClient />;
}
