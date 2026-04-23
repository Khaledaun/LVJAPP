import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { runAuthed } from "@/lib/rbac-http";

export const dynamic = 'force-dynamic'
export const revalidate = 0

const generateInvoiceNumber = () => `INV-${Date.now()}`;

export async function POST(req: Request) {
  const { caseId, amount, description } = await req.json();

  if (!caseId || !amount) {
    return NextResponse.json({ error: "Case ID and amount are required" }, { status: 400 });
  }

  return runAuthed({ caseId }, async () => {
    const prisma = await getPrisma();
    try {
      const caseData = await prisma.case.findUnique({ where: { id: caseId } });
      if (!caseData) {
        return NextResponse.json({ error: "Case not found" }, { status: 404 });
      }

      const invoiceNumber = generateInvoiceNumber();

      const payment = await prisma.payment.create({
        data: {
          amount: Math.round(parseFloat(amount) * 100),
          currency: 'USD',
          description: description || `Payment for case ${caseData.caseNumber}`,
          status: 'UNPAID',
          invoiceNumber,
          case: { connect: { id: caseId } }
        }
      });

      return NextResponse.json({ success: true, paymentId: payment.id, invoiceNumber });
    } catch (error) {
      console.error("Simple payment creation failed:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  });
}
