/**
 * Hoshinote E2E Test Suite - Assertion and Reporting Helpers
 * Self-contained utilities with zero external npm dependencies.
 */

class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object') {
    if (a instanceof RegExp && b instanceof RegExp) return a.toString() === b.toString();
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

export const assert = {
  ok(condition, message = 'Expected condition to be truthy') {
    if (!condition) {
      throw new AssertionError(message, condition, true);
    }
  },

  strictEqual(actual, expected, message) {
    if (actual !== expected) {
      const msg = message || `Expected strict equality: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`;
      throw new AssertionError(msg, actual, expected);
    }
  },

  notStrictEqual(actual, expected, message) {
    if (actual === expected) {
      const msg = message || `Expected values to differ: both were ${JSON.stringify(actual)}`;
      throw new AssertionError(msg, actual, expected);
    }
  },

  deepStrictEqual(actual, expected, message) {
    if (!deepEqual(actual, expected)) {
      const msg = message || `Expected deep equality:\nActual:   ${JSON.stringify(actual, null, 2)}\nExpected: ${JSON.stringify(expected, null, 2)}`;
      throw new AssertionError(msg, actual, expected);
    }
  },

  match(actual, regex, message) {
    if (typeof actual !== 'string' || !regex.test(actual)) {
      const msg = message || `Expected string to match ${regex}: got "${actual}"`;
      throw new AssertionError(msg, actual, regex.toString());
    }
  },

  doesNotMatch(actual, regex, message) {
    if (typeof actual === 'string' && regex.test(actual)) {
      const msg = message || `Expected string NOT to match ${regex}: got "${actual}"`;
      throw new AssertionError(msg, actual, regex.toString());
    }
  },

  includes(collection, item, message) {
    if (typeof collection === 'string') {
      if (!collection.includes(item)) {
        throw new AssertionError(message || `Expected string to include "${item}"`, collection, item);
      }
      return;
    }
    if (Array.isArray(collection)) {
      const found = collection.some(el => deepEqual(el, item));
      if (!found) {
        throw new AssertionError(message || `Expected array to include item: ${JSON.stringify(item)}`, collection, item);
      }
      return;
    }
    throw new AssertionError('includes expects a string or array', collection, item);
  },

  lengthOf(collection, expectedLength, message) {
    const actualLen = collection ? collection.length : undefined;
    if (actualLen !== expectedLength) {
      const msg = message || `Expected length ${expectedLength}, got ${actualLen}`;
      throw new AssertionError(msg, actualLen, expectedLength);
    }
  },

  isAbove(actual, min, message) {
    if (!(actual > min)) {
      const msg = message || `Expected ${actual} to be strictly greater than ${min}`;
      throw new AssertionError(msg, actual, `> ${min}`);
    }
  },

  isAtLeast(actual, min, message) {
    if (!(actual >= min)) {
      const msg = message || `Expected ${actual} to be at least ${min}`;
      throw new AssertionError(msg, actual, `>= ${min}`);
    }
  },

  isBelow(actual, max, message) {
    if (!(actual < max)) {
      const msg = message || `Expected ${actual} to be strictly less than ${max}`;
      throw new AssertionError(msg, actual, `< ${max}`);
    }
  },

  isAtMost(actual, max, message) {
    if (!(actual <= max)) {
      const msg = message || `Expected ${actual} to be at most ${max}`;
      throw new AssertionError(msg, actual, `<= ${max}`);
    }
  },

  throws(fn, expectedRegexOrMessage, message) {
    let threw = false;
    let thrownError = null;
    try {
      fn();
    } catch (err) {
      threw = true;
      thrownError = err;
    }
    if (!threw) {
      throw new AssertionError(message || 'Expected function to throw an error', null, 'Error');
    }
    if (expectedRegexOrMessage instanceof RegExp) {
      if (!expectedRegexOrMessage.test(thrownError.message || String(thrownError))) {
        throw new AssertionError(`Expected error message to match ${expectedRegexOrMessage}, got: "${thrownError.message}"`, thrownError.message, expectedRegexOrMessage.toString());
      }
    } else if (typeof expectedRegexOrMessage === 'string') {
      if (!String(thrownError.message || thrownError).includes(expectedRegexOrMessage)) {
        throw new AssertionError(`Expected error message to contain "${expectedRegexOrMessage}", got: "${thrownError.message}"`, thrownError.message, expectedRegexOrMessage);
      }
    }
  },

  doesNotThrow(fn, message) {
    try {
      fn();
    } catch (err) {
      throw new AssertionError(message || `Expected function not to throw, but caught: ${err.message}`, err.message, null);
    }
  }
};
