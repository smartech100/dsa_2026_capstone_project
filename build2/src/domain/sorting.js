/**
 * Stable merge sort. Returns a new array; never mutates the input.
 * Does not call Array.prototype.sort.
 *
 * @template T
 * @param {readonly T[]} items
 * @param {(a: T, b: T) => number} compare  negative if a < b, 0 if equal, positive if a > b
 * @returns {T[]}
 */
export function mergeSort(items, compare) {
  const n = items.length;
  if (n <= 1) return items.slice();

  const mid = Math.floor(n / 2);
  const left = mergeSort(items.slice(0, mid), compare);
  const right = mergeSort(items.slice(mid), compare);
  return merge(left, right, compare);
}

/**
 * Merge two already-sorted arrays. When compare returns 0, take from the left
 * first so equal items keep their original relative order (stability).
 */
function merge(left, right, compare) {
  const result = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (compare(left[i], right[j]) <= 0) {
      result.push(left[i]);
      i += 1;
    } else {
      result.push(right[j]);
      j += 1;
    }
  }

  while (i < left.length) {
    result.push(left[i]);
    i += 1;
  }
  while (j < right.length) {
    result.push(right[j]);
    j += 1;
  }
  return result;
}
