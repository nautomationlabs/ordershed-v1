/** Sign-in codes by email. Console in development; Amazon SES once the domain is verified. */
export interface Email {
  sendCode(to: string, code: string): Promise<void>;
}

export class ConsoleEmail implements Email {
  readonly sent: { to: string; code: string }[] = [];
  constructor(private log: (msg: string) => void = () => {}) {}
  async sendCode(to: string, code: string) {
    this.sent.push({ to, code });
    this.log(`[email:console] code ${code} → ${to}`);
  }
}
