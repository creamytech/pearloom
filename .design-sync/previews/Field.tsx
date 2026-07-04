import React from 'react';
import { Field } from 'pearloom';

const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16, width: 300 };

/** A labelled text input — mono editorial label above a warm paper control. */
export function TextInput() {
  return (
    <div style={form}>
      <Field label="Your name" placeholder="Margaret Whitfield" defaultValue="Margaret Whitfield" />
      <Field label="Email" type="email" placeholder="you@example.com" hint="We only use this to send your invitation." />
    </div>
  );
}

/** The multiline variant — a note or a message to the hosts. */
export function Multiline() {
  return (
    <div style={form}>
      <Field
        label="A note for the couple"
        multiline
        rows={4}
        defaultValue="We wouldn't miss it for the world — see you under the olive trees."
      />
    </div>
  );
}

/** The disabled state, dimmed and non-interactive. */
export function Disabled() {
  return (
    <div style={form}>
      <Field label="Guest count" defaultValue="Locked after RSVP" disabled />
    </div>
  );
}
