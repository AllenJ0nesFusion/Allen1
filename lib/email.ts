import { Resend } from 'resend';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — email sending disabled.');
    return null;
  }
  return new Resend(key);
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'L&D Tracker <noreply@fusionehr.com>';
}

export async function sendInviteEmail(opts: {
  to: string;
  name: string;
  inviterName: string;
  tempPassword: string;
  appUrl: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const { to, name, inviterName, tempPassword, appUrl } = opts;
  const loginUrl = `${appUrl}/login`;
  try {
    await resend.emails.send({
      from: fromAddress(),
      to,
      subject: `You've been invited to the L&D Goals Tracker`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#0E4774;margin-bottom:4px">You're invited</h2>
          <p style="color:#404D5B;margin-top:0">${inviterName} has added you to the Fusion L&D Goals Tracker.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#F4EFEF;border-radius:8px">
            <tr><td style="padding:12px 16px;font-size:13px;color:#404D5B"><strong>Email</strong></td><td style="padding:12px 16px;font-size:13px">${to}</td></tr>
            <tr><td style="padding:12px 16px;font-size:13px;color:#404D5B"><strong>Temp password</strong></td><td style="padding:12px 16px;font-size:13px;font-family:monospace">${tempPassword}</td></tr>
          </table>
          <a href="${loginUrl}" style="display:inline-block;background:#0E4774;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:600">Sign in →</a>
          <p style="color:#9aa5b1;font-size:12px;margin-top:24px">You'll be prompted to set a new password on first sign-in.</p>
        </div>
      `,
    });
  } catch (e) {
    console.error('[email] sendInviteEmail failed:', e);
  }
}

export async function sendWeeklyDigest(opts: {
  to: string;
  name: string;
  tasks: Array<{
    wbs_id: string;
    task_name: string;
    finish_date: string | null;
    status: string;
    goal_name: string | null;
  }>;
  weekStart: string;
  appUrl: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const { to, name, tasks, weekStart, appUrl } = opts;

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date';

  const rows = tasks.map((t) => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#2C3E50">${t.task_name}</td>
      <td style="padding:8px 12px;font-size:13px;color:#404D5B">${t.goal_name ?? '—'}</td>
      <td style="padding:8px 12px;font-size:13px;color:#404D5B">${t.status}</td>
      <td style="padding:8px 12px;font-size:13px;color:#404D5B;white-space:nowrap">${fmtDate(t.finish_date)}</td>
    </tr>
  `).join('');

  try {
    await resend.emails.send({
      from: fromAddress(),
      to,
      subject: `Your L&D tasks for the week of ${weekStart}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#0E4774;margin-bottom:4px">Weekly task digest</h2>
          <p style="color:#404D5B;margin-top:0">Hi ${name || 'there'} — here are your assigned tasks due this week.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead>
              <tr style="background:#0E4774;color:#fff;text-align:left">
                <th style="padding:8px 12px;font-size:12px;font-weight:600">Task</th>
                <th style="padding:8px 12px;font-size:12px;font-weight:600">Goal</th>
                <th style="padding:8px 12px;font-size:12px;font-weight:600">Status</th>
                <th style="padding:8px 12px;font-size:12px;font-weight:600">Due</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <a href="${appUrl}/tasks" style="display:inline-block;background:#0E4774;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:600">Open Tasks →</a>
        </div>
      `,
    });
  } catch (e) {
    console.error('[email] sendWeeklyDigest failed:', e);
  }
}
