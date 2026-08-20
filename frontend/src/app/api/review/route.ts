import { NextResponse } from 'next/server';
import { generateServerCodeReview } from '@/lib/aiProvider';
import { SupportedLanguage } from '@/types/dashboard';

const VALID_LANGUAGES: SupportedLanguage[] = [
  'typescript',
  'javascript',
  'python',
  'java',
  'cpp',
  'go',
];

const MAX_CODE_LENGTH = 50000; // 50KB limit

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const { code, language } = body;

    // 1. Validate Code
    if (typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { error: 'Code submission cannot be empty.' },
        { status: 400 }
      );
    }

    if (code.length > MAX_CODE_LENGTH) {
      return NextResponse.json(
        {
          error: `Code submission size (${code.length} chars) exceeds maximum allowed limit of ${MAX_CODE_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    // 2. Validate Language
    if (
      typeof language !== 'string' ||
      !VALID_LANGUAGES.includes(language as SupportedLanguage)
    ) {
      return NextResponse.json(
        {
          error: `Invalid or unsupported programming language '${language}'. Supported languages: ${VALID_LANGUAGES.join(
            ', '
          )}`,
        },
        { status: 400 }
      );
    }

    // 3. Process Code Review via Server-Side AI Provider
    const reviewResult = await generateServerCodeReview({
      code: code.trim(),
      language: language as SupportedLanguage,
    });

    return NextResponse.json(reviewResult, { status: 200 });
  } catch (error) {
    console.error('[API /api/review Exception]:', error);
    return NextResponse.json(
      { error: 'Internal server error processing AI code review.' },
      { status: 500 }
    );
  }
}
