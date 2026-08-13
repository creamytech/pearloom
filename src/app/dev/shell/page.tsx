// Dev-only visual harness for the dashboard SHELL chrome —
// sidebar, utility bar, topbar, and the page atmosphere — wrapped
// around the same sample cockpit the /dev/dashboard harness renders.
// Lets sidebar/background/search design passes be verified without
// an auth session or a database. Not linked from the product.
import { DevShellClient } from './DevShellClient';

export const dynamic = 'force-static';

export default function DevShellPage() {
  return <DevShellClient />;
}
