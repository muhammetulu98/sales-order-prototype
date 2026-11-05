// Destek talepleri — saf yardımcılar (vitest ile test edilir).
// Sayfa ve composable'ın paylaştığı tek dallanma içeren mantık burada yaşar.

interface WaitingOnAgentInput {
  isClosed: boolean;
  lastCustomerReplyAt?: string | null;
  lastAgentReplyAt?: string | null;
}

/** Müşteri (raportör) en son yanıttan sonra destek hiç yanıtlamadıysa true. */
export const isWaitingOnAgent = (ticket: WaitingOnAgentInput): boolean => {
  if (ticket.isClosed || !ticket.lastCustomerReplyAt) return false;
  if (!ticket.lastAgentReplyAt) return true;
  return (
    new Date(ticket.lastCustomerReplyAt).getTime() >
    new Date(ticket.lastAgentReplyAt).getTime()
  );
};
