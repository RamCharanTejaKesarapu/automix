import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ApplicationStateMachine } from '../src/state/stateMachine.js';

describe('ApplicationStateMachine Lifecycle & Statistics', () => {
  test('should start in IDLE state with zeroed statistics', () => {
    const fsm = new ApplicationStateMachine();
    assert.strictEqual(fsm.getState(), 'IDLE');
    assert.strictEqual(fsm.getContext(), null);

    const stats = fsm.getStats();
    assert.strictEqual(stats.jobsFound, 0);
    assert.strictEqual(stats.applicationsSubmitted, 0);
    assert.strictEqual(stats.waitingForUser, 0);
    assert.strictEqual(stats.failed, 0);
  });

  test('should transition through standard application states and update context', () => {
    const fsm = new ApplicationStateMachine();

    fsm.transitionTo('DISCOVERING');
    assert.strictEqual(fsm.getState(), 'DISCOVERING');

    fsm.transitionTo('OPENING_APPLICATION', {
      company: 'Acme Corp',
      jobTitle: 'Data Engineer',
      jobUrl: 'https://example.com/job/1',
      totalFields: 5,
      filledFields: 0
    });

    assert.strictEqual(fsm.getState(), 'OPENING_APPLICATION');
    const ctx = fsm.getContext();
    assert.ok(ctx);
    assert.strictEqual(ctx.company, 'Acme Corp');
    assert.strictEqual(ctx.jobTitle, 'Data Engineer');
    assert.strictEqual(ctx.totalFields, 5);
    assert.strictEqual(ctx.filledFields, 0);
  });

  test('should correctly track and update field progress', () => {
    const fsm = new ApplicationStateMachine();

    fsm.transitionTo('FILLING_FIELDS', {
      company: 'TechCorp',
      jobTitle: 'Software Intern',
      jobUrl: 'https://example.com/job/2',
      totalFields: 10,
      filledFields: 0
    });

    fsm.updateFieldProgress(4, 10, 'Full Name');
    let ctx = fsm.getContext();
    assert.strictEqual(ctx?.filledFields, 4);
    assert.strictEqual(ctx?.totalFields, 10);
    assert.strictEqual(ctx?.currentFieldName, 'Full Name');

    fsm.updateFieldProgress(7, undefined, 'Resume File');
    ctx = fsm.getContext();
    assert.strictEqual(ctx?.filledFields, 7);
    assert.strictEqual(ctx?.totalFields, 10);
    assert.strictEqual(ctx?.currentFieldName, 'Resume File');
  });

  test('should increment waitingForUser during HITL and decrement when resumed', () => {
    const fsm = new ApplicationStateMachine();

    fsm.transitionTo('WAITING_FOR_USER', {
      pendingQuestion: 'What is your graduation date?'
    });

    assert.strictEqual(fsm.getState(), 'WAITING_FOR_USER');
    assert.strictEqual(fsm.getStats().waitingForUser, 1);

    fsm.transitionTo('GENERATING_GPT_RESPONSE');
    assert.strictEqual(fsm.getState(), 'GENERATING_GPT_RESPONSE');
    assert.strictEqual(fsm.getStats().waitingForUser, 0);
  });

  test('should track successful submissions and failures', () => {
    const fsm = new ApplicationStateMachine();

    fsm.transitionTo('SUBMITTED');
    assert.strictEqual(fsm.getStats().applicationsSubmitted, 1);

    fsm.markFailed();
    assert.strictEqual(fsm.getState(), 'ERROR');
    assert.strictEqual(fsm.getStats().failed, 1);
  });

  test('should trigger registered listeners on state changes and support unsubscription', () => {
    const fsm = new ApplicationStateMachine();
    const transitions: string[] = [];

    const unsubscribe = fsm.onStateChange((state) => {
      transitions.push(state);
    });

    fsm.transitionTo('DISCOVERING');
    fsm.transitionTo('JOB_FOUND');
    assert.deepStrictEqual(transitions, ['DISCOVERING', 'JOB_FOUND']);

    // Test unsubscribe
    unsubscribe();
    fsm.transitionTo('IDLE');
    // transitions list should remain unchanged after unsubscribing
    assert.deepStrictEqual(transitions, ['DISCOVERING', 'JOB_FOUND']);
  });
});
