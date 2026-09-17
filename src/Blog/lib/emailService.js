// ─── Email Service ────────────────────────────────────────────────────────────
// Dispatches emails through the Express backend (/api/email/send).
// Supports live SMTP delivery (Gmail, Resend, SendGrid, custom SMTP) and test logging.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

/** Central email send function */
export const sendEmail = async ({ to, subject, htmlBody, textBody }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/email/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to,
                subject,
                html: htmlBody,
                text: textBody,
            }),
        });

        const data = await response.json();
        return data;
    } catch (err) {
        console.warn("Email service dispatch error:", err.message);
        return { success: false, error: err.message };
    }
};

// ─── HTML Email Templates ────────────────────────────────────────────────────

const neonBrand = {
    bg: "#0d0c11",
    cardBg: "#16151c",
    border: "rgba(255, 255, 255, 0.12)",
    gold: "#FCEDB6",
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
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${neonBrand.gold};margin-bottom:8px;">Neon Cinematics</div>
      <div style="font-size:26px;font-style:italic;color:${neonBrand.text};font-weight:700;">NEON JOURNAL</div>
    </div>
    <!-- Content -->
    <div style="padding:32px 0;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding-top:24px;border-top:1px solid ${neonBrand.border};text-align:center;">
      <p style="margin:0;font-size:11px;color:${neonBrand.muted};letter-spacing:1px;">
        NEON CINEMATICS · A Cinematography & Filmmaking Collective<br>
        This is an automated workflow notification.
      </p>
    </div>
  </div>
</body>
</html>`;

const statusBadge = (status) => {
    const colors = {
        draft: "#888888",
        submitted: "#3b82f6",
        under_review: "#8b5cf6",
        approved: "#10b981",
        rejected: "#ef4444",
        published: neonBrand.gold,
    };
    const color = colors[status] || neonBrand.muted;
    return `<span style="display:inline-block;padding:4px 12px;background:${color}22;color:${color};border:1px solid ${color}55;border-radius:4px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">${status.replace("_", " ")}</span>`;
};

const ctaButton = (label, url, color = neonBrand.gold) => `
<a href="${url}" style="display:inline-block;padding:14px 28px;background:${color};color:#0d0c11;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:1px;text-transform:uppercase;margin-top:24px;border-radius:2px;">${label}</a>`;

// ─── Notification Functions ───────────────────────────────────────────────────

const SITE_URL = import.meta.env.VITE_SITE_URL || "http://localhost:5174";
const ADMIN_URL = `${SITE_URL}/neoncinematicsadminhere/blogs`;

/** Notify Neon team & all blog managers when a poster submits a blog for review */
export const notifyManagers = async (managerEmails, blog, poster) => {
    if (!managerEmails?.length) return;

    const subject = `[Blog Action Needed] Someone has submitted a new blog post: "${blog.title}"`;
    const htmlBody = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;color:${neonBrand.text};font-weight:600;">New Blog Submission Received</h2>
    <p style="margin:0 0 20px;color:${neonBrand.muted};font-size:14px;">
      Someone has posted a new blog on Neon Cinematics. Please review it for further actions.
    </p>
    
    <div style="background:${neonBrand.cardBg};border:1px solid ${neonBrand.border};padding:24px;margin:20px 0;">
      <h3 style="margin:0 0 16px;font-size:18px;color:${neonBrand.gold};">${blog.title}</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:${neonBrand.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;width:120px;">Poster Name</td>
            <td style="padding:6px 0;color:${neonBrand.text};font-weight:600;">${poster.name}</td></tr>
        <tr><td style="padding:6px 0;color:${neonBrand.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Username</td>
            <td style="padding:6px 0;color:${neonBrand.text};">@${poster.username}</td></tr>
        <tr><td style="padding:6px 0;color:${neonBrand.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Poster Email</td>
            <td style="padding:6px 0;color:${neonBrand.text};">${poster.email || "N/A"}</td></tr>
        <tr><td style="padding:6px 0;color:${neonBrand.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Submitted On</td>
            <td style="padding:6px 0;color:${neonBrand.text};">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td></tr>
        <tr><td style="padding:6px 0;color:${neonBrand.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Status</td>
            <td style="padding:6px 0;">${statusBadge("submitted")}</td></tr>
      </table>
    </div>
    
    ${blog.description ? `
      <div style="margin:20px 0;">
        <span style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${neonBrand.muted};margin-bottom:6px;">Summary</span>
        <p style="color:${neonBrand.text};font-size:14px;line-height:1.6;border-left:3px solid ${neonBrand.gold};padding-left:16px;margin:0;">${blog.description}</p>
      </div>
    ` : ""}
    
    ${ctaButton("→ Review Blog in Admin Panel", `${ADMIN_URL}/${blog._id}/review`)}
  `);

    const textBody = `Someone has posted a new blog: "${blog.title}" by ${poster.name} (@${poster.username}).\n\nPlease review it for further actions at: ${ADMIN_URL}/${blog._id}/review`;

    const results = [];
    for (const email of managerEmails) {
        results.push(await sendEmail({ to: email, subject, htmlBody, textBody }));
    }
    return results;
};

// Helper to resolve poster email from arguments or blog object
const resolvePosterEmail = (posterEmail, blog) => {
    if (posterEmail && typeof posterEmail === "string" && posterEmail.includes("@")) {
        return posterEmail;
    }
    if (blog?.author?.email && typeof blog.author.email === "string" && blog.author.email.includes("@")) {
        return blog.author.email;
    }
    // Fallback email for development / testing when blog document lacks author email
    return "neoncinematic@iiitkota.ac.in";
};

