import { NextResponse, NextRequest } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with your API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { from, to, subject, html } = await request.json();

    const data = await resend.emails.send({
      from: from,
      to: to,
      subject: subject,
      html: html,
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json({ message: 'Failed to send email' }, { status: 500 });
  }
}