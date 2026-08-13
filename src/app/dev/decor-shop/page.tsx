// Dev-only harness for the standalone-decor storefront (DecorShop).
// Renders the catalog with buy → owned → apply interactions so the
// look + flow can be verified without an auth session. Not linked.
import { DevDecorShopClient } from './DevDecorShopClient';

export const dynamic = 'force-static';

export default function DevDecorShopPage() {
  return <DevDecorShopClient />;
}
