import { generateJoinToken, hashJoinToken, joinLinkUrl } from './join-token';

describe('join-token', () => {
  it('hashes a raw token without storing the plaintext', () => {
    const raw = 'fake-high-entropy-join-token';
    const digest = hashJoinToken(raw);

    expect(digest).not.toBe(raw);
    expect(digest).toHaveLength(64);
    expect(digest).toBe(hashJoinToken(raw));
    expect(hashJoinToken('other-token')).not.toBe(digest);
  });

  it('builds the join URL from the raw token, not the hash', () => {
    const raw = generateJoinToken();
    const url = joinLinkUrl(raw);

    expect(url).toBe(`http://localhost:3000/join/${raw}`);
    expect(url).not.toContain(hashJoinToken(raw));
  });
});