/** Notify poster that their blog was submitted for review */
export const notifyPosterSubmitted = async (posterEmail, blog) => {
    const targetEmail = resolvePosterEmail(posterEmail, blog);
    if (!targetEmail) return;

    const subject = `Blog Submitted: "${blog.title}"`;
    const htmlBody = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;color:${neonBrand.text};font-weight:600;">Blog Submitted for Review</h2>
    <p style="margin:0 0 20px;color:${neonBrand.muted};font-size:14px;">Your blog post has been submitted and is now under review by Neon team managers.</p>
    
    <div style="background:${neonBrand.cardBg};border:1px solid ${neonBrand.border};padding:24px;margin:20px 0;">
      <h3 style="margin:0 0 8px;font-size:18px;color:${neonBrand.text};">${blog.title}</h3>
      <p style="margin:0;color:${neonBrand.muted};font-size:13px;">${blog.description || ""}</p>
      <div style="margin-top:16px;">${statusBadge("submitted")}</div>
    </div>
    
    <p style="color:${neonBrand.muted};font-size:13px;line-height:1.6;">
      Our managers will review your submission shortly. You will receive an email as soon as a decision is made.
    </p>
    
    ${ctaButton("→ Track Status in Dashboard", `${SITE_URL}/blog/dashboard`)}
  `);

    return sendEmail({ to: targetEmail, subject, htmlBody, textBody: `Your blog "${blog.title}" has been submitted for review. Check status at: ${SITE_URL}/blog/dashboard` });
};

/** Notify poster that their blog was approved */
export const notifyPosterApproved = async (posterEmail, blog) => {
    const targetEmail = resolvePosterEmail(posterEmail, blog);
    if (!targetEmail) return;

    const subject = `🎬 Your Blog Post Has Been Approved: "${blog.title}"`;
    const htmlBody = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;color:${neonBrand.gold};font-weight:600;">Blog Approved!</h2>
    <p style="margin:0 0 20px;color:${neonBrand.muted};font-size:14px;">Great news — your blog post "<strong>${blog.title}</strong>" has been approved by Neon managers.</p>
    
    <div style="background:${neonBrand.cardBg};border:1px solid ${neonBrand.gold}44;padding:24px;margin:20px 0;">
      <h3 style="margin:0 0 8px;font-size:18px;color:${neonBrand.text};">${blog.title}</h3>
      <div style="margin-top:12px;">${statusBadge("approved")}</div>
    </div>
    
    <p style="color:${neonBrand.muted};font-size:13px;line-height:1.6;">
      Your post will be published to the main blog page shortly.
    </p>
    
    ${ctaButton("→ View Dashboard", `${SITE_URL}/blog/dashboard`, neonBrand.gold)}
  `);

    return sendEmail({ to: targetEmail, subject, htmlBody, textBody: `Your blog "${blog.title}" has been approved!` });
};

/** Notify poster that their blog was rejected with feedback */
export const notifyPosterRejected = async (posterEmail, blog, reviewMessage) => {
    const targetEmail = resolvePosterEmail(posterEmail, blog);
    if (!targetEmail) return;

    const subject = `Blog Needs Revision: "${blog.title}"`;
    const htmlBody = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;color:#ef4444;font-weight:600;">Blog Requires Revision</h2>
    <p style="margin:0 0 20px;color:${neonBrand.muted};font-size:14px;">Your blog submission requires changes before it can be published.</p>
    
    <div style="background:${neonBrand.cardBg};border:1px solid ${neonBrand.border};padding:24px;margin:20px 0;">
      <h3 style="margin:0 0 12px;font-size:18px;color:${neonBrand.text};">${blog.title}</h3>
      <div style="margin-bottom:16px;">${statusBadge("rejected")}</div>
      
      <div style="border-top:1px solid ${neonBrand.border};padding-top:16px;margin-top:16px;">
        <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${neonBrand.muted};">Manager Feedback</p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:${neonBrand.text};background:#1c1012;border-left:3px solid #ef4444;padding:12px 16px;">${reviewMessage}</p>
      </div>
    </div>
    
    ${ctaButton("→ Edit Blog", `${SITE_URL}/blog/dashboard`, "#ef4444")}
  `);

    return sendEmail({
        to: targetEmail, subject, htmlBody,
        textBody: `Your blog "${blog.title}" requires revision.\n\nFeedback: ${reviewMessage}\n\nEdit your blog: ${SITE_URL}/blog/dashboard`
    });
};

/** Notify poster that their blog has been published */
export const notifyPosterPublished = async (posterEmail, blog) => {
    const targetEmail = resolvePosterEmail(posterEmail, blog);
    if (!targetEmail) return;

    const publicUrl = `${SITE_URL}/blog/${blog.slug?.current || blog._id}`;
    const subject = `🎬 Your Blog is Live: "${blog.title}"`;
    const htmlBody = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:22px;color:${neonBrand.gold};font-weight:600;">Your Blog is Live!</h2>
    <p style="margin:0 0 20px;color:${neonBrand.muted};font-size:14px;">Congratulations! Your blog has been published and is now live on Neon Cinematics.</p>
    
    <div style="background:${neonBrand.cardBg};border:1px solid ${neonBrand.gold}44;padding:24px;margin:20px 0;">
      <h3 style="margin:0 0 8px;font-size:18px;color:${neonBrand.text};">${blog.title}</h3>
      ${blog.description ? `<p style="margin:8px 0 0;color:${neonBrand.muted};font-size:13px;">${blog.description}</p>` : ""}
      <div style="margin-top:16px;">${statusBadge("published")}</div>
    </div>
    
    ${ctaButton("→ Read Your Blog Live", publicUrl, neonBrand.gold)}
  `);

    return sendEmail({
        to: targetEmail, subject, htmlBody,
        textBody: `Your blog "${blog.title}" is live! Read it at: ${publicUrl}`
    });
};
