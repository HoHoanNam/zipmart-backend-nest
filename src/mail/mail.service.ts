import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Thin wrapper over a single SMTP transport. Failures are logged, never
 * thrown to the caller — every consumer (password reset, staff invite,
 * digest, reports) treats email as a best-effort side effect, not something
 * that should fail the primary request/job.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>('MAIL_FROM', 'no-reply@zipmart.example.com');
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
    });
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to: options.to, subject: options.subject, html: options.html });
    } catch (error) {
      this.logger.error(`Failed to send mail to ${options.to}: ${(error as Error).message}`);
    }
  }
}
