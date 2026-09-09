// ─── Email Service (Stub) ────────────────────────────────────────────────────
// This is a stub implementation that logs to console and shows UI notifications.
// To wire to a real email provider, see the documentation at the bottom of this file.

const isDev = import.meta.env.DEV;

/** Central email send function — replace this function's internals to use a real provider */
const sendEmail = async ({ to, subject, htmlBody, textBody }) => {
    if (isDev) {
        console.group(`📧 [Email Stub] ${subject}`);
        console.log("To:", to);
        console.log("Subject:", subject);
        console.log("Body preview:", textBody?.slice(0, 200));
        console.groupEnd();
    }
    // PRODUCTION: uncomment and configure one of the providers below:
    //
    // === Option A: EmailJS ===
    // import emailjs from '@emailjs/browser';
    // return emailjs.send(
    //   import.meta.env.VITE_EMAILJS_SERVICE_ID,
    //   import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    //   { to_email: to, subject, html_body: htmlBody },
    //   import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    // );
    //
    // === Option B: Resend (via your Express backend) ===
    // return fetch(`${import.meta.env.VITE_API_BASE_URL}/api/email/send`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ to, subject, html: htmlBody })
    // });

    return { success: true, stub: true };
};

// ─── HTML Email Templates ────────────────────────────────────────────────────

const neonBrand = {
    bg: "#080a0d",
    cardBg: "#0f1318",
    border: "#1e2630",
    teal: "#7de5d2",
    orange: "#ff7800",
    blue: "#00b4ff",
    text: "#f2f1eb",
    muted: "#9ba4a7",
};

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neon Cinematics</title>
</head>
<body style="margin:0;padding:0;background:${neonBrand.bg};font-family:'DM Sans',Arial,sans-serif;color:${neonBrand.text};">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="text-align:center;padding:32px 0 24px;border-bottom:1px solid ${neonBrand.border};">
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${neonBrand.teal};margin-bottom:8px;">Neon Cinematics</div>
      <div style="font-size:28px;font-style:italic;color:${neonBrand.text};font-weight:700;filter:drop-shadow(0 0 10px rgba(125,229,210,0.3));">NEON</div>
    </div>
    <!-- Content -->
    <div style="padding:32px 0;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding-top:24px;border-top:1px solid ${neonBrand.border};text-align:center;">
      <p style="margin:0;font-size:11px;color:${neonBrand.muted};letter-spacing:1px;">
        NEON CINEMATICS · A Cinematography & Filmmaking Club<br>
        This is an automated notification. Do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`;

const statusBadge = (status) => {
    const colors = {
        draft: "#526168",
        submitted: neonBrand.blue,
        under_review: "#9b6bce",
        approved: neonBrand.teal,
        rejected: "#e05c6a",
        published: neonBrand.orange,
    };
    const color = colors[status] || neonBrand.muted;
    return `<span style="display:inline-block;padding:4px 12px;background:${color}22;color:${color};border:1px solid ${color}55;border-radius:4px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">${status.replace("_", " ")}</span>`;
};

const ctaButton = (label, url, color = neonBrand.teal) => `
<a href="${url}" style="display:inline-block;padding:14px 28px;background:${color};color:${neonBrand.bg};text-decoration:none;font-weight:700;font-size:13px;letter-spacing:1px;text-transform:uppercase;margin-top:24px;">${label}</a>`;

// ─── Notification Functions ───────────────────────────────────────────────────

const SITE_URL = import.meta.env.VITE_SITE_URL || "http://localhost:5174";
const ADMIN_URL = `${SITE_URL}/admin/blogs`;

/** Notify all blog managers when a poster submits a blog */
export const notifyManagers = async (managerEmails, blog, poster) => {
    if (!managerEmails?.length) return;

    const subject = `[Blog Review] New submission: "${blog.title}"`;
    const htmlBody = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;color:${neonBrand.text};font-weight:600;">${blog.title}</h2>
    <p style="margin:0 0 20px;color:${neonBrand.muted};font-size:14px;">New blog submission requires your review.</p>
    
    <div style="background:${neonBrand.cardBg};border:1px solid ${neonBrand.border};padding:24px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:${neonBrand.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;width:120px;">Author</td>
            <td style="padding:8px 0;color:${neonBrand.text};">${poster.name} (@${poster.username})</td></tr>
        <tr><td style="padding:8px 0;color:${neonBrand.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Submitted</td>
            <td style="padding:8px 0;color:${neonBrand.text};">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
        <tr><td style="padding:8px 0;color:${neonBrand.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Status</td>
            <td style="padding:8px 0;">${statusBadge("submitted")}</td></tr>
      </table>
    </div>
    
    ${blog.description ? `<p style="color:${neonBrand.muted};font-size:14px;line-height:1.6;border-left:3px solid ${neonBrand.teal};padding-left:16px;margin:20px 0;">${blog.description}</p>` : ""}
    
    ${ctaButton("→ Review Blog", `${ADMIN_URL}/${blog._id}/review`)}
  `);

    const textBody = `New blog submission: "${blog.title}" by ${poster.name}.\nReview at: ${ADMIN_URL}/${blog._id}/review`;

    const results = [];
    for (const email of managerEmails) {
        results.push(await sendEmail({ to: email, subject, htmlBody, textBody }));
    }
    return results;
};

