import { EmailMessage } from "cloudflare:email";

export async function onRequestPost({ request, env }) {
  try {
    // 1. Parse the incoming form data
    const formData = await request.formData();
    const name = formData.get("name") || "Unknown";
    const email = formData.get("email") || "No Email";
    const phone = formData.get("phone") || "No Phone";
    const interest = formData.get("interest") || "General";
    const messageText = formData.get("message") || "";

    // 2. Format the email content
    const subject = `New Website Enquiry: ${interest} from ${name}`;
    const body = `
You have received a new message from the Putra Jambu Antique website (Fallback System).

Name: ${name}
Email: ${email}
Phone/WA: ${phone}
Interest: ${interest}

Message:
${messageText}
`;

    // 3. Construct the email message
    // Note: The "from" address must be a verified sender in Cloudflare Email Routing
    // and the "to" address must be your verified destination address.
    const message = new EmailMessage(
      "noreply@antique.id",
      "info@antique.id",
      body
    );

    // 4. Send the email using the Cloudflare Email Routing binding (named 'SEB' in dashboard)
    if (!env.SEB) {
      throw new Error("Cloudflare Send Email Binding (SEB) is not configured in the dashboard.");
    }
    
    await env.SEB.send(message);

    return new Response(JSON.stringify({ success: true, via: 'cloudflare' }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
