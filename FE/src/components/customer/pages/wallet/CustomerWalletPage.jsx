import CustomerWallet from '../../widgets/CustomerWallet';

export default function CustomerWalletPage({ apiBase, token, user, onUserUpdate }) {
  return (
    <div>
      <CustomerWallet
        apiBase={apiBase}
        token={token}
        user={user}
        refreshUser={() => {
          fetch(`${apiBase}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (d?.data) onUserUpdate?.(d.data); })
            .catch(() => {});
        }}
      />
    </div>
  );
}