/** Notify poster that their blog was submitted */
export const notifyPosterSubmitted = async (posterEmail, blog) => {
    const subject = `Blog Submitted: "${blog.title}"`;
    const htmlBody = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;color:${neonBrand.text};font-weight:600;">Blog Submitted for Review</h2>
    <p style="margin:0 0 20px;color:${neonBrand.muted};font-size:14px;">Your blog has been submitted and is pending review.</p>
    
    <div style="background:${neonBrand.cardBg};border:1px solid ${neonBrand.border};padding:24px;margin:20px 0;">
      <h3 style="margin:0 0 8px;font-size:18px;color:${neonBrand.text};">${blog.title}</h3>
      <p style="margin:0;color:${neonBrand.muted};font-size:13px;">${blog.description || ""}</p>
      <div style="margin-top:16px;">${statusBadge("submitted")}</div>
    </div>
    
    <p style="color:${neonBrand.muted};font-size:13px;line-height:1.6;">
      Our team will review your submission shortly. You'll receive an email when a decision has been made.<br>
      You can track the status in your dashboard.
    </p>
    
    ${ctaButton("→ View Dashboard", `${SITE_URL}/blog/dashboard`)}
  `);

    return sendEmail({ to: posterEmail, subject, htmlBody, textBody: `Your blog "${blog.title}" has been submitted for review. Check your dashboard: ${SITE_URL}/blog/dashboard` });
};

/** Notify poster that their blog was approved */
export const notifyPosterApproved = async (posterEmail, blog) => {
    const subject = `🎬 Blog Approved: "${blog.title}"`;
    const htmlBody = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;color:${neonBrand.teal};font-weight:600;">Blog Approved!</h2>
    <p style="margin:0 0 20px;color:${neonBrand.muted};font-size:14px;">Great news — your blog has been approved and is ready for publication.</p>
    
    <div style="background:${neonBrand.cardBg};border:1px solid ${neonBrand.teal}44;padding:24px;margin:20px 0;">
      <h3 style="margin:0 0 8px;font-size:18px;color:${neonBrand.text};">${blog.title}</h3>
      <div style="margin-top:12px;">${statusBadge("approved")}</div>
    </div>
    
    <p style="color:${neonBrand.muted};font-size:13px;line-height:1.6;">
      Your blog will be published by a blog manager soon. You'll receive another notification once it goes live.
    </p>
    
    ${ctaButton("→ View Dashboard", `${SITE_URL}/blog/dashboard`, neonBrand.teal)}
  `);

    return sendEmail({ to: posterEmail, subject, htmlBody, textBody: `Your blog "${blog.title}" has been approved!` });
};

/** Notify poster that their blog was rejected */
export const notifyPosterRejected = async (posterEmail, blog, reviewMessage) => {
    const subject = `Blog Needs Revision: "${blog.title}"`;
    const htmlBody = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#e05c6a;font-weight:600;">Blog Requires Revision</h2>
    <p style="margin:0 0 20px;color:${neonBrand.muted};font-size:14px;">Your blog submission has been reviewed and requires changes before it can be published.</p>
    
    <div style="background:${neonBrand.cardBg};border:1px solid ${neonBrand.border};padding:24px;margin:20px 0;">
      <h3 style="margin:0 0 12px;font-size:18px;color:${neonBrand.text};">${blog.title}</h3>
      <div style="margin-bottom:16px;">${statusBadge("rejected")}</div>
      
      <div style="border-top:1px solid ${neonBrand.border};padding-top:16px;margin-top:16px;">
        <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${neonBrand.muted};">Review Feedback</p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:${neonBrand.text};background:#1a0a0b;border-left:3px solid #e05c6a;padding:12px 16px;">${reviewMessage}</p>
      </div>
    </div>
    
    <p style="color:${neonBrand.muted};font-size:13px;line-height:1.6;">
      Please address the feedback above and resubmit your blog. Your draft has been saved in your dashboard.
    </p>
    
    ${ctaButton("→ Edit Blog", `${SITE_URL}/blog/dashboard`, "#e05c6a")}
  `);

    return sendEmail({
        to: posterEmail, subject, htmlBody,
        textBody: `Your blog "${blog.title}" requires revision.\n\nFeedback: ${reviewMessage}\n\nEdit your blog: ${SITE_URL}/blog/dashboard`
    });
};

/** Notify poster that their blog has been published */
export const notifyPosterPublished = async (posterEmail, blog) => {
    const publicUrl = `${SITE_URL}/blog/${blog.slug?.current || blog._id}`;
    const subject = `🎬 Your Blog is Live: "${blog.title}"`;
    const htmlBody = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;color:${neonBrand.orange};font-weight:600;">Your Blog is Live!</h2>
    <p style="margin:0 0 20px;color:${neonBrand.muted};font-size:14px;">Congratulations! Your blog has been published and is now live on Neon Cinematics.</p>
    
    <div style="background:${neonBrand.cardBg};border:1px solid ${neonBrand.orange}44;padding:24px;margin:20px 0;">
      <h3 style="margin:0 0 8px;font-size:18px;color:${neonBrand.text};">${blog.title}</h3>
      ${blog.description ? `<p style="margin:8px 0 0;color:${neonBrand.muted};font-size:13px;">${blog.description}</p>` : ""}
      <div style="margin-top:16px;">${statusBadge("published")}</div>
    </div>
    
    ${ctaButton("→ Read Your Blog", publicUrl, neonBrand.orange)}
  `);

    return sendEmail({
        to: posterEmail, subject, htmlBody,
        textBody: `Your blog "${blog.title}" is now live! Read it at: ${publicUrl}`
    });
};
