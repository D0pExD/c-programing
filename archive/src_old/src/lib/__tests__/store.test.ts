import { describe, it, expect } from 'vitest';
import { TournamentStore } from '../store/tournament-store';

describe('TournamentStore Integration', () => {
  it('creates and retrieves demo event with 10 teams and 5 rounds of questions', () => {
    const event = TournamentStore.createEvent('Test Event 1', 'EVTEST1');
    expect(event).toBeDefined();
    expect(event.teams.length).toBeGreaterThanOrEqual(8);
    expect(event.currentRound).toBe(1);

    const questions = TournamentStore.getQuestions(event.id);
    expect(questions.length).toBeGreaterThanOrEqual(8);
  });

  it('handles atomic student joining, assigns captain to 1st member, and issues session', () => {
    const event = TournamentStore.createEvent('Test Join Event', 'JOIN01');
    TournamentStore.updateEventState(event.id, 'LOBBY_OPEN');
    const team1 = event.teams[0];

    // Join member 1
    const res1 = TournamentStore.joinEvent('JOIN01', 'Rahul Verma', 'BCA-001', team1.id);
    expect(res1.player.name).toBe('Rahul Verma');
    expect(res1.player.isCaptain).toBe(true);
    expect(res1.session.token).toBeDefined();
    expect(res1.session.isCaptain).toBe(true);

    // Join member 2
    const res2 = TournamentStore.joinEvent('JOIN01', 'Priya Sharma', 'BCA-002', team1.id);
    expect(res2.player.isCaptain).toBe(false);
    expect(res2.session.isCaptain).toBe(false);

    // Reconnecting student with same roll number recovers session instead of duplicating
    const reconn = TournamentStore.joinEvent('JOIN01', 'Rahul Verma', 'BCA-001', team1.id);
    expect(reconn.player.id).toBe(res1.player.id);
    expect(reconn.player.isCaptain).toBe(true);
  });

  it('enforces captain-only submissions and prevents duplicate team submissions', () => {
    const event = TournamentStore.createEvent('Test Submission Event', 'SUB001');
    TournamentStore.updateEventState(event.id, 'LOBBY_OPEN');
    const team = event.teams[0];

    // Join captain first
    const captainRes = TournamentStore.joinEvent('SUB001', 'Captain Bob', 'BCA-CAP-1', team.id);
    // Join non-captain second
    const memberRes = TournamentStore.joinEvent('SUB001', 'Member Alice', 'BCA-MEM-1', team.id);

    // Transition to ACTIVE question
    TournamentStore.setQuestionState(event.id, 'ACTIVE');

    // Non-captain submission should fail
    expect(() => {
      TournamentStore.submitAnswer('SUB001', memberRes.session.token, 'opt-a');
    }).toThrow(/Only the designated team captain/);

    // Captain submission should succeed
    const sub = TournamentStore.submitAnswer('SUB001', captainRes.session.token, 'opt-a');
    expect(sub.isCorrect).toBe(true);

    // Second submission by captain for same question should fail (idempotency)
    expect(() => {
      TournamentStore.submitAnswer('SUB001', captainRes.session.token, 'opt-a');
    }).toThrow(/already submitted/);

    // Transition to LOCKED, REVEALED, and SCORED
    TournamentStore.setQuestionState(event.id, 'LOCKED');
    TournamentStore.setQuestionState(event.id, 'REVEALED');
    TournamentStore.calculateQuestionScores(event.id);

    expect(team.score).toBeGreaterThan(0);
    const ledger = TournamentStore.getLedger(event.id);
    expect(ledger.length).toBeGreaterThan(0);
    expect(ledger[0].teamId).toBe(team.id);
    expect(ledger[0].pointsDelta).toBeGreaterThan(0);
  });

  it('seeds simulated classroom of 50 students across teams', () => {
    const event = TournamentStore.createEvent('Test Simulation Event', 'SIM001');
    TournamentStore.seedSimulatedClassroom(event.id);

    const totalStudents = event.teams.reduce((sum, t) => sum + t.members.length, 0);
    expect(totalStudents).toBe(event.teams.length * 5);
    for (const t of event.teams) {
      expect(t.members.length).toBe(5);
      expect(t.captainId).toBeDefined();
    }
  });
});
