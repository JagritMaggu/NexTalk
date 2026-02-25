import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
    path: "/clerk-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error("CLERK_WEBHOOK_SECRET environment variable not set");
        }

        const svix_id = request.headers.get("svix-id");
        const svix_timestamp = request.headers.get("svix-timestamp");
        const svix_signature = request.headers.get("svix-signature");

        if (!svix_id || !svix_timestamp || !svix_signature) {
            return new Response("Missing svix headers", { status: 400 });
        }

        const body = await request.text();
        const wh = new Webhook(webhookSecret);

        let event: any;
        try {
            event = wh.verify(body, {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature,
            });
        } catch (err) {
            return new Response("Webhook verification failed", { status: 400 });
        }

        const { type, data } = event;

        if (type === "user.created" || type === "user.updated") {
            const { id, first_name, last_name, email_addresses, image_url } = data;
            const name =
                [first_name, last_name].filter(Boolean).join(" ") || "Unknown";
            const email = email_addresses?.[0]?.email_address ?? "";

            await ctx.runMutation(internal.users.upsertFromClerk, {
                clerkId: id,
                name,
                email,
                image: image_url ?? "",
            });
        }

        return new Response(null, { status: 200 });
    }),
});

export default http;
