import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

// A simple utility to generate an invoice number
const generateInvoiceNumber = () => `INV-${Date.now()}`;

export async function POST(req: Request) {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const prisma = await getPrisma();
  const { caseId, amount, description } = await req.json();

  if (!caseId || !amount) {
    return NextResponse.json({ error: "Case ID and amount are required" }, { status: 400 });
  }

  try {
    const caseData = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const invoiceNumber = generateInvoiceNumber();
    
    // This is the corrected block
    const payment = await prisma.payment.create({
      data: {
        amount: Math.round(parseFloat(amount) * 100), // Correct field name is 'amount'
        currency: 'USD',
        description: description || `Payment for case ${caseData.caseNumber}`,
        status: 'UNPAID', // Enums are typically uppercase
        invoiceNumber,
        case: {          // Correct way to link a relation
          connect: {
            id: caseId
          }
        }
      }
    });

    return NextResponse.json({ success: true, paymentId: payment.id, invoiceNumber });
  } catch (error) {
    console.error("Simple payment creation failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
