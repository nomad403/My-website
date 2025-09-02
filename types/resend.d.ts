declare module 'resend' {
  export class Resend {
    constructor(apiKey?: string);
    emails: {
      send(params: {
        from: string;
        to: string;
        subject: string;
        html?: string;
        text?: string;
        reply_to?: string;
      }): Promise<{ error?: any; data?: any }>;
    };
  }
}
