/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import {
  assertCanSetAdviceClass,
  AttorneyApprovedError,
} from '@/lib/rbac-advice-class'

// Minimal SessionUser stub — the helper only reads `.role`.
function user(role: string): any {
  return { id: 'u_1', role }
}

describe('lib/rbac-advice-class · assertCanSetAdviceClass (PRD R1)', () => {
  const origEnv = { ...process.env }
  beforeEach(() => {
    process.env = { ...origEnv }
    process.env.NODE_ENV = 'production'
    delete process.env.ALLOW_ATTORNEY_APPROVED
  })
  afterEach(() => {
    process.env = { ...origEnv }
  })

  it('passes for general_information regardless of role', () => {
    expect(() =>
      assertCanSetAdviceClass({
        user: user('CLIENT'),
        caseDestinationJurisdiction: 'PT',
        targetAdviceClass: 'general_information',
      }),
    ).not.toThrow()
  })

  it('passes for firm_process regardless of role', () => {
    expect(() =>
      assertCanSetAdviceClass({
        user: user('STAFF'),
        caseDestinationJurisdiction: 'PT',
        targetAdviceClass: 'firm_process',
      }),
    ).not.toThrow()
  })

  it('denies non-lawyer roles trying to set attorney_approved_advice', () => {
    for (const role of ['CLIENT', 'STAFF', 'ADMIN', 'LVJ_MARKETING', 'LAWYER_ASSISTANT']) {
      expect(() =>
        assertCanSetAdviceClass({
          user: user(role),
          caseDestinationJurisdiction: 'PT',
          targetAdviceClass: 'attorney_approved_advice',
        }),
      ).toThrow(AttorneyApprovedError)
    }
  })

  it('denies lawyers even with a case jurisdiction — deny-by-default until User.licensedJurisdictions lands', () => {
    for (const role of ['LAWYER_ADMIN', 'LAWYER_ASSOCIATE']) {
      expect(() =>
        assertCanSetAdviceClass({
          user: user(role),
          caseDestinationJurisdiction: 'PT',
          targetAdviceClass: 'attorney_approved_advice',
        }),
      ).toThrow(/schema field missing/)
    }
  })

  it('denies when destination jurisdiction is missing', () => {
    expect(() =>
      assertCanSetAdviceClass({
        user: user('LAWYER_ADMIN'),
        caseDestinationJurisdiction: null,
        targetAdviceClass: 'attorney_approved_advice',
      }),
    ).toThrow(/destinationJurisdiction is unset/)
  })

  it('respects the dev escape hatch ALLOW_ATTORNEY_APPROVED=1 outside production', () => {
    process.env.NODE_ENV = 'development'
    process.env.ALLOW_ATTORNEY_APPROVED = '1'
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() =>
      assertCanSetAdviceClass({
        user: user('LAWYER_ADMIN'),
        caseDestinationJurisdiction: 'PT',
        targetAdviceClass: 'attorney_approved_advice',
      }),
    ).not.toThrow()
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('ignores the escape hatch in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.ALLOW_ATTORNEY_APPROVED = '1'
    expect(() =>
      assertCanSetAdviceClass({
        user: user('LAWYER_ADMIN'),
        caseDestinationJurisdiction: 'PT',
        targetAdviceClass: 'attorney_approved_advice',
      }),
    ).toThrow(AttorneyApprovedError)
  })

  it('AttorneyApprovedError carries status 403 for HTTP mapping', () => {
    try {
      assertCanSetAdviceClass({
        user: user('CLIENT'),
        caseDestinationJurisdiction: 'PT',
        targetAdviceClass: 'attorney_approved_advice',
      })
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(AttorneyApprovedError)
      expect((err as AttorneyApprovedError).status).toBe(403)
    }
  })
})
