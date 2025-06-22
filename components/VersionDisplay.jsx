'use client'
import { APP_VERSION } from '../lib/version';

export default function VersionDisplay() {
  return (
    <div className="fixed bottom-2 right-2 text-xs text-gray-400/60 font-mono select-none pointer-events-none z-50">
      version: {APP_VERSION}
    </div>
  );
}