import { NextRequest } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, replyTo } = body;

    if (!to || !subject || !html) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    const result = await resend.emails.send({
      from: "ChinaDailyBazar <orders@updates.chinadailybazar.com>",
      to: [to],
      replyTo: replyTo || "orderchinadailybazar@gmail.com", // ✅ NEW REPLY-TO
      subject: subject,
      html: html,
    });

    if (result.error) {
      console.error("Resend Error:", result.error);
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    return Response.json({ success: true, id: result.data?.id });
  } catch (err: any) {
    console.error("API Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}