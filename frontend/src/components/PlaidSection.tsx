import { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { api } from '../services/api';

export default function PlaidSection() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getPlaidLinkToken()
      .then((res) => { if (!cancelled) setLinkToken(res.linkToken); })
      .catch(() => { if (!cancelled) setLinkToken(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken) => {
      api.exchangePlaidToken(publicToken).then(() => {
        // Could refetch transactions or show success
      }).catch(console.error);
    },
    onExit: (_err, _metadata) => {},
  });

  return (
    <div className="mt-12 pt-10 border-t border-pink-border">
      <h2 className="font-serif text-xl text-body mb-2">Transaction history</h2>
      <p className="text-muted text-sm mb-4">
        Connect your bank with Plaid to see transaction history and align spending with accountable companies.
      </p>
      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : linkToken ? (
        <button
          type="button"
          onClick={() => open()}
          disabled={!ready}
          className="px-4 py-2 bg-body text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          Connect your bank
        </button>
      ) : (
        <p className="text-muted text-sm">
          Connect your bank (backend Plaid keys required for link token).
        </p>
      )}
    </div>
  );
}
