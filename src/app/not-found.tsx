import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        background: '#FAF7F2',
        fontFamily: "'Lora', Georgia, serif",
      }}
    >
      <div
        style={{
          fontSize: '2.5rem',
          color: '#A3B18A',
          marginBottom: '1.25rem',
          letterSpacing: '0.1em',
        }}
      >
        &#10022;
      </div>
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 400,
          fontSize: '2rem',
          color: '#3D3530',
          marginBottom: '0.75rem',
          letterSpacing: '-0.01em',
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          color: '#6B665F',
          fontSize: '1rem',
          maxWidth: '420px',
          lineHeight: 1.7,
          marginBottom: '2rem',
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '0.7rem 1.75rem',
          borderRadius: '100px',
          background: '#A3B18A',
          color: '#fff',
          fontFamily: "'Lora', Georgia, serif",
          fontWeight: 600,
          fontSize: '0.9rem',
          textDecoration: 'none',
          letterSpacing: '0.04em',
          transition: 'background 0.2s ease',
        }}
      >
        Go home
      </Link>
    </div>
  );
}
