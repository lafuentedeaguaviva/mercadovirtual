import { NextResponse } from "next/server";
import { trackClick } from "@/app/actions/analytics";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.businessId || !body.type) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const res = await trackClick({
      businessId: body.businessId,
      itemId: body.itemId || null,
      type: body.type,
    });

    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
