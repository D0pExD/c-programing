import { NextRequest, NextResponse } from 'next/server';
import { TournamentStore } from '@/lib/store/tournament-store';
import { Question } from '@/types/tournament';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const questions = TournamentStore.getQuestions(id);
    return NextResponse.json({ success: true, questions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch questions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const questions = TournamentStore.getQuestions(id);

    // If importing array of questions
    if (Array.isArray(body)) {
      questions.length = 0;
      questions.push(...body);
      return NextResponse.json({ success: true, count: questions.length });
    }

    // Single question creation
    const newQ: Question = {
      id: body.id || `q-${Date.now()}`,
      round: body.round || 1,
      type: body.type || 'SINGLE_CHOICE',
      title: body.title || 'New C Question',
      description: body.description || '',
      codeSnippet: body.codeSnippet || '',
      options: body.options || [],
      correctAnswer: body.correctAnswer || '',
      explanation: body.explanation || '',
      difficulty: body.difficulty || 'MEDIUM',
      timeLimitSeconds: body.timeLimitSeconds || 30,
      basePoints: body.basePoints || 100,
      speedBonusMax: body.speedBonusMax || 50,
      tags: body.tags || [],
      orderIndex: questions.length + 1,
    };

    questions.push(newQ);
    return NextResponse.json({ success: true, question: newQ }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save question';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
