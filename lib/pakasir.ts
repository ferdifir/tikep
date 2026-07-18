import "server-only";

export type PakasirPayment = {
  project: string;
  order_id: string;
  amount: number;
  fee?: number;
  total_payment?: number;
  payment_method: string;
  payment_number: string;
  expired_at: string;
};

export type PakasirTransaction = {
  amount: number;
  order_id: string;
  project: string;
  status: string;
  payment_method: string;
  completed_at?: string | null;
};

function getPakasirConfig() {
  const project = process.env.PAKASIR_SLUG;
  const apiKey = process.env.PAKASIR_API_KEY;

  if (!project || !apiKey) {
    throw new Error("Pakasir belum dikonfigurasi.");
  }

  return { project, apiKey };
}

export async function createPakasirQrisTransaction(input: { orderId: string; amount: number }) {
  const { project, apiKey } = getPakasirConfig();
  const response = await fetch("https://app.pakasir.com/api/transactioncreate/qris", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project,
      order_id: input.orderId,
      amount: input.amount,
      api_key: apiKey,
    }),
  });

  if (!response.ok) {
    throw new Error("Gagal membuat QRIS Pakasir.");
  }

  const data = (await response.json()) as { payment?: PakasirPayment };

  if (!data.payment?.payment_number) {
    throw new Error("Response QRIS Pakasir tidak valid.");
  }

  return data.payment;
}

export async function getPakasirTransactionDetail(input: { orderId: string; amount: number }) {
  const { project, apiKey } = getPakasirConfig();
  const params = new URLSearchParams({
    project,
    amount: String(input.amount),
    order_id: input.orderId,
    api_key: apiKey,
  });
  const response = await fetch(`https://app.pakasir.com/api/transactiondetail?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Gagal mengecek status Pakasir.");
  }

  const data = (await response.json()) as { transaction?: PakasirTransaction };
  return data.transaction ?? null;
}

export function isMatchingPakasirWebhook(input: {
  project: string;
  orderId: string;
  amount: number;
  localOrderId: string;
  localAmount: number;
}) {
  return (
    input.project === process.env.PAKASIR_SLUG &&
    input.orderId === input.localOrderId &&
    Number(input.amount) === Number(input.localAmount)
  );
}
