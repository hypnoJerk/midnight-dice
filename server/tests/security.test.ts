import { describe, it, expect } from 'vitest';
import { validateUsername, sanitizeText, validateUUID, validateRoomCode } from '../src/utils/security.js';

describe('Security Utility Hardening & Sanitization', () => {
  describe('Username and Display Name Validation', () => {
    it('should accept clean alphanumeric names, spaces, hyphens, and underscores', () => {
      expect(validateUsername('SHAUN')).toBe(true);
      expect(validateUsername('Player 1')).toBe(true);
      expect(validateUsername('MIDNIGHT_GAMER')).toBe(true);
      expect(validateUsername('Dice-Boss-99')).toBe(true);
    });

    it('should reject names containing script tags or HTML elements (XSS)', () => {
      expect(validateUsername('<script>alert(1)</script>')).toBe(false);
      expect(validateUsername('Player<script>')).toBe(false);
      expect(validateUsername('hello <b>world</b>')).toBe(false);
      expect(validateUsername('<img src=x onerror=alert(1)>')).toBe(false);
    });

    it('should reject SQL injection or special symbol payloads', () => {
      expect(validateUsername("' OR 1=1 --")).toBe(false);
      expect(validateUsername('admin; DROP TABLE users;')).toBe(false);
      expect(validateUsername('user@domain.com')).toBe(false);
      expect(validateUsername('player#1')).toBe(false);
    });

    it('should reject empty, undefined, or non-string values', () => {
      expect(validateUsername('')).toBe(false);
      expect(validateUsername('   ')).toBe(false);
      expect(validateUsername(null)).toBe(false);
      expect(validateUsername(undefined)).toBe(false);
      expect(validateUsername(12345)).toBe(false);
    });

    it('should reject names longer than 30 characters', () => {
      expect(validateUsername('A'.repeat(31))).toBe(false);
      expect(validateUsername('A'.repeat(30))).toBe(true);
    });
  });

  describe('HTML and Script Sanitization', () => {
    it('should strip simple HTML and XML tags from incoming text', () => {
      expect(sanitizeText('<b>Hello</b> World')).toBe('Hello World');
      expect(sanitizeText('<script>alert("XSS")</script>')).toBe('alert("XSS")');
      expect(sanitizeText('hello <img src=x onerror=alert(1)>')).toBe('hello ');
    });

    it('should return empty string for non-string inputs', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
      expect(sanitizeText(1234)).toBe('');
    });
  });

  describe('UUID Format Validation', () => {
    it('should accept valid standard UUID formats', () => {
      expect(validateUUID('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true);
      expect(validateUUID('A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11')).toBe(true);
    });

    it('should reject SQL injection, script injections, or generic text in place of UUID', () => {
      expect(validateUUID("' OR 1=1 --")).toBe(false);
      expect(validateUUID('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11; DROP TABLE matches;')).toBe(false);
      expect(validateUUID('<script>')).toBe(false);
      expect(validateUUID('not-a-uuid')).toBe(false);
      expect(validateUUID('')).toBe(false);
    });
  });

  describe('Room Code Validation', () => {
    it('should accept valid 4-character alphanumeric room codes', () => {
      expect(validateRoomCode('ABCD')).toBe(true);
      expect(validateRoomCode('1234')).toBe(true);
      expect(validateRoomCode('A1B2')).toBe(true);
    });

    it('should reject invalid length codes, special characters, or injections', () => {
      expect(validateRoomCode('ABC')).toBe(false);
      expect(validateRoomCode('ABCDE')).toBe(false);
      expect(validateRoomCode('AB-D')).toBe(false);
      expect(validateRoomCode("' OR")).toBe(false);
      expect(validateRoomCode('')).toBe(false);
    });
  });
});
