"use client";

import React from 'react';
// If you had other providers, like React Query, Theme provider, etc., they would go here.
// For now, it's just a wrapper to ensure client context for hooks if needed.

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
