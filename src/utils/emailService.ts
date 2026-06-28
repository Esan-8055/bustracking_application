import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '"LINGA School Bus Alert" <no-reply@smartbus.ai>';

// Create transporter if SMTP details are provided
const getTransporter = () => {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

export async function sendStopNotificationEmail(
  busNumber: string,
  plateNumber: string,
  stopName: string,
  speed: number,
  recipients: string[] = ['russellsridhar@gmail.com', 'swathiswathi44231@gmail.com']
) {
  const subject = `🚌 [LINGA Alert] Bus ${busNumber} is approaching stop: ${stopName}`;
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fafafa;">
      <div style="text-align: center; border-bottom: 2px solid #eab308; padding-bottom: 10px; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0;">LINGA School Bus Alert</h2>
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold;">Real-Time Stop Notification</span>
      </div>
      
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        This is an automated safety update. The school bus is approaching the stop sequence.
      </p>
      
      <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #f1f5f9; margin-bottom: 20px;">
        <table style="width: 100%; font-size: 13px; color: #475569; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-weight: bold; width: 120px;">Bus Service:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${busNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">Plate Number:</td>
            <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${plateNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">Target Stop:</td>
            <td style="padding: 6px 0; color: #3b82f6; font-weight: bold;">${stopName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">Current Speed:</td>
            <td style="padding: 6px 0; color: #0f172a;">${speed} km/h</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold;">Alert Time:</td>
            <td style="padding: 6px 0; color: #0f172a;">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (UTC+5:30)</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 20px;">
        Please ensure the student is ready at the pickup stop. Thank you for using LINGA School Bus Transport.
      </p>
    </div>
  `;

  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`\n[EMAIL SERVICE WARNING] SMTP Credentials not configured in .env.local!`);
    console.warn(`Simulating email alert payload:`);
    console.warn(`  To: ${recipients.join(', ')}`);
    console.warn(`  Subject: ${subject}`);
    console.warn(`  Content: Bus ${busNumber} is within 200m of ${stopName}\n`);
    return { success: false, error: 'SMTP Config Missing' };
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: recipients.join(', '),
      subject: subject,
      html: htmlContent,
    });

    console.log(`[EMAIL SERVICE] Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EMAIL SERVICE ERROR] Failed to send email:`, error);
    return { success: false, error: error.message };
  }
}
