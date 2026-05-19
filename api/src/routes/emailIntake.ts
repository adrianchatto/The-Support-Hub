import type { FastifyPluginAsync } from "fastify";
import { processInboundEmail } from "../domain/emailIntake.js";

/**
 * Email intake webhook — compatible with Mailgun, Postmark, and generic SMTP webhooks.
 * Configure your email provider to POST to POST /api/v1/intake/email
 */
export const emailIntakeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/email", async (request, reply) => {
    const body = request.body as Record<string, string>;

    // Normalise across common webhook formats (Mailgun / Postmark / raw)
    const payload = {
      messageId:
        body["Message-Id"] || body.MessageID || body.message_id || body.messageId || "",
      fromAddress:
        body.From || body.from || body.from_address || body.fromAddress || "",
      fromName:
        body.FromName || body.from_name || body.fromName || undefined,
      subject:
        body.Subject || body.subject || undefined,
      bodyText:
        body["body-plain"] || body.TextBody || body.body_text || body.bodyText || undefined,
      bodyHtml:
        body["body-html"] || body.HtmlBody || body.body_html || body.bodyHtml || undefined,
    };

    const result = await processInboundEmail(payload);
    return reply.code(result.status === "created" ? 201 : 200).send(result);
  });
};
