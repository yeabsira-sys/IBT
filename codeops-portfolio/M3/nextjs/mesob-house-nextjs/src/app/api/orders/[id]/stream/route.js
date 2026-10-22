import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOrderForUser } from "@/lib/orders";
import { isTerminal } from "@/lib/orderStatus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_MS = 2_000;
const encoder = new TextEncoder();

/** SSE framing: one `data:` line followed by the required blank line. */
const event = (payload) => `data: ${JSON.stringify(payload)}\n\n`;

export async function GET(request, { params }) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }
  if (user.role !== "customer") {
    return NextResponse.json({ message: "Customer access required." }, { status: 403 });
  }

  const { id } = await params;
  const initial = await getOrderForUser(user.id, id);
  if (!initial) {
    return NextResponse.json({ message: "Order not found." }, { status: 404 });
  }

  let closed = false;
  let timer = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (order) => {
        if (closed) return;
        controller.enqueue(encoder.encode(event(order)));
      };

      const close = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          // The browser may already have cancelled the stream.
        }
      };

      let lastUpdatedAt = initial.updatedAt;
      send(initial);

      if (isTerminal(initial.status)) {
        close();
        return;
      }

      timer = setInterval(async () => {
        if (closed) return;
        try {
          const latest = await getOrderForUser(user.id, id);
          if (!latest) {
            close();
            return;
          }
          if (latest.updatedAt === lastUpdatedAt) return;

          lastUpdatedAt = latest.updatedAt;
          send(latest);

          if (isTerminal(latest.status)) close();
        } catch {
          // A transient file read should not kill the stream; try again next tick.
        }
      }, POLL_MS);

      if (request.signal.aborted) {
        close();
      } else {
        request.signal.addEventListener("abort", close, { once: true });
      }
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
