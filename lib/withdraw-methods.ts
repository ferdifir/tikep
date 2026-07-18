export const withdrawMethods = [
  {
    id: "BI_FAST",
    label: "Bank via BI-FAST",
    adminFee: 2500,
    minimumAmount: 10000,
    accountLabel: "Nomor rekening",
    note: "Biaya admin maksimal Rp2.500 per transaksi. Limit bank bisa berbeda.",
  },
  {
    id: "DANA",
    label: "DANA",
    adminFee: 2500,
    minimumAmount: 50000,
    accountLabel: "Nomor DANA",
    note: "Biaya dan kuota bebas admin dapat berubah mengikuti kebijakan DANA.",
  },
  {
    id: "GOPAY",
    label: "GoPay",
    adminFee: 2500,
    minimumAmount: 10000,
    accountLabel: "Nomor GoPay",
    note: "Biaya admin dipotong dari nominal pencairan jika berlaku.",
  },
] as const;

export type WithdrawMethodId = (typeof withdrawMethods)[number]["id"];

export function getWithdrawMethod(methodId: string) {
  return withdrawMethods.find((method) => method.id === methodId) ?? null;
}

export function formatRupiah(amount: number) {
  return `Rp${amount.toLocaleString("id-ID")}`;
}
