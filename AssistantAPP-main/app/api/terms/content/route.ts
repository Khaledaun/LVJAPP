export type TermsType = string;
export type Language = 'en' | 'ar' | 'pt';

import { NextRequest, NextResponse } from "next/server";
import { TERMS_CONTENT, CURRENT_TERMS_VERSION } from "@/lib/terms";
import { getPrisma } from '@/lib/db'
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
export const fetchCache = 'force-no-store';



export async function GET(request: NextRequest) {
  const prisma = await getPrisma();
  const { searchParams } = new URL(request.url);
  const language = (searchParams.get('language') || 'EN') as Language;
  const type = searchParams.get('type') as TermsType;

  try {
    if (type && TERMS_CONTENT[language]?.[type]) {
      return NextResponse.json(TERMS_CONTENT[language][type]);
    } else {
      // Return all terms for the language
      return NextResponse.json({
        version: CURRENT_TERMS_VERSION,
        language,
        terms: (TERMS_CONTENT[language] ?? TERMS_CONTENT['en'])
      });
    }
  } catch (error) {
    console.error("Terms content error:", error);
    return NextResponse.json(
      { error: "Failed to get terms content" },
      { status: 500 }
    );
  }
}
