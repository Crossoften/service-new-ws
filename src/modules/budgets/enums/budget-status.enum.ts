export enum BudgetStatusEnum {
  Pending = 'Pending',
  Responded = 'Responded',
  WaitingInformation = 'WaitingInformation',
  Cancelled = 'Cancelled',
  /** O cliente aceitou a proposta; nasce junto com o trabalho. */
  Accepted = 'Accepted',
  /** O cliente recusou a proposta. Terminal, como o aceite. */
  Rejected = 'Rejected',
}
