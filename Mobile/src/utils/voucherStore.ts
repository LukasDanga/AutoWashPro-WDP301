type PendingVoucher = { code: string; name: string; discount: number } | null;
let _selection: PendingVoucher = null;

export function setPendingVoucher(v: PendingVoucher) {
  _selection = v;
}

export function consumePendingVoucher(): PendingVoucher {
  const v = _selection;
  _selection = null;
  return v;
}
