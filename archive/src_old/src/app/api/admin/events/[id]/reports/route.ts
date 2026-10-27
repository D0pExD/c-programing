import { NextRequest, NextResponse } from 'next/server';
import { TournamentStore } from '@/lib/store/tournament-store';

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const event = TournamentStore.getEventById(id);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'leaderboard';

    let csvContent = '';
    const filename = `${event.code}_${type}.csv`;

    switch (type) {
      case 'attendance': {
        const rows: string[] = ['Roll Number,Student Name,Team Name,Is Captain,Joined At,Status'];
        for (const t of event.teams) {
          for (const m of t.members) {
            rows.push(
              [
                escapeCSV(m.rollNumber),
                escapeCSV(m.name),
                escapeCSV(t.name),
                escapeCSV(m.isCaptain ? 'YES' : 'NO'),
                escapeCSV(m.joinedAt),
                escapeCSV('ACTIVE'),
              ].join(',')
            );
          }
        }
        csvContent = rows.join('\n');
        break;
      }

      case 'teams': {
        const rows: string[] = ['Team Name,Members Count,Captain,Current Score,Rank,Is Locked'];
        for (const t of event.teams) {
          rows.push(
            [
              escapeCSV(t.name),
              escapeCSV(t.members.length),
              escapeCSV(t.captainName || 'None'),
              escapeCSV(t.score),
              escapeCSV(t.rank),
              escapeCSV(t.isLocked ? 'YES' : 'NO'),
            ].join(',')
          );
        }
        csvContent = rows.join('\n');
        break;
      }

      case 'leaderboard': {
        const rows: string[] = ['Rank,Team Name,Score,Correct Answers,Cumulative Response Time (ms),Members'];
        for (const t of event.teams) {
          rows.push(
            [
              escapeCSV(t.rank),
              escapeCSV(t.name),
              escapeCSV(t.score),
              escapeCSV(t.correctCount),
              escapeCSV(t.totalResponseTimeMs),
              escapeCSV(t.members.length),
            ].join(',')
          );
        }
        csvContent = rows.join('\n');
        break;
      }

      case 'ledger': {
        const ledger = TournamentStore.getLedger(id);
        const rows: string[] = ['Timestamp,Team Name,Round,Question ID,Points Delta,Previous Score,New Score,Reason,Performed By'];
        for (const entry of ledger) {
          rows.push(
            [
              escapeCSV(entry.createdAt),
              escapeCSV(entry.teamName),
              escapeCSV(entry.round),
              escapeCSV(entry.questionId || 'N/A'),
              escapeCSV(entry.pointsDelta),
              escapeCSV(entry.previousScore),
              escapeCSV(entry.newScore),
              escapeCSV(entry.reason),
              escapeCSV(entry.performedBy),
            ].join(',')
          );
        }
        csvContent = rows.join('\n');
        break;
      }

      case 'questions': {
        const questions = TournamentStore.getQuestions(id);
        const rows: string[] = ['Order,Round,Type,Title,Difficulty,Time Limit (s),Base Points,Speed Bonus,Tags'];
        for (const q of questions) {
          rows.push(
            [
              escapeCSV(q.orderIndex),
              escapeCSV(q.round),
              escapeCSV(q.type),
              escapeCSV(q.title),
              escapeCSV(q.difficulty),
              escapeCSV(q.timeLimitSeconds),
              escapeCSV(q.basePoints),
              escapeCSV(q.speedBonusMax),
              escapeCSV(q.tags.join('; ')),
            ].join(',')
          );
        }
        csvContent = rows.join('\n');
        break;
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid report type' }, { status: 400 });
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
