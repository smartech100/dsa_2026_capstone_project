import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Queue } from '../src/domain/waitlistQueue.js';

describe('Queue', () => {
  it('starts empty', () => {
    const queue = new Queue();
    assert.equal(queue.size, 0);
    assert.equal(queue.isEmpty, true);
    assert.equal(queue.peek(), undefined);
    assert.equal(queue.dequeue(), undefined);
  });

  it('enqueues and dequeues in FIFO order', () => {
    const queue = new Queue();
    queue.enqueue('Bayo');
    queue.enqueue('Fatou');
    assert.equal(queue.size, 2);
    assert.equal(queue.peek(), 'Bayo');
    assert.equal(queue.dequeue(), 'Bayo');
    assert.equal(queue.dequeue(), 'Fatou');
    assert.equal(queue.isEmpty, true);
  });

  it('peek does not remove the head', () => {
    const queue = new Queue();
    queue.enqueue('Ada');
    assert.equal(queue.peek(), 'Ada');
    assert.equal(queue.size, 1);
    assert.equal(queue.peek(), 'Ada');
  });

  it('clear empties the queue', () => {
    const queue = new Queue();
    queue.enqueue(1);
    queue.enqueue(2);
    queue.clear();
    assert.equal(queue.size, 0);
    assert.equal(queue.isEmpty, true);
    assert.equal(queue.dequeue(), undefined);
  });

  it('handles enqueue after emptying', () => {
    const queue = new Queue();
    queue.enqueue('first');
    queue.dequeue();
    queue.enqueue('second');
    assert.equal(queue.peek(), 'second');
    assert.equal(queue.dequeue(), 'second');
  });
});
