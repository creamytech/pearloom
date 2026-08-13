import { describe, expect, it } from 'vitest';
import { isPrivateHost, isPrivateIp, parseProductPage } from './product-page';

describe('parseProductPage', () => {
  it('reads og:title / og:image / og:site_name / product price meta', () => {
    const html = `
      <html><head>
        <title>Fallback title</title>
        <meta property="og:title" content="Le Creuset Dutch Oven &amp; Lid" />
        <meta property="og:image" content="https://cdn.example.com/pot.jpg" />
        <meta property="og:site_name" content="Crate &amp; Barrel" />
        <meta property="product:price:amount" content="249.95" />
      </head><body></body></html>`;
    const meta = parseProductPage(html, 'https://www.crateandbarrel.com/p/123');
    expect(meta.title).toBe('Le Creuset Dutch Oven & Lid');
    expect(meta.imageUrl).toBe('https://cdn.example.com/pot.jpg');
    expect(meta.store).toBe('Crate & Barrel');
    expect(meta.price).toBe(249.95);
  });

  it('handles reversed attribute order and single quotes', () => {
    const html = `<meta content='The Good Olive Oil' property='og:title'>`;
    expect(parseProductPage(html).title).toBe('The Good Olive Oil');
  });

  it('falls back to <title> and page hostname', () => {
    const html = `<html><head><title>  A Linen Tablecloth — Shop  </title></head></html>`;
    const meta = parseProductPage(html, 'https://www.shop.example.com/item');
    expect(meta.title).toBe('A Linen Tablecloth — Shop');
    expect(meta.store).toBe('shop.example.com');
  });

  it('reads itemprop=price when no product meta exists', () => {
    const html = `<span itemprop="price" content="$1,299.00">$1,299.00</span>`;
    expect(parseProductPage(html).price).toBe(1299);
  });

  it('reads JSON-LD offers.price (including @graph nesting)', () => {
    const html = `
      <script type="application/ld+json">
        {"@context":"https://schema.org","@graph":[
          {"@type":"WebPage"},
          {"@type":"Product","name":"Pot","offers":{"@type":"Offer","price":"120.00","priceCurrency":"USD"}}
        ]}
      </script>`;
    expect(parseProductPage(html).price).toBe(120);
  });

  it('skips malformed JSON-LD without throwing', () => {
    const html = `
      <script type="application/ld+json">{not json at all</script>
      <script type="application/ld+json">{"offers":{"price":42}}</script>`;
    expect(parseProductPage(html).price).toBe(42);
  });

  it('resolves relative og:image against the page URL and rejects non-http schemes', () => {
    const rel = parseProductPage(
      `<meta property="og:image" content="/img/pot.jpg">`,
      'https://store.example.com/p/1',
    );
    expect(rel.imageUrl).toBe('https://store.example.com/img/pot.jpg');
    const bad = parseProductPage(`<meta property="og:image" content="javascript:alert(1)">`);
    expect(bad.imageUrl).toBeNull();
  });

  it('returns nulls on an empty page', () => {
    expect(parseProductPage('')).toEqual({ title: null, imageUrl: null, price: null, store: null });
  });
});

describe('SSRF guards', () => {
  it('flags private / reserved IPv4 ranges', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1']) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
    for (const ip of ['8.8.8.8', '172.32.0.1', '100.63.0.1', '1.1.1.1']) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });

  it('flags IPv6 loopback / unique-local / link-local / v4-mapped', () => {
    for (const ip of ['::1', '::', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1']) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
    expect(isPrivateIp('2606:4700::1111')).toBe(false);
  });

  it('flags localhost-ish hostnames', () => {
    for (const h of ['localhost', 'foo.localhost', 'printer.local', 'db.internal', '127.0.0.1', '[::1]']) {
      expect(isPrivateHost(h), h).toBe(true);
    }
    expect(isPrivateHost('www.crateandbarrel.com')).toBe(false);
  });
});
